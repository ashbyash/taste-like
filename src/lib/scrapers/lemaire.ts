import { supabaseAdmin } from '@/lib/supabase/server';
import type { Category, Gender } from '@/types/brand';
import type { ScrapedProduct } from '@/types/product';
import type { RawProduct, CrawlOptions, CrawlResult } from './base';
import { mapNameToSubcategory } from '@/lib/subcategory/mappings';

const BRAND = 'Lemaire';
const BRAND_TIER = 'luxury' as const;
const BATCH_SIZE = 50;
const MAX_RETRIES = 3;
const BASE_URL = 'https://www.lemaire.fr';

// Shopify product_type → taste-like category
const PRODUCT_TYPE_MAP: Record<string, Category> = {
  Bag: 'bags',
  Shoes: 'shoes',
  Outerwear: 'outerwear',
  Top: 'tops',
  Shirt: 'tops',
  Pants: 'bottoms',
  Skirt: 'bottoms',
};

// Collection handles per gender
// men-bags and men-accessories are empty on Lemaire
const WOMEN_COLLECTIONS: [Category, string][] = [
  ['bags', 'women-bags'],
  ['shoes', 'women-shoes'],
  ['outerwear', 'women-coats'],
  ['tops', 'women-tops'],
  ['bottoms', 'women-pants'],
  ['bottoms', 'skirts'],
];

const MEN_COLLECTIONS: [Category, string][] = [
  ['shoes', 'men-shoes'],
  ['outerwear', 'men-ready-to-wear-all'],
  ['tops', 'men-ready-to-wear-all'],
  ['bottoms', 'men-ready-to-wear-all'],
];

// Categories to crawl (accessories excluded per project convention)
const CRAWL_CATEGORIES: Category[] = ['bags', 'shoes', 'outerwear', 'tops', 'bottoms'];

interface ShopifyProduct {
  title: string;
  handle: string;
  product_type: string;
  tags: string[];
  variants: { price: string; available: boolean }[];
  images: { src: string }[];
  body_html?: string;
}

interface ShopifyCollectionResponse {
  products: ShopifyProduct[];
}

function delay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs) + minMs);
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
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

function parseProduct(
  product: ShopifyProduct,
  expectedCategory: Category,
  gender: Gender,
): RawProduct | null {
  const name = product.title;
  if (!name) return null;

  const variant = product.variants?.[0];
  if (!variant?.price) return null;

  const image = product.images?.[0];
  if (!image?.src) return null;

  // Map product_type to category
  const actualCategory = PRODUCT_TYPE_MAP[product.product_type];
  if (!actualCategory) return null;

  // For mixed collections (men-ready-to-wear-all), filter by expected category
  if (actualCategory !== expectedCategory) return null;

  const price = Math.round(parseFloat(variant.price));
  if (!price || price <= 0) return null;

  const subcategory = mapNameToSubcategory(actualCategory, name);

  return {
    name,
    price,
    currency: 'KRW',
    category: actualCategory,
    subcategory,
    gender,
    image_url: image.src,
    product_url: `${BASE_URL}/ko/products/${product.handle}`,
  };
}

