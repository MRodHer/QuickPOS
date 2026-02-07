-- SPEC-POS-001: Online Orders System
-- Migration: Create product_nutrition_info table
-- Phase 1 MVP: Database Migrations

-- Create product_nutrition_info table for detailed nutritional information
CREATE TABLE IF NOT EXISTS product_nutrition_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Serving info
  serving_size VARCHAR(100),
  servings_per_container INTEGER,

  -- Macros (per serving)
  calories INTEGER,
  protein DECIMAL(5,1),
  carbohydrates DECIMAL(5,1),
  fat DECIMAL(5,1),
  fiber DECIMAL(5,1),
  sugar DECIMAL(5,1),
  sodium INTEGER,

  -- Micros (optional, stored as JSON)
  vitamins JSONB DEFAULT '{}'::jsonb,
  minerals JSONB DEFAULT '{}'::jsonb,

  -- Fitness-specific scores (1-10)
  protein_score INTEGER CHECK (protein_score BETWEEN 1 AND 10),
  calorie_score INTEGER CHECK (calorie_score BETWEEN 1 AND 10),
  health_score INTEGER CHECK (health_score BETWEEN 1 AND 10),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, product_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_nutrition_business_product ON product_nutrition_info(business_id, product_id);
CREATE INDEX IF NOT EXISTS idx_product_nutrition_protein_score ON product_nutrition_info(protein_score);
CREATE INDEX IF NOT EXISTS idx_product_nutrition_health_score ON product_nutrition_info(health_score);

-- Create trigger for updated_at
CREATE TRIGGER trigger_product_nutrition_updated_at
  BEFORE UPDATE ON product_nutrition_info
  FOR EACH ROW
  EXECUTE FUNCTION update_online_orders_updated_at();

-- Add columns to products table for online availability
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_available_online'
  ) THEN
    ALTER TABLE products ADD COLUMN is_available_online BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'online_category_id'
  ) THEN
    ALTER TABLE products ADD COLUMN online_category_id UUID REFERENCES menu_categories(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'featured_rank'
  ) THEN
    ALTER TABLE products ADD COLUMN featured_rank INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'allergens'
  ) THEN
    ALTER TABLE products ADD COLUMN allergens TEXT[] DEFAULT '{}'::TEXT[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'dietary_tags'
  ) THEN
    ALTER TABLE products ADD COLUMN dietary_tags TEXT[] DEFAULT '{}'::TEXT[];
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_online_category ON products(online_category_id);
CREATE INDEX IF NOT EXISTS idx_products_available_online ON products(is_available_online) WHERE is_available_online = true;

COMMENT ON TABLE product_nutrition_info IS 'Detailed nutritional information for products (macros, micros, fitness scores)';
COMMENT ON COLUMN products.is_available_online IS 'Whether product is available for online ordering';
COMMENT ON COLUMN products.online_category_id IS 'Fitness menu category for online display';
COMMENT ON COLUMN products.allergens IS 'Array of allergen tags (gluten, dairy, nuts, eggs, soy, shellfish)';
COMMENT ON COLUMN products.dietary_tags IS 'Array of dietary preferences (vegan, vegetarian, keto, paleo, etc)';
