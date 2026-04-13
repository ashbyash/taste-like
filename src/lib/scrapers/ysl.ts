import type { ScrapedProduct } from '@/types/product';
import type { Category, Gender } from '@/types/brand';
import { mapYslSubcategory } from '@/lib/subcategory/mappings';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { CrawlOptions, CrawlResult } from './base';

// ============================================
// Error Types
// ============================================

export type YslErrorCode =
  | 'INVALID_URL'
  | 'NOT_PRODUCT_PAGE'
  | 'FETCH_FAILED'
  | 'PARSE_FAILED'
  | 'MISSING_DATA'
  | 'UNKNOWN_CATEGORY';

export class YslScraperError extends Error {
  constructor(
    message: string,
    public readonly code: YslErrorCode,
  ) {
    super(message);
    this.name = 'YslScraperError';
  }
}

// ============================================
// Constants
// ============================================

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const FETCH_TIMEOUT_MS = 8_000;

// ============================================
// __NEXT_DATA__ Types
// ============================================

interface YslNextData {
  props: {
    pageProps: {
      product?: {
        name?: string;
        id?: string;
        categories?: {
          macroCategory?: string;
          microCategory?: string;
        };
        images?: Array<{
          src?: string;
          alt?: string;
          width?: number;
          height?: number;
          srcset?: string;
        }>;
        description?: string;
        compositions?: string;
      };
      price?: {
        salePriceValue?: number;
        salePrice?: string;
        currencyCode?: string;
      };
    };
  };
}

// ============================================
// Category Mapping
// ============================================

const KEYWORD_TO_CATEGORY: Record<string, Category> = {
  // bags
  handbags: 'bags',
  shoulder_bags: 'bags',
  tote_bags: 'bags',
  crossbody_bags: 'bags',
  clutch: 'bags',
  mini_bags: 'bags',
  backpacks: 'bags',
  luggage: 'bags',
  business: 'bags',
  id_bags: 'bags',
  totes: 'bags',
  sac_de_jour: 'bags',
  messenger_and_crossbody: 'bags',
  backpack: 'bags',

  // shoes
  shoes: 'shoes',
  boots: 'shoes',
  sneakers: 'shoes',
  sandals: 'shoes',
  loafers: 'shoes',
  pumps: 'shoes',
  mules: 'shoes',
  flats: 'shoes',
  derbies: 'shoes',

  // outerwear
  coats: 'outerwear',
  coat: 'outerwear',
  jackets: 'outerwear',
  blazers: 'outerwear',
  parkas: 'outerwear',
  leather_jackets: 'outerwear',
  outerwear: 'outerwear',

  // tops
  shirts: 'tops',
  knitwear: 'tops',
  tshirts: 'tops',
  tops: 'tops',
  blouses: 'tops',
  sweaters: 'tops',
  sweatshirts: 'tops',
  jersey: 'tops',

  // bottoms
  pants: 'bottoms',
  jeans: 'bottoms',
  skirts: 'bottoms',
  shorts: 'bottoms',
  trousers: 'bottoms',
  denim: 'bottoms',

  // accessories
  belts: 'accessories',
  scarves: 'accessories',
  jewelry: 'accessories',
  hats: 'accessories',
  sunglasses: 'accessories',
  wallets: 'accessories',
  keyrings: 'accessories',
  ties: 'accessories',
  gloves: 'accessories',
  leathergoods: 'accessories',
};

/** @internal — exported for testing */
export function mapCategory(
  macroCategory: string | undefined,
  microCategory: string | undefined,
): Category {
  // Try macroCategory first, then microCategory as fallback
  for (const raw of [macroCategory, microCategory]) {
    if (!raw) continue;
    const segments = raw.split('_');
    for (let i = segments.length - 1; i >= 0; i--) {
      const key = segments.slice(i).join('_');
      if (KEYWORD_TO_CATEGORY[key]) return KEYWORD_TO_CATEGORY[key];
    }
  }

  throw new YslScraperError(
    `알 수 없는 카테고리: ${macroCategory ?? 'unknown'}`,
    'UNKNOWN_CATEGORY',
  );
}

// ============================================
// Gender Detection
// ============================================

/** @internal — exported for testing */
export function detectGender(macroCategory: string | undefined): Gender {
  if (macroCategory?.includes('_men_')) return 'men';
  if (macroCategory?.startsWith('ysl_macro_men')) return 'men';
  return 'women';
}

// ============================================
// URL Validation & Normalization
// ============================================

function validateAndNormalizeUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new YslScraperError('올바른 URL을 입력해주세요', 'INVALID_URL');
  }

  const hostname = url.hostname.replace(/^www\./, '');
  if (hostname !== 'ysl.com') {
    throw new YslScraperError(
      '현재 지원하는 브랜드: Saint Laurent (ysl.com)',
      'INVALID_URL',
    );
  }

  // Force /ko-kr/ locale for KRW prices
  let pathname = url.pathname;
  const localeMatch = pathname.match(/^\/([a-z]{2}-[a-z]{2})\//);
  if (localeMatch && localeMatch[1] !== 'ko-kr') {
    pathname = pathname.replace(/^\/[a-z]{2}-[a-z]{2}\//, '/ko-kr/');
  } else if (!localeMatch) {
    pathname = '/ko-kr' + pathname;
  }

  // Product pages end with .html
  if (!pathname.endsWith('.html')) {
    throw new YslScraperError(
      '상품 페이지 URL을 입력해주세요',
      'NOT_PRODUCT_PAGE',
    );
  }

  return `https://www.ysl.com${pathname}`;
}

// ============================================
// HTTP Fetch
// ============================================

const FETCH_HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
};

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      headers: FETCH_HEADERS,
      signal: controller.signal,
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchProductPage(url: string): Promise<string> {
  try {
    const response = await fetchWithTimeout(url);

    // YSL canonical format: /ko-kr/pr/{filename}.html
    // Old URLs may have category paths (e.g., /ko-kr/mini-bags/...) — normalize and retry
    if (response.status === 404 && !url.includes('/pr/')) {
      const filename = url.split('/').pop();
      if (filename) {
        const prUrl = `https://www.ysl.com/ko-kr/pr/${filename}`;
        const retryResponse = await fetchWithTimeout(prUrl);
        if (retryResponse.ok) return await retryResponse.text();
      }
    }

    if (!response.ok) {
      throw new YslScraperError(
        `상품 정보를 가져올 수 없습니다 (HTTP ${response.status})`,
        'FETCH_FAILED',
      );
    }

    return await response.text();
  } catch (err) {
    if (err instanceof YslScraperError) throw err;
    throw new YslScraperError(
      '상품 정보를 가져올 수 없습니다. 잠시 후 다시 시도해주세요',
      'FETCH_FAILED',
    );
  }
}

// ============================================
// __NEXT_DATA__ Parsing
// ============================================

function parseNextData(html: string): YslNextData {
  const match = html.match(
    /<script\s+id="__NEXT_DATA__"\s+type="application\/json"[^>]*>([\s\S]*?)<\/script>/,
  );

  if (!match?.[1]) {
    throw new YslScraperError(
      '상품 정보를 가져올 수 없습니다 (페이지 구조 변경)',
      'PARSE_FAILED',
    );
  }

  try {
    return JSON.parse(match[1]) as YslNextData;
  } catch {
    throw new YslScraperError(
      '상품 정보를 가져올 수 없습니다 (데이터 파싱 실패)',
      'PARSE_FAILED',
    );
  }
}

// ============================================
// Image Selection
// ============================================

type YslProduct = NonNullable<YslNextData['props']['pageProps']['product']>;

function selectBestImage(
  images?: YslProduct['images'],
): string {
  if (!images?.length) {
    throw new YslScraperError(
      '상품 이미지를 찾을 수 없습니다',
      'MISSING_DATA',
    );
  }

  // First image = hero shot (already absolute URL, high-res 2608x3260)
  const src = images[0].src;
  if (!src) {
    throw new YslScraperError(
      '상품 이미지를 찾을 수 없습니다',
      'MISSING_DATA',
    );
  }

  return src;
}

// ============================================
// Main Scraper Function
// ============================================

export async function scrapeYslProduct(rawUrl: string): Promise<ScrapedProduct> {
  const url = validateAndNormalizeUrl(rawUrl);
  const html = await fetchProductPage(url);
  const nextData = parseNextData(html);

  const { product, price } = nextData.props.pageProps;

  if (!product?.name) {
    throw new YslScraperError('상품명을 찾을 수 없습니다', 'MISSING_DATA');
  }

  if (!price?.salePriceValue) {
    throw new YslScraperError('가격 정보를 찾을 수 없습니다', 'MISSING_DATA');
  }

  const category = mapCategory(
    product.categories?.macroCategory,
    product.categories?.microCategory,
  );
  const gender = detectGender(product.categories?.macroCategory);
  const imageUrl = selectBestImage(product.images);

  const microCategory = product.categories?.microCategory;
  const subcategory = microCategory
    ? mapYslSubcategory(category, microCategory)
    : null;

  const description = [product.description, product.compositions]
    .filter(Boolean)
    .join('\n') || undefined;

  return {
    brand: 'Saint Laurent',
    name: product.name,
    price: price.salePriceValue,
    currency: price.currencyCode ?? 'KRW',
    category,
    subcategory,
    gender,
    image_url: imageUrl,
    product_url: url,
    description,
  };
}

