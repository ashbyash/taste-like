-- Enable RLS on all tables and add anon read policies
-- service_role key automatically bypasses RLS (crawlers/writes unaffected)

-- products: anon can only read available products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_available_products" ON products
  FOR SELECT TO anon USING (is_available = true);

-- supported_brands: anon can only read active brands
ALTER TABLE supported_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_active_brands" ON supported_brands
  FOR SELECT TO anon USING (is_active = true);

-- recommendation_cache: anon can only read non-expired cache
ALTER TABLE recommendation_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_valid_cache" ON recommendation_cache
  FOR SELECT TO anon USING (expires_at > now());
