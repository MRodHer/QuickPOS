---
id: SPEC-POS-001
version: "1.0.0"
status: "draft"
created: "2026-02-07"
updated: "2026-02-07"
author: "Developer"
priority: "HIGH"
title: "Plan de Implementación - Sistema de Pedidos Online con Recogida Programada"
---

# 1. RESUMEN EJECUTIVO

Este documento describe el plan de implementación del Sistema de Pedidos Online con Recogida Programada para el restaurante fitness/gourmet ubicado dentro del gimnasio. El sistema extiende QuickPOS añadiendo capacidades de pedidos online para clientes sin modificar la funcionalidad POS existente.

## 1.1 Objetivos

1. **Principal**: Permitir a los clientes del gimnasio realizar pedidos online con hora de recogida programada
2. **Secundario**: Ofrecer registro opcional con beneficios sin fricción
3. **Terciario**: Integrar pagos online y notificaciones multi-canal

## 1.2 Alcance del Proyecto

| Fase | Descripción | Duración Estimada |
|------|-------------|-------------------|
| Fase 1 | Menú fitness + Pedidos básicos (sin pago) | 2-3 semanas |
| Fase 2 | Panel staff + Notificaciones + Pagos Stripe | 2-3 semanas |
| Fase 3 | Perfil nutricional + Recomendaciones | 1-2 semanas |

---

# 2. ARQUITECTURA DEL SISTEMA

## 2.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 18 + TS)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │
│  │ Customer App  │  │  Staff Panel  │  │  Admin Panel  │           │
│  │  (Público)    │  │  (Privado)    │  │  (Privado)    │           │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘           │
│          │                  │                  │                     │
│          └──────────────────┴──────────────────┘                     │
│                             │                                       │
│                    ┌────────▼────────┐                              │
│                    │ Zustand Stores  │                              │
│                    │ (State Mgmt)    │                              │
│                    └────────┬────────┘                              │
└─────────────────────────────┼─────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SUPABASE (Backend)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │
│  │  PostgreSQL   │  │ Supabase Auth │  │   Realtime    │           │
│  │  (Database)   │  │  (Users/Roles) │  │ (Websockets)  │           │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘           │
│          │                  │                  │                     │
│          └──────────────────┴──────────────────┘                     │
│                             │                                       │
│                    ┌────────▼────────┐                              │
│                    │  RLS Policies   │                              │
│                    │  (Security)     │                              │
│                    └─────────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SERVICIOS EXTERNOS                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │
│  │    Stripe     │  │    Twilio     │  │   Telegram    │           │
│  │  (Payments)   │  │  (SMS API)    │  │     Bot       │           │
│  └───────────────┘  └───────────────┘  └───────────────┘           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 2.2 Stack Tecnológico (Alineado con QuickPOS)

| Capa | Tecnología | Versión | Justificación |
|------|------------|---------|---------------|
| **Frontend** | React | 18.3.1 | Stack existente QuickPOS |
| **Lenguaje** | TypeScript | 5.5.3 | Type safety |
| **Build** | Vite | 5.4.2 | Build rápido |
| **Estilos** | Tailwind CSS | 3.4.1 | Consistencia con QuickPOS |
| **State** | Zustand | Latest | Ligero, ya usado en QuickPOS |
| **Routing** | React Router | 7.13.0 | Ya existente |
| **Backend** | Supabase | Latest | Backend existente QuickPOS |
| **Database** | PostgreSQL | via Supabase | Multi-tenant con RLS |
| **Auth** | Supabase Auth | Latest | Ya integrado |
| **Realtime** | Supabase Realtime | Latest | Panel staff updates |
| **Pagos** | Stripe | Latest | PCI compliance |
| **Forms** | React Hook Form + Zod | Latest | Validación type-safe |

---

# 3. DISEÑO DE BASE DE DATOS

## 3.1 Tablas Nuevas (Extensiones a QuickPOS)

### 3.1.1 `online_orders`

Pedidos realizados a través de la interfaz online (cliente-facing).

