-- 007_match_products_reverse.sql
-- Reverse similarity search: given a SPA product embedding, find similar luxury products.
-- Used by pSEO pages to show "this ZARA item looks like this Saint Laurent item".

CREATE OR REPLACE FUNCTION match_products_reverse (
  query_embedding vector(768),
  query_category text,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5,
  include_tier text DEFAULT 'luxury',
  query_gender text DEFAULT 'women'
)
RETURNS TABLE (
  id uuid,
  brand text,
  name text,
  price integer,
  category text,
  image_url text,
  product_url text,
  similarity float
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    products.id,
    products.brand,
    products.name,
    products.price,
    products.category,
    products.image_url,
    products.product_url,
    1 - (products.embedding <=> query_embedding) AS similarity
  FROM products
  WHERE products.category = query_category
    AND products.gender = query_gender
    AND products.is_available = true
    AND products.brand_tier = include_tier
    AND 1 - (products.embedding <=> query_embedding) > match_threshold
  ORDER BY products.embedding <=> query_embedding ASC
  LIMIT LEAST(match_count, 10);
$$;
