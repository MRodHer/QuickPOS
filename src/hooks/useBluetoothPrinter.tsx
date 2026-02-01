import { useState, useCallback } from 'react';

interface PrinterDevice {
  device: BluetoothDevice;
  server: BluetoothRemoteGATTServer;
  characteristic: BluetoothRemoteGATTCharacteristic;
}

interface UseBluetoothPrinter {
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  error: string | null;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  print: (text: string) => Promise<boolean>;
  printTicket: (data: TicketData) => Promise<boolean>;
  isSupported: boolean;
}

interface TicketItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface TicketData {
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  ticketNumber: string;
  date: string;
  items: TicketItem[];
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  paymentMethod: string;
  cashReceived?: number;
  change?: number;
  footerText?: string;
}

// ESC/POS Commands for thermal printers
const ESC = 0x1b;
const GS = 0x1d;

const COMMANDS = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [GS, 0x21, 0x10],
  DOUBLE_WIDTH: [GS, 0x21, 0x20],
  DOUBLE_SIZE: [GS, 0x21, 0x30],
  NORMAL_SIZE: [GS, 0x21, 0x00],
  CUT: [GS, 0x56, 0x00], // Full cut
  PARTIAL_CUT: [GS, 0x56, 0x01],
  FEED_LINES: (n: number) => [ESC, 0x64, n],
  LINE: '--------------------------------',
};

// Common Bluetooth printer service UUIDs
const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Generic printer
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Common thermal printer
  '0000ff00-0000-1000-8000-00805f9b34fb', // Alternative
  '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile
];

const CHARACTERISTIC_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000ffe1-0000-1000-8000-00805f9b34fb',
];

