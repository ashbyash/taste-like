import type {
  RecommendationResult,
  RecommendedItem,
  ScrapedProduct,
} from '@/types/product';
import type { Category, Subcategory } from '@/types/brand';
import { scrapeYslProduct } from '@/lib/scrapers/ysl';
import { scrapeLemaireProduct } from '@/lib/scrapers/lemaire';
import { scrapeMiumiuProduct } from '@/lib/scrapers/miumiu';
import { scrapeTheRowProduct } from '@/lib/scrapers/therow';
import { getEmbedding } from '@/lib/embedding/client';
import {
  getCachedRecommendation,
  setCachedRecommendation,
  getSupportedBrand,
  getProductByUrl,
  getProductsByIds,
  getProductWithEmbedding,
  searchSimilarProducts,
} from '@/lib/supabase/queries';

// ============================================
// Error Types
// ============================================

export type PipelineErrorCode =
  | 'INVALID_INPUT'
  | 'UNSUPPORTED_BRAND'
  | 'SCRAPE_FAILED'
  | 'EMBED_FAILED'
  | 'SEARCH_FAILED';

export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly code: PipelineErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'PipelineError';
  }
}

// ============================================
// Constants
// ============================================

const MAX_RESULTS = 10;
const MAX_PER_BRAND = 3;
const VECTOR_SEARCH_LIMIT = 20;
const EXCLUDED_CATEGORIES = ['accessories'];
const SUBCATEGORY_MIN_RESULTS = 3;

// ============================================
// Main Pipeline
// ============================================

export async function getRecommendations(
  url: string,
): Promise<RecommendationResult> {
  const t0 = Date.now();

  // Step 1: Cache check
  const cached = await getCachedRecommendation(url);
  if (cached) {
    console.log(`[pipeline] Cache hit, total: ${Date.now() - t0}ms`);
    return restoreFromCache(cached);
  }

  // Step 2: URL validation
  const domain = extractDomain(url);
  const brand = await getSupportedBrand(domain);
  if (!brand) {
    throw new PipelineError(
      '아직 지원하지 않는 브랜드예요. 현재 Saint Laurent, Miu Miu, Lemaire, The Row URL을 지원합니다.',
      'UNSUPPORTED_BRAND',
      400,
    );
  }

  // Step 3: Route by brand — on-demand scraping vs DB matching (fallback)
  const ON_DEMAND_SCRAPERS: Record<string, (url: string) => Promise<ScrapedProduct>> = {
    'ysl.com': scrapeYslProduct,
    'lemaire.fr': scrapeLemaireProduct,
    'miumiu.com': scrapeMiumiuProduct,
    'therow.com': scrapeTheRowProduct,
  };

  const scraper = ON_DEMAND_SCRAPERS[domain];

  if (!scraper) {
    // DB matching: find crawled product by URL → use stored embedding
    const product = await getProductByUrl(url);
    if (!product) {
      throw new PipelineError(
        '이 상품을 찾을 수 없어요. 단종되었거나 아직 등록되지 않은 상품일 수 있습니다.',
        'SCRAPE_FAILED',
        404,
      );
    }
    return getRecommendationsByProductId(product.id);
  }

  // On-demand scraping flow
  const source = await scraper(url);
  const t3 = Date.now();

  // Step 4: Embed (image-only for speed; DB products use hybrid embeddings)
  let embedding: number[];
  try {
    embedding = await getEmbedding(source.image_url);
  } catch {
    throw new PipelineError(
      '일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.',
      'EMBED_FAILED',
      502,
    );
  }
  console.log(`[pipeline] Scrape+Embed: ${Date.now() - t3}ms`);

  // Step 5: Category check
  if (EXCLUDED_CATEGORIES.includes(source.category)) {
    return { source, recommendations: [] };
  }

  // Step 6: Vector search with subcategory filter + fallback
  const subcategory = effectiveSubcategory(source.subcategory);
  const candidates = await searchWithSubcategoryFallback(
    embedding, source.category, source.gender, subcategory,
  );

  // Step 7: Filter & rank
  const recommendations = filterAndRank(candidates, source);

  // Step 8: Cache save
  const resultIds = recommendations.map((r) => r.id);
  await setCachedRecommendation(source, embedding, resultIds).catch(() => {});
  console.log(`[pipeline] TOTAL: ${Date.now() - t0}ms`);

  return { source, recommendations };
}

