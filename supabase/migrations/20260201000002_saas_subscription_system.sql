/*
  # SPEC-SAAS-003: QuickPOS Subscription System

  ## Tables Created
  - subscription_plans - QuickPOS subscription plans
  - subscriptions - Store subscriptions
  - subscription_features - Feature definitions
  - plan_features - Junction table for plan features

  ## QuickPOS Plans
  - Free: /bin/bash - 1 terminal, 100 products
  - Basic: 99/mes - 2 terminales, 500 productos
  - Pro: ,299/mes - 5 terminales, productos ilimitados
  - Enterprise: ,999/mes - terminales ilimitadas + multi-sucursal + API
*/

-- ============================================
-- TABLE: subscription_features
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert QuickPOS features
INSERT INTO subscription_features (key, name, description, category) VALUES
  -- Core features
  ('dashboard', 'Dashboard', 'Panel principal con métricas', 'core'),
  ('pos', 'Punto de Venta', 'Módulo POS completo', 'core'),
  ('products', 'Productos', 'Gestión de catálogo de productos', 'core'),
  ('inventory', 'Inventario', 'Control de inventario', 'core'),
  ('customers', 'Clientes', 'Gestión de clientes', 'core'),
  ('suppliers', 'Proveedores', 'Gestión de proveedores', 'core'),
  
  -- Sales & Purchases
  ('sales', 'Ventas', 'Gestión de ventas', 'sales'),
  ('purchases', 'Compras', 'Gestión de compras', 'sales'),
  
  -- Cash Management
  ('cash_register', 'Caja Registradora', 'Apertura y cierre de caja', 'cash'),
  ('cash_movements', 'Movimientos de Caja', 'Entradas y salidas de efectivo', 'cash'),
  
  -- Reporting
  ('reports', 'Reportes', 'Reportes básicos', 'reports'),
  ('advanced_reports', 'Reportes Avanzados', 'Reportes analíticos y exportación', 'reports'),
  
  -- Multi-store
  ('multi_store', 'Multi-Sucursal', 'Gestión de múltiples sucursales', 'advanced'),
  
  -- Integrations
  ('api_access', 'API Access', 'Acceso a API REST', 'integrations'),
  ('clip_integration', 'Integración CLIP', 'Procesamiento de pagos CLIP', 'integrations'),
  
  -- Employees
  ('employees', 'Empleados', 'Gestión de empleados', 'hr'),
  ('roles_permissions', 'Roles y Permisos', 'Control granular de permisos', 'hr'),

  -- Support
  ('priority_support', 'Soporte Prioritario', 'Soporte prioritario 24/7', 'support'),
  ('onboarding', 'Onboarding', 'Sesión de onboarding personalizado', 'support');

-- ============================================
-- TABLE: subscription_plans
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Pricing
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MXN',
  
  -- Limits
  max_terminals INTEGER NOT NULL,
  max_products INTEGER NOT NULL,
  max_users INTEGER NOT NULL,
  max_stores INTEGER NOT NULL DEFAULT 1,
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  
  -- Stripe
  stripe_price_id_monthly VARCHAR(255),
  stripe_price_id_yearly VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert QuickPOS plans
INSERT INTO subscription_plans (
  slug, name, description,
  price_monthly, price_yearly,
  max_terminals, max_products, max_users, max_stores
) VALUES
  (
    'free',
    'Free',
    'Plan gratuito para comenzar con QuickPOS',
    0, 0,
    1, 100, 2, 1
  ),
  (
    'basic',
    'Basic',
    'Para pequeñas tiendas en crecimiento',
    499, 4990,
    2, 500, 5, 1
  ),
  (
    'pro',
    'Pro',
    'Para negocios con alto volumen de ventas',
    1299, 12990,
    5, -1, 20, 3
  ),
  (
    'enterprise',
    'Enterprise',
    'Solución completa para cadenas y franquicias',
    2999, 29990,
    -1, -1, -1, -1
  );