```sql
CREATE TABLE online_orders (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Order identification
  order_number VARCHAR(20) UNIQUE NOT NULL, -- Formato: #KA-000001

  -- Customer (nullable for guest orders)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Guest info (when not registered)
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  guest_phone VARCHAR(50),

  -- Order details
  items JSONB NOT NULL, -- [{product_id, name, quantity, price, notes, nutrition_info}]
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  tip DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,

  -- Scheduling
  pickup_time TIMESTAMPTZ NOT NULL,
  estimated_prep_time INTEGER DEFAULT 30, -- minutos
  requested_time TIMESTAMPTZ, -- Hora que el cliente solicitó (si aplicó)

  -- Status
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'cancelled')),
  cancellation_reason TEXT,

  -- Payment
  payment_method VARCHAR(20) DEFAULT 'on_arrival'
    CHECK (payment_method IN ('stripe', 'cash', 'card_terminal')),
  payment_status VARCHAR(20) DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  stripe_payment_intent_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),

  -- Notifications
  notification_method VARCHAR(20) DEFAULT 'email'
    CHECK (notification_method IN ('email', 'sms', 'telegram')),
  notification_sent BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,

  -- Notes
  customer_notes TEXT,
  staff_notes TEXT,
  internal_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  started_preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}' -- Additional data for future use
);

-- Indexes
CREATE INDEX idx_online_orders_business_id ON online_orders(business_id);
CREATE INDEX idx_online_orders_user_id ON online_orders(user_id);
CREATE INDEX idx_online_orders_status ON online_orders(business_id, status);
CREATE INDEX idx_online_orders_pickup_time ON online_orders(business_id, pickup_time);
CREATE INDEX idx_online_orders_created_at ON online_orders(created_at DESC);
```

### 3.1.2 `online_order_status_history`

Historial de cambios de estado de pedidos online (audit log).

```sql
CREATE TABLE online_order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES online_orders(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_status_history_order_id ON online_order_status_history(order_id);
```

### 3.1.3 `menu_categories`

Categorías específicas para menú fitness (extiende categorías básicas).

```sql
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Category info
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(255), -- URL to icon
  color VARCHAR(20), -- Hex color for UI

  -- Fitness-specific
  category_type VARCHAR(20)
    CHECK (category_type IN ('pre_workout', 'post_workout', 'balanced', 'snacks', 'drinks')),

  -- Display
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  -- Nutritional highlights (shown in category card)
  nutrition_highlight JSONB, -- {calories_range, protein_range, main_benefits}

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, slug)
);

CREATE INDEX idx_menu_categories_business_id ON menu_categories(business_id);
CREATE INDEX idx_menu_categories_active ON menu_categories(business_id, is_active);
```

### 3.1.4 `product_nutrition_info`

Información nutricional detallada para productos (extiende `products`).

```sql
CREATE TABLE product_nutrition_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Serving info
  serving_size VARCHAR(100), -- "1 plato (350g)"
  servings_per_container INTEGER,

  -- Macros (per serving)
  calories INTEGER,
  protein DECIMAL(5,1), -- gramos
  carbohydrates DECIMAL(5,1), -- gramos
  fat DECIMAL(5,1), -- gramos
  fiber DECIMAL(5,1), -- gramos
  sugar DECIMAL(5,1), -- gramos
  sodium INTEGER, -- mg

  -- Micros (optional)
  vitamins JSONB, -- {a, c, d, e, k, b12, etc}
  minerals JSONB, -- {iron, calcium, magnesium, zinc, etc}

  -- Fitness-specific
  protein_score INTEGER, -- 1-10 for high protein indicator
  calorie_score INTEGER, -- 1-10 for calorie density
  health_score INTEGER, -- 1-10 overall health score

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, product_id)
);

CREATE INDEX idx_product_nutrition_business_product ON product_nutrition_info(business_id, product_id);
```

### 3.1.5 `customer_profiles`

Perfiles opcionales de clientes registrados con preferencias fitness.

