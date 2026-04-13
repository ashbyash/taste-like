import { supabaseAdmin } from '@/lib/supabase/server';
import type { Category, Gender } from '@/types/brand';
import type { RawProduct, CrawlOptions, CrawlResult } from './base';

const BASE_URL = 'https://www.massimodutti.com';
const STORE_ID = '35009516';
const CATALOG_ID = '30359499';
const LANGUAGE_ID = '-9';
const APP_ID = '1';

const BRAND = 'Massimo Dutti';
const BRAND_TIER = 'spa' as const;
const BATCH_SIZE = 50;
const MAX_RETRIES = 3;
const REFS_PER_REQUEST = 20;

// Category IDs — use VIEW ALL subcategory where available (2026-03-05)
const WOMEN_CATEGORIES: [Category, number][] = [
  ['outerwear', 2028560],  // jackets VIEW ALL
  ['outerwear', 2225484],  // blazers (no VIEW ALL, parent works)
  ['tops', 1925504],       // sweaters VIEW ALL
  ['tops', 1887041],       // shirts VIEW ALL
  ['tops', 1982001],       // t-shirts VIEW ALL
  ['bottoms', 1887043],    // trousers VIEW ALL
  ['bottoms', 675012],     // jeans VIEW ALL
  ['bottoms', 1835010],    // skirts (no VIEW ALL, parent works)
  ['bags', 1797006],       // bags VIEW ALL
  // shoes excluded: defaultImageType uses different ID scheme, referenceId extraction fails
];

const MEN_CATEGORIES: [Category, number][] = [
  ['outerwear', 680512],   // jackets VIEW ALL
  ['outerwear', 1976067],  // overshirts VIEW ALL
  ['tops', 1736768],       // sweaters VIEW ALL
  ['tops', 680504],        // shirts VIEW ALL
  ['tops', 911158],        // t-shirts VIEW ALL
  ['bottoms', 911182],     // trousers VIEW ALL
  ['bottoms', 911172],     // jeans VIEW ALL
  // shoes excluded: defaultImageType uses different ID scheme, referenceId extraction fails
];

// --- New API response types (2026-03 endpoint change) ---

interface ItxProduct {
  id: number;
  name: string;
  nameEn: string;
  detail?: {
    reference?: string;
    colors?: Array<{
      id: string;
      name: string;
      sizes?: Array<{
        price?: string;
        oldPrice?: string | null;
      }>;
    }>;
    xmedia?: Array<{
      xmediaItems?: Array<{
        medias?: Array<{
          extraInfo?: {
            deliveryUrl?: string;
          };
        }>;
      }>;
    }>;
  };
}

interface CategoryProductResponse {
  gridElements: Array<{
    ccIds: number[];
    commercialComponentIds?: Array<{
      ccId: number;
      defaultImageType?: string;
    }>;
  }>;
}