-- ============================================
-- TABLE: plan_features (junction)
-- ============================================
CREATE TABLE IF NOT EXISTS plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES subscription_features(id) ON DELETE CASCADE,
  
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(plan_id, feature_id)
);

-- Free plan features
INSERT INTO plan_features (plan_id, feature_id, enabled)
SELECT 
  p.id,
  f.id,
  true
FROM subscription_plans p, subscription_features f
WHERE p.slug = 'free'
AND f.key IN (
  'dashboard', 'pos', 'products', 'inventory',
  'customers', 'suppliers', 'sales', 'cash_register',
  'reports', 'employees'
);

-- Basic plan features
INSERT INTO plan_features (plan_id, feature_id, enabled)
SELECT 
  p.id,
  f.id,
  true
FROM subscription_plans p, subscription_features f
WHERE p.slug = 'basic'
AND f.key IN (
  'dashboard', 'pos', 'products', 'inventory',
  'customers', 'suppliers', 'sales', 'purchases',
  'cash_register', 'cash_movements', 'reports',
  'employees', 'clip_integration'
);

-- Pro plan features
INSERT INTO plan_features (plan_id, feature_id, enabled)
SELECT 
  p.id,
  f.id,
  true
FROM subscription_plans p, subscription_features f
WHERE p.slug = 'pro'
AND f.key IN (
  'dashboard', 'pos', 'products', 'inventory',
  'customers', 'suppliers', 'sales', 'purchases',
  'cash_register', 'cash_movements',
  'reports', 'advanced_reports',
  'employees', 'roles_permissions',
  'multi_store', 'clip_integration'
);

-- Enterprise plan features (ALL)
INSERT INTO plan_features (plan_id, feature_id, enabled)
SELECT 
  p.id,
  f.id,
  true
FROM subscription_plans p, subscription_features f
WHERE p.slug = 'enterprise';

-- ============================================
-- TABLE: subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  
  -- Billing
  billing_cycle VARCHAR(10) DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'yearly')),
  
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  
  -- Trial
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  
  -- Payment
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  payment_method_id VARCHAR(255),
  
  last_payment_date TIMESTAMPTZ,
  next_payment_date TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(store_id)
);

CREATE INDEX idx_subscriptions_store ON subscriptions(store_id);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY Users can view own subscriptions
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM store_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY Super admins can manage all subscriptions
  ON subscriptions FOR ALL
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

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: payment_methods
-- ============================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  -- Payment method details
  type VARCHAR(50) NOT NULL
    CHECK (type IN ('card', 'bank_account', 'sepa_debit')),
  
  stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
  
  -- Card details
  card_last4 VARCHAR(4),
  card_brand VARCHAR(20),
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  
  -- Bank details
  bank_name VARCHAR(255),
  bank_last4 VARCHAR(4),
  
  -- Default
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_store ON payment_methods(store_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(store_id, is_default)
  WHERE is_default = true;

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY Users can view own payment methods
  ON payment_methods FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM store_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: invoices
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  
  -- Invoice details
  number VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  
  amount DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2),
  total DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MXN',
  
  -- Dates
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- Stripe
  stripe_invoice_id VARCHAR(255) UNIQUE,
  stripe_invoice_url TEXT,
  
  -- Line items
  line_items JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_store ON invoices(store_id);
CREATE INDEX idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_number ON invoices(number);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY Users can view own invoices
  ON invoices FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM store_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: check_subscription_limits
-- ============================================
CREATE OR REPLACE FUNCTION check_subscription_limits(
  p_store_id UUID,
  p_limit_type TEXT
)
RETURNS INTEGER AS 3800750
DECLARE
  v_limit INTEGER;
  v_current INTEGER;
