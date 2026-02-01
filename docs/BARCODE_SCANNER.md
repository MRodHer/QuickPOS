# Guía de Escáner de Códigos de Barras

## Descripción General

QuickPOS soporta dos métodos de escaneo de códigos de barras:

1. **Escáner USB/HID**: Scanners que actúan como teclado
2. **Cámara del dispositivo**: Usando la cámara del celular o tablet

---

## Escáner USB (HID)

### Cómo Funciona

Los scanners USB envían los caracteres del código de barras como si fueran pulsaciones de teclado, seguidas de Enter. QuickPOS detecta esta entrada rápida (< 50ms entre caracteres) y la diferencia de la escritura manual.

```
Scanner USB → Caracteres rápidos → Detección → Búsqueda → Agregar al carrito
     ↓              ↓                  ↓           ↓              ↓
  [7501234567890] [<50ms/char]    [useBarcodeScanner]  [Supabase]   [Cart]
```

### Configuración

No requiere configuración. El hook `useBarcodeScanner` escucha globalmente:

```typescript
// Se activa automáticamente en InventoryPage
const { barcode, lastScan } = useBarcodeScanner({
  onScan: (code) => handleProductSearch(code),
  minLength: 4,      // Mínimo 4 caracteres
  maxDelay: 50,      // Máximo 50ms entre caracteres
});
```

### Scanners Compatibles

Cualquier scanner USB que actúe como teclado (HID):

| Tipo | Ejemplos | Precio |
|------|----------|--------|
| Pistola con cable | Honeywell, Symbol, Netum | $15-50 USD |
| Pistola inalámbrica | Inateck, Eyoyo | $25-60 USD |
| De escritorio | Honeywell Orbit | $100-200 USD |

### Uso con Android (OTG)

Para usar scanners USB en tablets/celulares Android:

1. Necesitas un adaptador USB-OTG
2. Conecta el scanner al adaptador
3. Conecta el adaptador al dispositivo
4. El scanner funciona igual que en PC

---

## Escáner de Cámara

### Cómo Funciona

Usa la librería `html5-qrcode` para decodificar códigos de barras desde el stream de video de la cámara.

```
Cámara → Stream de video → Análisis de frames → Decodificación → Callback
   ↓           ↓                  ↓                   ↓             ↓
[getUserMedia] [Canvas]      [html5-qrcode]      [CODE128/EAN]  [onScan]
```

### Formatos Soportados

| Formato | Descripción | Ejemplo |
|---------|-------------|---------|
| CODE128 | Alfanumérico, muy común | PRD-ABC123 |
| EAN-13 | Productos retail (13 dígitos) | 7501234567890 |
| EAN-8 | Productos pequeños (8 dígitos) | 12345678 |
| UPC-A | Productos USA (12 dígitos) | 012345678901 |
| CODE39 | Industrial, alfanumérico | ABC-123 |
| QR Code | Códigos 2D | (cualquier texto) |

### Uso en QuickPOS

#### Desde el POS

1. Toca el botón azul de cámara (esquina inferior)
2. O presiona F3 en teclado
3. Apunta al código de barras
4. El producto se agrega automáticamente

#### Desde Inventario

1. Ve a la pestaña de productos
2. El indicador de scanner muestra el estado
3. Escanea y el producto se filtra/selecciona

### Componente CameraScanner

```tsx
// src/components/scanner/CameraScanner.tsx

<CameraScanner
  onScan={(barcode) => {
    // Buscar producto y agregar al carrito
    searchAndAddProduct(barcode);
  }}
  onClose={() => setShowScanner(false)}
  isOpen={showScanner}
/>
```

### Características

- **Cambio de cámara**: Botón para alternar frontal/trasera
- **Guía visual**: Recuadro para centrar el código
- **Vibración**: Feedback háptico al detectar (Android)
- **Auto-cierre**: Se cierra al escanear exitosamente

---

## Generación de Códigos de Barras

### Componente BarcodeGenerator

QuickPOS puede generar códigos de barras para productos que no los tienen:

```tsx
// src/components/barcode/BarcodeGenerator.tsx

<BarcodeGenerator
  value="7501234567890"
  format="EAN13"
  productName="Producto Ejemplo"
  price={99.99}
  showControls={true}
/>
```

### Funciones de Generación

```typescript
// Generar EAN-13 válido (con dígito verificador)
const ean = generateEAN13('200'); // Prefijo 200-299 para uso interno
// Resultado: "2001234567893"

// Generar Code128 con prefijo
const code = generateCode128('PRD');
// Resultado: "PRDM5X8K2ABC"
```

### Acciones Disponibles

1. **Copiar**: Copia el código al portapapeles
2. **Descargar PNG**: Guarda imagen del código
3. **Imprimir**: Abre diálogo para imprimir etiqueta

### Formato de Etiqueta

La impresión genera etiquetas de 50x30mm:

```
┌────────────────────────┐
│    Nombre Producto     │
│   |||||||||||||||||||  │
│     7501234567890      │
│        $99.99          │
└────────────────────────┘
```

