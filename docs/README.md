# QuickPOS - Sistema de Punto de Venta

Sistema de Punto de Venta (POS) moderno, diseñado para funcionar en tablets, celulares y computadoras. Incluye escaneo de códigos de barras con cámara e impresión Bluetooth.

**URL de producción:** http://72.61.5.37:5050

---

## Tabla de Contenidos

1. [Inicio Rápido](#inicio-rápido)
2. [Características](#características)
3. [Instalación como App](#instalación-como-app)
4. [Módulos del Sistema](#módulos-del-sistema)
5. [Guía de Uso Móvil](#guía-de-uso-móvil)
6. [Impresoras Compatibles](#impresoras-compatibles)
7. [Configuración Técnica](#configuración-técnica)
8. [Solución de Problemas](#solución-de-problemas)

---

## Inicio Rápido

### Requisitos
- Navegador moderno (Chrome recomendado para Bluetooth)
- Conexión a internet
- Cuenta de usuario

### Primeros Pasos
1. Accede a http://72.61.5.37:5050
2. Inicia sesión con tu cuenta
3. Selecciona o crea un negocio
4. Abre la caja para comenzar a vender

---

## Características

### Punto de Venta
- Búsqueda rápida de productos
- Carrito de compras interactivo
- Múltiples métodos de pago (efectivo, tarjeta, terminal, transferencia)
- Cálculo automático de cambio
- Atajos de teclado (F1-Buscar, F2-Cobrar, F3-Escanear)

### Escáner de Códigos de Barras
- **Escáner USB**: Detección automática de scanners tipo teclado
- **Cámara del dispositivo**: Escaneo con la cámara del celular/tablet
- Formatos soportados: CODE128, EAN-13, EAN-8, UPC, CODE39, ITF14

### Impresión de Tickets
- **Impresión Bluetooth**: Conexión directa a impresoras térmicas
- **Impresión del navegador**: Compatible con cualquier impresora
- Formato optimizado para papel térmico de 80mm y 58mm

### Inventario
- Gestión de productos con categorías
- Control de stock con alertas de mínimos
- Generación de códigos de barras
- Análisis visual con gráficos

### Reportes y Dashboard
- Gráficos de ventas en tiempo real
- KPIs: ventas del día, ticket promedio, productos vendidos
- Exportación a PDF
- Comparativas con días anteriores

### Gestión de Caja
- Apertura y cierre de caja
- Registro de movimientos (entradas/salidas)
- Arqueo automático

---

## Instalación como App

QuickPOS es una Progressive Web App (PWA) que puede instalarse como aplicación nativa.

### Android (Chrome)
1. Abre http://72.61.5.37:5050 en Chrome
2. Toca el menú (tres puntos)
3. Selecciona "Añadir a pantalla de inicio"
4. Confirma la instalación

### iOS (Safari)
1. Abre http://72.61.5.37:5050 en Safari
2. Toca el botón de compartir
3. Selecciona "Añadir a inicio"
4. Confirma el nombre y toca "Añadir"

### Beneficios de la Instalación
- Acceso rápido desde el inicio
- Pantalla completa sin barra del navegador
- Funcionamiento offline básico
- Notificaciones (próximamente)

---

## Módulos del Sistema

### 1. Dashboard (`/dashboard`)
Vista general del negocio con:
- Ventas del día vs ayer
- Gráfico de tendencia semanal
- Distribución por método de pago
- Ventas por hora

### 2. Punto de Venta (`/pos`)
Pantalla principal de ventas:
- Panel izquierdo: Búsqueda y selección de productos
- Panel derecho: Carrito y totales
- Botón flotante: Escanear con cámara

### 3. Inventario (`/inventory`)
Gestión de productos:
- Lista con búsqueda y filtros
- Crear/editar productos
- Generar códigos de barras
- Tab de analíticos

### 4. Caja (`/cash-register`)
Control de efectivo:
- Abrir caja con monto inicial
- Registrar entradas/salidas
- Cerrar caja con resumen

### 5. Reportes (`/reports`)
Análisis de ventas:
- Filtros por período
- Gráficos interactivos
- Exportación PDF

### 6. Configuración (`/settings`)
Ajustes del negocio:
- Datos del negocio
- Categorías de productos
- Usuarios y permisos

---

## Guía de Uso Móvil

### Flujo de Venta Típico

```
1. Abrir caja (si no está abierta)
         ↓
2. Escanear producto (cámara o búsqueda)
         ↓
3. Ajustar cantidad si es necesario
         ↓
4. Repetir para más productos
         ↓
5. Tocar "Cobrar"
         ↓
6. Seleccionar método de pago
         ↓
7. Ingresar monto recibido (efectivo)
         ↓
8. Completar venta
         ↓
9. Imprimir ticket (Bluetooth o navegador)
         ↓
10. Nueva venta
```

### Escanear con Cámara

1. En la pantalla de POS, toca el botón azul de cámara
2. Permite el acceso a la cámara cuando lo solicite
3. Apunta al código de barras dentro del recuadro
4. El producto se agrega automáticamente al carrito
5. Si no se encuentra, verifica que el código esté registrado

### Escanear con Scanner USB

Los scanners USB funcionan automáticamente:
1. Conecta el scanner al dispositivo (OTG en Android)
2. Escanea el código de barras
3. El sistema detecta la entrada rápida y busca el producto

---

## Impresoras Compatibles

### Impresoras Bluetooth Recomendadas

| Tipo | Modelos | Precio Aprox. |
|------|---------|---------------|
| Portátil 58mm | HPRT HM-E200, Aibecy 58mm | $30-80 USD |
| Escritorio 80mm | HPRT TP806, Rongta RP326 | $60-120 USD |
| Profesional | Epson TM-T20III BT | $180-250 USD |

### Configuración de Impresora Bluetooth

1. Enciende la impresora y ponla en modo emparejamiento
2. En QuickPOS, completa una venta
3. Toca "Imprimir Bluetooth"
4. Selecciona tu impresora de la lista
5. La conexión se mantiene para futuras impresiones

### Compatibilidad

| Función | Android Chrome | iOS Safari | Desktop |
|---------|---------------|------------|---------|
| Bluetooth | ✅ | ❌ | ✅ Chrome |
| Impresión navegador | ✅ | ✅ | ✅ |
| Cámara | ✅ | ✅ | ✅ |
| PWA | ✅ | ✅ | ✅ |

**Nota iOS:** Para impresión Bluetooth en iOS, usa apps puente como "RawBT" o "Star Print".

---

## Configuración Técnica

### Stack Tecnológico

```
Frontend:
├── React 18 + TypeScript
├── Vite (build tool)
├── Tailwind CSS (estilos)
├── Zustand (estado global)
├── Recharts (gráficos)
└── PWA (vite-plugin-pwa)

Backend:
├── Supabase (PostgreSQL + Auth)
└── Row Level Security (RLS)

Librerías Especiales:
├── html5-qrcode (escáner cámara)
├── jsbarcode (generador códigos)
├── jspdf (exportación PDF)
└── Web Bluetooth API (impresión)
```

### Estructura de Archivos

```
src/
├── components/
│   ├── barcode/
│   │   └── BarcodeGenerator.tsx    # Generador de códigos
│   ├── charts/
│   │   └── SalesChart.tsx          # Componentes de gráficos
│   ├── dashboard/
│   │   └── DashboardPage.tsx       # Dashboard principal
│   ├── inventory/
│   │   └── InventoryPage.tsx       # Gestión de inventario
│   ├── pos/
│   │   ├── POSPage.tsx             # Punto de venta
│   │   ├── CartPanel.tsx           # Carrito
│   │   ├── CheckoutModal.tsx       # Modal de cobro
│   │   ├── TicketPreview.tsx       # Vista previa ticket
│   │   └── TicketPrinter.tsx       # Impresión térmica
│   ├── reports/
│   │   └── ReportsPage.tsx         # Reportes
│   └── scanner/
│       └── CameraScanner.tsx       # Escáner de cámara
├── hooks/
│   ├── useBarcodeScanner.ts        # Hook scanner USB
│   ├── useBluetoothPrinter.tsx     # Hook impresora BT
│   ├── useKeyboardShortcuts.ts     # Atajos de teclado
│   └── usePDFExport.ts             # Exportación PDF
├── stores/
│   ├── cartStore.ts                # Estado del carrito
│   └── cashRegisterStore.ts        # Estado de caja
└── lib/
    ├── supabase.ts                 # Cliente Supabase
    └── constants.ts                # Constantes y formatos
```

### Variables de Entorno

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview
```

---

## Solución de Problemas

### La cámara no funciona

**Síntomas:** El escáner muestra "No se pudo acceder a la cámara"

**Soluciones:**
1. Verifica que el sitio tenga permisos de cámara en el navegador
2. En Android, ve a Configuración → Apps → Chrome → Permisos → Cámara
3. Asegúrate de usar HTTPS o localhost (requerido para cámara)
4. Cierra otras apps que puedan usar la cámara

### La impresora Bluetooth no aparece

**Síntomas:** Al buscar impresoras, no aparece ninguna

**Soluciones:**
1. Verifica que la impresora esté encendida y en modo emparejamiento
2. Usa Chrome en Android (Safari no soporta Web Bluetooth)
3. Habilita Bluetooth en el dispositivo
4. Intenta apagar y encender la impresora

### El ticket se imprime mal

**Síntomas:** Caracteres extraños o formato incorrecto

**Soluciones:**
1. Verifica que la impresora soporte ESC/POS
2. Algunas impresoras necesitan configuración específica
3. Prueba con "Imprimir (navegador)" como alternativa

### Los productos no se agregan al escanear

**Síntomas:** El escáner detecta el código pero no agrega producto

**Soluciones:**
1. Verifica que el código de barras esté registrado en el producto
2. Revisa que el producto esté activo
3. El código debe coincidir exactamente

### La app no se instala en iOS

**Síntomas:** No aparece opción de instalar

**Soluciones:**
1. Usa Safari (otros navegadores no soportan PWA en iOS)
2. Busca "Añadir a inicio" en el menú de compartir
3. Asegúrate de estar en la URL principal

---

## Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| F1 | Enfocar búsqueda de productos |
| F2 | Abrir modal de cobro |
| F3 | Abrir escáner de cámara |
| F8 | Limpiar carrito |
| Escape | Cerrar modal abierto |

---

## Contacto y Soporte

Para reportar problemas o solicitar funciones:
- Revisa la documentación en `/docs`
- Contacta al administrador del sistema

---

*Última actualización: Enero 2026*
*Versión: 1.0.0*