// ============================================
// Product ID Pipeline (pre-scraped)
// ============================================

export async function getRecommendationsByProductId(
  productId: string,
): Promise<RecommendationResult> {
  const product = await getProductWithEmbedding(productId);
  if (!product) {
    throw new PipelineError('이 상품을 찾을 수 없어요. 단종되었거나 아직 등록되지 않은 상품일 수 있습니다.', 'INVALID_INPUT', 404);
  }
  if (!product.embedding) {
    throw new PipelineError('이 상품은 아직 검색 준비가 되지 않았어요. 잠시 후 다시 시도해주세요.', 'EMBED_FAILED', 500);
  }

  const source: ScrapedProduct = {
    brand: product.brand,
    name: product.name,
    price: product.price,
    currency: product.currency,
    category: product.category,
    subcategory: product.subcategory,
    gender: product.gender,
    image_url: product.image_url,
    product_url: product.product_url,
  };

  if (EXCLUDED_CATEGORIES.includes(product.category)) {
    return { source, recommendations: [] };
  }

  const subcategory = effectiveSubcategory(product.subcategory);
  const candidates = await searchWithSubcategoryFallback(
    product.embedding, product.category, product.gender, subcategory,
  );

  const recommendations = filterAndRank(candidates, source);

  return { source, recommendations };
}

// ============================================
// Helpers
// ============================================

/** @internal — exported for testing */
export function effectiveSubcategory(
  sub: Subcategory | null | undefined,
): Subcategory | null {
  // 'other' is a catch-all — don't filter by it
  if (!sub || sub === 'other') return null;
  return sub;
}

async function searchWithSubcategoryFallback(
  embedding: number[],
  category: string,
  gender: 'women' | 'men',
  subcategory: Subcategory | null,
) {
  if (subcategory) {
    const results = await searchSimilarProducts(
      embedding, category, VECTOR_SEARCH_LIMIT, gender, subcategory,
    );
    // Fallback: if too few results with subcategory, search without it
    if (results.length >= SUBCATEGORY_MIN_RESULTS) {
      return results;
    }
  }
  return searchSimilarProducts(
    embedding, category, VECTOR_SEARCH_LIMIT, gender,
  );
}

/** @internal — exported for testing */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    throw new PipelineError('올바른 URL을 입력해주세요', 'INVALID_INPUT', 400);
  }
}

/** @internal — exported for testing */
export interface FilterCandidate {
  id: string;
  brand: string;
  name: string;
  price: number;
  category: Category;
  image_url: string;
  product_url: string;
  similarity: number;
}

/** @internal — exported for testing */
export function filterAndRank(
  candidates: FilterCandidate[],
  source: ScrapedProduct,
): RecommendedItem[] {
  const brandCount: Record<string, number> = {};
  const results: RecommendedItem[] = [];

  for (const item of candidates) {
    // Price filter: recommendation must be ≤ 50% of source price
    if (item.price > source.price * 0.5) continue;

    // Brand diversity: max 3 per brand
    const count = brandCount[item.brand] ?? 0;
    if (count >= MAX_PER_BRAND) continue;

    brandCount[item.brand] = count + 1;
    results.push({
      ...item,
      savings_percent: Math.round(
        ((source.price - item.price) / source.price) * 100,
      ),
    });

    if (results.length >= MAX_RESULTS) break;
  }

  return results;
}

async function restoreFromCache(
  cached: NonNullable<Awaited<ReturnType<typeof getCachedRecommendation>>>,
): Promise<RecommendationResult> {
  const source: ScrapedProduct = {
    brand: cached.source_brand,
    name: cached.source_name,
    price: cached.source_price,
    currency: cached.source_currency,
    category: cached.source_category,
    gender: 'women', // cache doesn't store gender; defaults safely since results are pre-filtered
    image_url: cached.source_image,
    product_url: cached.source_url,
  };

  const products = await getProductsByIds(cached.result_ids);

  const recommendations: RecommendedItem[] = products.map((p) => ({
    id: p.id,
    brand: p.brand,
    name: p.name,
    price: p.price,
    category: p.category as ScrapedProduct['category'],
    image_url: p.image_url,
    product_url: p.product_url,
    similarity: 0,
    savings_percent: Math.round(
      ((source.price - p.price) / source.price) * 100,
    ),
  }));

  return { source, recommendations };
}
