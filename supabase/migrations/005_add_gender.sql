-- 005_add_gender.sql
-- Add gender support (women/men) to products and match_products RPC

-- 1. products 테이블에 gender 컬럼 추가
ALTER TABLE products ADD COLUMN gender TEXT NOT NULL DEFAULT 'women';

-- 2. gender 포함 인덱스 추가
CREATE INDEX idx_products_gender_category ON products (gender, category, is_available);

-- 3. match_products RPC에 gender 필터 추가
DROP FUNCTION IF EXISTS match_products(vector(768), text, float, int, text);

CREATE OR REPLACE FUNCTION match_products (
  query_embedding vector(768),
  query_category text,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10,
  exclude_tier text DEFAULT 'luxury',
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
    AND 1 - (products.embedding <=> query_embedding) > match_threshold
  ORDER BY products.embedding <=> query_embedding ASC
  LIMIT LEAST(match_count, 20);
$$;
