# Referencia Rápida QuickPOS

## Atajos de Teclado

| Tecla | Acción |
|-------|--------|
| `F1` | Enfocar búsqueda |
| `F2` | Abrir cobro |
| `F3` | Abrir escáner |
| `F8` | Limpiar carrito |
| `Esc` | Cerrar modal |

---

## URLs

| Módulo | Ruta |
|--------|------|
| Dashboard | `/dashboard` |
| Punto de Venta | `/pos` |
| Inventario | `/inventory` |
| Caja | `/cash-register` |
| Reportes | `/reports` |
| Configuración | `/settings` |

---

## Métodos de Pago

| Código | Nombre |
|--------|--------|
| `cash` | Efectivo |
| `card` | Tarjeta |
| `terminal` | Terminal bancaria |
| `transfer` | Transferencia |
| `mixed` | Mixto |

---

## Formatos de Código de Barras

| Formato | Uso | Ejemplo |
|---------|-----|---------|
| `CODE128` | General | `PRD-ABC123` |
| `EAN13` | Retail | `7501234567890` |
| `EAN8` | Productos pequeños | `12345678` |
| `UPC` | USA | `012345678901` |
| `CODE39` | Industrial | `ABC-123` |

---

## Componentes Principales

```
POSPage          → Punto de venta
CartPanel        → Carrito lateral
CheckoutModal    → Modal de cobro
TicketPreview    → Vista previa ticket
CameraScanner    → Escáner de cámara
BarcodeGenerator → Generador de códigos
InventoryPage    → Lista de productos
DashboardPage    → Dashboard con KPIs
ReportsPage      → Reportes y gráficos
```

---

## Hooks

```typescript
// Escáner USB
useBarcodeScanner({ onScan, minLength, maxDelay })

// Impresora Bluetooth
useBluetoothPrinter() // { connect, printTicket, isConnected }

// Atajos de teclado
useKeyboardShortcuts({ F1: handler, F2: handler })

// Exportar PDF
usePDFExport() // { exportReportPDF, exportSalesReportPDF }
```

---

## Stores (Zustand)

```typescript
// Carrito
useCartStore() // { items, addItem, removeItem, clear, total }

// Caja registradora
useCashRegisterStore() // { isOpen, currentRegister, loadCurrentRegister }
```

---

## Supabase Queries Comunes

```typescript
// Buscar producto por código
await supabase
  .from('products')
  .select('*')
  .eq('barcode', code)
  .single();

// Ventas del día
await supabase
  .from('sales')
  .select('*')
  .eq('business_id', id)
  .gte('created_at', today)
  .order('created_at', { ascending: false });

// Productos con stock bajo
await supabase
  .from('products')
  .select('*')
  .eq('track_stock', true)
  .lte('stock_quantity', supabase.raw('min_stock'));
```

---

## Formato de Moneda

```typescript
import { formatCurrency } from '../lib/constants';

formatCurrency(99.99)  // "$99.99"
formatCurrency(1234)   // "$1,234.00"
```

---

## Formato de Fecha

```typescript
import { formatDateTime } from '../lib/constants';

formatDateTime('2025-01-29T10:30:00')  // "29/01/2025 10:30"
```

---

## Colores del Sistema

| Color | Uso | Tailwind |
|-------|-----|----------|
| Azul | Primario, acciones | `blue-600` |
| Verde | Éxito, confirmar | `green-600` |
| Rojo | Error, eliminar | `red-600` |
| Amarillo | Advertencia | `yellow-500` |
| Gris | Secundario, deshabilitado | `gray-400` |

---

## API de Impresión Bluetooth

```typescript
// Conectar
const success = await connect();

// Imprimir texto
await print("Texto simple\n");

// Imprimir ticket completo
await printTicket({
  businessName: 'Mi Negocio',
  ticketNumber: 'T-001',
  date: '29/01/2025 10:30',
  items: [{ name: 'Producto', quantity: 2, price: 50, total: 100 }],
  subtotal: 100,
  tax: 16,
  total: 116,
  paymentMethod: 'cash',
  cashReceived: 150,
  change: 34,
});
```

---

## PWA

### Manifest

```json
{
  "name": "QuickPOS",
  "short_name": "QuickPOS",
  "display": "standalone",
  "theme_color": "#1e40af"
}
```

### Service Worker

- Estrategia: NetworkFirst para API
- Cache: Assets estáticos por 1 año
- Offline: Funcionalidad básica

---

## Comandos de Desarrollo

```bash
npm run dev      # Desarrollo
npm run build    # Build producción
npm run preview  # Preview local
npm run lint     # Lint código
```

---

## Estructura de Ticket ESC/POS

```
[INIT]
[ALIGN_CENTER][DOUBLE_SIZE][BOLD]Nombre Negocio[NORMAL][BOLD_OFF]
Dirección
Tel: xxx
[LINE]
Ticket: T-001
Fecha: 29/01/2025
[LINE]
[BOLD]Cant Producto P.U. Total[BOLD_OFF]
2    Coca Cola  $15   $30
[LINE]
[ALIGN_RIGHT]
Subtotal: $xxx
IVA: $xxx
[DOUBLE_HEIGHT][BOLD]TOTAL: $xxx[NORMAL][BOLD_OFF]
[LINE]
[ALIGN_CENTER]¡Gracias!
[FEED 4]
[CUT]
```

---

*v1.0.0 - Enero 2026*
