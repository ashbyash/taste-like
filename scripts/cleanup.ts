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

import { appendFileSync } from 'node:fs';
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

function writeGithubOutput(pairs: Record<string, string | number>) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  const body = Object.entries(pairs).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
  appendFileSync(file, body);
}

interface PhaseResult {
  count: number;
  hadError: boolean;
}

// --- Phase 1: Check images for products missing embeddings ---

async function checkAndMarkBrokenImages(dryRun: boolean): Promise<PhaseResult> {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, brand, name, image_url')
    .eq('is_available', true)
    .is('embedding', null);

  if (error) throw new Error(`Fetch failed: ${error.message}`);
  if (!products || products.length === 0) {
    console.log('Phase 1: No products with missing embeddings.');
    return { count: 0, hadError: false };
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
    return { count: 0, hadError: false };
  }

  console.log(`Phase 1: ${broken.length} broken images found:`);
  for (const p of broken) {
    console.log(`  ${p.brand} | ${p.name}`);
  }

  if (dryRun) {
    return { count: broken.length, hadError: false };
  }

  const ids = broken.map((p) => p.id);
  const { error: updateErr } = await supabase
    .from('products')
    .update({ is_available: false })
    .in('id', ids);

  if (updateErr) {
    console.error(`Failed to mark unavailable: ${updateErr.message}`);
    return { count: 0, hadError: true };
  }

  console.log(`Phase 1: Marked ${broken.length} products as unavailable.`);
  return { count: broken.length, hadError: false };
}

// --- Phase 2: Delete unavailable products ---

async function deleteUnavailable(dryRun: boolean): Promise<PhaseResult> {
  const { count, error: countErr } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_available', false);

  if (countErr) throw new Error(`Count failed: ${countErr.message}`);

  const total = count ?? 0;
  if (total === 0) {
    console.log('Phase 2: No unavailable products to delete.');
    return { count: 0, hadError: false };
  }

  console.log(`Phase 2: ${total} unavailable products to delete.`);

  if (dryRun) {
    return { count: total, hadError: false };
  }

  const { error: delErr } = await supabase
    .from('products')
    .delete()
    .eq('is_available', false);

  if (delErr) {
    console.error(`Delete failed: ${delErr.message}`);
    return { count: 0, hadError: true };
  }

  console.log(`Phase 2: Deleted ${total} products.`);
  return { count: total, hadError: false };
}

// --- Phase 3: Invalidate cache ---

async function invalidateCache(dryRun: boolean): Promise<boolean> {
  if (dryRun) {
    console.log('Phase 3: [dry-run] Would invalidate recommendation cache.');
    return true;
  }

  const { error } = await supabase
    .from('recommendation_cache')
    .delete()
    .gte('created_at', '1970-01-01');

  if (error) {
    console.error(`Cache invalidation failed: ${error.message}`);
    return false;
  }

  console.log('Phase 3: Recommendation cache invalidated.');
  return true;
}

// --- Main ---

async function main() {
  const { dryRun } = parseArgs();
  console.log(`Cleanup — ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  const phase1 = await checkAndMarkBrokenImages(dryRun);
  const phase2 = await deleteUnavailable(dryRun);

  let cacheOk = true;
  if (phase1.count > 0 || phase2.count > 0) {
    cacheOk = await invalidateCache(dryRun);
  }

  console.log(`\nDone. ${phase1.count} marked unavailable, ${phase2.count} deleted.`);

  writeGithubOutput({
    marked: phase1.count,
    deleted: phase2.count,
    cache_invalidated: cacheOk ? 'true' : 'false',
    had_errors: phase1.hadError || phase2.hadError || !cacheOk ? 'true' : 'false',
  });

  if (phase1.hadError || phase2.hadError || !cacheOk) {
    console.error('Cleanup finished with errors.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  writeGithubOutput({ marked: 0, deleted: 0, cache_invalidated: 'false', had_errors: 'true' });
  process.exit(1);
});
