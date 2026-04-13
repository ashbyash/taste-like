-- 006_add_subcategory.sql
-- Add subcategory support for fine-grained filtering (backpack vs tote, sneakers vs boots, etc.)

-- 1. products 테이블에 subcategory 컬럼 추가 (nullable — 모든 카테고리에 해당하지 않음)
ALTER TABLE products ADD COLUMN subcategory TEXT;

-- 2. category + subcategory 복합 인덱스
CREATE INDEX idx_products_subcategory ON products (category, subcategory, gender, is_available);

-- 3. match_products RPC 업데이트: subcategory 파라미터 추가 (optional)
DROP FUNCTION IF EXISTS match_products(vector(768), text, float, int, text, text);

CREATE OR REPLACE FUNCTION match_products (
  query_embedding vector(768),
  query_category text,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10,
  exclude_tier text DEFAULT 'luxury',
  query_gender text DEFAULT 'women',
  query_subcategory text DEFAULT NULL
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
    AND products.gender = query_gender
    AND products.is_available = true
    AND products.brand_tier != exclude_tier
    AND (query_subcategory IS NULL OR products.subcategory = query_subcategory)
    AND 1 - (products.embedding <=> query_embedding) > match_threshold
  ORDER BY products.embedding <=> query_embedding ASC
  LIMIT LEAST(match_count, 20);
$$;
