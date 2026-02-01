import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Download, Printer, Copy, Check } from 'lucide-react';

interface BarcodeGeneratorProps {
  value: string;
  format?: 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39' | 'ITF14';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  showControls?: boolean;
  productName?: string;
  price?: number;
}

export function BarcodeGenerator({
  value,
  format = 'CODE128',
  width = 2,
  height = 80,
  displayValue = true,
  fontSize = 16,
  showControls = true,
  productName,
  price,
}: BarcodeGeneratorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    try {
      JsBarcode(svgRef.current, value, {
        format,
        width,
        height,
        displayValue,
        fontSize,
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000',
      });
      setError(null);
    } catch (err) {
      setError('Código no válido para este formato');
      console.error('Barcode error:', err);
    }
  }, [value, format, width, height, displayValue, fontSize]);

  const handleDownload = () => {
    if (!svgRef.current) return;

    // Convert SVG to canvas then to PNG
    const svg = svgRef.current;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');

      const link = document.createElement('a');
      link.download = `barcode-${value}.png`;
      link.href = pngUrl;
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !svgRef.current) return;

    const svgData = new XMLSerializer().serializeToString(svgRef.current);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Imprimir Código de Barras</title>
          <style>
            @page {
              size: 50mm 30mm;
              margin: 2mm;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: Arial, sans-serif;
            }
            .label {
              text-align: center;
              padding: 2mm;
            }
            .product-name {
              font-size: 10px;
              font-weight: bold;
              margin-bottom: 2px;
              max-width: 45mm;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .price {
              font-size: 14px;
              font-weight: bold;
              margin-top: 2px;
            }
            svg {
              max-width: 45mm;
              height: auto;
            }
          </style>
        </head>
        <body>
          <div class="label">
            ${productName ? `<div class="product-name">${productName}</div>` : ''}
            ${svgData}
            ${price ? `<div class="price">$${price.toFixed(2)}</div>` : ''}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  if (!value) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg text-gray-500">
        Ingresa un código para generar
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32 bg-red-50 rounded-lg text-red-600 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col items-center">
        {productName && (
          <p className="text-sm font-medium text-gray-900 mb-2 truncate max-w-full">
            {productName}
          </p>
        )}
        <svg ref={svgRef} className="max-w-full" />
        {price && (
          <p className="text-lg font-bold text-gray-900 mt-2">
            ${price.toFixed(2)}
          </p>
        )}
      </div>

      {showControls && (
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm"
          >
            <Download className="w-4 h-4" />
            PNG
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition text-sm"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      )}
    </div>
  );
}

// Generador de código EAN-13 válido
export function generateEAN13(prefix: string = '200'): string {
  // Usar prefijo 200-299 para códigos internos
  const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
  const code = prefix + random.slice(0, 9);

  // Calcular dígito de verificación
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;

  return code + checkDigit;
}

// Generador de código Code128 simple
export function generateCode128(prefix: string = 'PRD'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}