---

## Flujo Completo de Escaneo

### En Punto de Venta

```
1. Usuario toca botón de cámara / presiona F3
         ↓
2. Se abre CameraScanner a pantalla completa
         ↓
3. Usuario apunta al código de barras
         ↓
4. html5-qrcode detecta y decodifica
         ↓
5. onScan callback recibe el código
         ↓
6. Búsqueda en Supabase por barcode
         ↓
7a. Si encuentra → Agregar al carrito + Toast verde
7b. Si no encuentra → Toast rojo "No encontrado"
         ↓
8. Scanner se cierra automáticamente
```

### En Inventario

```
1. Usuario está en lista de productos
         ↓
2. Escanea con USB o abre cámara
         ↓
3. Hook detecta el código
         ↓
4. Filtro de búsqueda se actualiza
         ↓
5. Lista muestra solo el producto escaneado
         ↓
6. Usuario puede ver/editar el producto
```

---

## Configuración del Hook

### useBarcodeScanner

```typescript
interface Options {
  onScan?: (barcode: string) => void;  // Callback al escanear
  minLength?: number;    // Mínimo de caracteres (default: 4)
  maxDelay?: number;     // Ms entre caracteres (default: 50)
  enabled?: boolean;     // Activar/desactivar (default: true)
}

const {
  barcode,      // Último código escaneado
  isScanning,   // Si está detectando entrada rápida
  lastScan,     // Último escaneo exitoso
  clearBarcode  // Limpiar estado
} = useBarcodeScanner(options);
```

### useBarcodeInput

Para inputs específicos:

```typescript
const inputRef = useRef<HTMLInputElement>(null);

const { value, setValue } = useBarcodeInput(
  inputRef,
  (barcode) => handleScan(barcode)
);

return <input ref={inputRef} value={value} onChange={...} />;
```

---

## Solución de Problemas

### La cámara no enciende

**Causas:**
1. Permisos no otorgados
2. Otra app usando la cámara
3. HTTPS requerido

**Soluciones:**
1. Ve a configuración del navegador → Permisos → Cámara → Permitir
2. Cierra otras apps que usen cámara
3. Asegúrate de acceder por HTTPS (o localhost)

### El scanner USB no detecta

**Causas:**
1. Scanner configurado en modo incorrecto
2. Delay entre caracteres muy largo
3. Código muy corto (< 4 caracteres)

**Soluciones:**
1. Configura el scanner en modo "USB HID Keyboard"
2. Algunos scanners tienen modos de velocidad, usa el más rápido
3. Ajusta `minLength` si necesitas códigos cortos

### El código no se reconoce

**Causas:**
1. Código borroso o dañado
2. Formato no soportado
3. Luz insuficiente

**Soluciones:**
1. Limpia la cámara, mejora el enfoque
2. Verifica que el formato esté soportado
3. Mejora la iluminación del código

### El producto no se agrega

**Causas:**
1. Código no registrado en el producto
2. Producto inactivo
3. Producto de otro negocio

**Soluciones:**
1. Ve a inventario y agrega el código de barras al producto
2. Activa el producto
3. Verifica que estás en el negocio correcto

---

## Mejores Prácticas

### Para Scanners USB

1. **Configura sufijo Enter**: La mayoría viene así por defecto
2. **Usa modo continuo**: Para escaneo rápido de múltiples productos
3. **Posición ergonómica**: Coloca el scanner al alcance de la mano

### Para Cámara

1. **Buena iluminación**: Evita sombras sobre el código
2. **Distancia correcta**: 10-30cm del código
3. **Código limpio**: Sin arrugas ni daños
4. **Estabilidad**: Mantén firme el dispositivo

### Para Generación

1. **Usa EAN-13**: Para productos de venta
2. **Usa CODE128**: Para códigos internos o SKUs
3. **Prefijo consistente**: Ej: "200" para productos propios
4. **Imprime en buena calidad**: Mínimo 300 DPI para etiquetas

---

## Código de Referencia

### Hook de Scanner USB

```typescript
// src/hooks/useBarcodeScanner.ts

export function useBarcodeScanner(options: Options = {}) {
  const { onScan, minLength = 4, maxDelay = 50 } = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTime;

      if (e.key === 'Enter' && buffer.length >= minLength) {
        onScan?.(buffer);
        buffer = '';
      } else if (timeDiff < maxDelay) {
        buffer += e.key;
      }

      lastKeyTime = now;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
```

### Componente de Escáner

```tsx
// src/components/scanner/CameraScanner.tsx

export function CameraScanner({ onScan, onClose }) {
  useEffect(() => {
    const scanner = new Html5Qrcode('scanner-container');

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        navigator.vibrate?.(100);
        onScan(decodedText);
      },
      () => {} // Ignorar errores de no-detección
    );

    return () => scanner.stop();
  }, []);

  return <div id="scanner-container" />;
}
```

---

*Última actualización: Enero 2026*