```sql
CREATE TABLE customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,

  -- Fitness goals
  fitness_goal VARCHAR(20)
    CHECK (fitness_goal IN ('lose_weight', 'gain_muscle', 'maintain', 'performance', 'general_health')),

  -- Daily targets
  daily_calorie_target INTEGER,
  daily_protein_target INTEGER, -- gramos
  daily_carbs_target INTEGER,
  daily_fat_target INTEGER,

  -- Dietary preferences
  dietary_preferences TEXT[], -- {vegan, vegetarian, keto, paleo, gluten_free, dairy_free}
  allergies TEXT[], -- {nuts, gluten, dairy, eggs, soy, shellfish}

  -- Notification preferences
  preferred_notification_method VARCHAR(20) DEFAULT 'email'
    CHECK (preferred_notification_method IN ('email', 'sms', 'telegram')),

  phone_number VARCHAR(50), -- Para SMS/Telegram
  telegram_chat_id VARCHAR(255), -- Para notificaciones Telegram

  -- Favorites
  favorite_products UUID[], -- Array of product IDs

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, user_id),
  UNIQUE(business_id, customer_id)
);

CREATE INDEX idx_customer_profiles_user ON customer_profiles(user_id);
CREATE INDEX idx_customer_profiles_customer ON customer_profiles(customer_id);
```

### 3.1.6 `notification_logs`

Registro de todas las notificaciones enviadas.

```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Target
  order_id UUID REFERENCES online_orders(id) ON DELETE SET NULL,
  recipient VARCHAR(255) NOT NULL, -- Email, phone, or chat_id

  -- Notification details
  channel VARCHAR(20) NOT NULL, -- email, sms, telegram
  type VARCHAR(50) NOT NULL, -- order_confirmed, order_ready, order_reminded, etc.
  status VARCHAR(20) DEFAULT 'sent'
    CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),

  -- Content
  subject VARCHAR(255),
  content TEXT,

  -- External IDs
  external_id VARCHAR(255), -- Twilio SID, Telegram message_id, etc.

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_business ON notification_logs(business_id);
CREATE INDEX idx_notification_logs_order ON notification_logs(order_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
```

## 3.2 Modificaciones a Tablas Existentes QuickPOS

### 3.2.1 Extensión de `products`

```sql
-- Agregar campos a products existentes si no existen
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_available_online BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS online_category_id UUID REFERENCES menu_categories(id),
  ADD COLUMN IF NOT EXISTS featured_rank INTEGER; -- Para orden de destacados
```

### 3.2.2 Extensión de `customers`

```sql
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_online_customer BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_online_order_at TIMESTAMPTZ;
```

## 3.3 RLS Policies (Row Level Security)

```sql
-- Enable RLS
ALTER TABLE online_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_nutrition_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can only see their own orders
CREATE POLICY "Customers can view own orders"
ON online_orders FOR SELECT
USING (
  auth.uid() = user_id OR
  guest_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Policy: Staff can see all orders for their business
CREATE POLICY "Staff can view business orders"
ON online_orders FOR ALL
USING (
  business_id IN (SELECT business_id FROM user_businesses WHERE user_id = auth.uid())
);

-- Similar policies for other tables...
```

---

# 4. ARQUITECTURA DE FRONTEND

## 4.1 Estructura de Directorios

