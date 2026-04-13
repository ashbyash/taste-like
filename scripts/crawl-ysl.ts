/**
 * YSL Batch Crawler
 *
 * Fetches product URLs from YSL sitemap, scrapes each page using
 * the existing on-demand scraper, and upserts to Supabase.
 *
 * Usage:
 *   npm run crawl:ysl                          # all products
 *   npm run crawl:ysl -- --dry-run             # preview only
 *   npm run crawl:ysl -- --limit 10            # first 10
 *   npm run crawl:ysl -- --category bags       # bags only
 *   npm run crawl:ysl -- --skip-existing       # skip already in DB
 */

import { scrapeYslProduct, YslScraperError } from '../src/lib/scrapers/ysl';
import { supabaseAdmin } from '../src/lib/supabase/server';
import { CATEGORIES, type Category, type Gender } from '../src/types/brand';

// ============================================
// Config
// ============================================

const SITEMAP_URL = 'https://www.ysl.com/ko-kr/sitemaps/0/sitemap-products.xml';
const DELAY_MIN_MS = 1500;
const DELAY_MAX_MS = 3000;
const BATCH_SIZE = 50;

// ============================================
// CLI Args
// ============================================

interface CliArgs {
  dryRun: boolean;
  limit: number;
  category?: Category;
  gender?: Gender;
  skipExisting: boolean;
}

function parseArgs(args: string[]): CliArgs {
  let dryRun = false;
  let limit = Infinity;
  let category: Category | undefined;
  let gender: Gender | undefined;
  let skipExisting = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') { dryRun = true; continue; }
    if (arg === '--skip-existing') { skipExisting = true; continue; }
    if (arg === '--limit' && args[i + 1]) {
      limit = parseInt(args[++i], 10);
      continue;
    }
    if (arg === '--category' && args[i + 1]) {
      const val = args[++i] as Category;
      if (!CATEGORIES.includes(val)) {
        console.error(`Invalid category: "${val}". Available: ${CATEGORIES.join(', ')}`);
        process.exit(1);
      }
      category = val;
      continue;
    }
    if (arg === '--gender' && args[i + 1]) {
      const val = args[++i] as Gender;
      if (val !== 'women' && val !== 'men') {
        console.error(`Invalid gender: "${val}". Available: women, men`);
        process.exit(1);
      }
      gender = val;
      continue;
    }
  }

  return { dryRun, limit, category, gender, skipExisting };
}

// ============================================
// Sitemap Fetching
// ============================================

async function fetchSitemapUrls(): Promise<string[]> {
  console.log('Fetching sitemap...');
  const res = await fetch(SITEMAP_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });

  if (!res.ok) throw new Error(`Sitemap fetch failed: HTTP ${res.status}`);
  const xml = await res.text();

  const urls: string[] = [];
  const locRegex = /<loc>(.*?)<\/loc>/g;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    const url = match[1].trim();
    if (url.endsWith('.html')) urls.push(decodeURIComponent(url));
  }

  console.log(`  Found ${urls.length} product URLs in sitemap`);
  return urls;
}

// ============================================
// Existing URL Check
// ============================================

async function getExistingUrls(): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('product_url')
    .eq('brand', 'Saint Laurent');

  if (error) throw new Error(`DB query failed: ${error.message}`);
  return new Set((data ?? []).map(r => r.product_url));
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
  const args = parseArgs(process.argv.slice(2));

  console.log('YSL Batch Crawler');
  console.log(`  dry-run: ${args.dryRun}`);
  console.log(`  limit: ${args.limit === Infinity ? 'none' : args.limit}`);
  console.log(`  category: ${args.category ?? 'all'}`);
  console.log(`  gender: ${args.gender ?? 'all (auto-detect)'}`);
  console.log(`  skip-existing: ${args.skipExisting}`);
  console.log('');

  // 1. Fetch sitemap
  let urls = await fetchSitemapUrls();

  // 2. Filter existing
  if (args.skipExisting) {
    const existing = await getExistingUrls();
    const before = urls.length;
    urls = urls.filter(u => !existing.has(u));
    console.log(`  Skipping ${before - urls.length} existing, ${urls.length} remaining`);
  }

  // 3. Apply limit
  if (args.limit < urls.length) {
    urls = urls.slice(0, args.limit);
    console.log(`  Limited to ${urls.length} URLs`);
  }

  // 4. Scrape loop
  const now = new Date().toISOString();
  const rows: ProductRow[] = [];
  let scraped = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const progress = `[${i + 1}/${urls.length}]`;

    try {
      const product = await scrapeYslProduct(url);

      // Category filter
      if (args.category && product.category !== args.category) {
        skipped++;
        continue;
      }

      // Gender filter
      if (args.gender && product.gender !== args.gender) {
        skipped++;
        continue;
      }

      if (args.dryRun) {
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

      if (errors <= 10) {
        console.warn(`  ${progress} ERROR [${code}]: ${message}`);
      }
    }

    // Rate limiting
    if (i < urls.length - 1) {
      await delay(DELAY_MIN_MS, DELAY_MAX_MS);
    }
  }

  // 5. Batch upsert
  if (!args.dryRun && rows.length > 0) {
    console.log(`\nUpserting ${rows.length} products to DB...`);
    const upserted = await batchUpsert(rows);
    console.log(`  ${upserted} upserted`);
  }

  // 6. Summary
  console.log('\n--- Summary ---');
  console.log(`  Total URLs: ${urls.length}`);
  console.log(`  Scraped: ${scraped}`);
  console.log(`  Skipped (category): ${skipped}`);
  console.log(`  Errors: ${errors}`);

  if (errors > 10) {
    console.log(`  (first 10 errors shown above)`);
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
