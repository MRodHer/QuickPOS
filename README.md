# QuickPOS

Sistema POS (Point of Sale) multi-tenant para restaurantes con integración de pedidos online.

## Features

- **POS**: Sistema de punto de venta completo
- **Multi-tenant**: Soporte para múltiples negocios
- **Inventario**: Gestión de productos e inventario
- **Ventas**: Historial de ventas y reportes
- **Clientes**: Gestión de clientes
- **Descuentos**: Sistema de descuentos y promociones
- **Caja**: Apertura y cierre de caja, cortes
- **Suscripciones**: Gestión de suscripciones
- **Pedidos Online**: Sistema de pedidos con recogida programada

---

## Online Orders Module (SPEC-POS-001)

### Overview

El módulo de pedidos online permite a los clientes realizar pedidos de comida con recogida programada, sincronizada con el fin de su entrenamiento.

### Features

- **Cliente Invitado**: Pedidos sin registro obligatorio
- **Menú Fitness**: Categorías Pre/Post-Entreno, Balanceado, Snacks
- **Info Nutricional**: Calorías, proteínas, carbohidratos, grasas
- **Carrito Persistente**: Guardado en localStorage
- **Checkout Opcional**: Pago online con Stripe o en recepción
- **Notificaciones**: Email, SMS, Telegram cuando el pedido está listo
- **Staff Dashboard**: Panel en tiempo real para gestionar pedidos
- **Kanban Board**: Vista visual de pedidos por estado

### Architecture

#### Customer Components

| Componente | Descripción |
|-----------|-------------|
| `ProductCard` | Tarjeta de producto con foto e info nutricional |
| `NutritionInfo` | Display de macros del producto |
| `CartDrawer` | Panel lateral del carrito |
| `CheckoutForm` | Formulario de checkout como invitado |
| `PickupTimeSelector` | Selector de hora de recogida |

#### Staff Components

| Componente | Descripción |
|-----------|-------------|
| `StaffDashboard` | Panel principal con métricas y filtros |
| `KanbanBoard` | Vista kanban de pedidos por estado |
| `OrderDetailModal` | Modal con detalle del pedido |

#### Services

| Servicio | Descripción |
|----------|-------------|
| `StatusChangeHandler` | Manejo de estados con validación |
| `NotificationService` | Notificaciones multi-canal |
| `StripeService` | Procesamiento de pagos |

#### Hooks

| Hook | Descripción |
|------|-------------|
| `useOnlineMenu` | Fetch de menú con filtros |
| `useOrdersRealtime` | Suscripción en tiempo real |

#### Stores

| Store | Descripción |
|-------|-------------|
| `onlineCartStore` | Carrito con persistencia |
| `ordersRealtimeStore` | Pedidos en tiempo real |

### Database Schema

```sql
online_orders
  - id, business_id, order_number
  - user_id, customer_id (nullable)
  - guest_name, guest_email, guest_phone
  - items (JSONB)
  - subtotal, tax, tip, total
  - pickup_time, estimated_prep_time
  - status, payment_method, payment_status
  - notification_method, notification_sent
  - timestamps for each status

online_order_status_history
  - id, order_id, old_status, new_status
  - changed_by, notes, created_at
```

### Status Flow

```
pending -> confirmed -> preparing -> ready -> picked_up
   |           |           |          |
   v           v           v          v
cancelled   cancelled   cancelled  cancelled
```

### API Reference

Ver documentación completa en [docs/api/online-orders-services.md](docs/api/online-orders-services.md)

---

## Tech Stack

| Tecnología | Version |
|-----------|---------|
| React | 18.3.1 |
| TypeScript | 5.5.3 |
| Vite | 5.4.2 |
| Supabase | Latest |
| Zustand | Latest |
| Stripe | Latest |
| Tailwind CSS | 3.4.1 |
| Vitest | Latest |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm o yarn
- Cuenta de Supabase
- Cuenta de Stripe (opcional, para pagos online)

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/QuickPOS.git
cd QuickPOS

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase and Stripe credentials

# Run development server
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

### Database Setup

```bash
# Apply migrations
npx supabase db push
```

---

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

---

## Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Project Structure

```
src/
├── components/
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard components
│   ├── inventory/         # Inventory management
│   ├── online-orders/     # Online orders module
│   ├── pos/               # POS interface
│   ├── sales/             # Sales history
│   └── ...
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and configurations
├── services/              # Business logic services
├── stores/                # Zustand stores
├── types/                 # TypeScript type definitions
└── App.tsx

supabase/
└── migrations/            # Database migrations
```

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see LICENSE file for details

---

## Support

For issues and questions, please open an issue on GitHub.
