-- SPEC-POS-001: Online Orders System
-- Migration: Create menu_categories table
-- Phase 1 MVP: Database Migrations

-- Create menu_categories table for fitness menu organization
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Category info
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  color VARCHAR(20),

  -- Fitness-specific category type
  category_type VARCHAR(20)
    CHECK (category_type IN ('pre_workout', 'post_workout', 'balanced', 'snacks', 'drinks')),

  -- Display
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  -- Nutritional highlights for category card
  nutrition_highlight JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, slug)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_menu_categories_business_id ON menu_categories(business_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_active ON menu_categories(business_id, is_active);
CREATE INDEX IF NOT EXISTS idx_menu_categories_type ON menu_categories(category_type);
CREATE INDEX IF NOT EXISTS idx_menu_categories_sort ON menu_categories(business_id, sort_order);

-- Create trigger for updated_at
CREATE TRIGGER trigger_menu_categories_updated_at
  BEFORE UPDATE ON menu_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_online_orders_updated_at();

-- Insert default categories for fitness restaurant
INSERT INTO menu_categories (business_id, name, slug, description, icon, color, category_type, sort_order, nutrition_highlight)
SELECT
  id,
  'Pre-Entreno',
  'pre-workout',
  'Energía ligera antes del entrenamiento. Rico en carbohidratos complejos.',
  'zap',
  '#F59E0B',
  'pre_workout',
  1,
  '{"calories_range": "200-400", "main_benefits": ["Energía sostenida", "Digestión ligera"], "recommendation": "Consumir 30-60 min antes de entrenar"}'::jsonb
FROM businesses
WHERE NOT EXISTS (
  SELECT 1 FROM menu_categories WHERE slug = 'pre-workout'
LIMIT 1
);

INSERT INTO menu_categories (business_id, name, slug, description, icon, color, category_type, sort_order, nutrition_highlight)
SELECT
  id,
  'Post-Entreno',
  'post-workout',
  'Recuperación muscular. Alto en proteína para rebuild.',
  'dumbbell',
  '#10B981',
  'post_workout',
  2,
  '{"calories_range": "400-600", "main_benefits": ["Recuperación muscular", "Reposición de glucógeno"], "recommendation": "Consumir dentro de 30 min post-entreno"}'::jsonb
FROM businesses
WHERE NOT EXISTS (
  SELECT 1 FROM menu_categories WHERE slug = 'post-workout'
LIMIT 1
);

INSERT INTO menu_categories (business_id, name, slug, description, icon, color, category_type, sort_order, nutrition_highlight)
SELECT
  id,
  'Balanceado',
  'balanced',
  'Platos completos con macros balanceadas para cualquier momento.',
  'scale',
  '#3B82F6',
  'balanced',
  3,
  '{"calories_range": "400-700", "main_benefits": ["Nutrición completa", "Saciedad"], "recommendation": "Ideal para cualquier momento del día"}'::jsonb
FROM businesses
WHERE NOT EXISTS (
  SELECT 1 FROM menu_categories WHERE slug = 'balanced'
LIMIT 1
);

INSERT INTO menu_categories (business_id, name, slug, description, icon, color, category_type, sort_order, nutrition_highlight)
SELECT
  id,
  'Snacks',
  'snacks',
  'Opciones saludables para picar entre comidas.',
  'apple',
  '#8B5CF6',
  'snacks',
  4,
  '{"calories_range": "100-250", "main_benefits": ["Control de hambre", "Sin culpa"], "recommendation": "Ideal entre comidas principales"}'::jsonb
FROM businesses
WHERE NOT EXISTS (
  SELECT 1 FROM menu_categories WHERE slug = 'snacks'
LIMIT 1
);

INSERT INTO menu_categories (business_id, name, slug, description, icon, color, category_type, sort_order, nutrition_highlight)
SELECT
  id,
  'Bebidas',
  'drinks',
  'Bebidas saludables, smoothies y suplementos.',
  'coffee',
  '#06B6D4',
  'drinks',
  5,
  '{"calories_range": "50-300", "main_benefits": ["Hidratación", "Energía rápida"], "recommendation": "Complementa tu comida favorita"}'::jsonb
FROM businesses
WHERE NOT EXISTS (
  SELECT 1 FROM menu_categories WHERE slug = 'drinks'
LIMIT 1
);

COMMENT ON TABLE menu_categories IS 'Fitness menu categories for online ordering';
