/*
  # QuickPOS - Sistema de Punto de Venta Completo
  
  ## Descripción
  Sistema POS multi-tenant para cualquier tipo de negocio (queserías, cremerías, 
  taquerías, abarrotes, papelerías, tiendas de ropa, ferreterías, etc.)
  
  ## Tablas Creadas
  1. **businesses** - Negocios/empresas (tenant principal)
  2. **business_staff** - Personal y roles por negocio
  3. **user_preferences** - Preferencias de usuario (negocio actual)
  4. **product_categories** - Categorías de productos
  5. **products** - Catálogo de productos
  6. **customers** - Clientes
  7. **cash_registers** - Sesiones de caja (cortes diarios)
  8. **sales** - Ventas realizadas
  9. **sale_items** - Detalle de items por venta
  10. **cash_movements** - Movimientos de efectivo
  11. **stock_movements** - Movimientos de inventario
  12. **suppliers** - Proveedores
  13. **purchase_orders** - Órdenes de compra
  14. **purchase_order_items** - Detalle de órdenes de compra
  15. **terminal_configs** - Configuración de terminales de pago
  16. **terminal_payments** - Pagos procesados por terminal
  17. **cash_cuts** - Cortes semanales y mensuales
  
  ## Seguridad
  - RLS habilitado en todas las tablas
  - Políticas restrictivas por defecto
  - Acceso basado en business_id y rol del usuario
*/

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer', 'terminal', 'mixed');
CREATE TYPE sale_status AS ENUM ('completed', 'refunded', 'partial_refund', 'cancelled');
CREATE TYPE cash_movement_type AS ENUM ('sale', 'refund', 'cash_in', 'cash_out');
CREATE TYPE stock_adjustment_type AS ENUM ('purchase', 'sale', 'adjustment', 'return', 'damage', 'count');
CREATE TYPE subscription_tier AS ENUM ('basic', 'professional', 'enterprise');
CREATE TYPE staff_role AS ENUM ('owner', 'admin', 'manager', 'cashier', 'staff');

-- ============================================================================
-- TABLAS
-- ============================================================================

-- 1. BUSINESSES (tenant principal)
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    business_type VARCHAR(50),
    rfc VARCHAR(13),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(200),
    logo_url VARCHAR(500),
    subscription_tier subscription_tier DEFAULT 'basic',
    modules_enabled TEXT[] DEFAULT ARRAY['pos', 'products', 'customers', 'cash_register', 'reports', 'inventory'],
    settings JSONB DEFAULT '{}',
    receipt_header TEXT DEFAULT '',
    receipt_footer TEXT DEFAULT 'Gracias por su compra',
    default_tax_rate DECIMAL(5,4) DEFAULT 0.16,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BUSINESS_STAFF
CREATE TABLE IF NOT EXISTS business_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role staff_role NOT NULL DEFAULT 'cashier',
    display_name VARCHAR(100) NOT NULL,
    pin VARCHAR(6),
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, user_id)
);

-- 3. USER_PREFERENCES
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PRODUCT_CATEGORIES
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- 5. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    sku VARCHAR(50),
    barcode VARCHAR(50),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) DEFAULT 0,
    tax_included BOOLEAN DEFAULT TRUE,
    tax_rate DECIMAL(5,4) DEFAULT 0.16,
    track_stock BOOLEAN DEFAULT TRUE,
    stock_quantity DECIMAL(10,2) DEFAULT 0,
    stock_min DECIMAL(10,2) DEFAULT 5,
    unit VARCHAR(20) DEFAULT 'pieza',
    image_url VARCHAR(500),
    is_service BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, sku)
);

-- 6. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    phone VARCHAR(20),
    rfc VARCHAR(13),
    address TEXT,
    notes TEXT,
    total_purchases DECIMAL(12,2) DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    last_visit_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CASH_REGISTERS (sesión de caja)
CREATE TABLE IF NOT EXISTS cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    opened_by UUID NOT NULL REFERENCES auth.users(id),
    closed_by UUID REFERENCES auth.users(id),
    opening_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    closing_amount DECIMAL(10,2),
    expected_amount DECIMAL(10,2),
    difference DECIMAL(10,2),
    total_sales DECIMAL(12,2) DEFAULT 0,
    total_cash DECIMAL(12,2) DEFAULT 0,
    total_card DECIMAL(12,2) DEFAULT 0,
    total_transfer DECIMAL(12,2) DEFAULT 0,
    total_terminal DECIMAL(12,2) DEFAULT 0,
    total_terminal_commissions DECIMAL(12,2) DEFAULT 0,
    total_refunds DECIMAL(12,2) DEFAULT 0,
    sale_count INTEGER DEFAULT 0,
    notes TEXT,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    is_open BOOLEAN DEFAULT TRUE
);