// ============================================
// Batch Crawler (for weekly workflow)
// ============================================

const BRAND = 'Saint Laurent';
const BRAND_TIER = 'luxury' as const;
const SITEMAP_URL = 'https://www.ysl.com/ko-kr/sitemaps/0/sitemap-products.xml';
const DELAY_MIN_MS = 800;
const DELAY_MAX_MS = 1500;
const BATCH_SIZE = 50;

const MEN_CATEGORY_PAGES = [
  'https://www.ysl.com/ko-kr/ca/남성/레디-투-웨어/레디-투-웨어-모두-보기',
  'https://www.ysl.com/ko-kr/ca/남성/슈즈/슈즈-모두-보기',
  'https://www.ysl.com/ko-kr/ca/남성/백/백-모두-보기',
];

function delay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs) + minMs);
  return new Promise(r => setTimeout(r, ms));
}

async function fetchSitemapUrls(): Promise<string[]> {
  console.log('  Fetching sitemap...');
  const res = await fetch(SITEMAP_URL, {
    headers: { 'User-Agent': USER_AGENT },
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

async function collectMenUrls(): Promise<string[]> {
  console.log('  Collecting men\'s product URLs...');
  const allUrls: string[] = [];

  for (const catUrl of MEN_CATEGORY_PAGES) {
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
      const nextDataMatch = html.match(
        /<script\s+id="__NEXT_DATA__"\s+type="application\/json"[^>]*>([\s\S]*?)<\/script>/,
      );
      if (!nextDataMatch?.[1]) break;

      const data = JSON.parse(nextDataMatch[1]);
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
      if (pageNum > 50) break;
    }

    const label = catUrl.split('/ca/')[1];
    console.log(`  [${label}] ${catCount} URLs`);
  }

  const unique = [...new Set(allUrls)];
  console.log(`  Total unique men's URLs: ${unique.length}`);
  return unique;
}

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

async function batchUpsertRows(rows: ProductRow[]): Promise<number> {
  let upserted = 0;
  const deduped = [...new Map(rows.map(r => [r.product_url, r])).values()];

  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabaseAdmin
      .from('products')
      .upsert(batch, { onConflict: 'product_url' })
      .select('id');

    if (error) throw new Error(`Upsert failed: ${error.message}`);
    upserted += data?.length ?? 0;
  }

  return upserted;
}

async function scrapeUrls(
  urls: string[],
  opts: { dryRun: boolean; categories?: Category[]; gender?: Gender },
): Promise<{ rows: ProductRow[]; scraped: number; errors: { category: string; message: string }[] }> {
  const now = new Date().toISOString();
  const rows: ProductRow[] = [];
  let scraped = 0;
  const errors: { category: string; message: string }[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const product = await scrapeYslProduct(url);

      if (opts.categories?.length && !opts.categories.includes(product.category)) continue;
      if (opts.gender && product.gender !== opts.gender) continue;

      if (opts.dryRun) {
        if (scraped < 5) {
          console.log(`    ${product.gender} | ${product.category} | ${product.name} | ${product.price.toLocaleString()}KRW`);
        }
      } else {
        rows.push({
          brand: BRAND,
          brand_tier: BRAND_TIER,
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
      }
      scraped++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (errors.length < 10) {
        errors.push({ category: 'scrape', message: `${url}: ${message}` });
      }
    }

    if (i < urls.length - 1) await delay(DELAY_MIN_MS, DELAY_MAX_MS);

    if ((i + 1) % 50 === 0) {
      console.log(`    Progress: ${i + 1}/${urls.length}`);
    }
  }

  return { rows, scraped, errors };
}

export async function crawlYsl(options: CrawlOptions = {}): Promise<CrawlResult> {
  const { categories, gender, dryRun = false } = options;
  const result: CrawlResult = { brand: BRAND, total: 0, upserted: 0, staleRemoved: 0, errors: [], warnings: [], succeededCategories: [] };

  const genders: Gender[] = gender ? [gender] : ['women', 'men'];

  for (const g of genders) {
    console.log(`  [${g}] Collecting URLs...`);
    const urls = g === 'women' ? await fetchSitemapUrls() : await collectMenUrls();

    console.log(`  [${g}] Scraping ${urls.length} products...`);
    const { rows, scraped, errors } = await scrapeUrls(urls, {
      dryRun,
      categories,
      gender: g,
    });

    result.total += scraped;
    result.errors.push(...errors);

    if (!dryRun && rows.length > 0) {
      const upserted = await batchUpsertRows(rows);
      result.upserted += upserted;
      console.log(`  [${g}] ${upserted} upserted to DB`);
    }
  }

  return result;
}
