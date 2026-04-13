import { supabaseAdmin } from '@/lib/supabase/server';
import type { Category, Gender } from '@/types/brand';
import type { ScrapedProduct } from '@/types/product';
import type { RawProduct, CrawlOptions, CrawlResult } from './base';
import { mapMiumiuSubcategory } from '@/lib/subcategory/mappings';

function getAlgoliaConfig() {
  const appId = process.env.MIUMIU_ALGOLIA_APP_ID!;
  const apiKey = process.env.MIUMIU_ALGOLIA_API_KEY!;
  const index = process.env.MIUMIU_ALGOLIA_INDEX ?? 'PLP_COLOR_MIUMIU_Online_KR';
  const url = `https://${appId.toLowerCase()}-dsn.algolia.net/1/indexes/${index}/query`;
  return { appId, apiKey, index, url };
}

const HITS_PER_PAGE = 100;
const BATCH_SIZE = 50;
const MAX_RETRIES = 3;

const BRAND = 'Miu Miu';
const BRAND_TIER = 'luxury' as const;

// Algolia filters for each taste-like category
const CATEGORY_FILTERS: Record<Category, string> = {
  bags: 'Breadcrumbs.level_1.ko_KR:"가방"',
  shoes: 'Breadcrumbs.level_1.ko_KR:"슈즈"',
  outerwear: 'Breadcrumbs.level_2.ko_KR:"재킷 및 코트"',
  tops: 'Breadcrumbs.level_2.ko_KR:"니트웨어" OR Breadcrumbs.level_2.ko_KR:"셔츠 및 탑" OR Breadcrumbs.level_2.ko_KR:"티셔츠 & 스웨트"',
  bottoms: 'Breadcrumbs.level_2.ko_KR:"팬츠 및 반바지" OR Breadcrumbs.level_2.ko_KR:"스커트"',
  accessories: 'Breadcrumbs.level_1.ko_KR:"액세서리"',
};

interface AlgoliaHit {
  ProductName: { ko_KR: string; en_GB: string };
  Price: {
    Value: number;
    Currency: string;
    DiscountedPrice: number;
  };
  UrlReconstructed: { ko_KR: string };
  Images: {
    PLPBKG: string;
    HoverBKG?: string;
  };
  Breadcrumbs: {
    level_1: { ko_KR: string };
    level_2: { ko_KR: string; en_GB?: string };
  };
  Gender: { ko_KR: string[] };
  Shoppability: { ko_KR: string };
  StockVariant?: { Total: number };
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
  nbHits: number;
  nbPages: number;
  page: number;
  hitsPerPage: number;
}

