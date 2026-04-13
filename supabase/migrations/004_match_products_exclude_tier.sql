-- Migration: Add exclude_tier parameter to match_products RPC
-- Reason: YSL (luxury) products will be stored in products table for browsing.
-- Without this filter, luxury products would appear as recommendations.

-- Drop old 4-parameter version to prevent overloading conflict (PGRST203)
DROP FUNCTION IF EXISTS match_products(vector(768), text, float, int);

CREATE OR REPLACE FUNCTION match_products (
  query_embedding vector(768),
  query_category text,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10,
  exclude_tier text DEFAULT 'luxury'
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
    AND products.is_available = true
    AND products.brand_tier != exclude_tier
    AND 1 - (products.embedding <=> query_embedding) > match_threshold
  ORDER BY products.embedding <=> query_embedding ASC
  LIMIT LEAST(match_count, 20);
$$;
