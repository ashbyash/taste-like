/**
 * Batch update subcategory for all bags/shoes/bottoms products based on product name keywords.
 * Handles ZARA, COS, Saint Laurent (and any brand without Algolia-level subcategory data).
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/update-subcategory.ts [--dry-run] [--brand <brand>]
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ============================================
// Keyword mappings (same logic as mappings.ts)
// ============================================

type BagSub = 'tote' | 'shoulder' | 'crossbody' | 'backpack' | 'clutch' | 'mini' | 'top-handle' | 'hobo' | 'bucket' | 'other';
type ShoeSub = 'sneakers' | 'boots' | 'loafers' | 'sandals' | 'pumps' | 'other';
type BottomSub = 'skirts' | 'pants' | 'jeans' | 'shorts' | 'other';

const BAG_KEYWORDS: [RegExp, BagSub][] = [
  // Korean (ZARA)
  [/백팩/i, 'backpack'],
  [/토트/i, 'tote'],
  [/쇼퍼/i, 'tote'],
  [/숄더/i, 'shoulder'],
  [/크로스/i, 'crossbody'],
  [/버킷/i, 'bucket'],
  [/클러치/i, 'clutch'],
  [/미니\s*백/i, 'mini'],
  [/호보/i, 'hobo'],
  [/핸드백/i, 'top-handle'],
  // English (COS, YSL)
  [/BACKPACK/i, 'backpack'],
  [/TOTE/i, 'tote'],
  [/SHOPPER/i, 'tote'],
  [/SHOULDER/i, 'shoulder'],
  [/CROSSBODY/i, 'crossbody'],
  [/MESSENGER/i, 'crossbody'],
  [/BUCKET/i, 'bucket'],
  [/CLUTCH/i, 'clutch'],
  [/MINI BAG/i, 'mini'],
  [/HOBO/i, 'hobo'],
  [/BELT BAG/i, 'crossbody'],
  [/BOWLING/i, 'other'],
  [/DUFFLE/i, 'other'],
  [/POUCH/i, 'clutch'],
  [/ENVELOPE/i, 'clutch'],
];

const SHOE_KEYWORDS: [RegExp, ShoeSub][] = [
  // Korean (ZARA)
  [/스니커즈/i, 'sneakers'],
  [/부츠/i, 'boots'],
  [/로퍼/i, 'loafers'],
  [/샌들/i, 'sandals'],
  [/발레리나/i, 'pumps'],
  [/펌프스/i, 'pumps'],
  [/힐\s*(슈즈|샌들)/i, 'pumps'],
  [/뮬/i, 'sandals'],
  [/플랫\s*슈즈/i, 'loafers'],
  [/블루처/i, 'loafers'],
  [/데크\s*슈즈/i, 'loafers'],
  // English (COS, YSL)
  [/TRAINER/i, 'sneakers'],
  [/SNEAKER/i, 'sneakers'],
  [/BOOT/i, 'boots'],
  [/LOAFER/i, 'loafers'],
  [/SANDAL/i, 'sandals'],
  [/MULE/i, 'sandals'],
  [/PUMP/i, 'pumps'],
  [/BALLET/i, 'pumps'],
  [/FLAT/i, 'loafers'],
  [/DERBY/i, 'loafers'],
  [/OXFORD/i, 'loafers'],
  [/HIKING/i, 'boots'],
  [/MARY.?JANE/i, 'pumps'],
  [/DECK SHOE/i, 'loafers'],
];

const BOTTOM_KEYWORDS: [RegExp, BottomSub][] = [
  // Korean (ZARA)
  [/스커트/i, 'skirts'],
  [/치마/i, 'skirts'],
  [/팬츠/i, 'pants'],
  [/트라우저/i, 'pants'],
  [/슬랙스/i, 'pants'],
  [/청바지/i, 'jeans'],
  [/데님/i, 'jeans'],
  [/반바지/i, 'shorts'],
  [/쇼츠/i, 'shorts'],
  // English (COS)
  [/SKIRT/i, 'skirts'],
  [/TROUSER/i, 'pants'],
  [/PANT(?!Y)/i, 'pants'],
  [/JEAN/i, 'jeans'],
  [/DENIM/i, 'jeans'],
  [/SHORT(?!S?\s*SLEEVE)/i, 'shorts'],
];

function detectSubcategory(category: string, name: string): string | null {
  if (category === 'bags') {
    for (const [re, sub] of BAG_KEYWORDS) {
      if (re.test(name)) return sub;
    }
    return 'other';
  }
  if (category === 'shoes') {
    for (const [re, sub] of SHOE_KEYWORDS) {
      if (re.test(name)) return sub;
    }
    return 'other';
  }
  if (category === 'bottoms') {
    for (const [re, sub] of BOTTOM_KEYWORDS) {
      if (re.test(name)) return sub;
    }
    return 'other';
  }
  return null;
}

// ============================================
// Main
// ============================================

const BATCH_SIZE = 100;

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const brandIdx = args.indexOf('--brand');
  const brandFilter = brandIdx !== -1 ? args[brandIdx + 1] : null;

  console.log(`Subcategory batch update`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  if (brandFilter) console.log(`  Brand: ${brandFilter}`);

  for (const category of ['bags', 'shoes', 'bottoms'] as const) {
    let query = supabase
      .from('products')
      .select('id, name, brand, category, subcategory')
      .eq('category', category)
      .is('subcategory', null);

    if (brandFilter) {
      query = query.eq('brand', brandFilter);
    }

    const { data: products, error } = await query.limit(5000);
    if (error) {
      console.error(`Error fetching ${category}:`, error.message);
      continue;
    }

    if (!products?.length) {
      console.log(`  [${category}] No products with null subcategory`);
      continue;
    }

    console.log(`  [${category}] ${products.length} products to update`);

    const dist: Record<string, number> = {};
    const updates: { id: string; subcategory: string }[] = [];

    for (const p of products) {
      const sub = detectSubcategory(p.category, p.name);
      if (sub) {
        updates.push({ id: p.id, subcategory: sub });
        dist[sub] = (dist[sub] || 0) + 1;
      }
    }

    console.log(`  [${category}] Distribution:`, dist);

    if (dryRun) {
      // Show some examples
      const examples = updates.slice(0, 5);
      for (const u of examples) {
        const p = products.find(pr => pr.id === u.id)!;
        console.log(`    ${p.brand} | ${p.name} -> ${u.subcategory}`);
      }
      continue;
    }

    // Batch update
    let updated = 0;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);

      // Supabase doesn't support batch update with different values per row,
      // so group by subcategory and update in bulk
      const bySubcat: Record<string, string[]> = {};
      for (const u of batch) {
        if (!bySubcat[u.subcategory]) bySubcat[u.subcategory] = [];
        bySubcat[u.subcategory].push(u.id);
      }

      for (const [sub, ids] of Object.entries(bySubcat)) {
        const { error: updateErr, count } = await supabase
          .from('products')
          .update({ subcategory: sub })
          .in('id', ids);

        if (updateErr) {
          console.error(`  Error updating ${sub}:`, updateErr.message);
        } else {
          updated += count ?? ids.length;
        }
      }
    }

    console.log(`  [${category}] ${updated} products updated`);
  }

  console.log('Done.');
}

main();