interface ProductsArrayResponse {
  products: ItxProduct[];
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

function apiUrl(path: string, extraParams = ''): string {
  return `${BASE_URL}/itxrest/3/catalog/store/${STORE_ID}/${CATALOG_ID}/${path}?languageId=${LANGUAGE_ID}&appId=${APP_ID}${extraParams}`;
}

/**
 * Extract referenceId from defaultImageType.
 * Numeric pattern: "6718136800_2_6_" → first 7 digits → 0-pad to 8 → "06718136"
 * Hash pattern (32-char hex): skip (editorial content)
 */
function ditToReferenceId(dit: string | undefined): string | null {
  if (!dit) return null;
  if (dit.length === 32 && /^[0-9a-f]+$/.test(dit)) return null;
  const numPart = dit.split('_')[0];
  if (!numPart || numPart.length < 7) return null;
  return numPart.substring(0, 7).padStart(8, '0');
}

async function fetchCategoryReferenceIds(categoryId: number): Promise<string[]> {
  const url = apiUrl(`category/${categoryId}/product`);
  const res = await fetch(url, { headers: HEADERS });

  if (!res.ok) {
    throw new Error(`Category API error: ${res.status} ${res.statusText}`);
  }

  const data: CategoryProductResponse = await res.json();
  const refs: string[] = [];

  for (const el of data.gridElements) {
    for (const cc of el.commercialComponentIds ?? []) {
      const ref = ditToReferenceId(cc.defaultImageType);
      if (ref && !refs.includes(ref)) refs.push(ref);
    }
  }

  return refs;
}

function extractDeliveryUrl(product: ItxProduct): string | null {
  const allUrls: string[] = [];
  for (const xm of product.detail?.xmedia ?? []) {
    for (const item of xm.xmediaItems ?? []) {
      for (const media of item.medias ?? []) {
        const raw = media.extraInfo?.deliveryUrl;
        if (raw) {
          allUrls.push(raw.startsWith('http') ? raw : `https://static.massimodutti.net/${raw}`);
        }
      }
    }
  }
  // Prefer full-body shots (-a, -e) over cropped detail shots (-o1, -o2, etc.)
  return allUrls.find(u => /-[ae]\d*\.jpg/.test(u))
    ?? allUrls.find(u => /-[tr]\.jpg/.test(u))
    ?? allUrls[0] ?? null;
}

function buildProductUrl(reference: string | undefined, productId: number): string {
  const ref = reference?.split('-')[0] ?? String(productId);
  return `${BASE_URL}/kr/-l${ref}`;
}

async function fetchProductDetails(
  refs: string[],
  category: Category,
  gender: Gender,
): Promise<RawProduct[]> {
  const products: RawProduct[] = [];

  for (let i = 0; i < refs.length; i += REFS_PER_REQUEST) {
    const chunk = refs.slice(i, i + REFS_PER_REQUEST);
    const url = apiUrl('productsArray', `&referenceIds=${chunk.join(',')}`);

    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.warn(`  [Massimo Dutti] productsArray error: ${res.status} for chunk ${i}`);
      continue;
    }

    const data: ProductsArrayResponse = await res.json();

    for (const p of data.products) {
      if (!p.detail?.colors?.length) continue;

      const color = p.detail.colors[0];
      const priceStr = color.sizes?.[0]?.price;
      const price = priceStr ? parseInt(priceStr, 10) : 0;
      if (!price) continue;

      const imageUrl = extractDeliveryUrl(p);
      if (!imageUrl) continue;

      const name = p.name || p.nameEn;
      if (!name) continue;

      products.push({
        name,
        price,
        currency: 'KRW',
        category,
        gender,
        image_url: imageUrl,
        product_url: buildProductUrl(p.detail.reference, p.id),
      });
    }

    if (i + REFS_PER_REQUEST < refs.length) {
      await delay(200, 400);
    }
  }

  return products;
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

const CRAWL_CATEGORIES: Category[] = ['bags', 'shoes', 'outerwear', 'tops', 'bottoms'];

export async function crawlMassimoDutti(options: CrawlOptions = {}): Promise<CrawlResult> {
  const { categories, dryRun = false, gender: targetGender } = options;
  const result: CrawlResult = { brand: BRAND, total: 0, upserted: 0, staleRemoved: 0, errors: [], warnings: [], succeededCategories: [] };

  const genders: Gender[] = targetGender ? [targetGender] : ['women', 'men'];

  let targetCategories = CRAWL_CATEGORIES;
  if (categories?.length) {
    targetCategories = targetCategories.filter(c => categories.includes(c));
  }

  for (const gender of genders) {
    const catMap = gender === 'men' ? MEN_CATEGORIES : WOMEN_CATEGORIES;

    for (const category of targetCategories) {
      const catEntries = catMap.filter(([c]) => c === category);
      if (catEntries.length === 0) {
        console.log(`  [${gender}/${category}] No category IDs, skipping`);
        continue;
      }

      try {
        let allProducts: RawProduct[] = [];

        for (const [, catId] of catEntries) {
          console.log(`  [${gender}/${category}] Fetching category ${catId}...`);
          const refs = await fetchCategoryReferenceIds(catId);
          console.log(`  [${gender}/${category}] ${refs.length} reference IDs`);

          const products = await fetchProductDetails(refs, category, gender);
          console.log(`  [${gender}/${category}] ${products.length} products extracted`);
          allProducts.push(...products);

          await delay(300, 600);
        }

        // Deduplicate across sub-categories
        allProducts = [...new Map(allProducts.map(p => [p.product_url, p])).values()];
        result.total += allProducts.length;

        if (!dryRun && allProducts.length > 0) {
          const upserted = await batchUpsert(allProducts);
          result.upserted += upserted;
          console.log(`  [${gender}/${category}] ${upserted} upserted to DB`);
        } else if (dryRun && allProducts.length > 0) {
          console.log(`  [${gender}/${category}] dry-run, ${allProducts.length} products`);
          allProducts.slice(0, 3).forEach(p =>
            console.log(`    ${p.name} | ₩${p.price.toLocaleString()} | ${p.image_url.substring(0, 80)}...`)
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  [${gender}/${category}] ERROR: ${message}`);
        result.errors.push({ category, message });
      }

      await delay(500, 1000);
    }
  }

  return result;
}