```
src/
├── components/
│   ├── online-orders/          # NEW: Online orders components
│   │   ├── customer/           # Customer-facing components
│   │   │   ├── MenuSection.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── NutritionInfo.tsx
│   │   │   ├── CartDrawer.tsx
│   │   │   ├── CheckoutForm.tsx
│   │   │   ├── PickupTimeSelector.tsx
│   │   │   ├── OrderConfirmation.tsx
│   │   │   └── OrderTracking.tsx
│   │   ├── staff/              # Staff panel components
│   │   │   ├── StaffDashboard.tsx
│   │   │   ├── OrdersKanban.tsx
│   │   │   ├── OrderCard.tsx
│   │   │   ├── OrderDetailModal.tsx
│   │   │   └── StatusControls.tsx
│   │   └── shared/             # Shared components
│   │       ├── NutritionLabel.tsx
│   │       ├── AllergenTags.tsx
│   │       └── OrderStatusBadge.tsx
│   ├── pos/                    # EXISTING: Reuse from QuickPOS
│   ├── products/               # EXISTING: Reuse from QuickPOS
│   └── customers/              # EXISTING: Reuse from QuickPOS
├── stores/                     # Zustand stores
│   ├── onlineCartStore.ts      # NEW: Online cart
│   ├── customerProfileStore.ts # NEW: Customer profile
│   └── staffOrdersStore.ts     # NEW: Staff orders
├── hooks/
│   ├── useOnlineOrders.ts      # NEW: Online orders hooks
│   ├── useNutritionInfo.ts     # NEW: Nutrition data
│   └── useStripePayment.ts     # NEW: Stripe integration
├── services/
│   ├── onlineOrderService.ts   # NEW: Order API calls
│   ├── notificationService.ts  # NEW: Notifications
│   └── stripeService.ts        # NEW: Stripe wrapper
├── pages/
│   ├── OnlineMenu.tsx          # NEW: Public menu page
│   ├── OnlineCheckout.tsx      # NEW: Checkout page
│   ├── StaffOrders.tsx         # NEW: Staff dashboard
│   └── CustomerProfile.tsx     # NEW: Profile management
└── types/
    └── online-orders.ts        # NEW: TypeScript types
```

## 4.2 Zustand Stores

### 4.2.1 Online Cart Store

```typescript
// stores/onlineCartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  nutritionInfo?: NutritionInfo;
}

interface OnlineCartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: () => number;
}

export const useOnlineCartStore = create<OnlineCartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const items = get().items;
        const existing = items.find(i => i.productId === item.productId);
        if (existing) {
          set({
            items: items.map(i =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          });
        } else {
          set({ items: [...items, item] });
        }
      },
      removeItem: (productId) =>
        set({ items: get().items.filter(i => i.productId !== productId) }),
      updateQuantity: (productId, quantity) =>
        set({
          items: get().items.map(i =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        }),
      clearCart: () => set({ items: [] }),
      subtotal: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }),
    { name: 'online-cart' }
  )
);
```

### 4.2.2 Staff Orders Store (with Realtime)

```typescript
// stores/staffOrdersStore.ts
import { create } from 'zustand';
import { RealtimeChannel } from '@supabase/supabase-js';

interface StaffOrdersState {
  orders: OnlineOrder[];
  loading: boolean;
  error: string | null;
  channel: RealtimeChannel | null;
  subscribeToOrders: (businessId: string) => void;
  unsubscribe: () => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
}

export const useStaffOrdersStore = create<StaffOrdersState>((set, get) => ({
  orders: [],
  loading: false,
  error: null,
  channel: null,

  subscribeToOrders: (businessId: string) => {
    const channel = supabase
      .channel(`staff-orders-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'online_orders',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          // Handle real-time updates
          const { eventType, new: newRecord, old: oldRecord } = payload;
          switch (eventType) {
            case 'INSERT':
              set({ orders: [newRecord, ...get().orders] });
              break;
            case 'UPDATE':
              set({
                orders: get().orders.map(o =>
                  o.id === newRecord.id ? newRecord : o
                ),
              });
              break;
            case 'DELETE':
              set({
                orders: get().orders.filter(o => o.id !== oldRecord.id),
              });
              break;
          }
        }
      )
      .subscribe();

    set({ channel });
  },

  unsubscribe: () => {
    const { channel } = get();
    if (channel) {
      supabase.removeChannel(channel);
      set({ channel: null });
    }
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus) => {
    // Update order status via Supabase
    const { error } = await supabase
      .from('online_orders')
      .update({ status, [`${status}_at`]: new Date().toISOString() })
      .eq('id', orderId);

    if (error) set({ error: error.message });
  },
}));
```

---

# 5. API ENDPOINTS (Supabase)

## 5.1 Customer-Facing Endpoints

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/menu` | GET | Obtener menú con productos activos | Público |
| `/menu/:category` | GET | Productos por categoría | Público |
| `/orders` | POST | Crear nuevo pedido online | Invitado/User |
| `/orders/:id` | GET | Ver detalle de pedido | User (own) |
| `/orders/my` | GET | Mis pedidos | User |
| `/orders/:id/cancel` | POST | Cancelar pedido | User (own) |
| `/profile` | GET/PUT | Gestionar perfil nutricional | User |
| `/payments/create-intent` | POST | Crear Payment Intent | User |
| `/payments/confirm` | POST | Confirmar pago | User |

