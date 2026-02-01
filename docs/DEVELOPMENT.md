# Guía de Desarrollo

## Configuración del Entorno

### Requisitos

- Node.js 18+ (recomendado 20 LTS)
- npm o pnpm
- Cuenta en Supabase

### Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd QuickPOS

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase
```

### Variables de Entorno

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Comandos

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview

# Lint
npm run lint

# Type check
npx tsc --noEmit
```

---

## Estructura del Proyecto

```
QuickPOS/
├── docs/                      # Documentación
├── public/
│   ├── icons/                 # Iconos PWA
│   └── manifest.json          # PWA manifest
├── src/
│   ├── components/            # Componentes React
│   │   ├── barcode/           # Generador de códigos
│   │   ├── charts/            # Gráficos (Recharts)
│   │   ├── dashboard/         # Dashboard principal
│   │   ├── inventory/         # Gestión de inventario
│   │   ├── pos/               # Punto de venta
│   │   ├── reports/           # Reportes
│   │   ├── scanner/           # Escáner de cámara
│   │   └── ui/                # Componentes UI base
│   ├── contexts/              # React contexts
│   │   └── TenantContext.tsx  # Multi-tenancy
│   ├── hooks/                 # Custom hooks
│   │   ├── useBarcodeScanner.ts
│   │   ├── useBluetoothPrinter.tsx
│   │   ├── useKeyboardShortcuts.ts
│   │   └── usePDFExport.ts
│   ├── lib/                   # Utilidades
│   │   ├── constants.ts       # Constantes y formatos
│   │   └── supabase.ts        # Cliente Supabase
│   ├── stores/                # Estado global (Zustand)
│   │   ├── cartStore.ts       # Carrito de compras
│   │   └── cashRegisterStore.ts
│   ├── App.tsx                # Componente raíz
│   ├── main.tsx               # Entry point
│   └── index.css              # Estilos globales
├── index.html                 # HTML template
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Convenciones de Código

### Nombrado

```typescript
// Componentes: PascalCase
export function ProductCard() { }

// Hooks: camelCase con prefijo 'use'
export function useBluetoothPrinter() { }

// Constantes: UPPER_SNAKE_CASE
export const MAX_CART_ITEMS = 100;

// Funciones: camelCase
function calculateTotal() { }

// Tipos/Interfaces: PascalCase
interface ProductData { }
type PaymentMethod = 'cash' | 'card';
```

### Estructura de Componentes

```tsx
// 1. Imports
import { useState, useEffect } from 'react';
import { SomeIcon } from 'lucide-react';

// 2. Types
interface Props {
  id: string;
  onSave: (data: Data) => void;
}

