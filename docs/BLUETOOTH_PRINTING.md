# Guía de Impresión Bluetooth

## Descripción General

QuickPOS soporta impresión directa a impresoras térmicas Bluetooth usando la Web Bluetooth API. Esta funcionalidad permite imprimir tickets de venta sin necesidad de cables ni configuración compleja.

---

## Compatibilidad

### Navegadores Soportados

| Navegador | Plataforma | Soporte |
|-----------|------------|---------|
| Chrome 56+ | Android | ✅ Completo |
| Chrome 56+ | Windows/Mac/Linux | ✅ Completo |
| Edge 79+ | Windows | ✅ Completo |
| Opera 43+ | Android/Desktop | ✅ Completo |
| Safari | iOS/macOS | ❌ No soportado |
| Firefox | Todas | ❌ No soportado |

### Impresoras Compatibles

La implementación usa el protocolo **ESC/POS**, estándar en impresoras térmicas. Marcas compatibles:

- **HPRT**: HM-E200, HM-E300, TP806
- **Rongta**: RP326, RP80, ACE series
- **Epson**: TM-T20, TM-T88 (con módulo BT)
- **Aibecy**: Todas las portátiles
- **Munbyn**: IMP001, series portátiles
- **Star Micronics**: SM-L200, SM-T300
- **Genéricas**: Cualquier impresora ESC/POS con Bluetooth

---

## Cómo Funciona

### Arquitectura

```
┌──────────────┐     Web Bluetooth API     ┌─────────────────┐
│   QuickPOS   │ ─────────────────────────▶│  Impresora BT   │
│  (Browser)   │    GATT Service/Char      │   (ESC/POS)     │
└──────────────┘                           └─────────────────┘
```

### Flujo de Conexión

1. Usuario toca "Imprimir Bluetooth"
2. Navegador muestra lista de dispositivos Bluetooth cercanos
3. Usuario selecciona su impresora
4. Se establece conexión GATT
5. Se busca el servicio de impresión
6. Se envían comandos ESC/POS

### Servicios Bluetooth Soportados

```javascript
// UUIDs de servicios comunes en impresoras térmicas
const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Genérico
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Común
  '0000ff00-0000-1000-8000-00805f9b34fb', // Alternativo
  '00001101-0000-1000-8000-00805f9b34fb', // Serial Port
];
```

---

## Uso en QuickPOS

### Primera Conexión

1. Completa una venta normalmente
2. En la pantalla de ticket, toca **"Imprimir Bluetooth"**
3. Aparece un diálogo del navegador con dispositivos disponibles
4. Selecciona tu impresora (ej: "RPP02N", "HPRT", etc.)
5. Espera la conexión (indicador cambia a verde)
6. El ticket se imprime automáticamente

### Conexiones Posteriores

Una vez conectada, la impresora se mantiene enlazada durante la sesión:
- El botón mostrará el nombre de la impresora
- La impresión es inmediata sin diálogo de selección
- Si la impresora se desconecta, volverá a pedir selección

### Indicador de Estado

En la pantalla de POS aparece un indicador de impresora:

| Estado | Indicador |
|--------|-----------|
| No soportado | ⚫ "BT no soportado" |
| Desconectada | ⚫ "Conectar impresora" |
| Conectando | 🔵 "Conectando..." |
| Conectada | 🟢 "Nombre impresora ✓" |

---

## Formato del Ticket

### Estructura

```
╔══════════════════════════════════╗
║       NOMBRE DEL NEGOCIO         ║  ← Grande, centrado
║         Dirección                ║
║       Tel: 555-1234              ║
╠══════════════════════════════════╣
║ Ticket: T-2025-0001              ║
║ Fecha: 29/01/2025 10:30          ║
╠══════════════════════════════════╣
║ Cant Producto        P.U.  Total ║
║ 2    Coca Cola 600   $15   $30   ║
║ 1    Papas Sabritas  $18   $18   ║
║ 3    Pan Bimbo       $45  $135   ║
╠══════════════════════════════════╣
║                    Subtotal: $157║
║                        IVA: $25  ║
║                      TOTAL: $183 ║  ← Grande
╠══════════════════════════════════╣
║ Método: Efectivo                 ║
║ Recibido: $200                   ║
║ Cambio: $17                      ║
╠══════════════════════════════════╣
║      ¡Gracias por su compra!     ║
╚══════════════════════════════════╝
```