async function queryAlgolia(filters: string, page: number): Promise<AlgoliaResponse> {
  const { appId, apiKey, url } = getAlgoliaConfig();
  const params = new URLSearchParams({
    query: '',
    hitsPerPage: String(HITS_PER_PAGE),
    page: String(page),
    filters,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-algolia-api-key': apiKey,
      'x-algolia-application-id': appId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ params: params.toString() }),
  });

  if (!res.ok) {
    throw new Error(`Algolia API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

function hitToProduct(hit: AlgoliaHit, category: Category): RawProduct | null {
  const name = hit.ProductName?.ko_KR || hit.ProductName?.en_GB;
  if (!name) return null;

  const price = hit.Price?.DiscountedPrice || hit.Price?.Value;
  if (!price) return null;

  const imageUrl = hit.Images?.PLPBKG;
  if (!imageUrl) return null;

  const urlPath = hit.UrlReconstructed?.ko_KR;
  if (!urlPath) return null;

  const productUrl = urlPath.startsWith('http')
    ? urlPath
    : `https://www.miumiu.com/ko-kr${urlPath}`;

  const level2 = hit.Breadcrumbs?.level_2?.en_GB;
  const subcategory = level2 ? mapMiumiuSubcategory(category, level2) : null;

  return {
    name,
    price,
    currency: hit.Price?.Currency || 'KRW',
    category,
    subcategory,
    gender: 'women' as Gender, // Miu Miu is women-only
    image_url: imageUrl,
    product_url: productUrl,
  };
}

async function fetchCategoryProducts(category: Category): Promise<RawProduct[]> {
  const filter = CATEGORY_FILTERS[category];
  const products: RawProduct[] = [];

  // First page to get total
  const first = await queryAlgolia(filter, 0);
  console.log(`    Algolia: ${first.nbHits} hits, ${first.nbPages} pages`);

  for (const hit of first.hits) {
    const p = hitToProduct(hit, category);
    if (p) products.push(p);
  }

  // Remaining pages
  for (let page = 1; page < first.nbPages; page++) {
    await delay(200, 400); // Be nice to Algolia
    const res = await queryAlgolia(filter, page);
    for (const hit of res.hits) {
      const p = hitToProduct(hit, category);
      if (p) products.push(p);
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

// Categories to crawl (accessories excluded per project convention)
const CRAWL_CATEGORIES: Category[] = ['bags', 'shoes', 'outerwear', 'tops', 'bottoms'];

export async function crawlMiumiu(options: CrawlOptions = {}): Promise<CrawlResult> {
  const { categories, dryRun = false } = options;
  // Miu Miu is women-only, ignore gender option
  const result: CrawlResult = { brand: BRAND, total: 0, upserted: 0, staleRemoved: 0, errors: [], warnings: [], succeededCategories: [] };

  let targetCategories = CRAWL_CATEGORIES;
  if (categories?.length) {
    targetCategories = targetCategories.filter(c => categories.includes(c));
  }

  for (const category of targetCategories) {
    try {
      console.log(`  [${category}] Fetching from Algolia...`);
      const products = await fetchCategoryProducts(category);
      console.log(`  [${category}] ${products.length} products extracted`);
      result.total += products.length;

      if (!dryRun && products.length > 0) {
        const upserted = await batchUpsert(products);
        result.upserted += upserted;
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

    await delay(500, 1000);
  }

  return result;
}

// ============================================
// On-demand Scraper (single product URL)
// ============================================

const FETCH_TIMEOUT_MS = 8_000;

// Breadcrumbs.level_1 (Korean) → taste-like category
const L1_CATEGORY_MAP: Record<string, Category> = {
  '가방': 'bags',
  '슈즈': 'shoes',
  '의류': 'outerwear', // fallback, refined by level_2
};

// Breadcrumbs.level_2 (Korean) → taste-like category (more specific)
const L2_CATEGORY_MAP: Record<string, Category> = {
  '재킷 및 코트': 'outerwear',
  '니트웨어': 'tops',
  '셔츠 및 탑': 'tops',
  '티셔츠 & 스웨트': 'tops',
  '팬츠 및 반바지': 'bottoms',
  '스커트': 'bottoms',
};

function extractObjectId(rawUrl: string): string {
  const url = new URL(rawUrl);
  // URL: /ko-kr/p/{name-slug}/{objectID}.html or /ko-kr/p/{name-slug}/{objectID}
  const segments = url.pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1]?.replace(/\.html$/, '');
  if (!last) {
    throw new Error('올바른 Miu Miu 상품 URL을 입력해주세요');
  }
  return last;
}

function mapCategoryFromBreadcrumbs(
  l1: string | undefined,
  l2: string | undefined,
): Category {
  // Try level_2 first (more specific)
  if (l2 && L2_CATEGORY_MAP[l2]) return L2_CATEGORY_MAP[l2];
  // Fallback to level_1
  if (l1 && L1_CATEGORY_MAP[l1]) return L1_CATEGORY_MAP[l1];
  throw new Error(`지원하지 않는 카테고리입니다: ${l1 ?? 'unknown'}`);
}

export async function scrapeMiumiuProduct(rawUrl: string): Promise<ScrapedProduct> {
  const { appId, apiKey, index } = getAlgoliaConfig();
  const objectId = extractObjectId(rawUrl);

  const apiUrl = `https://${appId.toLowerCase()}-dsn.algolia.net/1/indexes/${index}/${encodeURIComponent(objectId)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(apiUrl, {
      headers: {
        'x-algolia-api-key': apiKey,
        'x-algolia-application-id': appId,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    throw new Error(`상품 정보를 가져올 수 없습니다 (HTTP ${res.status})`);
  }

  const hit: AlgoliaHit = await res.json();

  const name = hit.ProductName?.ko_KR || hit.ProductName?.en_GB;
  if (!name) {
    throw new Error('상품명을 찾을 수 없습니다');
  }

  const price = hit.Price?.DiscountedPrice || hit.Price?.Value;
  if (!price) {
    throw new Error('가격 정보를 찾을 수 없습니다');
  }

  const imageUrl = hit.Images?.PLPBKG;
  if (!imageUrl) {
    throw new Error('상품 이미지를 찾을 수 없습니다');
  }

  const l1 = hit.Breadcrumbs?.level_1?.ko_KR;
  const l2 = hit.Breadcrumbs?.level_2?.ko_KR;
  const category = mapCategoryFromBreadcrumbs(l1, l2);

  const level2En = hit.Breadcrumbs?.level_2?.en_GB;
  const subcategory = level2En ? mapMiumiuSubcategory(category, level2En) : null;

  const urlPath = hit.UrlReconstructed?.ko_KR;
  const productUrl = urlPath
    ? (urlPath.startsWith('http') ? urlPath : `https://www.miumiu.com/ko-kr${urlPath}`)
    : rawUrl;

  return {
    brand: BRAND,
    name,
    price,
    currency: hit.Price?.Currency || 'KRW',
    category,
    subcategory,
    gender: 'women' as Gender, // Miu Miu is women-only
    image_url: imageUrl,
    product_url: productUrl,
  };
}