// 3. Component
export function MyComponent({ id, onSave }: Props) {
  // 3.1 Hooks
  const [state, setState] = useState();
  const { data } = useQuery();

  // 3.2 Effects
  useEffect(() => {
    // ...
  }, []);

  // 3.3 Handlers
  const handleClick = () => {
    // ...
  };

  // 3.4 Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### Estilos (Tailwind)

```tsx
// Preferir clases de Tailwind
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  Click me
</button>

// Para estilos condicionales
<div className={`
  p-4 rounded-lg
  ${isActive ? 'bg-green-100' : 'bg-gray-100'}
`}>

// Para muchas clases, usar cn() o clsx()
import { clsx } from 'clsx';
<div className={clsx(
  'base-class',
  isActive && 'active-class',
  variant === 'primary' && 'primary-class'
)}>
```

---

## Estado Global (Zustand)

### Crear Store

```typescript
// src/stores/exampleStore.ts
import { create } from 'zustand';

interface ExampleState {
  items: Item[];
  isLoading: boolean;
  addItem: (item: Item) => void;
  removeItem: (id: string) => void;
  reset: () => void;
}

export const useExampleStore = create<ExampleState>((set) => ({
  items: [],
  isLoading: false,

  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),

  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),

  reset: () => set({ items: [], isLoading: false }),
}));
```

### Usar Store

```tsx
function MyComponent() {
  const { items, addItem } = useExampleStore();

  // O selectores para evitar re-renders
  const items = useExampleStore((state) => state.items);

  return <div>{items.length}</div>;
}
```

---

## Supabase

### Cliente

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### Queries

```typescript
// SELECT
const { data, error } = await supabase
  .from('products')
  .select('*, category:categories(*)')
  .eq('business_id', businessId)
  .eq('active', true)
  .order('name');

// INSERT
const { data, error } = await supabase
  .from('products')
  .insert({ name, price, business_id })
  .select()
  .single();

// UPDATE
const { error } = await supabase
  .from('products')
  .update({ price: newPrice })
  .eq('id', productId);

// DELETE
const { error } = await supabase
  .from('products')
  .delete()
  .eq('id', productId);

// RPC (funciones)
const { data } = await supabase.rpc('generate_ticket_number', {
  p_business_id: businessId
});
```

### Realtime

```typescript
useEffect(() => {
  const channel = supabase
    .channel('products-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'products',
        filter: `business_id=eq.${businessId}`
      },
      (payload) => {
        console.log('Change:', payload);
        refetch();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [businessId]);
```

---

## Hooks Personalizados

### useBluetoothPrinter

```tsx
const {
  isConnected,     // boolean - estado de conexión
  isConnecting,    // boolean - conectando...
  deviceName,      // string | null - nombre del dispositivo
  error,           // string | null - último error
  connect,         // () => Promise<boolean>
  disconnect,      // () => void
  print,           // (text: string) => Promise<boolean>
  printTicket,     // (data: TicketData) => Promise<boolean>
  isSupported,     // boolean - si el navegador soporta BT
} = useBluetoothPrinter();
```

### useBarcodeScanner

```tsx
const {
  barcode,         // string - último código
  isScanning,      // boolean - detectando entrada rápida
  lastScan,        // string | null - último escaneo exitoso
  clearBarcode,    // () => void
} = useBarcodeScanner({
  onScan: (code) => handleScan(code),
  minLength: 4,
  maxDelay: 50,
  enabled: true,
});
```

### usePDFExport

```tsx
const { exportReportPDF, exportSalesReportPDF } = usePDFExport();

// Exportar reporte de ventas
await exportSalesReportPDF(
  'Mi Negocio',
  'Enero 2025',
  { from: '2025-01-01', to: '2025-01-31' },
  salesData
);
```

---

## Testing

### Setup

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

### Ejemplo de Test

```typescript
// src/components/__tests__/ProductCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ProductCard } from '../ProductCard';

describe('ProductCard', () => {
  it('renders product name', () => {
    render(<ProductCard name="Test Product" price={99.99} />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('formats price correctly', () => {
    render(<ProductCard name="Test" price={99.99} />);
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });
});
```

### Ejecutar Tests

```bash
npm run test
npm run test:watch
npm run test:coverage
```

---

## Deploy

### Build

```bash
npm run build
```

### Nginx (Producción)

```nginx
# /etc/nginx/sites-available/quickpos
server {
    listen 5050;
    server_name _;

    root /root/apps/QuickPOS/dist;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/javascript application/json;

    # Cache assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Comandos de Deploy

```bash
# Build
npm run build

# Reload nginx
sudo nginx -s reload
```

---

## Troubleshooting

### Error de TypeScript

```bash
# Verificar tipos
npx tsc --noEmit

# Regenerar node_modules
rm -rf node_modules
npm install
```

### Error de Build

```bash
# Limpiar cache
rm -rf node_modules/.vite
npm run build
```

### Supabase Connection Error

1. Verifica las variables de entorno
2. Revisa las políticas RLS
3. Confirma que el proyecto esté activo

---

*Última actualización: Enero 2026*
