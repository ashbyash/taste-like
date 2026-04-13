import { supabaseAnon } from './server';
import type { Category, Gender } from '@/types/brand';

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

interface SpaProductWithEmbedding {
  id: string;
  brand: string;
  name: string;
  price: number;
  category: Category;
  gender: Gender;
  image_url: string;
  product_url: string;
  embedding: number[];
}

export async function getSpaProductsWithEmbeddings(options: {
  brand: string;
  category?: Category;
  gender?: Gender;
  limit?: number;
}): Promise<SpaProductWithEmbedding[]> {
  const { brand, category, gender = 'women', limit = 20 } = options;

  let query = supabaseAnon
    .from('products')
    .select('id, brand, name, price, category, gender, image_url, product_url, embedding')
    .eq('brand', brand)
    .eq('is_available', true)
    .eq('gender', gender)
    .not('embedding', 'is', null)
    .order('crawled_at', { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw new Error(`SPA products query failed: ${error.message}`);
  return (data ?? []) as SpaProductWithEmbedding[];
}

export async function searchReverseSimilar(
  embedding: number[],
  category: string,
  gender: Gender = 'women',
  limit = 1,
): Promise<SimilarProduct[]> {
  const { data, error } = await supabaseAnon.rpc('match_products_reverse', {
    query_embedding: embedding,
    query_category: category,
    match_threshold: 0.3,
    match_count: limit,
    include_tier: 'luxury',
    query_gender: gender,
  });

  if (error) throw new Error(`Reverse search failed: ${error.message}`);
  return (data ?? []) as SimilarProduct[];
}

export interface StylePair {
  spa: {
    id: string;
    brand: string;
    name: string;
    price: number;
    image_url: string;
    product_url: string;
  };
  luxury: {
    id: string;
    brand: string;
    name: string;
    price: number;
    image_url: string;
    product_url: string;
    similarity: number;
  };
}

export async function getStylePairs(options: {
  spaBrand: string;
  luxuryBrand?: string;
  category?: Category;
  gender?: Gender;
  limit?: number;
}): Promise<StylePair[]> {
  const { spaBrand, category, gender = 'women', limit = 20 } = options;

  const spaProducts = await getSpaProductsWithEmbeddings({
    brand: spaBrand,
    category,
    gender,
    limit,
  });

  const pairs: StylePair[] = [];

  await Promise.all(
    spaProducts.map(async (spa) => {
      const matches = await searchReverseSimilar(
        spa.embedding,
        spa.category,
        spa.gender,
        1,
      );

      if (matches.length > 0) {
        pairs.push({
          spa: {
            id: spa.id,
            brand: spa.brand,
            name: spa.name,
            price: spa.price,
            image_url: spa.image_url,
            product_url: spa.product_url,
          },
          luxury: {
            ...matches[0],
            similarity: matches[0].similarity,
          },
        });
      }
    }),
  );

  // Sort by similarity descending (best matches first)
  pairs.sort((a, b) => b.luxury.similarity - a.luxury.similarity);

  return pairs;
}
