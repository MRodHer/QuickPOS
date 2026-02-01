/*
  # SPEC-SAAS-001: Multitenant Architecture - Add store_id Columns

  ## Tables Modified (QuickPOS specific)
  - Products, Inventory, Customers, Suppliers
  - Sales, Purchases, Cash Register, Terminals
*/

-- ============================================
-- PRODUCTS & INVENTORY
-- ============================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_store
  ON products(sku, store_id)
  WHERE store_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_items') THEN
    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_inventory_items_store ON inventory_items(store_id);
  END IF;
END $$;

-- ============================================
-- CUSTOMERS & SUPPLIERS
-- ============================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_customers_store ON customers(store_id);

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_suppliers_store ON suppliers(store_id);

-- ============================================
-- SALES & PURCHASES
-- ============================================
ALTER TABLE sales ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sales_store ON sales(store_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sale_items') THEN
    ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_sale_items_store ON sale_items(store_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchases') THEN
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_purchases_store ON purchases(store_id);
  END IF;
END $$;

-- ============================================
-- CASH REGISTER & TERMINALS
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cash_registers') THEN
    ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_cash_registers_store ON cash_registers(store_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'terminals') THEN
    ALTER TABLE terminals ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_terminals_store ON terminals(store_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cash_movements') THEN
    ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_cash_movements_store ON cash_movements(store_id);
  END IF;
END $$;