-- 8. SALES
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    cash_register_id UUID REFERENCES cash_registers(id),
    customer_id UUID REFERENCES customers(id),
    seller_id UUID NOT NULL REFERENCES auth.users(id),
    ticket_number VARCHAR(20) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_reason TEXT,
    total DECIMAL(10,2) NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'cash',
    amount_paid DECIMAL(10,2) NOT NULL,
    change_amount DECIMAL(10,2) DEFAULT 0,
    cash_amount DECIMAL(10,2) DEFAULT 0,
    card_amount DECIMAL(10,2) DEFAULT 0,
    transfer_amount DECIMAL(10,2) DEFAULT 0,
    terminal_amount DECIMAL(10,2) DEFAULT 0,
    card_reference VARCHAR(50),
    transfer_reference VARCHAR(50),
    terminal_reference VARCHAR(100),
    status sale_status DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SALE_ITEMS
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,4) DEFAULT 0.16,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL
);

-- 10. CASH_MOVEMENTS
CREATE TABLE IF NOT EXISTS cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    cash_register_id UUID NOT NULL REFERENCES cash_registers(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    type cash_movement_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    sale_id UUID REFERENCES sales(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. STOCK_MOVEMENTS
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    type stock_adjustment_type NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    previous_stock DECIMAL(10,2) NOT NULL,
    new_stock DECIMAL(10,2) NOT NULL,
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(200),
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. PURCHASE_ORDERS
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    order_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    ordered_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. PURCHASE_ORDER_ITEMS
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    received_quantity DECIMAL(10,2) DEFAULT 0
);

-- 15. TERMINAL_CONFIGS
CREATE TABLE IF NOT EXISTS terminal_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    api_key_encrypted TEXT,
    device_id VARCHAR(100),
    commission_percent DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. TERMINAL_PAYMENTS
CREATE TABLE IF NOT EXISTS terminal_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    terminal_config_id UUID REFERENCES terminal_configs(id),
    provider VARCHAR(30) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL,
    reference_id VARCHAR(100),
    authorization_code VARCHAR(50),
    card_last_four VARCHAR(4),
    card_brand VARCHAR(20),
    status VARCHAR(20) DEFAULT 'completed',
    provider_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. CASH_CUTS
CREATE TABLE IF NOT EXISTS cash_cuts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    cut_type VARCHAR(10) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_sales DECIMAL(12,2) DEFAULT 0,
    total_cash DECIMAL(12,2) DEFAULT 0,
    total_card DECIMAL(12,2) DEFAULT 0,
    total_transfer DECIMAL(12,2) DEFAULT 0,
    total_terminal DECIMAL(12,2) DEFAULT 0,
    total_terminal_commissions DECIMAL(12,2) DEFAULT 0,
    total_refunds DECIMAL(12,2) DEFAULT 0,
    total_cash_in DECIMAL(12,2) DEFAULT 0,
    total_cash_out DECIMAL(12,2) DEFAULT 0,
    net_cash DECIMAL(12,2) DEFAULT 0,
    net_total DECIMAL(12,2) DEFAULT 0,
    sale_count INTEGER DEFAULT 0,
    ticket_average DECIMAL(10,2) DEFAULT 0,
    registers_count INTEGER DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, cut_type, period_start)
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(business_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(business_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(business_id, name);
CREATE INDEX IF NOT EXISTS idx_sales_business ON sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_ticket ON sales(business_id, ticket_number);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_register ON sales(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(business_id, phone);
CREATE INDEX IF NOT EXISTS idx_cash_registers_business ON cash_registers(business_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_register ON cash_movements(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_business_staff_user ON business_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_business ON product_categories(business_id);
CREATE INDEX IF NOT EXISTS idx_terminal_configs_business ON terminal_configs(business_id);
CREATE INDEX IF NOT EXISTS idx_terminal_payments_sale ON terminal_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_terminal_payments_business ON terminal_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_cash_cuts_business ON cash_cuts(business_id);
CREATE INDEX IF NOT EXISTS idx_cash_cuts_period ON cash_cuts(business_id, cut_type, period_start);

-- ============================================================================
-- FUNCIONES HELPER PARA RLS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_business_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT current_business_id FROM user_preferences WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_user_business_ids()
RETURNS UUID[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(array_agg(business_id), ARRAY[]::UUID[])
    FROM business_staff WHERE user_id = auth.uid() AND is_active = TRUE;
$$;

CREATE OR REPLACE FUNCTION has_business_role(target_role TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM business_staff
        WHERE user_id = auth.uid()
          AND business_id = get_current_business_id()
          AND is_active = TRUE
          AND role::TEXT = target_role
    );
$$;

-- ============================================================================
-- FUNCIONES AUXILIARES
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_ticket_number(p_business_id UUID)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    v_count INTEGER;
    v_date TEXT;
BEGIN
    v_date := to_char(NOW(), 'YYMMDD');
    SELECT COUNT(*) + 1 INTO v_count
    FROM sales
    WHERE business_id = p_business_id
      AND created_at::DATE = CURRENT_DATE;
    RETURN 'T-' || v_date || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION create_default_categories(p_business_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO product_categories (business_id, name, color, icon, sort_order) VALUES
    (p_business_id, 'General',      '#6B7280', 'package',       1),
    (p_business_id, 'Alimentos',    '#F59E0B', 'utensils',      2),
    (p_business_id, 'Bebidas',      '#06B6D4', 'cup-soda',      3),
    (p_business_id, 'Lácteos',      '#FBBF24', 'milk',          4),
    (p_business_id, 'Limpieza',     '#10B981', 'sparkles',      5),
    (p_business_id, 'Servicios',    '#8B5CF6', 'wrench',        6)
    ON CONFLICT DO NOTHING;
END;
$$;

-- ============================================================================
-- RLS - HABILITAR EN TODAS LAS TABLAS
-- ============================================================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_cuts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - BUSINESSES
-- ============================================================================

CREATE POLICY "Users can view their businesses"
    ON businesses FOR SELECT
    TO authenticated
    USING (id = ANY(get_user_business_ids()));

CREATE POLICY "Users can insert businesses"
    ON businesses FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

CREATE POLICY "Owners can update their businesses"
    ON businesses FOR UPDATE
    TO authenticated
    USING (id = ANY(get_user_business_ids()));

-- ============================================================================
-- RLS POLICIES - BUSINESS_STAFF
-- ============================================================================

CREATE POLICY "Users can view staff from their businesses"
    ON business_staff FOR SELECT
    TO authenticated
    USING (business_id = ANY(get_user_business_ids()));

CREATE POLICY "Users can insert themselves to a business"
    ON business_staff FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners/admins can manage staff"
    ON business_staff FOR UPDATE
    TO authenticated
    USING (business_id = get_current_business_id());

-- ============================================================================
-- RLS POLICIES - USER_PREFERENCES
-- ============================================================================

CREATE POLICY "Users can view own preferences"
    ON user_preferences FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
    ON user_preferences FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
    ON user_preferences FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES - TABLAS CON BUSINESS_ID (POLÍTICA ESTÁNDAR)
-- ============================================================================

-- PRODUCT_CATEGORIES
CREATE POLICY "Users can view categories from current business"
    ON product_categories FOR SELECT
    TO authenticated
    USING (business_id = get_current_business_id());

CREATE POLICY "Users can insert categories to current business"
    ON product_categories FOR INSERT
    TO authenticated
    WITH CHECK (business_id = get_current_business_id());

CREATE POLICY "Users can update categories from current business"
    ON product_categories FOR UPDATE
    TO authenticated
    USING (business_id = get_current_business_id());

CREATE POLICY "Users can delete categories from current business"
    ON product_categories FOR DELETE
    TO authenticated
    USING (business_id = get_current_business_id());

-- PRODUCTS
CREATE POLICY "Users can view products from current business"
    ON products FOR SELECT
    TO authenticated
    USING (business_id = get_current_business_id());

CREATE POLICY "Users can insert products to current business"
    ON products FOR INSERT
    TO authenticated
    WITH CHECK (business_id = get_current_business_id());

CREATE POLICY "Users can update products from current business"
    ON products FOR UPDATE
    TO authenticated
    USING (business_id = get_current_business_id());

CREATE POLICY "Users can delete products from current business"
    ON products FOR DELETE
    TO authenticated
    USING (business_id = get_current_business_id());

-- CUSTOMERS
CREATE POLICY "Users can view customers from current business"
    ON customers FOR SELECT
    TO authenticated
    USING (business_id = get_current_business_id());

CREATE POLICY "Users can insert customers to current business"
    ON customers FOR INSERT
    TO authenticated
    WITH CHECK (business_id = get_current_business_id());

CREATE POLICY "Users can update customers from current business"
    ON customers FOR UPDATE
    TO authenticated
    USING (business_id = get_current_business_id());

-- CASH_REGISTERS
CREATE POLICY "Users can view cash registers from current business"
    ON cash_registers FOR SELECT
    TO authenticated
    USING (business_id = get_current_business_id());

CREATE POLICY "Users can insert cash registers to current business"
    ON cash_registers FOR INSERT
    TO authenticated
    WITH CHECK (business_id = get_current_business_id());

CREATE POLICY "Users can update cash registers from current business"
    ON cash_registers FOR UPDATE
    TO authenticated
    USING (business_id = get_current_business_id());

-- SALES
CREATE POLICY "Users can view sales from current business"
    ON sales FOR SELECT
    TO authenticated
    USING (business_id = get_current_business_id());

CREATE POLICY "Users can insert sales to current business"
    ON sales FOR INSERT
    TO authenticated
    WITH CHECK (business_id = get_current_business_id());

CREATE POLICY "Users can update sales from current business"
    ON sales FOR UPDATE
    TO authenticated
    USING (business_id = get_current_business_id());

-- SALE_ITEMS (depende de sales)
CREATE POLICY "Users can view sale items from their sales"
    ON sale_items FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM sales 
        WHERE sales.id = sale_items.sale_id 
        AND sales.business_id = get_current_business_id()
    ));

CREATE POLICY "Users can insert sale items"
    ON sale_items FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM sales 
        WHERE sales.id = sale_items.sale_id 
        AND sales.business_id = get_current_business_id()
    ));

-- CASH_MOVEMENTS
CREATE POLICY "Users can view cash movements from current business"
    ON cash_movements FOR SELECT
    TO authenticated
    USING (business_id = get_current_business_id());

CREATE POLICY "Users can insert cash movements to current business"
    ON cash_movements FOR INSERT
    TO authenticated
    WITH CHECK (business_id = get_current_business_id());

-- STOCK_MOVEMENTS
CREATE POLICY "Users can view stock movements from current business"
    ON stock_movements FOR SELECT
    TO authenticated
    USING (business_id = get_current_business_id());

CREATE POLICY "Users can insert stock movements to current business"
    ON stock_movements FOR INSERT
    TO authenticated
    WITH CHECK (business_id = get_current_business_id());

-- SUPPLIERS
CREATE POLICY "Users can view suppliers from current business"
    ON suppliers FOR SELECT
    TO authenticated
    USING (business_id = get_current_business_id());

CREATE POLICY "Users can insert suppliers to current business"
    ON suppliers FOR INSERT
    TO authenticated
    WITH CHECK (business_id = get_current_business_id());

CREATE POLICY "Users can update suppliers from current business"
    ON suppliers FOR UPDATE
    TO authenticated
    USING (business_id = get_current_business_id());

-- PURCHASE_ORDERS
CREATE POLICY "Users can view purchase orders from current business"
    ON purchase_orders FOR SELECT
    TO authenticated
    USING (business_id = get_current_business_id());

CREATE POLICY "Users can insert purchase orders to current business"
    ON purchase_orders FOR INSERT
    TO authenticated
    WITH CHECK (business_id = get_current_business_id());

CREATE POLICY "Users can update purchase orders from current business"
    ON purchase_orders FOR UPDATE
    TO authenticated
    USING (business_id = get_current_business_id());

-- PURCHASE_ORDER_ITEMS
CREATE POLICY "Users can view purchase order items"
    ON purchase_order_items FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM purchase_orders 
        WHERE purchase_orders.id = purchase_order_items.purchase_order_id 
        AND purchase_orders.business_id = get_current_business_id()
    ));

CREATE POLICY "Users can insert purchase order items"
    ON purchase_order_items FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM purchase_orders 
        WHERE purchase_orders.id = purchase_order_items.purchase_order_id 
        AND purchase_orders.business_id = get_current_business_id()
    ));

