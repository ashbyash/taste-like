-- taste-like initial schema
-- Prerequisites: pgvector extension must be enabled in Supabase dashboard

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 1. supported_brands
-- ============================================
CREATE TABLE supported_brands (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  name_ko       TEXT,
  slug          TEXT NOT NULL UNIQUE,
  tier          TEXT NOT NULL,             -- 'luxury', 'spa', 'domestic_designer'
  role          TEXT NOT NULL,             -- 'source' | 'alternative' | 'both'
  domain        TEXT,
  url_pattern   TEXT,
  crawl_sources JSONB DEFAULT '[]',
  price_range   JSONB,
  categories    TEXT[] DEFAULT '{}',
  scraper_id    TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. products
-- ============================================
CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand         TEXT NOT NULL,
  brand_tier    TEXT NOT NULL,
  name          TEXT NOT NULL,
  price         INTEGER NOT NULL,
  currency      TEXT DEFAULT 'KRW',
  category      TEXT NOT NULL,
  image_url     TEXT NOT NULL,
  product_url   TEXT NOT NULL,
  embedding     vector(512),
  is_available  BOOLEAN DEFAULT true,
  crawled_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Vector search index (IVFFlat)
CREATE INDEX idx_products_embedding ON products
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Category + availability filter index
CREATE INDEX idx_products_category_available ON products (category, is_available);

-- Brand filter index
CREATE INDEX idx_products_brand ON products (brand);

-- ============================================
-- 3. recommendation_cache
-- ============================================
CREATE TABLE recommendation_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url      TEXT NOT NULL UNIQUE,
  source_brand    TEXT NOT NULL,
  source_name     TEXT NOT NULL,
  source_price    INTEGER,
  source_currency TEXT DEFAULT 'KRW',
  source_image    TEXT NOT NULL,
  source_category TEXT NOT NULL,
  source_embedding vector(512),
  result_ids      UUID[] NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_cache_source_url ON recommendation_cache (source_url);

-- ============================================
-- 4. Vector search RPC function
-- ============================================
CREATE OR REPLACE FUNCTION match_products (
  query_embedding vector(512),
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
