# Estructura de Base de Datos

QuickPOS usa **Supabase** (PostgreSQL) con Row Level Security (RLS) para multi-tenancy.

---

## Diagrama de Entidades

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   users     │────▶│  businesses │────▶│  products   │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                    │
      │                   │                    │
      ▼                   ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ user_roles  │     │   sales     │◀────│ sale_items  │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │cash_registers│
                    └─────────────┘
```

---

## Tablas Principales

### users
Usuarios del sistema (gestionado por Supabase Auth).

```sql
-- Tabla manejada por Supabase Auth
auth.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  created_at TIMESTAMP
)
```

### businesses
Negocios/tiendas registradas.

```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  rfc TEXT,                    -- RFC para facturación (México)
  logo_url TEXT,
  receipt_footer TEXT,         -- Texto al pie del ticket
  default_tax_rate DECIMAL(5,2) DEFAULT 0.16,
  currency TEXT DEFAULT 'MXN',
  timezone TEXT DEFAULT 'America/Mexico_City',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### categories
Categorías de productos.

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,                  -- Color para UI
  icon TEXT,                   -- Icono (nombre de Lucide)
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);
```

### products
Productos del inventario.

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,                    -- Código interno
  barcode TEXT,                -- Código de barras
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2),          -- Costo de adquisición
  tax_rate DECIMAL(5,2) DEFAULT 0.16,
  tax_included BOOLEAN DEFAULT false,
  track_stock BOOLEAN DEFAULT true,
  stock_quantity INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0, -- Alerta de stock bajo
  unit TEXT DEFAULT 'pza',     -- Unidad de medida
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Índices
CREATE INDEX idx_products_barcode ON products(business_id, barcode);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_search ON products USING gin(to_tsvector('spanish', name));
```

### cash_registers
Sesiones de caja.

```sql
CREATE TABLE cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  opened_by UUID REFERENCES auth.users(id),
  closed_by UUID REFERENCES auth.users(id),
  opening_amount DECIMAL(10,2) NOT NULL,
  closing_amount DECIMAL(10,2),
  expected_amount DECIMAL(10,2),
  difference DECIMAL(10,2),
  total_sales DECIMAL(10,2) DEFAULT 0,
  total_cash DECIMAL(10,2) DEFAULT 0,
  total_card DECIMAL(10,2) DEFAULT 0,
  total_terminal DECIMAL(10,2) DEFAULT 0,
  total_transfer DECIMAL(10,2) DEFAULT 0,
  sale_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open',  -- open, closed
  opened_at TIMESTAMP DEFAULT now(),
  closed_at TIMESTAMP,
  notes TEXT
);
```

### sales
Ventas realizadas.

```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  cash_register_id UUID REFERENCES cash_registers(id),
  seller_id UUID REFERENCES auth.users(id),
  customer_id UUID,            -- Opcional, para clientes registrados
  ticket_number TEXT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL, -- cash, card, terminal, transfer, mixed
  amount_paid DECIMAL(10,2),
  change_amount DECIMAL(10,2) DEFAULT 0,
  cash_amount DECIMAL(10,2) DEFAULT 0,
  card_amount DECIMAL(10,2) DEFAULT 0,
  terminal_amount DECIMAL(10,2) DEFAULT 0,
  transfer_amount DECIMAL(10,2) DEFAULT 0,
  card_reference TEXT,
  transfer_reference TEXT,
  status TEXT DEFAULT 'completed', -- completed, cancelled, refunded
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Índices
CREATE INDEX idx_sales_business_date ON sales(business_id, created_at DESC);
CREATE INDEX idx_sales_ticket ON sales(business_id, ticket_number);
```

### sale_items
Detalle de productos en cada venta.

```sql
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,  -- Snapshot del nombre
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL
);
```

### stock_movements
Historial de movimientos de inventario.

