/**
 * Product cleanup script
 * 1. Check image URLs for products with missing embeddings → mark broken as unavailable
 * 2. Delete all unavailable products from DB
 * 3. Invalidate recommendation cache
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/cleanup.ts
 *   node --env-file=.env.local --import tsx scripts/cleanup.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const CONCURRENCY = 10;
const IMAGE_TIMEOUT_MS = 5000;

function parseArgs() {
  return { dryRun: process.argv.includes('--dry-run') };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Phase 1: Check images for products missing embeddings ---

async function checkAndMarkBrokenImages(dryRun: boolean): Promise<number> {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, brand, name, image_url')
    .eq('is_available', true)
    .is('embedding', null);

  if (error) throw new Error(`Fetch failed: ${error.message}`);
  if (!products || products.length === 0) {
    console.log('Phase 1: No products with missing embeddings.');
    return 0;
  }

  console.log(`Phase 1: Checking ${products.length} products with missing embeddings...`);

  const broken: typeof products = [];

  for (let i = 0; i < products.length; i += CONCURRENCY) {
    const chunk = products.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map(async (p) => {
        try {
          const res = await fetch(p.image_url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
          });
          if (!res.ok) return { product: p, broken: true };
        } catch {
          return { product: p, broken: true };
        }
        return { product: p, broken: false };
      }),
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.broken) {
        broken.push(r.value.product);
      }
    }
  }

  if (broken.length === 0) {
    console.log('Phase 1: All images OK.');
    return 0;
  }

  console.log(`Phase 1: ${broken.length} broken images found:`);
  for (const p of broken) {
    console.log(`  ${p.brand} | ${p.name}`);
  }

  if (!dryRun) {
    const ids = broken.map((p) => p.id);
    const { error: updateErr } = await supabase
      .from('products')
      .update({ is_available: false })
      .in('id', ids);

    if (updateErr) {
      console.error(`Failed to mark unavailable: ${updateErr.message}`);
    } else {
      console.log(`Phase 1: Marked ${broken.length} products as unavailable.`);
    }
  }

  return broken.length;
}

// --- Phase 2: Delete unavailable products ---

async function deleteUnavailable(dryRun: boolean): Promise<number> {
  const { count, error: countErr } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_available', false);

  if (countErr) throw new Error(`Count failed: ${countErr.message}`);

  const total = count ?? 0;
  if (total === 0) {
    console.log('Phase 2: No unavailable products to delete.');
    return 0;
  }

  console.log(`Phase 2: ${total} unavailable products to delete.`);

  if (!dryRun) {
    const { error: delErr } = await supabase
      .from('products')
      .delete()
      .eq('is_available', false);

    if (delErr) {
      console.error(`Delete failed: ${delErr.message}`);
      return 0;
    }

    console.log(`Phase 2: Deleted ${total} products.`);
  }

  return total;
}

// --- Phase 3: Invalidate cache ---

async function invalidateCache(dryRun: boolean) {
  if (dryRun) {
    console.log('Phase 3: [dry-run] Would invalidate recommendation cache.');
    return;
  }

  const { error } = await supabase
    .from('recommendation_cache')
    .delete()
    .gte('created_at', '1970-01-01');

  if (error) {
    console.error(`Cache invalidation failed: ${error.message}`);
  } else {
    console.log('Phase 3: Recommendation cache invalidated.');
  }
}

// --- Main ---

async function main() {
  const { dryRun } = parseArgs();
  console.log(`Cleanup — ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  const marked = await checkAndMarkBrokenImages(dryRun);
  const deleted = await deleteUnavailable(dryRun);

  if (marked > 0 || deleted > 0) {
    await invalidateCache(dryRun);
  }

  console.log(`\nDone. ${marked} marked unavailable, ${deleted} deleted.`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