export function useBluetoothPrinter(): UseBluetoothPrinter {
  const [printer, setPrinter] = useState<PrinterDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;

  const connect = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Bluetooth no soportado en este navegador. Usa Chrome en Android.');
      return false;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Request device with printer services
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICE_UUIDS,
      });

      if (!device.gatt) {
        throw new Error('GATT no disponible');
      }

      // Connect to GATT server
      const server = await device.gatt.connect();

      // Find printer service and characteristic
      let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

      for (const serviceUuid of PRINTER_SERVICE_UUIDS) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          for (const charUuid of CHARACTERISTIC_UUIDS) {
            try {
              characteristic = await service.getCharacteristic(charUuid);
              break;
            } catch {
              continue;
            }
          }
          if (characteristic) break;
        } catch {
          continue;
        }
      }

      if (!characteristic) {
        // Try to get any writable characteristic
        const services = await server.getPrimaryServices();
        for (const service of services) {
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              characteristic = char;
              break;
            }
          }
          if (characteristic) break;
        }
      }

      if (!characteristic) {
        throw new Error('No se encontró característica de impresión');
      }

      setPrinter({ device, server, characteristic });

      // Handle disconnection
      device.addEventListener('gattserverdisconnected', () => {
        setPrinter(null);
      });

      setIsConnecting(false);
      return true;
    } catch (err) {
      console.error('Bluetooth connect error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Error al conectar con la impresora'
      );
      setIsConnecting(false);
      return false;
    }
  }, [isSupported]);

  const disconnect = useCallback(() => {
    if (printer?.device.gatt?.connected) {
      printer.device.gatt.disconnect();
    }
    setPrinter(null);
  }, [printer]);

  const sendData = useCallback(
    async (data: Uint8Array): Promise<boolean> => {
      if (!printer) {
        setError('Impresora no conectada');
        return false;
      }

      try {
        // Send in chunks (some printers have MTU limits)
        const chunkSize = 100;
        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize);
          if (printer.characteristic.properties.writeWithoutResponse) {
            await printer.characteristic.writeValueWithoutResponse(chunk);
          } else {
            await printer.characteristic.writeValue(chunk);
          }
          // Small delay between chunks
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        return true;
      } catch (err) {
        console.error('Print error:', err);
        setError('Error al imprimir');
        return false;
      }
    },
    [printer]
  );

  const textToBytes = (text: string): number[] => {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(text));
  };

  const print = useCallback(
    async (text: string): Promise<boolean> => {
      const data = new Uint8Array([
        ...COMMANDS.INIT,
        ...textToBytes(text),
        ...COMMANDS.FEED_LINES(4),
        ...COMMANDS.CUT,
      ]);
      return sendData(data);
    },
    [sendData]
  );

  const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`;
  };

  const padRight = (text: string, length: number): string => {
    return text.substring(0, length).padEnd(length, ' ');
  };

  const padLeft = (text: string, length: number): string => {
    return text.substring(0, length).padStart(length, ' ');
  };

  const printTicket = useCallback(
    async (data: TicketData): Promise<boolean> => {
      const lines: number[] = [];

      // Initialize
      lines.push(...COMMANDS.INIT);

      // Header - Business name (centered, large)
      lines.push(...COMMANDS.ALIGN_CENTER);
      lines.push(...COMMANDS.DOUBLE_SIZE);
      lines.push(...COMMANDS.BOLD_ON);
      lines.push(...textToBytes(data.businessName + '\n'));
      lines.push(...COMMANDS.NORMAL_SIZE);
      lines.push(...COMMANDS.BOLD_OFF);

      // Business info
      if (data.businessAddress) {
        lines.push(...textToBytes(data.businessAddress + '\n'));
      }
      if (data.businessPhone) {
        lines.push(...textToBytes('Tel: ' + data.businessPhone + '\n'));
      }

      // Divider
      lines.push(...textToBytes(COMMANDS.LINE + '\n'));

      // Ticket info (left aligned)
      lines.push(...COMMANDS.ALIGN_LEFT);
      lines.push(...textToBytes(`Ticket: ${data.ticketNumber}\n`));
      lines.push(...textToBytes(`Fecha: ${data.date}\n`));

      // Divider
      lines.push(...textToBytes(COMMANDS.LINE + '\n'));

      // Items header
      lines.push(...COMMANDS.BOLD_ON);
      lines.push(...textToBytes('Cant  Producto        P.U.   Total\n'));
      lines.push(...COMMANDS.BOLD_OFF);

      // Items
      for (const item of data.items) {
        const qty = padRight(item.quantity.toString(), 4);
        const name = padRight(item.name, 14);
        const price = padLeft(formatPrice(item.price), 7);
        const total = padLeft(formatPrice(item.total), 7);
        lines.push(...textToBytes(`${qty} ${name} ${price} ${total}\n`));
      }

      // Divider
      lines.push(...textToBytes(COMMANDS.LINE + '\n'));

      // Totals
      lines.push(...COMMANDS.ALIGN_RIGHT);
      lines.push(...textToBytes(`Subtotal: ${formatPrice(data.subtotal)}\n`));

      if (data.tax && data.tax > 0) {
        lines.push(...textToBytes(`IVA: ${formatPrice(data.tax)}\n`));
      }

      if (data.discount && data.discount > 0) {
        lines.push(...textToBytes(`Descuento: -${formatPrice(data.discount)}\n`));
      }

      // Total (large)
      lines.push(...COMMANDS.DOUBLE_HEIGHT);
      lines.push(...COMMANDS.BOLD_ON);
      lines.push(...textToBytes(`TOTAL: ${formatPrice(data.total)}\n`));
      lines.push(...COMMANDS.NORMAL_SIZE);
      lines.push(...COMMANDS.BOLD_OFF);

      // Divider
      lines.push(...COMMANDS.ALIGN_LEFT);
      lines.push(...textToBytes(COMMANDS.LINE + '\n'));

      // Payment info
      lines.push(...textToBytes(`Método: ${data.paymentMethod}\n`));
      if (data.cashReceived) {
        lines.push(...textToBytes(`Recibido: ${formatPrice(data.cashReceived)}\n`));
        lines.push(...textToBytes(`Cambio: ${formatPrice(data.change || 0)}\n`));
      }

      // Footer
      lines.push(...textToBytes('\n'));
      lines.push(...COMMANDS.ALIGN_CENTER);
      lines.push(...textToBytes((data.footerText || '¡Gracias por su compra!') + '\n'));

      // Feed and cut
      lines.push(...COMMANDS.FEED_LINES(4));
      lines.push(...COMMANDS.PARTIAL_CUT);

      return sendData(new Uint8Array(lines));
    },
    [sendData]
  );

  return {
    isConnected: !!printer,
    isConnecting,
    deviceName: printer?.device.name || null,
    error,
    connect,
    disconnect,
    print,
    printTicket,
    isSupported,
  };
}

// Component for printer status/connection button
export function BluetoothPrinterStatus() {
  const {
    isConnected,
    isConnecting,
    deviceName,
    error,
    connect,
    disconnect,
    isSupported,
  } = useBluetoothPrinter();

  if (!isSupported) {
    return (
      <div className="text-xs text-gray-500 flex items-center gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full" />
        BT no soportado
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="text-xs text-blue-600 flex items-center gap-1">
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        Conectando...
      </div>
    );
  }

  if (isConnected) {
    return (
      <button
        onClick={disconnect}
        className="text-xs text-green-600 flex items-center gap-1 hover:text-red-600 transition"
      >
        <span className="w-2 h-2 bg-green-500 rounded-full" />
        {deviceName || 'Impresora'} ✓
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      className="text-xs text-gray-600 flex items-center gap-1 hover:text-blue-600 transition"
    >
      <span className="w-2 h-2 bg-gray-400 rounded-full" />
      {error ? 'Reintentar' : 'Conectar impresora'}
    </button>
  );
}
