-- Add brand and price levels to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_medical DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_public DECIMAL(10,2);

-- Add index for brand
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(business_id, brand);

-- Comment on new columns
COMMENT ON COLUMN products.brand IS 'Product brand name';
COMMENT ON COLUMN products.price_medical IS 'Special price for medical professionals';
COMMENT ON COLUMN products.price_public IS 'Regular retail price';