```sql
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL,          -- sale, purchase, adjustment, return
  quantity INTEGER NOT NULL,   -- Positivo o negativo
  previous_stock INTEGER,
  new_stock INTEGER,
  reference_id UUID,           -- ID de venta/compra relacionada
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

### cash_movements
Movimientos de efectivo en caja.

```sql
CREATE TABLE cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  cash_register_id UUID REFERENCES cash_registers(id),
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL,          -- sale, withdrawal, deposit, expense
  amount DECIMAL(10,2) NOT NULL,
  sale_id UUID REFERENCES sales(id),
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## Row Level Security (RLS)

### Políticas por Tabla

```sql
-- Ejemplo para products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo ven productos de sus negocios
CREATE POLICY "Users can view own business products"
  ON products FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid()
      OR id IN (
        SELECT business_id FROM user_roles
        WHERE user_id = auth.uid()
      )
    )
  );

-- Los usuarios solo modifican productos de sus negocios
CREATE POLICY "Users can modify own business products"
  ON products FOR ALL
  USING (
    business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid()
    )
  );
```

---

## Funciones SQL

### Generar Número de Ticket

```sql
CREATE OR REPLACE FUNCTION generate_ticket_number(p_business_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_date TEXT;
BEGIN
  v_date := TO_CHAR(NOW(), 'YYYYMMDD');

  SELECT COUNT(*) + 1 INTO v_count
  FROM sales
  WHERE business_id = p_business_id
    AND DATE(created_at) = CURRENT_DATE;

  RETURN 'T-' || v_date || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
```

### Resumen de Ventas del Día

```sql
CREATE OR REPLACE FUNCTION get_daily_sales_summary(
  p_business_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_sales DECIMAL,
  sale_count INTEGER,
  avg_ticket DECIMAL,
  total_cash DECIMAL,
  total_card DECIMAL,
  total_terminal DECIMAL,
  total_transfer DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(total), 0) as total_sales,
    COUNT(*)::INTEGER as sale_count,
    COALESCE(AVG(total), 0) as avg_ticket,
    COALESCE(SUM(cash_amount), 0) as total_cash,
    COALESCE(SUM(card_amount), 0) as total_card,
    COALESCE(SUM(terminal_amount), 0) as total_terminal,
    COALESCE(SUM(transfer_amount), 0) as total_transfer
  FROM sales
  WHERE business_id = p_business_id
    AND DATE(created_at) = p_date
    AND status = 'completed';
END;
$$ LANGUAGE plpgsql;
```

### Productos Más Vendidos

```sql
CREATE OR REPLACE FUNCTION get_top_products(
  p_business_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  total_quantity INTEGER,
  total_revenue DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    si.product_id,
    si.product_name,
    SUM(si.quantity)::INTEGER as total_quantity,
    SUM(si.total) as total_revenue
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  WHERE s.business_id = p_business_id
    AND DATE(s.created_at) BETWEEN p_start_date AND p_end_date
    AND s.status = 'completed'
  GROUP BY si.product_id, si.product_name
  ORDER BY total_quantity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## Índices Recomendados

```sql
-- Búsqueda de productos
CREATE INDEX idx_products_business_active
  ON products(business_id) WHERE active = true;

-- Ventas por fecha
CREATE INDEX idx_sales_created_at
  ON sales(created_at DESC);

-- Stock bajo
CREATE INDEX idx_products_low_stock
  ON products(business_id)
  WHERE track_stock = true AND stock_quantity <= min_stock;
```

---

## Triggers

### Actualizar Timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### Validar Stock Negativo

```sql
CREATE OR REPLACE FUNCTION check_stock_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_quantity < 0 THEN
    RAISE EXCEPTION 'Stock no puede ser negativo';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_check_stock
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_stock_quantity();
```

---

## Backup y Restauración

### Exportar Datos

```bash
# Desde Supabase Dashboard
# Settings → Database → Backups

# O con pg_dump
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
```

### Restaurar

```bash
psql -h db.xxx.supabase.co -U postgres -d postgres < backup.sql
```

---

## Migraciones

Las migraciones se manejan desde Supabase Dashboard o con Supabase CLI:

```bash
# Instalar CLI
npm install -g supabase

# Login
supabase login

# Crear migración
supabase migration new add_customer_field

# Aplicar migraciones
supabase db push
```

---

*Última actualización: Enero 2026*