BEGIN
  -- Get limit from subscription
  SELECT 
    CASE p_limit_type
      WHEN 'terminals' THEN s.max_terminals
      WHEN 'products' THEN s.max_products
      WHEN 'users' THEN s.max_users
      WHEN 'stores' THEN s.max_stores
      ELSE 0
    END INTO v_limit
  FROM subscriptions sub
  JOIN subscription_plans s ON sub.plan_id = s.id
  WHERE sub.store_id = p_store_id
  AND sub.status = 'active';
  
  IF v_limit = -1 THEN
    -- Unlimited
    RETURN -1;
  END IF;
  
  -- Get current usage
  CASE p_limit_type
    WHEN 'terminals' THEN
      SELECT COUNT(*) INTO v_current
      FROM terminals
      WHERE store_id = p_store_id AND deleted_at IS NULL;
    WHEN 'products' THEN
      SELECT COUNT(*) INTO v_current
      FROM products
      WHERE store_id = p_store_id;
    WHEN 'users' THEN
      SELECT COUNT(*) INTO v_current
      FROM store_users
      WHERE store_id = p_store_id AND is_active = true;
    WHEN 'stores' THEN
      -- For multi-store, count branches
      SELECT COUNT(*) INTO v_current
      FROM stores
      WHERE id = p_store_id OR parent_store_id = p_store_id;
  END CASE;
  
  RETURN v_limit - v_current;
END;
3800750 LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: has_subscription_feature
-- ============================================
CREATE OR REPLACE FUNCTION has_subscription_feature(
  p_store_id UUID,
  p_feature_key TEXT
)
RETURNS BOOLEAN AS 3800750
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM subscriptions sub
    JOIN plan_features pf ON sub.plan_id = pf.id
    JOIN subscription_features f ON pf.feature_id = f.id
    WHERE sub.store_id = p_store_id
    AND sub.status = 'active'
    AND f.key = p_feature_key
    AND pf.enabled = true
  );
END;
3800750 LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_subscription_features TO authenticated;
GRANT EXECUTE ON FUNCTION has_subscription_feature TO authenticated;

-- ============================================
-- FUNCTION: get_subscription_info
-- ============================================
CREATE OR REPLACE FUNCTION get_subscription_info(p_store_id UUID)
RETURNS JSONB AS 3800750
DECLARE
  v_info JSONB;
BEGIN
  SELECT jsonb_build_object(
    'plan_id', s.id,
    'plan_slug', s.slug,
    'plan_name', s.name,
    'status', sub.status,
    'billing_cycle', sub.billing_cycle,
    'current_period_start', sub.current_period_start,
    'current_period_end', sub.current_period_end,
    'trial_end', sub.trial_end,
    'cancel_at_period_end', sub.cancel_at_period_end,
    'limits', jsonb_build_object(
      'terminals', s.max_terminals,
      'products', s.max_products,
      'users', s.max_users,
      'stores', s.max_stores
    ),
    'features', (
      SELECT jsonb_agg(f.key)
      FROM plan_features pf
      JOIN subscription_features f ON pf.feature_id = f.id
      WHERE pf.plan_id = s.id AND pf.enabled = true
    )
  ) INTO v_info
  FROM subscriptions sub
  JOIN subscription_plans s ON sub.plan_id = s.id
  WHERE sub.store_id = p_store_id;
  
  RETURN v_info;
END;
3800750 LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_subscription_info TO authenticated;

-- ============================================
-- Create default free subscription for existing stores
-- ============================================
DO 3800750
DECLARE
  v_store_record RECORD;
  v_free_plan UUID;
BEGIN
  -- Get free plan
  SELECT id INTO v_free_plan
  FROM subscription_plans
  WHERE slug = 'free';
  
  -- Create subscriptions for stores without one
  FOR v_store_record IN 
    SELECT id FROM stores 
    WHERE id NOT IN (SELECT store_id FROM subscriptions)
  LOOP
    INSERT INTO subscriptions (
      store_id,
      plan_id,
      status,
      billing_cycle,
      current_period_start,
      current_period_end
    ) VALUES (
      v_store_record.id,
      v_free_plan,
      'active',
      'monthly',
      NOW(),
      NOW() + INTERVAL '1 month'
    );
  END LOOP;
END 3800750;
