-- SPEC-POS-001: Online Orders System
-- Migration: Configure RLS policies for all new tables
-- TASK-002: Configure Row Level Security

-- Enable RLS on all new tables
ALTER TABLE online_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_nutrition_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ONLINE_ORDERS RLS POLICIES
-- ============================================================================

-- Policy: Public can view active menu (needed for product catalog)
-- No public read on orders - customers must auth or use guest checkout

-- Policy: Customers can view own orders (by user_id or guest_email)
CREATE POLICY "Customers can view own orders"
ON online_orders FOR SELECT
USING (
  auth.uid() = user_id OR
  guest_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Policy: Customers can insert orders (for creating orders)
CREATE POLICY "Customers can insert orders"
ON online_orders FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL OR
  guest_email IS NOT NULL
);

-- Policy: Staff can view all orders for their business
CREATE POLICY "Staff can view business orders"
ON online_orders FOR ALL
USING (
  business_id IN (
    SELECT business_id FROM business_staff
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  business_id IN (
    SELECT business_id FROM business_staff
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Policy: Service role can do everything (for backend processing)
CREATE POLICY "Service role full access on online_orders"
ON online_orders FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- ONLINE_ORDER_STATUS_HISTORY RLS POLICIES
-- ============================================================================

-- Policy: Users can view status history for their own orders
CREATE POLICY "Users can view own order history"
ON online_order_status_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM online_orders
    WHERE online_orders.id = online_order_status_history.order_id
    AND (
      online_orders.user_id = auth.uid() OR
      online_orders.guest_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
);

-- Policy: Staff can view status history for their business
CREATE POLICY "Staff can view business order history"
ON online_order_status_history FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM online_orders
    WHERE online_orders.id = online_order_status_history.order_id
    AND online_orders.business_id IN (
      SELECT business_id FROM business_staff
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

-- Policy: Service role full access
CREATE POLICY "Service role full access on status_history"
ON online_order_status_history FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- MENU_CATEGORIES RLS POLICIES
-- ============================================================================

-- Policy: Public can view active menu categories
CREATE POLICY "Public can view active menu categories"
ON menu_categories FOR SELECT
USING (is_active = true);

-- Policy: Staff can view all categories for their business
CREATE POLICY "Staff can manage business menu categories"
ON menu_categories FOR ALL
USING (
  business_id IN (
    SELECT business_id FROM business_staff
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  business_id IN (
    SELECT business_id FROM business_staff
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Policy: Service role full access
CREATE POLICY "Service role full access on menu_categories"
ON menu_categories FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- PRODUCT_NUTRITION_INFO RLS POLICIES
-- ============================================================================

-- Policy: Public can view nutrition info for available products
CREATE POLICY "Public can view nutrition info"
ON product_nutrition_info FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM products
    WHERE products.id = product_nutrition_info.product_id
    AND products.is_available_online = true
    AND products.is_active = true
  )
);

-- Policy: Staff can manage nutrition info for their business
CREATE POLICY "Staff can manage business nutrition info"
ON product_nutrition_info FOR ALL
USING (
  business_id IN (
    SELECT business_id FROM business_staff
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  business_id IN (
    SELECT business_id FROM business_staff
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Policy: Service role full access
CREATE POLICY "Service role full access on nutrition_info"
ON product_nutrition_info FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- CUSTOMER_PROFILES RLS POLICIES
-- ============================================================================

-- Policy: Users can view own profile
CREATE POLICY "Users can view own profile"
ON customer_profiles FOR SELECT
USING (user_id = auth.uid());

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON customer_profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update own profile
CREATE POLICY "Users can update own profile"
ON customer_profiles FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Staff can view profiles for their business customers
CREATE POLICY "Staff can view business customer profiles"
ON customer_profiles FOR SELECT
USING (
  business_id IN (
    SELECT business_id FROM business_staff
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Policy: Service role full access
CREATE POLICY "Service role full access on customer_profiles"
ON customer_profiles FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- NOTIFICATION_LOGS RLS POLICIES
-- ============================================================================

-- Policy: Users can view notifications for their own orders
CREATE POLICY "Users can view own order notifications"
ON notification_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM online_orders
    WHERE online_orders.id = notification_logs.order_id
    AND (
      online_orders.user_id = auth.uid() OR
      online_orders.guest_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
);

-- Policy: Staff can view notifications for their business
CREATE POLICY "Staff can view business notifications"
ON notification_logs FOR ALL
USING (
  business_id IN (
    SELECT business_id FROM business_staff
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  business_id IN (
    SELECT business_id FROM business_staff
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Policy: Service role full access
CREATE POLICY "Service role full access on notification_logs"
ON notification_logs FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is staff for a business
CREATE OR REPLACE FUNCTION is_business_staff(p_business_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM business_staff
    WHERE business_id = p_business_id
    AND user_id = p_user_id
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant usage on functions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION is_business_staff TO authenticated;
