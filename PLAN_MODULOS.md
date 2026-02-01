# Plan de Módulos Premium - QuickPOS

## Estado Actual

### ✅ Completados
- **Panel Super Admin** (`/admin`) - Gestión de negocios y módulos
- **Sistema de Módulos** - Toggle on/off por negocio
- **Descuentos y Cupones** - Crear/gestionar códigos (falta ejecutar migración)
- **Pagos con Clip** - Links de pago, webhook para verificación automática
- **WhatsApp en Tickets** - Botón para enviar ticket por WhatsApp

### 🔧 Pendientes de Implementar

---

## 1. Descuentos y Cupones
**Estado:** Código listo, falta migración

**Pendiente:**
- [ ] Ejecutar migración: `supabase/migrations/20260129100000_add_discount_codes.sql`
- [ ] Integrar validación de cupón en CheckoutModal
- [ ] Aplicar descuento al total de la venta
- [ ] Decrementar contador de usos al aplicar cupón

---

## 2. Pagos con Clip
**Estado:** Funcional

**Pendiente:**
- [ ] Deploy de Edge Function `clip-webhook` en Supabase
- [ ] Configurar webhook URL en dashboard de Clip
- [ ] Probar flujo completo de pago
- [ ] Agregar polling automático mientras espera pago

---

## 3. Reportes Avanzados
**Estado:** Por implementar

**Funcionalidades:**
- [ ] Dashboard con gráficas de ventas (día, semana, mes)
- [ ] Top productos más vendidos
- [ ] Análisis de horarios pico
- [ ] Comparativa periodos anteriores
- [ ] Exportar a Excel (.xlsx)
- [ ] Exportar a PDF
- [ ] Reportes programados por email

**Archivos a crear:**
- `src/components/reports/AdvancedReportsPage.tsx`
- `src/hooks/useReportData.ts`
- Usar librería: recharts o chart.js

---

## 4. Multi-Sucursal
**Estado:** Por implementar

**Funcionalidades:**
- [ ] Un usuario puede tener múltiples negocios
- [ ] Selector de sucursal en header
- [ ] Dashboard consolidado (todas las sucursales)
- [ ] Transferencia de inventario entre sucursales
- [ ] Reportes por sucursal y consolidados

**Cambios en DB:**
```sql
-- Agregar tabla de sucursales
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  name VARCHAR(200) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  is_main BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modificar productos para tener stock por sucursal
CREATE TABLE branch_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id),
  product_id UUID REFERENCES products(id),
  stock_quantity DECIMAL(10,2) DEFAULT 0,
  UNIQUE(branch_id, product_id)
);
```

---

## 5. Roles y Permisos
**Estado:** Parcialmente implementado (tabla business_staff existe)

**Funcionalidades:**
- [ ] Definir permisos granulares por rol
- [ ] UI para asignar permisos
- [ ] Verificar permisos en cada acción
- [ ] Roles predefinidos: owner, admin, manager, cashier, staff
- [ ] Permisos personalizados

**Permisos a implementar:**
```javascript
const PERMISSIONS = {
  pos_sell: 'Realizar ventas',
  pos_discount: 'Aplicar descuentos',
  pos_refund: 'Hacer devoluciones',
  inventory_view: 'Ver inventario',
  inventory_edit: 'Modificar inventario',
  products_view: 'Ver productos',
  products_edit: 'Editar productos',
  reports_view: 'Ver reportes',
  reports_export: 'Exportar reportes',
  cash_open: 'Abrir caja',
  cash_close: 'Cerrar caja',
  settings_view: 'Ver configuración',
  settings_edit: 'Editar configuración',
  staff_manage: 'Gestionar personal',
};
```

---

## 6. WhatsApp Integrado
**Estado:** Básico implementado (botón manual)

**Funcionalidades:**
- [ ] Envío automático de ticket al completar venta (si cliente tiene teléfono)
- [ ] Plantillas de mensajes personalizables
- [ ] Notificación de pago pendiente (recordatorio)
- [ ] Notificación de pago completado
- [ ] Integración con WhatsApp Business API (opcional, más adelante)

**Configuración por negocio:**
```sql
ALTER TABLE businesses ADD COLUMN whatsapp_settings JSONB DEFAULT '{
  "auto_send_ticket": false,
  "ticket_template": "Hola {cliente}! Aquí está tu ticket...",
  "payment_reminder": true,
  "reminder_hours": 24
}';
```

---

## 7. Facturación CFDI
**Estado:** Por implementar

**Funcionalidades:**
- [ ] Integración con PAC (Facturama, Finkok, etc.)
- [ ] Captura de datos fiscales del cliente (RFC, razón social, uso CFDI)
- [ ] Generar factura desde venta completada
- [ ] Enviar factura por email
- [ ] Cancelación de facturas
- [ ] Catálogo de productos SAT (clave producto/servicio)

