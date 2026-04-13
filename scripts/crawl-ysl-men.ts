/**
 * YSL Men's Crawler
 *
 * Collects product URLs from YSL men's category pages (/ca/ pagination),
 * scrapes each via scrapeYslProduct(), and upserts to Supabase.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/crawl-ysl-men.ts
 *   node --env-file=.env.local --import tsx scripts/crawl-ysl-men.ts --dry-run
 *   node --env-file=.env.local --import tsx scripts/crawl-ysl-men.ts --limit 10
 */

import { scrapeYslProduct, YslScraperError } from '../src/lib/scrapers/ysl';
import { supabaseAdmin } from '../src/lib/supabase/server';
import type { Gender } from '../src/types/brand';

// ============================================
// Config
// ============================================

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const BASE = 'https://www.ysl.com/ko-kr';
const DELAY_MIN_MS = 1500;
const DELAY_MAX_MS = 3000;
const BATCH_SIZE = 50;

const MEN_CATEGORY_PAGES = [
  `${BASE}/ca/남성/레디-투-웨어/레디-투-웨어-모두-보기`,
  `${BASE}/ca/남성/슈즈/슈즈-모두-보기`,
  `${BASE}/ca/남성/백/백-모두-보기`,
  // 가죽 소품, 액세서리 제외 (여성에서도 비활성화)
];

// ============================================
// CLI Args
// ============================================

const isDryRun = process.argv.includes('--dry-run');
const limitIdx = process.argv.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1], 10) : Infinity;

// ============================================
// URL Collection from Category Pages
// ============================================

async function collectProductUrls(): Promise<string[]> {
  const allUrls: string[] = [];

  for (const catUrl of MEN_CATEGORY_PAGES) {
    const label = catUrl.split('/ca/')[1];
    let pageNum = 1;
    let catCount = 0;

    while (true) {
      const url = pageNum === 1 ? catUrl : `${catUrl}?page=${pageNum}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'ko-KR,ko;q=0.9' },
        redirect: 'follow',
      });
      if (!res.ok) break;

      const html = await res.text();
      const match = html.match(
        /<script\s+id="__NEXT_DATA__"\s+type="application\/json"[^>]*>([\s\S]*?)<\/script>/,
      );
      if (!match?.[1]) break;

      const data = JSON.parse(match[1]);
      const products = data?.props?.pageProps?.results?.products;
      if (!products || products.length === 0) break;

      for (const p of products) {
        if (p.url) {
          const fullUrl = p.url.startsWith('http')
            ? p.url
            : `https://www.ysl.com${p.url}`;
          allUrls.push(decodeURIComponent(fullUrl));
        }
      }

      catCount += products.length;
      pageNum++;
      if (pageNum > 50) break; // safety
    }

    console.log(`  [${label}] ${catCount} URLs`);
  }

  // Deduplicate
  const unique = [...new Set(allUrls)];
  console.log(`  Total unique URLs: ${unique.length}\n`);
  return unique;
}

// ============================================
// DB Upsert
// ============================================

interface ProductRow {
  brand: string;
  brand_tier: string;
  name: string;
  price: number;
  currency: string;
  category: string;
  gender: Gender;
  image_url: string;
  product_url: string;
  is_available: boolean;
  crawled_at: string;
}

async function batchUpsert(rows: ProductRow[]): Promise<number> {
  let upserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabaseAdmin
      .from('products')
      .upsert(batch, { onConflict: 'product_url' })
      .select('id');

    if (error) throw new Error(`Upsert failed: ${error.message}`);
    upserted += data?.length ?? 0;
  }

  return upserted;
}

// ============================================
// Helpers
// ============================================

function delay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs) + minMs);
  return new Promise(r => setTimeout(r, ms));
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('YSL Men\'s Crawler');
  console.log(`  dry-run: ${isDryRun}`);
  console.log(`  limit: ${limit === Infinity ? 'none' : limit}\n`);

  // 1. Collect URLs from category pages
  console.log('Collecting product URLs from category pages...');
  let urls = await collectProductUrls();

  // 2. Apply limit
  if (limit < urls.length) {
    urls = urls.slice(0, limit);
    console.log(`Limited to ${urls.length} URLs\n`);
  }

  // 3. Scrape loop
  const now = new Date().toISOString();
  const rows: ProductRow[] = [];
  let scraped = 0;
  let errors = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const progress = `[${i + 1}/${urls.length}]`;

    try {
      const product = await scrapeYslProduct(url);

      if (isDryRun) {
        console.log(`  ${progress} ${product.gender} | ${product.category} | ${product.name} | ₩${product.price.toLocaleString()}`);
      } else {
        rows.push({
          brand: product.brand,
          brand_tier: 'luxury',
          name: product.name,
          price: product.price,
          currency: product.currency,
          category: product.category,
          gender: product.gender,
          image_url: product.image_url,
          product_url: product.product_url,
          is_available: true,
          crawled_at: now,
        });

        if (i % 50 === 49 || i === urls.length - 1) {
          console.log(`  ${progress} scraped ${rows.length} so far...`);
        }
      }

      scraped++;
    } catch (err) {
      errors++;
      const code = err instanceof YslScraperError ? err.code : 'UNKNOWN';
      const message = err instanceof Error ? err.message : String(err);

      if (errors <= 20) {
        console.warn(`  ${progress} ERROR [${code}]: ${message}`);
      }
    }

    // Rate limiting
    if (i < urls.length - 1) {
      await delay(DELAY_MIN_MS, DELAY_MAX_MS);
    }
  }

  // 4. Batch upsert
  if (!isDryRun && rows.length > 0) {
    console.log(`\nUpserting ${rows.length} products to DB...`);
    const upserted = await batchUpsert(rows);
    console.log(`  ${upserted} upserted`);
  }

  // 5. Summary
  console.log('\n--- Summary ---');
  console.log(`  Total URLs: ${urls.length}`);
  console.log(`  Scraped: ${scraped}`);
  console.log(`  Errors: ${errors}`);

  if (errors > 20) {
    console.log(`  (first 20 errors shown above)`);
  }

  const byCat: Record<string, number> = {};
  for (const row of rows) {
    byCat[row.category] = (byCat[row.category] ?? 0) + 1;
  }
  if (Object.keys(byCat).length > 0) {
    console.log('\n  By category:');
    for (const [cat, count] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${cat}: ${count}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