## 5.2 Staff Endpoints

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/staff/orders` | GET | Listar pedidos (filtros) | Staff+ |
| `/staff/orders/:id` | GET | Detalle de pedido | Staff+ |
| `/staff/orders/:id/status` | PATCH | Actualizar estado | Staff+ |
| `/staff/orders/queue` | GET | Cola de pedidos pendientes | Staff+ |
| `/staff/dashboard` | GET | Métricas del dashboard | Staff+ |
| `/staff/menu` | PUT | Actualizar menú | Admin |

## 5.3 Webhooks

| Webhook | Origen | Propósito |
|---------|--------|-----------|
| `/webhooks/stripe` | Stripe | Eventos de pago |
| `/webhooks/twilio` | Twilio | SMS delivery status |

---

# 6. PLAN DE IMPLEMENTACIÓN POR FASES

## FASE 1: MVP - Menú + Pedidos Básicos

### Objetivo
Cliente puede ver menú y crear pedido sin pago online.

### Tareas

| ID | Tarea | Dependencia | Estimado |
|----|-------|-------------|----------|
| F1-T1 | Crear migraciones de DB (tablas nuevas) | - | 4h |
| F1-T2 | Implementar RLS policies | F1-T1 | 2h |
| F1-T3 | Crear página de menú público | - | 6h |
| F1-T4 | Componente ProductCard con info nutricional | - | 4h |
| F1-T5 | Filtros por categoría y preferencias | F1-T3 | 3h |
| F1-T6 | Zustand store para carrito online | - | 2h |
| F1-T7 | Componente CartDrawer | F1-T6 | 4h |
| F1-T8 | Formulario de checkout (invitado) | F1-T7 | 4h |
| F1-T9 | PickupTimeSelector component | - | 4h |
| F1-T10 | Servicio para crear pedidos | F1-T1 | 3h |
| F1-T11 | Página de confirmación de pedido | F1-T10 | 2h |
| F1-T12 | Testing y bug fixes | Todas | 4h |

**Total Estimado**: 42 horas (~1 semana)

### Deliverables Fase 1
- ✅ Menú público visible en URL pública
- ✅ Cliente puede agregar productos al carrito
- ✅ Checkout como invitado (nombre, email, teléfono)
- ✅ Selección de hora de recogida
- ✅ Confirmación de pedido con número de orden
- ✅ Email de confirmación enviado

---

## FASE 2: Panel Staff + Notificaciones + Pagos

### Objetivo
Staff puede gestionar pedidos online y pagos integrados.

### Tareas

| ID | Tarea | Dependencia | Estimado |
|----|-------|-------------|----------|
| F2-T1 | Panel Staff - Dashboard con lista de pedidos | F1 | 6h |
| F2-T2 | Kanban view de pedidos por estado | F2-T1 | 6h |
| F2-T3 | Realtime updates con Supabase | F2-T1 | 4h |
| F2-T4 | Controles de cambio de estado | F2-T3 | 3h |
| F2-T5 | OrderDetailModal | F2-T1 | 3h |
| F2-T6 | Integración Stripe Checkout | F1 | 6h |
| F2-T7 | Stripe Payment Intents API | F2-T6 | 4h |
| F2-T8 | Webhook handler de Stripe | F2-T7 | 3h |
| F2-T9 | Servicio de notificaciones por email | F2-T4 | 3h |
| F2-T10 | Integración Twilio SMS (opcional) | F2-T9 | 4h |
| F2-T11 | Integración Telegram Bot (opcional) | F2-T9 | 4h |
| F2-T12 | Testing y bug fixes | Todas | 6h |

**Total Estimado**: 52 horas (~1.5 semanas)

### Deliverables Fase 2
- ✅ Panel staff con vista en tiempo real
- ✅ Cambio de estado con un clic
- ✅ Notificaciones enviadas al marcar como listo
- ✅ Pagos con Stripe integrados
- ✅ Opción de pagar en recepción

---

## FASE 3: Perfil Nutricional + Recomendaciones

### Objetivo
Clientes registrados tienen experiencia personalizada.

### Tareas

| ID | Tarea | Dependencia | Estimado |
|----|-------|-------------|----------|
| F3-T1 | Formulario de registro con beneficios | F2 | 4h |
| F3-T2 | Página de perfil de cliente | F3-T1 | 4h |
| F3-T3 | Configuración de objetivos fitness | F3-T2 | 3h |
| F3-T4 | Calculadora de macros del pedido | F3-T3 | 4h |
| F3-T5 | Sistema de favoritos | F3-T2 | 3h |
| F3-T6 | Historial de pedidos del cliente | F3-T2 | 3h |
| F3-T7 | Recomendaciones inteligentes | F3-T4 | 6h |
| F3-T8 | Filtros personalizados según perfil | F3-T4 | 3h |
| F3-T9 | Testing y bug fixes | Todas | 4h |

**Total Estimado**: 34 horas (~1 semana)

### Deliverables Fase 3
- ✅ Registro de cliente con perfil nutricional
- ✅ Historial completo de pedidos
- ✅ Sistema de favoritos
- ✅ Recomendaciones según objetivos
- ✅ Alertas de macros en el carrito

---

# 7. PLAN DE TESTING

## 7.1 Pruebas Unitarias

- Zustand stores (cart, profile, staff)
- Utilidades de cálculo nutricional
- Servicios de API (order, notification, stripe)

## 7.2 Pruebas de Integración

- Flujo completo de pedido (menú → carrito → checkout → confirmación)
- Actualizaciones en tiempo real del panel staff
- Webhook de Stripe
- Envío de notificaciones

## 7.3 Pruebas E2E (Playwright)

- Escenarios de cliente (invitado y registrado)
- Escenarios de staff
- Flujos de pago
- Notificaciones

## 7.4 Pruebas de Carga

- 100 pedidos simultáneos
- Performance de actualizaciones realtime
- Tiempo de respuesta de endpoints

---

# 8. MATRIZ DE RIESGOS

| Riesgo | Probabilidad | Impacto | Mitigación | Plan B |
|--------|--------------|---------|------------|--------|
| Supabase downtime | Media | Alto | Cache local + graceful degradation | Mensaje de mantenimiento |
| Fallo en notificaciones | Media | Medio | Retry + log | Staff llama manualmente |
| Stripe downtime | Baja | Alto | Permitir pago en recepción | Deshabilitar pago online temporalmente |
| Saturación en hora pico | Media | Medio | Sistema de cola | Ajustar tiempo de preparación dinámicamente |
| Bug en integración QuickPOS | Baja | Alto | Testing exhaustivo | Revertir cambios via migrations |

---

# 9. CRITERIOS DE ÉXITO

## Métricas de Producto

| Métrica | Meta | Medición |
|---------|------|----------|
| Tiempo de creación de pedido | < 2 minutos | Analytics |
| Pedidos por día (target) | 50+ | DB query |
| Tasa de registro opcional | 30-40% | DB query |
| Pedidos con pago online | 60%+ | DB query |
| Tiempo de notificación | < 30 seg después de listo | Log |
| Satisfacción cliente | > 4.5/5 | Encuestas |

## Métricas Técnicas

| Métrica | Meta | Medición |
|---------|------|----------|
| Uptime | 99.5% | Monitoring |
| Response time p95 | < 2s | Analytics |
| Error rate | < 0.5% | Error tracking |
| Realtime latency | < 500ms | Supabase metrics |

---

# 10. PRÓXIMOS PASOS (POST-ESPEC)

1. **Revisión y Aprobación**: Revisar este SPEC con stakeholders
2. **Configuración de Ambiente**:
   - Crear proyecto en Supabase
   - Configurar Stripe account
   - Setup de Twilio (opcional)
3. **Ejecutar `/moai:2-run SPEC-POS-001`**: Iniciar implementación TDD
4. **Testing**: Ejecutar plan de pruebas completo
5. **Deploy**: Deploy a producción con monitoring

---

**Fin del Plan de Implementación**
