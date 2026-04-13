-- Add unique constraint on product_url for upsert support
ALTER TABLE products
  ADD CONSTRAINT products_product_url_key UNIQUE (product_url);