-- TERMINAL_CONFIGS
CREATE POLICY "Users can view terminal configs from current business"
    ON terminal_configs FOR SELECT
    TO authenticated
    USING (business_id = get_current_business_id());

CREATE POLICY "Users can insert terminal configs to current business"
    ON terminal_configs FOR INSERT
    TO authenticated
    WITH CHECK (business_id = get_current_business_id());

CREATE POLICY "Users can update terminal configs from current business"
    ON terminal_configs FOR UPDATE
    TO authenticated
    USING (business_id = get_current_business_id());

-- TERMINAL_PAYMENTS
CREATE POLICY "Users can view terminal payments from current business"
    ON terminal_payments FOR SELECT
    TO authenticated
    USING (business_id = get_current_business_id());

CREATE POLICY "Users can insert terminal payments to current business"
    ON terminal_payments FOR INSERT
    TO authenticated
    WITH CHECK (business_id = get_current_business_id());

-- CASH_CUTS
CREATE POLICY "Users can view cash cuts from current business"
    ON cash_cuts FOR SELECT
    TO authenticated
    USING (business_id = get_current_business_id());

CREATE POLICY "Users can insert cash cuts to current business"
    ON cash_cuts FOR INSERT
    TO authenticated
    WITH CHECK (business_id = get_current_business_id());