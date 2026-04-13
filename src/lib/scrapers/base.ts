import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { Category, Gender, Subcategory } from '@/types/brand';
import type { BrandTier } from '@/types/brand';

export interface RawProduct {
  name: string;
  price: number;
  currency: string;
  category: Category;
  subcategory?: Subcategory | null;
  gender: Gender;
  image_url: string;
  product_url: string;
}

export interface CrawlOptions {
  categories?: Category[];
  gender?: Gender;
  dryRun?: boolean;
}

export interface CrawlWarning {
  category: string;
  type: 'redirect' | 'category_drop';
  message: string;
}

export interface CrawlResult {
  brand: string;
  total: number;
  upserted: number;
  staleRemoved: number;
  errors: { category: string; message: string }[];
  warnings: CrawlWarning[];
  succeededCategories: { category: Category; gender: Gender }[];
}

const BATCH_SIZE = 50;
const MAX_RETRIES = 3;

export abstract class BaseCrawler {
  abstract readonly brand: string;
  abstract readonly brandTier: BrandTier;
  abstract readonly baseUrl: string;
  protected readonly headless: boolean = process.env.HEADLESS === 'true';

  protected browser!: Browser;
  protected context!: BrowserContext;

  abstract getCategoryUrls(gender: Gender): [Category, string][];
  abstract extractProducts(page: Page, category: Category, gender: Gender): Promise<RawProduct[]>;

  async run(options: CrawlOptions = {}): Promise<CrawlResult> {
    const { categories, gender = 'women', dryRun = false } = options;
    const crawlStartTime = new Date().toISOString();
    const result: CrawlResult = {
      brand: this.brand, total: 0, upserted: 0, staleRemoved: 0,
      errors: [], warnings: [], succeededCategories: [],
    };

    await this.launch();

    try {
      let categoryUrls = this.getCategoryUrls(gender);
      if (categories?.length) {
        categoryUrls = categoryUrls.filter(([cat]) => categories.includes(cat));
      }

      const page = await this.context.newPage();

      for (const [category, url] of categoryUrls) {
        try {
          console.log(`  [${category}] ${url}`);

          await this.navigateTo(page, url);
          await this.delay(1000, 2000);

          // Redirect detection: compare final URL with target
          const redirectWarning = this.detectRedirect(page.url(), url, category);
          if (redirectWarning) {
            result.warnings.push(redirectWarning);
            console.warn(`  ⚠️ [${category}] ${redirectWarning.message}`);
          }

          const products = await this.extractProducts(page, category, gender);
          console.log(`  [${category}] ${products.length} products extracted`);
          result.total += products.length;

          // Zero-product warning: check DB for previous count
          if (products.length === 0) {
            const drop = await this.checkCategoryDrop(category);
            if (drop) {
              result.warnings.push(drop);
              console.warn(`  ⚠️ [${category}] ${drop.message}`);
            }
          }

          if (!dryRun && products.length > 0) {
            const upserted = await this.batchUpsert(products);
            result.upserted += upserted;
            result.succeededCategories.push({ category, gender });
            console.log(`  [${category}] ${upserted} upserted to DB`);
          } else if (dryRun && products.length > 0) {
            console.log(`  [${category}] dry-run, skipping DB insert`);
            products.slice(0, 3).forEach(p =>
              console.log(`    ${p.name} | ₩${p.price.toLocaleString()} | ${p.category}`)
            );
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`  [${category}] ERROR: ${message}`);
          result.errors.push({ category, message });
        }

        await this.delay(2000, 4000);
      }

      await page.close();
    } finally {
      await this.close();
    }

    // Mark stale products as unavailable for successfully crawled categories
    if (!dryRun && result.succeededCategories.length > 0) {
      result.staleRemoved = await this.markStaleUnavailable(
        result.succeededCategories, crawlStartTime,
      );
    }

    if (result.warnings.length > 0) {
      console.warn(`\n⚠️  ${this.brand} WARNINGS (${result.warnings.length}):`);
      for (const w of result.warnings) {
        console.warn(`  [${w.type}] ${w.message}`);
      }
    }

    return result;
  }

  protected async navigateTo(page: Page, url: string): Promise<void> {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  }

