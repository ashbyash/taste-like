-- Migration: Change embedding dimension from 512 to 768
-- Reason: Marqo-FashionSigLIP actual output is 768-dim (not 512)

-- 1. Drop existing vector index
DROP INDEX IF EXISTS idx_products_embedding;

-- 2. Alter products.embedding column
ALTER TABLE products
  ALTER COLUMN embedding TYPE vector(768);

-- 3. Alter recommendation_cache.source_embedding column
ALTER TABLE recommendation_cache
  ALTER COLUMN source_embedding TYPE vector(768);

-- 4. Recreate vector search index
CREATE INDEX idx_products_embedding ON products
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 5. Recreate match_products RPC with correct dimension
CREATE OR REPLACE FUNCTION match_products (
  query_embedding vector(768),
  query_category text,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
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
    AND 1 - (products.embedding <=> query_embedding) > match_threshold
  ORDER BY products.embedding <=> query_embedding ASC
  LIMIT LEAST(match_count, 20);
$$;