**Tablas nuevas:**
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  sale_id UUID REFERENCES sales(id),
  customer_id UUID REFERENCES customers(id),
  uuid_fiscal VARCHAR(50), -- UUID del SAT
  serie VARCHAR(10),
  folio INTEGER,
  subtotal DECIMAL(12,2),
  iva DECIMAL(12,2),
  total DECIMAL(12,2),
  payment_method VARCHAR(10), -- PUE, PPD
  payment_form VARCHAR(10), -- 01, 03, 04, etc.
  cfdi_use VARCHAR(10), -- G01, G03, etc.
  status VARCHAR(20) DEFAULT 'active', -- active, cancelled
  xml_url TEXT,
  pdf_url TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Datos fiscales del cliente
ALTER TABLE customers ADD COLUMN rfc VARCHAR(13);
ALTER TABLE customers ADD COLUMN razon_social VARCHAR(300);
ALTER TABLE customers ADD COLUMN regimen_fiscal VARCHAR(10);
ALTER TABLE customers ADD COLUMN codigo_postal VARCHAR(5);
ALTER TABLE customers ADD COLUMN cfdi_use VARCHAR(10) DEFAULT 'G01';
```

**PAC recomendado:** Facturama (API fácil, buen precio)

---

## 8. Tienda Online (Ecommerce)
**Estado:** Por implementar

**Funcionalidades:**
- [ ] Página pública de catálogo
- [ ] Carrito de compras online
- [ ] Checkout con Clip/Stripe
- [ ] Sincronización de inventario POS <-> Tienda
- [ ] Gestión de pedidos
- [ ] Notificaciones de nuevos pedidos

**Estructura:**
```
/tienda/[negocio-slug]  -> Catálogo público
/tienda/[negocio-slug]/producto/[id]  -> Detalle producto
/tienda/[negocio-slug]/carrito  -> Carrito
/tienda/[negocio-slug]/checkout  -> Pago
```

**Tablas nuevas:**
```sql
CREATE TABLE online_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  customer_name VARCHAR(200),
  customer_email VARCHAR(200),
  customer_phone VARCHAR(20),
  shipping_address TEXT,
  subtotal DECIMAL(10,2),
  shipping_cost DECIMAL(10,2),
  total DECIMAL(10,2),
  payment_status VARCHAR(20), -- pending, paid, failed
  order_status VARCHAR(20), -- pending, confirmed, shipped, delivered, cancelled
  payment_reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE online_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES online_orders(id),
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(200),
  quantity INTEGER,
  unit_price DECIMAL(10,2),
  total DECIMAL(10,2)
);
```

---

## 9. Acceso API
**Estado:** Por implementar

**Funcionalidades:**
- [ ] Generación de API keys por negocio
- [ ] Documentación de endpoints (Swagger/OpenAPI)
- [ ] Rate limiting
- [ ] Webhooks para eventos (nueva venta, stock bajo, etc.)

**Endpoints principales:**
```
GET    /api/v1/products        - Listar productos
GET    /api/v1/products/:id    - Detalle producto
POST   /api/v1/sales           - Crear venta
GET    /api/v1/sales           - Listar ventas
GET    /api/v1/inventory       - Estado inventario
POST   /api/v1/inventory/adjust - Ajustar stock
GET    /api/v1/customers       - Listar clientes
POST   /api/v1/webhooks        - Configurar webhooks
```

**Tabla para API keys:**
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  name VARCHAR(100),
  key_hash VARCHAR(64), -- SHA256 del key
  key_prefix VARCHAR(8), -- Primeros 8 chars para identificar
  permissions TEXT[], -- ['read:products', 'write:sales', etc.]
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Prioridad Sugerida

1. **Descuentos** - Solo falta ejecutar migración e integrar en checkout
2. **Pagos Clip** - Terminar webhook y probar
3. **Reportes Avanzados** - Alto valor, relativamente fácil
4. **Facturación CFDI** - Muy solicitado en México
5. **Roles y Permisos** - Base ya existe
6. **WhatsApp Integrado** - Mejora la experiencia
7. **Multi-Sucursal** - Para negocios más grandes
8. **Tienda Online** - Proyecto más grande
9. **API** - Para integradores

---

## Notas Técnicas

- **Edge Functions:** `supabase/functions/` - Deploy con `supabase functions deploy`
- **Migraciones:** `supabase/migrations/` - Ejecutar en SQL Editor
- **Build:** `npm run build` después de cambios en código
- **Super Admin:** `mauricio.rodher+admin@gmail.com`

---

Última actualización: 2026-01-29