async function batchUpsert(products: RawProduct[]): Promise<number> {
  let upserted = 0;
  const now = new Date().toISOString();

  const deduped = [...new Map(products.map(p => [p.product_url, p])).values()];

  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE).map(p => ({
      brand: BRAND,
      brand_tier: BRAND_TIER,
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

    const result = await withRetry(async () => {
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

export async function crawlLemaire(options: CrawlOptions = {}): Promise<CrawlResult> {
  const { categories, gender = 'women', dryRun = false } = options;
  const result: CrawlResult = { brand: BRAND, total: 0, upserted: 0, staleRemoved: 0, errors: [], warnings: [], succeededCategories: [] };

  let targetCategories = CRAWL_CATEGORIES;
  if (categories?.length) {
    targetCategories = targetCategories.filter(c => categories.includes(c));
  }

  const collections = gender === 'men' ? MEN_COLLECTIONS : WOMEN_COLLECTIONS;

  // Track fetched collections to avoid duplicate API calls
  // (men-ready-to-wear-all is shared across outerwear/tops/bottoms)
  const fetchedCollections = new Map<string, ShopifyProduct[]>();

  for (const category of targetCategories) {
    try {
      console.log(`  [${category}] Fetching from Shopify...`);

      const handles = collections
        .filter(([cat]) => cat === category)
        .map(([, handle]) => handle);

      if (!handles.length) {
        console.log(`  [${category}] No collection for ${gender}, skipping`);
        continue;
      }

      const categoryProducts: RawProduct[] = [];

      for (const handle of handles) {
        // Use cached response for shared collections
        let shopifyProducts = fetchedCollections.get(handle);
        if (!shopifyProducts) {
          const url = `${BASE_URL}/ko/collections/${handle}/products.json?limit=250&currency=KRW`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Shopify API ${res.status}`);
          const data: ShopifyCollectionResponse = await res.json();
          shopifyProducts = data.products ?? [];

          // Paginate if needed
          let page = 2;
          while (shopifyProducts.length >= 250 * (page - 1)) {
            await delay(100, 200);
            const nextUrl = `${BASE_URL}/ko/collections/${handle}/products.json?limit=250&page=${page}&currency=KRW`;
            const nextRes = await fetch(nextUrl);
            if (!nextRes.ok) break;
            const nextData: ShopifyCollectionResponse = await nextRes.json();
            if (!nextData.products?.length) break;
            shopifyProducts = shopifyProducts.concat(nextData.products);
            page++;
          }

          fetchedCollections.set(handle, shopifyProducts);
        }

        for (const p of shopifyProducts) {
          const raw = parseProduct(p, category, gender);
          if (raw) categoryProducts.push(raw);
        }

        await delay(200, 400);
      }

      console.log(`  [${category}] ${categoryProducts.length} products extracted`);
      result.total += categoryProducts.length;

      if (!dryRun && categoryProducts.length > 0) {
        const upserted = await batchUpsert(categoryProducts);
        result.upserted += upserted;
        console.log(`  [${category}] ${upserted} upserted to DB`);
      } else if (dryRun && categoryProducts.length > 0) {
        console.log(`  [${category}] dry-run, skipping DB insert`);
        categoryProducts.slice(0, 3).forEach(p =>
          console.log(`    ${p.name} | ₩${p.price.toLocaleString()} | ${p.category}`)
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  [${category}] ERROR: ${message}`);
      result.errors.push({ category, message });
    }

    await delay(300, 500);
  }

  return result;
}

// ============================================
// On-demand Scraper (single product URL)
// ============================================

const FETCH_TIMEOUT_MS = 8_000;

interface ShopifySingleProductResponse {
  product: ShopifyProduct;
}

function extractHandle(rawUrl: string): string {
  const url = new URL(rawUrl);
  // URL: /ko/products/{handle} or /en/products/{handle}
  const segments = url.pathname.split('/').filter(Boolean);
  const productsIdx = segments.indexOf('products');
  if (productsIdx === -1 || !segments[productsIdx + 1]) {
    throw new Error('올바른 Lemaire 상품 URL을 입력해주세요');
  }
  return segments[productsIdx + 1];
}

function detectGenderFromTags(tags: string[]): Gender {
  const lower = tags.map(t => t.toLowerCase());
  if (lower.includes('men') && !lower.includes('women')) return 'men';
  return 'women';
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

export async function scrapeLemaireProduct(rawUrl: string): Promise<ScrapedProduct> {
  const handle = extractHandle(rawUrl);

  const apiUrl = `${BASE_URL}/ko/products/${handle}.json?currency=KRW`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(apiUrl, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    throw new Error(`상품 정보를 가져올 수 없습니다 (HTTP ${res.status})`);
  }

  const data: ShopifySingleProductResponse = await res.json();
  const product = data.product;

  if (!product?.title) {
    throw new Error('상품명을 찾을 수 없습니다');
  }

  const variant = product.variants?.[0];
  if (!variant?.price) {
    throw new Error('가격 정보를 찾을 수 없습니다');
  }

  const image = product.images?.[0];
  if (!image?.src) {
    throw new Error('상품 이미지를 찾을 수 없습니다');
  }

  const category = PRODUCT_TYPE_MAP[product.product_type];
  if (!category) {
    throw new Error(`지원하지 않는 카테고리입니다: ${product.product_type}`);
  }

  const price = Math.round(parseFloat(variant.price));
  const gender = detectGenderFromTags(product.tags);
  const subcategory = mapNameToSubcategory(category, product.title);
  const description = product.body_html
    ? stripHtml(product.body_html)
    : undefined;

  return {
    brand: BRAND,
    name: product.title,
    price,
    currency: 'KRW',
    category,
    subcategory,
    gender,
    image_url: image.src,
    product_url: `${BASE_URL}/ko/products/${handle}`,
    description,
  };
}