  protected async launch(): Promise<void> {
    this.browser = await chromium.launch({ headless: this.headless });
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
      locale: 'ko-KR',
    });
  }

  protected async close(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
  }

  protected async scrollToLoadAll(
    page: Page,
    itemSelector: string,
    options: { maxScrolls?: number; stabilizeAfter?: number } = {}
  ): Promise<void> {
    const { maxScrolls = 20, stabilizeAfter = 2 } = options;
    let previousCount = 0;
    let stableRounds = 0;

    for (let i = 0; i < maxScrolls; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.delay(1500, 2500);

      const currentCount = await page.locator(itemSelector).count();
      if (currentCount === previousCount) {
        stableRounds++;
        if (stableRounds >= stabilizeAfter) break;
      } else {
        stableRounds = 0;
        previousCount = currentCount;
      }
    }
  }

  protected detectRedirect(
    actualUrl: string,
    targetUrl: string,
    category: string,
  ): CrawlWarning | null {
    const actualPath = new URL(actualUrl).pathname;
    const targetPath = new URL(targetUrl).pathname;

    // Same path = no redirect
    if (actualPath === targetPath) return null;

    // Ignore minor differences (trailing slash)
    if (actualPath.replace(/\/$/, '') === targetPath.replace(/\/$/, '')) return null;

    return {
      category,
      type: 'redirect',
      message: `REDIRECT: ${targetUrl} → ${actualUrl}`,
    };
  }

  protected async checkCategoryDrop(category: string): Promise<CrawlWarning | null> {
    const { count } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('brand', this.brand)
      .eq('category', category)
      .eq('is_available', true);

    if (count && count > 0) {
      return {
        category,
        type: 'category_drop',
        message: `CATEGORY DROP: ${category} had ${count} products in DB, but crawl got 0`,
      };
    }
    return null;
  }

  protected async markStaleUnavailable(
    succeededCategories: { category: Category; gender: Gender }[],
    crawlStartTime: string,
  ): Promise<number> {
    // Deduplicate categories (multiple URLs can map to same category)
    const unique = [...new Map(
      succeededCategories.map(c => [`${c.category}:${c.gender}`, c]),
    ).values()];

    let total = 0;
    for (const { category, gender } of unique) {
      const { data, error } = await supabaseAdmin
        .from('products')
        .update({ is_available: false })
        .eq('brand', this.brand)
        .eq('category', category)
        .eq('gender', gender)
        .eq('is_available', true)
        .lt('crawled_at', crawlStartTime)
        .select('id');

      const removed = data?.length ?? 0;
      if (removed > 0) {
        console.log(`  [${category}] ${removed} stale products marked unavailable`);
      }
      if (error) {
        console.warn(`  [${category}] stale cleanup error: ${error.message}`);
      }
      total += removed;
    }

    if (total > 0) {
      console.log(`  [cleanup] ${total} total stale products removed for ${this.brand}`);
    }
    return total;
  }

  protected async delay(minMs: number, maxMs: number): Promise<void> {
    const ms = Math.floor(Math.random() * (maxMs - minMs) + minMs);
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  protected async batchUpsert(products: RawProduct[]): Promise<number> {
    let upserted = 0;
    const now = new Date().toISOString();

    // Deduplicate by product_url within the batch (keep last occurrence)
    const deduped = [...new Map(products.map(p => [p.product_url, p])).values()];

    for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
      const batch = deduped.slice(i, i + BATCH_SIZE).map(p => ({
        brand: this.brand,
        brand_tier: this.brandTier,
        name: p.name,
        price: p.price,
        currency: p.currency,
        category: p.category,
        subcategory: p.subcategory ?? null,
        gender: p.gender,
        image_url: p.image_url,
        product_url: p.product_url,
        is_available: true,
        crawled_at: now,
      }));

      const result = await this.withRetry(async () => {
        const { data, error } = await supabaseAdmin
          .from('products')
          .upsert(batch, { onConflict: 'product_url' })
          .select('id');

        if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
        return data?.length ?? 0;
      });

      upserted += result;
    }

    return upserted;
  }

  protected async withRetry<T>(
    fn: () => Promise<T>,
    retries: number = MAX_RETRIES
  ): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt === retries) throw err;
        const delayMs = 1000 * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`  Retry ${attempt + 1}/${retries} after ${Math.round(delayMs)}ms`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    throw new Error('Unreachable');
  }
}
