/**
 * Fix misclassified ZARA products: bags stored as bottoms/accessories due to cross-sell on category pages.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/fix-zara-misclassified.ts [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Bag name keywords — reuses the same patterns as update-subcategory.ts
type BagSub = 'tote' | 'shoulder' | 'crossbody' | 'backpack' | 'clutch' | 'mini' | 'top-handle' | 'hobo' | 'bucket' | 'other';

// Stricter patterns: we're scanning non-bag categories, so avoid partial matches
// e.g. "크로스" alone matches "크로스 오버 팬츠", need "크로스백"
const BAG_KEYWORDS: [RegExp, BagSub][] = [
  [/백팩/i, 'backpack'],
  [/토트백/i, 'tote'],
  [/쇼퍼\s*백/i, 'tote'],
  [/숄더\s*백/i, 'shoulder'],
  [/크로스\s*백/i, 'crossbody'],
  [/버킷\s*백/i, 'bucket'],
  [/클러치/i, 'clutch'],
  [/미니\s*백/i, 'mini'],
  [/호보\s*백/i, 'hobo'],
  [/핸드백/i, 'top-handle'],
  [/박스백/i, 'other'],
  [/쇼퍼/i, 'tote'],
];

function detectBagSubcategory(name: string): BagSub | null {
  for (const [re, sub] of BAG_KEYWORDS) {
    if (re.test(name)) return sub;
  }
  return null;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('Fix ZARA misclassified products');
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);

  // Find ZARA products in bottoms/accessories that have bag keywords in name
  const { data: candidates, error } = await supabase
    .from('products')
    .select('id, name, category, subcategory, brand')
    .eq('brand', 'ZARA')
    .in('category', ['bottoms', 'accessories']);

  if (error) {
    console.error('Query error:', error.message);
    process.exit(1);
  }

  if (!candidates?.length) {
    console.log('  No candidates found.');
    return;
  }

  // Filter to only those with bag keywords
  const misclassified: { id: string; name: string; oldCategory: string; subcategory: BagSub }[] = [];

  for (const p of candidates) {
    const sub = detectBagSubcategory(p.name);
    if (sub) {
      misclassified.push({
        id: p.id,
        name: p.name,
        oldCategory: p.category,
        subcategory: sub,
      });
    }
  }

  if (!misclassified.length) {
    console.log('  No misclassified products found.');
    return;
  }

  console.log(`  Found ${misclassified.length} misclassified products:\n`);

  for (const p of misclassified) {
    console.log(`    ${p.oldCategory} -> bags (${p.subcategory}) | ${p.name}`);
  }

  if (dryRun) {
    console.log('\n  Dry run complete. No changes made.');
    return;
  }

  // Group by subcategory for batch update
  const bySubcat: Record<string, string[]> = {};
  for (const p of misclassified) {
    if (!bySubcat[p.subcategory]) bySubcat[p.subcategory] = [];
    bySubcat[p.subcategory].push(p.id);
  }

  let updated = 0;
  for (const [sub, ids] of Object.entries(bySubcat)) {
    const { error: updateErr } = await supabase
      .from('products')
      .update({ category: 'bags', subcategory: sub })
      .in('id', ids);

    if (updateErr) {
      console.error(`  Error updating ${sub}:`, updateErr.message);
    } else {
      updated += ids.length;
      console.log(`  Updated ${ids.length} products -> bags (${sub})`);
    }
  }

  console.log(`\n  Total: ${updated} products fixed.`);
}

main();