### Comandos ESC/POS Utilizados

```javascript
const COMMANDS = {
  INIT: [0x1b, 0x40],           // Inicializar
  ALIGN_CENTER: [0x1b, 0x61, 0x01],
  ALIGN_LEFT: [0x1b, 0x61, 0x00],
  BOLD_ON: [0x1b, 0x45, 0x01],
  BOLD_OFF: [0x1b, 0x45, 0x00],
  DOUBLE_SIZE: [0x1d, 0x21, 0x30],
  NORMAL_SIZE: [0x1d, 0x21, 0x00],
  CUT: [0x1d, 0x56, 0x00],
  FEED_LINES: (n) => [0x1b, 0x64, n],
};
```

---

## Solución de Problemas

### "Bluetooth no soportado"

**Causa:** El navegador no tiene Web Bluetooth API

**Solución:**
- Usa Chrome o Edge en Android/Windows/Mac
- En iOS, no hay solución nativa (usar app puente)

### La impresora no aparece en la lista

**Causas posibles:**
1. Impresora apagada o fuera de rango
2. No está en modo emparejamiento
3. Ya conectada a otro dispositivo

**Soluciones:**
1. Enciende la impresora y acércala
2. Mantén presionado el botón de encendido para modo pairing
3. Desconéctala del otro dispositivo o apaga su Bluetooth

### Error "No se encontró característica de impresión"

**Causa:** La impresora tiene UUIDs de servicio no estándar

**Solución:**
- Verifica que la impresora soporte ESC/POS
- Algunas impresoras chinas genéricas pueden no funcionar
- Prueba con otra impresora de marca conocida

### El ticket sale cortado o con caracteres extraños

**Causas:**
1. Velocidad de transmisión muy rápida
2. Codificación de caracteres incorrecta

**Soluciones:**
1. La implementación ya incluye delays entre chunks
2. Se usa codificación UTF-8 estándar
3. Evita caracteres especiales en nombres de productos

### La impresora se desconecta frecuentemente

**Causas:**
1. Batería baja
2. Distancia excesiva
3. Interferencia de otros dispositivos

**Soluciones:**
1. Carga la impresora
2. Mantén el dispositivo cerca (< 5 metros)
3. Apaga otros dispositivos Bluetooth cercanos

---

## Alternativas para iOS

Como Safari no soporta Web Bluetooth, hay alternativas:

### 1. Apps Puente

- **RawBT**: App gratuita que recibe datos y los envía a impresora BT
- **Star Print**: Para impresoras Star Micronics
- **Epson iPrint**: Para impresoras Epson

### 2. Impresión por Navegador

Usa el botón "Imprimir (navegador)" que funciona con AirPrint:
1. Configura una impresora con AirPrint
2. Toca "Imprimir (navegador)"
3. Selecciona la impresora en el diálogo del sistema

### 3. Impresora WiFi

Algunas impresoras tienen WiFi además de Bluetooth:
- Configura la impresora en la misma red
- Usa la impresión del navegador

---

## Código de Referencia

### Hook useBluetoothPrinter

```typescript
// src/hooks/useBluetoothPrinter.tsx

import { useState, useCallback } from 'react';

export function useBluetoothPrinter() {
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(async () => {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICE_UUIDS,
    });

    const server = await device.gatt.connect();
    // ... buscar servicio y característica
  }, []);

  const printTicket = useCallback(async (data: TicketData) => {
    // Construir comandos ESC/POS
    // Enviar a característica Bluetooth
  }, []);

  return { isConnected, connect, printTicket };
}
```

### Uso en Componente

```tsx
function TicketPreview({ sale, items }) {
  const { isConnected, connect, printTicket } = useBluetoothPrinter();

  const handlePrint = async () => {
    if (!isConnected) await connect();
    await printTicket({
      businessName: 'Mi Tienda',
      items: items,
      total: sale.total,
      // ...
    });
  };

  return (
    <button onClick={handlePrint}>
      Imprimir Bluetooth
    </button>
  );
}
```

---

## Recursos Adicionales

- [Web Bluetooth API Specification](https://webbluetoothcg.github.io/web-bluetooth/)
- [ESC/POS Command Reference](https://reference.epson-biz.com/modules/ref_escpos/index.php)
- [Chrome Web Bluetooth Samples](https://googlechrome.github.io/samples/web-bluetooth/)

---

*Última actualización: Enero 2026*
