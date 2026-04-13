/**
 * Batch fashion description generator
 * Generates GPT-4o-mini Vision descriptions for all products missing fashion_description.
 * Re-runnable: uses IS NULL filter so interrupted runs can resume.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/batch-describe.ts
 *   node --env-file=.env.local --import tsx scripts/batch-describe.ts --brand ZARA
 *   node --env-file=.env.local --import tsx scripts/batch-describe.ts --dry-run
 */

// Set longer timeout for batch processing (before importing fashion module)
process.env.DESCRIBE_TIMEOUT_MS = '15000';

import { createClient } from '@supabase/supabase-js';
import { describeFashionItem } from '../src/lib/describe/fashion';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const CONCURRENCY = 3;
const BATCH_SIZE = 50;
const CHUNK_DELAY_MS = 500;
const MAX_RETRIES = 2;

interface ProductRow {
  id: string;
  name: string;
  category: string;
  image_url: string;
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

async function fetchProducts(brand?: string): Promise<ProductRow[]> {
  let query = supabase
    .from('products')
    .select('id, name, category, image_url, brand')
    .is('fashion_description', null)
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
    all.push(...(data as ProductRow[]));
    if (data.length < 1000) break;
    from += 1000;
  }

  return all;
}

async function processOne(
  product: ProductRow,
  dryRun: boolean,
): Promise<{ id: string; success: boolean; description?: string }> {
  if (dryRun) {
    return { id: product.id, success: true, description: '[dry-run]' };
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const description = await describeFashionItem(
        product.image_url,
        product.name,
        product.category,
      );

      if (!description) {
        return { id: product.id, success: false };
      }

      const { error } = await supabase
        .from('products')
        .update({ fashion_description: description })
        .eq('id', product.id);

      if (error) {
        console.error(`  DB update failed [${product.id}]: ${error.message}`);
        return { id: product.id, success: false };
      }

      return { id: product.id, success: true, description };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = msg.includes('429');
      const isTimeout = msg.includes('aborted') || msg.includes('Timeout');

      if ((is429 || isTimeout) && attempt < MAX_RETRIES) {
        const delay = is429 ? 3000 * (attempt + 1) : 2000;
        await sleep(delay);
        continue;
      }

      console.error(`  Error [${product.id}]: ${msg}`);
      return { id: product.id, success: false };
    }
  }

  return { id: product.id, success: false };
}

async function processBatch(
  products: ProductRow[],
  dryRun: boolean,
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i += CONCURRENCY) {
    const chunk = products.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map((p) => processOne(p, dryRun)),
    );

    for (const r of results) {
      if (r.success) success++;
      else failed++;
    }

    if (!dryRun && i + CONCURRENCY < products.length) {
      await sleep(CHUNK_DELAY_MS);
    }
  }

  return { success, failed };
}

async function main() {
  const { dryRun, brand } = parseArgs();

  console.log('=== Batch Fashion Description Generator ===');
  if (dryRun) console.log('[DRY RUN MODE]');
  if (brand) console.log(`Brand filter: ${brand}`);
  console.log(`Concurrency: ${CONCURRENCY}, Timeout: 15s, Retries: ${MAX_RETRIES}`);

  const products = await fetchProducts(brand);
  console.log(`Found ${products.length} products without fashion_description`);

  if (products.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const brandCounts = new Map<string, number>();
  for (const p of products) {
    brandCounts.set(p.brand, (brandCounts.get(p.brand) ?? 0) + 1);
  }
  for (const [b, c] of brandCounts) {
    console.log(`  ${b}: ${c}`);
  }

  const startTime = Date.now();
  let totalSuccess = 0;
  let totalFailed = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(products.length / BATCH_SIZE);

    console.log(`\nBatch ${batchNum}/${totalBatches} (${batch.length} items)`);

    const { success, failed } = await processBatch(batch, dryRun);
    totalSuccess += success;
    totalFailed += failed;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const processed = totalSuccess + totalFailed;
    const rate = processed > 0 ? (processed / ((Date.now() - startTime) / 1000)).toFixed(1) : '0';
    const eta = parseFloat(rate) > 0
      ? ((products.length - processed) / parseFloat(rate) / 60).toFixed(1)
      : '?';
    console.log(
      `  Progress: ${processed}/${products.length} | ` +
      `OK: ${totalSuccess} | Fail: ${totalFailed} | ` +
      `${rate}/s | ${elapsed}s | ETA: ${eta}min`,
    );
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== Complete ===');
  console.log(`Total: ${totalSuccess} success, ${totalFailed} failed`);
  console.log(`Time: ${totalTime}s`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
