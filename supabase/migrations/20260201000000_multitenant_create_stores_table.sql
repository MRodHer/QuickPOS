/*
  # SPEC-SAAS-001: Multitenant Architecture - Stores Table

  ## Tables Created

  ### 1. Stores
  - `stores` - Main store/organization table for QuickPOS
    - Subdomain identification
    - Custom domain support
    - Branding configuration

  ### 2. Store Users
  - `store_users` - Pivot table linking users to stores
*/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: stores
-- ============================================
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  custom_domain VARCHAR(255) UNIQUE,

  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('provisioning', 'active', 'suspended', 'deleted')),

  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#f59e0b',
  secondary_color VARCHAR(7) DEFAULT '#1f2937',
  locale VARCHAR(10) DEFAULT 'es-MX',
  timezone VARCHAR(50) DEFAULT 'America/Mexico_City',
  currency VARCHAR(3) DEFAULT 'MXN',

  company_name VARCHAR(255),
  company_rfc VARCHAR(20),
  company_address TEXT,
  company_phone VARCHAR(20),
  company_email VARCHAR(255),

  enabled_modules TEXT[] DEFAULT ARRAY[
    'dashboard', 'pos', 'products',
    'inventory', 'customers', 'suppliers',
    'sales', 'purchases', 'cash_register',
    'reports', 'employees', 'stores'
  ],

  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  subscription_tier VARCHAR(20) DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'basic', 'pro', 'enterprise')),
  subscription_status VARCHAR(20) DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'unpaid')),
  subscription_max_users INTEGER DEFAULT 1,
  subscription_max_terminals INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_stores_slug ON stores(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_stores_custom_domain ON stores(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_stores_status ON stores(status);
CREATE INDEX idx_stores_deleted_at ON stores(deleted_at);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active stores"
  ON stores FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Super admins can create stores"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Super admins can update stores"
  ON stores FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: store_users
-- ============================================
CREATE TABLE IF NOT EXISTS store_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  role VARCHAR(20) DEFAULT 'store_user'
    CHECK (role IN ('store_admin', 'store_manager', 'store_user')),

  is_active BOOLEAN DEFAULT true,
  invited_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store_id, user_id)
);

CREATE INDEX idx_store_users_store ON store_users(store_id) WHERE is_active = true;
CREATE INDEX idx_store_users_user ON store_users(user_id) WHERE is_active = true;
CREATE INDEX idx_store_users_active ON store_users(is_active);

ALTER TABLE store_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own store memberships"
  ON store_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all store users"
  ON store_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Super admins can manage store users"
  ON store_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE TRIGGER update_store_users_updated_at BEFORE UPDATE ON store_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: get_current_store_id
-- ============================================
CREATE OR REPLACE FUNCTION get_current_store_id()
RETURNS UUID AS $$
DECLARE
  store_id UUID;
  impersonating_id UUID;
BEGIN
  impersonating_id = NULLIF(current_setting('app.impersonating', true), '')::UUID;

  IF impersonating_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    ) THEN
      RETURN impersonating_id;
    END IF;
  END IF;

  store_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID;
  RETURN store_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: create_default_store
-- ============================================
CREATE OR REPLACE FUNCTION create_default_store()
RETURNS UUID AS $$
DECLARE
  v_store_id UUID;
BEGIN
  SELECT id INTO v_store_id FROM stores WHERE slug = 'default' LIMIT 1;

  IF v_store_id IS NOT NULL THEN
    RETURN v_store_id;
  END IF;

  INSERT INTO stores (
    id,
    name,
    slug,
    status,
    company_name,
    subscription_tier,
    subscription_max_users,
    subscription_max_terminals
  ) VALUES (
    gen_random_uuid(),
    'QuickPOS Default',
    'default',
    'active',
    'Tienda por Defecto',
    'enterprise',
    1000,
    100
  ) RETURNING id INTO v_store_id;

  RETURN v_store_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_current_store_id() TO authenticated;
GRANT EXECUTE ON FUNCTION create_default_store() TO authenticated;

SELECT create_default_store();
