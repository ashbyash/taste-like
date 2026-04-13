import { supabaseAdmin } from '@/lib/supabase/server';
import type { Category, Gender } from '@/types/brand';
import type { ScrapedProduct } from '@/types/product';
import type { RawProduct, CrawlOptions, CrawlResult } from './base';
import { mapNameToSubcategory } from '@/lib/subcategory/mappings';

const BRAND = 'The Row';
const BRAND_TIER = 'luxury' as const;
const BATCH_SIZE = 50;
const MAX_RETRIES = 3;
const BASE_URL = 'https://www.therow.com';

// Shopify product_type (uppercase) → taste-like category
const PRODUCT_TYPE_MAP: Record<string, Category> = {
  // Outerwear
  OUTERWEAR: 'outerwear',
  COATS: 'outerwear',
  // Bags
  'TOP HANDLE BAGS': 'bags',
  'TOTE BAGS': 'bags',
  'SHOULDER BAGS': 'bags',
  'CROSSBODY BAGS': 'bags',
  CLUTCHES: 'bags',
  BAGS: 'bags',
  // Shoes
  SANDALS: 'shoes',
  BOOTS: 'shoes',
  FLATS: 'shoes',
  HEELS: 'shoes',
  SNEAKERS: 'shoes',
  LOAFERS: 'shoes',
  'SLIP ONS': 'shoes',
  // Tops
  SWEATERS: 'tops',
  SHIRTS: 'tops',
  'T-SHIRTS': 'tops',
  TOPS: 'tops',
  KNITS: 'tops',
  // Bottoms
  PANTS: 'bottoms',
  SKIRTS: 'bottoms',
  SHORTS: 'bottoms',
  DENIM: 'bottoms',
};

// Collection handles per gender
const WOMEN_COLLECTIONS: [Category, string][] = [
  ['bags', 'women-handbags'],
  ['shoes', 'women-shoes'],
  ['outerwear', 'women-coats-outerwear'],
  ['outerwear', 'women-jackets-blazers'],
  ['tops', 'women-sweaters-sweatshirts'],
  ['tops', 'women-shirts-tops'],
  ['tops', 'women-t-shirts-tank-tops'],
  ['bottoms', 'women-pants-shorts'],
  ['bottoms', 'women-skirts'],
  ['bottoms', 'women-denim-jeans-shirts'],
];

const MEN_COLLECTIONS: [Category, string][] = [
  ['bags', 'm-accessories-bags'],
  ['shoes', 'men-shoes'],
  ['outerwear', 'men-coats-outerwear'],
  ['outerwear', 'men-jackets-blazers'],
  ['tops', 'men-sweaters-sweatshirts'],
  ['bottoms', 'men-pants-shorts'],
];

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

// ============================================
// USD → KRW Exchange Rate
// ============================================

let cachedRate: { rate: number; fetchedAt: number } | null = null;
const RATE_CACHE_MS = 60 * 60 * 1000; // 1 hour

async function getUsdToKrw(): Promise<number> {
  if (cachedRate && Date.now() - cachedRate.fetchedAt < RATE_CACHE_MS) {
    return cachedRate.rate;
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (res.ok) {
      const data = await res.json();
      const rate = data.rates?.KRW;
      if (rate && typeof rate === 'number') {
        cachedRate = { rate, fetchedAt: Date.now() };
        console.log(`  [The Row] USD/KRW rate: ${rate}`);
        return rate;
      }
    }
  } catch {
    // Fallback below
  }

  // Fallback rate if API fails
  const fallback = 1450;
  console.warn(`  [The Row] Exchange rate API failed, using fallback: ${fallback}`);
  return fallback;
}

