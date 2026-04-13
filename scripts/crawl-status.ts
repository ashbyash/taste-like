/**
 * Crawl status dashboard
 * Reports per-brand product counts and data quality metrics.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/crawl-status.ts
 */

import { createClient } from '@supabase/supabase-js';

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  // Paginate to get all brands (Supabase default limit is 1000)
  const counts: Record<string, number> = {};
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const { data } = await sb.from('products').select('brand').range(offset, offset + PAGE - 1);
    if (!data || data.length === 0) break;
    for (const p of data) counts[p.brand] = (counts[p.brand] || 0) + 1;
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  const { count: total } = await sb.from('products').select('*', { count: 'exact', head: true });
  const { count: noEmbed } = await sb.from('products').select('*', { count: 'exact', head: true }).is('embedding', null);
  const { count: noDesc } = await sb.from('products').select('*', { count: 'exact', head: true }).is('fashion_description', null);
  const { count: noSub } = await sb.from('products').select('*', { count: 'exact', head: true }).is('subcategory', null).in('category', ['bags', 'shoes', 'bottoms']);
  const { count: cache } = await sb.from('recommendation_cache').select('*', { count: 'exact', head: true });

  console.log('=== Brand Counts ===');
  for (const [b, c] of Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number))) {
    console.log(b + ': ' + c);
  }
  console.log('');
  console.log('=== Data Quality ===');
  console.log('Total products:', total);
  console.log('Missing embeddings:', noEmbed);
  console.log('Missing fashion_description:', noDesc);
  console.log('Missing subcategory (bags/shoes/bottoms):', noSub);
  console.log('Cached recommendations:', cache);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
