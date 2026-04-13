import { supabaseAnon, supabaseAdmin } from './server';
import type { Category, Gender, Subcategory } from '@/types/brand';
import type { Product, ScrapedProduct } from '@/types/product';

// ============================================
// Vector Search
// ============================================

interface SimilarProduct {
  id: string;
  brand: string;
  name: string;
  price: number;
  category: Category;
  image_url: string;
  product_url: string;
  similarity: number;
}

export async function searchSimilarProducts(
  embedding: number[],
  category: string,
  limit = 10,
  gender: Gender = 'women',
  subcategory?: Subcategory | null,
): Promise<SimilarProduct[]> {
  // Fetch extra to compensate for deduplication
  const { data, error } = await supabaseAnon.rpc('match_products', {
    query_embedding: embedding,
    query_category: category,
    match_threshold: 0.3,
    match_count: limit * 3,
    query_gender: gender,
    query_subcategory: subcategory ?? null,
  });

  if (error) throw new Error(`Vector search failed: ${error.message}`);

  // Deduplicate: keep highest-similarity per brand+name (color/category variants)
  const seen = new Map<string, SimilarProduct>();
  for (const item of (data ?? []) as SimilarProduct[]) {
    const key = `${item.brand}::${item.name}`;
    if (!seen.has(key) || item.similarity > seen.get(key)!.similarity) {
      seen.set(key, item);
    }
  }

  return [...seen.values()].slice(0, limit);
}

// ============================================
// Recommendation Cache
// ============================================

interface CachedRecommendation {
  source_url: string;
  source_brand: string;
  source_name: string;
  source_price: number;
  source_currency: string;
  source_image: string;
  source_category: Category;
  source_embedding: number[];
  result_ids: string[];
}

export async function getCachedRecommendation(
  url: string,
): Promise<CachedRecommendation | null> {
  const { data, error } = await supabaseAnon
    .from('recommendation_cache')
    .select('*')
    .eq('source_url', url)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) return null;
  return data as CachedRecommendation;
}

export async function setCachedRecommendation(
  source: ScrapedProduct,
  embedding: number[],
  resultIds: string[],
): Promise<void> {
  const row = {
    source_url: source.product_url,
    source_brand: source.brand,
    source_name: source.name,
    source_price: source.price,
    source_currency: source.currency,
    source_image: source.image_url,
    source_category: source.category,
    source_embedding: embedding,
    result_ids: resultIds,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const { error } = await supabaseAdmin
    .from('recommendation_cache')
    .upsert(row, { onConflict: 'source_url' });

  if (error) throw new Error(`Cache write failed: ${error.message}`);
}

// ============================================
// Brand Validation
// ============================================

export async function getSupportedBrand(domain: string) {
  const { data, error } = await supabaseAnon
    .from('supported_brands')
    .select('*')
    .eq('domain', domain)
    .eq('is_active', true)
    .in('role', ['source', 'both'])
    .single();

  if (error || !data) return null;
  return data;
}

// ============================================
// Product Lookup (for cache hits)
// ============================================

// ============================================
// Source Products (for browsing)
// ============================================

export async function getSourceProducts(options: {
  brand?: string;
  category?: Category;
  gender?: Gender;
  page?: number;
  pageSize?: number;
}): Promise<{ products: Product[]; total: number }> {
  const { brand, category, gender = 'women', page = 1, pageSize = 24 } = options;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Lemaire bags are unisex (men's bag collection is empty on site)
  const skipGenderFilter = brand === 'Lemaire' && category === 'bags';

  let query = supabaseAnon
    .from('products')
    .select('id, brand, brand_tier, name, price, currency, category, gender, image_url, product_url, is_available, crawled_at, created_at, updated_at', { count: 'exact' })
    .eq('brand_tier', 'luxury')
    .eq('is_available', true)
    .order('crawled_at', { ascending: false })
    .range(from, to);

  if (!skipGenderFilter) {
    query = query.eq('gender', gender);
  }
  if (brand) {
    query = query.eq('brand', brand);
  }
  if (category) {
    query = query.eq('category', category);
  }

  const { data, count, error } = await query;
  if (error) throw new Error(`Source products query failed: ${error.message}`);
  return { products: (data ?? []) as Product[], total: count ?? 0 };
}

export async function getProductByUrl(url: string): Promise<Product | null> {
  // Strip query params, fragment, trailing slash
  const cleanUrl = url.split('?')[0].split('#')[0].replace(/\/$/, '');

  // Exact match
  const { data } = await supabaseAnon
    .from('products')
    .select('*')
    .eq('product_url', cleanUrl)
    .single();

  if (data) return data as Product;

  // Fallback: match by last path segment (handles locale differences)
  const segments = new URL(cleanUrl).pathname.split('/').filter(Boolean);
  const slug = segments[segments.length - 1];
  if (!slug) return null;

  const { data: fuzzy } = await supabaseAnon
    .from('products')
    .select('*')
    .ilike('product_url', `%/${slug}`)
    .eq('is_available', true)
    .limit(1)
    .single();

  return (fuzzy as Product) ?? null;
}

export async function getProductWithEmbedding(id: string): Promise<Product | null> {
  const { data, error } = await supabaseAnon
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as Product;
}

// ============================================
// Product Lookup (for cache hits)
// ============================================

export async function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return [];

  const { data, error } = await supabaseAnon
    .from('products')
    .select('id, brand, name, price, category, image_url, product_url')
    .in('id', ids)
    .eq('is_available', true);

  if (error) throw new Error(`Product lookup failed: ${error.message}`);
  return data ?? [];
}
