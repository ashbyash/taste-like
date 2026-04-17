/**
 * Batch embedding generator using HF Space
 * Generates embeddings for all products missing embedding via HF Space /embed endpoint.
 * Re-runnable: uses IS NULL filter so interrupted runs can resume.
 * After completion, invalidates recommendation_cache.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/batch-embed.ts
 *   node --env-file=.env.local --import tsx scripts/batch-embed.ts --brand ZARA
 *   node --env-file=.env.local --import tsx scripts/batch-embed.ts --dry-run
 */

import { appendFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { getEmbedding } from '../src/lib/embedding/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const CONCURRENCY = 3;
const BATCH_SIZE = 50;
const CHUNK_DELAY_MS = 300;
const MAX_RETRIES = 2;

interface ProductRow {
  id: string;
  name: string;
  image_url: string;
  fashion_description: string | null;
  brand: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const brandIdx = args.indexOf('--brand');
  const brand = brandIdx !== -1 ? args[brandIdx + 1] : undefined;
  return { dryRun, brand };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeGithubOutput(pairs: Record<string, string | number>) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  const body = Object.entries(pairs).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
  appendFileSync(file, body);
}

async function fetchProducts(brand?: string): Promise<ProductRow[]> {
  let query = supabase
    .from('products')
    .select('id, name, image_url, fashion_description, brand')
    .is('embedding', null)
    .eq('is_available', true)
    .order('brand')
    .order('created_at');

  if (brand) {
    query = query.eq('brand', brand);
  }

  const all: ProductRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await query.range(from, from + 999);
    if (error) throw new Error(`Fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  return all;
}

async function embedWithRetry(
  imageUrl: string,
  text: string | undefined,
  retries = MAX_RETRIES,
): Promise<number[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await getEmbedding(imageUrl, text);
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = 1000 * (attempt + 1);
      console.warn(`  Retry ${attempt + 1}/${retries} after ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error('Unreachable');
}

async function processProduct(
  product: ProductRow,
  dryRun: boolean,
): Promise<boolean> {
  const text = product.fashion_description ?? product.name;

  if (dryRun) {
    console.log(`  [dry-run] ${product.brand} | ${product.name} | text: ${text.slice(0, 50)}...`);
    return true;
  }

  const embedding = await embedWithRetry(product.image_url, text);

  const { error } = await supabase
    .from('products')
    .update({ embedding: JSON.stringify(embedding) })
    .eq('id', product.id);

  if (error) {
    console.error(`  Failed to update ${product.id}: ${error.message}`);
    return false;
  }

  return true;
}

async function invalidateCache(): Promise<boolean> {
  const { error } = await supabase
    .from('recommendation_cache')
    .delete()
    .gte('created_at', '1970-01-01');

  if (error) {
    console.error(`Cache invalidation failed: ${error.message}`);
    return false;
  }

  console.log('Recommendation cache invalidated.');
  return true;
}

async function main() {
  const { dryRun, brand } = parseArgs();

  console.log(`Batch embed — ${dryRun ? 'DRY RUN' : 'LIVE'}${brand ? ` — brand: ${brand}` : ''}`);

  const products = await fetchProducts(brand);
  const total = products.length;
  console.log(`Found ${total} products with missing embeddings.`);

  if (total === 0) {
    console.log('Nothing to do.');
    writeGithubOutput({ total: 0, success: 0, failed: 0, cache_invalidated: 'false' });
    return;
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    console.log(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)} (${batch.length} products)`);

    for (let j = 0; j < batch.length; j += CONCURRENCY) {
      const chunk = batch.slice(j, j + CONCURRENCY);
      const results = await Promise.allSettled(
        chunk.map((p) => processProduct(p, dryRun)),
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) success++;
        else failed++;
      }

      if (!dryRun && j + CONCURRENCY < batch.length) {
        await sleep(CHUNK_DELAY_MS);
      }
    }

    console.log(`  Progress: ${Math.min(i + BATCH_SIZE, total)}/${total} (${success} ok, ${failed} failed)`);
  }

  console.log(`\nDone. ${success} embedded, ${failed} failed.`);

  let cacheInvalidated = false;
  if (!dryRun && success > 0) {
    cacheInvalidated = await invalidateCache();
  }

  writeGithubOutput({
    total,
    success,
    failed,
    cache_invalidated: cacheInvalidated ? 'true' : 'false',
  });

  // Fail the workflow if embedding was expected but nothing succeeded,
  // or if cache invalidation failed after successful embeds.
  if (total > 0 && success === 0) {
    console.error(`All ${total} embeddings failed.`);
    process.exit(1);
  }
  if (!dryRun && success > 0 && !cacheInvalidated) {
    console.error('Embeddings succeeded but cache invalidation failed.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  writeGithubOutput({ total: -1, success: 0, failed: 0, cache_invalidated: 'false' });
  process.exit(1);
});