// ============================================
// Helpers
// ============================================

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
  exchangeRate: number,
): RawProduct | null {
  const name = product.title;
  if (!name) return null;

  const variant = product.variants?.[0];
  if (!variant?.price) return null;

  const image = product.images?.[0];
  if (!image?.src) return null;

  const actualCategory = PRODUCT_TYPE_MAP[product.product_type];
  if (!actualCategory) return null;

  // For shared collections, filter by expected category
  if (actualCategory !== expectedCategory) return null;

  const usdPrice = parseFloat(variant.price);
  if (!usdPrice || usdPrice <= 0) return null;

  const price = Math.round(usdPrice * exchangeRate);
  const subcategory = mapNameToSubcategory(actualCategory, name);

  return {
    name,
    price,
    currency: 'KRW',
    category: actualCategory,
    subcategory,
    gender,
    image_url: image.src,
    product_url: `${BASE_URL}/ko-kr/products/${product.handle}`,
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

// ============================================
// Batch Crawler
// ============================================

export async function crawlTheRow(options: CrawlOptions = {}): Promise<CrawlResult> {
  const { categories, gender = 'women', dryRun = false } = options;
  const result: CrawlResult = { brand: BRAND, total: 0, upserted: 0, staleRemoved: 0, errors: [], warnings: [], succeededCategories: [] };

  const exchangeRate = await getUsdToKrw();

  let targetCategories = CRAWL_CATEGORIES;
  if (categories?.length) {
    targetCategories = targetCategories.filter(c => categories.includes(c));
  }

  const collections = gender === 'men' ? MEN_COLLECTIONS : WOMEN_COLLECTIONS;

  // Cache fetched collections to avoid duplicate API calls
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
        let shopifyProducts = fetchedCollections.get(handle);
        if (!shopifyProducts) {
          const url = `${BASE_URL}/ko-kr/collections/${handle}/products.json?limit=250`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Shopify API ${res.status}`);
          const data: ShopifyCollectionResponse = await res.json();
          shopifyProducts = data.products ?? [];

          // Paginate if needed
          let page = 2;
          while (shopifyProducts.length >= 250 * (page - 1)) {
            await delay(100, 200);
            const nextUrl = `${BASE_URL}/ko-kr/collections/${handle}/products.json?limit=250&page=${page}`;
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
          const raw = parseProduct(p, category, gender, exchangeRate);
          if (raw) categoryProducts.push(raw);
        }

        await delay(200, 400);
      }

      console.log(`  [${category}] ${categoryProducts.length} products extracted`);
      result.total += categoryProducts.length;

      if (!dryRun && categoryProducts.length > 0) {
        const upserted = await batchUpsert(categoryProducts);
        result.upserted += upserted;
        result.succeededCategories.push({ category, gender });
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
  const segments = url.pathname.split('/').filter(Boolean);
  const productsIdx = segments.indexOf('products');
  if (productsIdx === -1 || !segments[productsIdx + 1]) {
    throw new Error('올바른 The Row 상품 URL을 입력해주세요');
  }
  return segments[productsIdx + 1];
}

function detectGenderFromTags(tags: string[]): Gender {
  const joined = tags.join(' ').toUpperCase();
  if (joined.includes("DIV_MEN'S") && !joined.includes("DIV_WOMEN'S")) return 'men';
  return 'women';
}

function mapCategoryFromProductType(productType: string): Category {
  const category = PRODUCT_TYPE_MAP[productType];
  if (!category) {
    throw new Error(`지원하지 않는 카테고리입니다: ${productType}`);
  }
  return category;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

export async function scrapeTheRowProduct(rawUrl: string): Promise<ScrapedProduct> {
  const handle = extractHandle(rawUrl);
  const exchangeRate = await getUsdToKrw();

  const apiUrl = `${BASE_URL}/ko-kr/products/${handle}.json`;
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

  const category = mapCategoryFromProductType(product.product_type);
  const usdPrice = parseFloat(variant.price);
  const price = Math.round(usdPrice * exchangeRate);
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
    product_url: `${BASE_URL}/ko-kr/products/${handle}`,
    description,
  };
}
