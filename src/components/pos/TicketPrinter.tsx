import { forwardRef } from 'react';
import { formatCurrency, formatDateTime } from '../../lib/constants';

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
  customerName?: string;
  cashierName?: string;
  footerText?: string;
}

interface TicketPrinterProps {
  data: TicketData;
}

// Componente para imprimir ticket térmico (80mm o 58mm)
export const TicketPrinter = forwardRef<HTMLDivElement, TicketPrinterProps>(
  ({ data }, ref) => {
    return (
      <div
        ref={ref}
        className="ticket-print"
        style={{
          width: '80mm',
          fontFamily: 'monospace',
          fontSize: '12px',
          padding: '5mm',
          backgroundColor: 'white',
          color: 'black',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            {data.businessName}
          </div>
          {data.businessAddress && (
            <div style={{ fontSize: '10px' }}>{data.businessAddress}</div>
          )}
          {data.businessPhone && (
            <div style={{ fontSize: '10px' }}>Tel: {data.businessPhone}</div>
          )}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px dashed black', margin: '5px 0' }} />

        {/* Ticket Info */}
        <div style={{ marginBottom: '10px' }}>
          <div>
            <strong>Ticket:</strong> {data.ticketNumber}
          </div>
          <div>
            <strong>Fecha:</strong> {formatDateTime(data.date)}
          </div>
          {data.customerName && (
            <div>
              <strong>Cliente:</strong> {data.customerName}
            </div>
          )}
          {data.cashierName && (
            <div>
              <strong>Cajero:</strong> {data.cashierName}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px dashed black', margin: '5px 0' }} />

        {/* Items */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', fontSize: '10px' }}>Cant</th>
              <th style={{ textAlign: 'left', fontSize: '10px' }}>Producto</th>
              <th style={{ textAlign: 'right', fontSize: '10px' }}>P.U.</th>
              <th style={{ textAlign: 'right', fontSize: '10px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index}>
                <td style={{ fontSize: '11px' }}>{item.quantity}</td>
                <td
                  style={{
                    fontSize: '11px',
                    maxWidth: '100px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.name}
                </td>
                <td style={{ textAlign: 'right', fontSize: '11px' }}>
                  {formatCurrency(item.price)}
                </td>
                <td style={{ textAlign: 'right', fontSize: '11px' }}>
                  {formatCurrency(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Divider */}
        <div style={{ borderTop: '1px dashed black', margin: '5px 0' }} />

        {/* Totals */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <span>{formatCurrency(data.subtotal)}</span>
          </div>
          {data.tax && data.tax > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>IVA:</span>
              <span>{formatCurrency(data.tax)}</span>
            </div>
          )}
          {data.discount && data.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Descuento:</span>
              <span>-{formatCurrency(data.discount)}</span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '16px',
              fontWeight: 'bold',
              marginTop: '5px',
            }}
          >
            <span>TOTAL:</span>
            <span>{formatCurrency(data.total)}</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px dashed black', margin: '5px 0' }} />

        {/* Payment */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Método:</span>
            <span style={{ textTransform: 'capitalize' }}>{data.paymentMethod}</span>
          </div>
          {data.cashReceived && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Recibido:</span>
                <span>{formatCurrency(data.cashReceived)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cambio:</span>
                <span>{formatCurrency(data.change || 0)}</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '10px' }}>
          {data.footerText || 'Gracias por su compra'}
        </div>

        {/* Print styles */}
        <style>
          {`
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
              }
              .ticket-print {
                width: 80mm !important;
                padding: 3mm !important;
              }
            }
          `}
        </style>
      </div>
    );
  }
);

TicketPrinter.displayName = 'TicketPrinter';

// Función para imprimir ticket
export function printTicket(data: TicketData) {
  const printWindow = window.open('', '_blank', 'width=320,height=600');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ticket ${data.ticketNumber}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 3mm;
            font-family: monospace;
            font-size: 12px;
            width: 74mm;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed black; margin: 5px 0; }
          .row { display: flex; justify-content: space-between; }
          .total { font-size: 16px; font-weight: bold; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { font-size: 11px; padding: 2px 0; }
          th { text-align: left; font-size: 10px; }
          .price { text-align: right; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="bold" style="font-size: 16px;">${data.businessName}</div>
          ${data.businessAddress ? `<div style="font-size: 10px;">${data.businessAddress}</div>` : ''}
          ${data.businessPhone ? `<div style="font-size: 10px;">Tel: ${data.businessPhone}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div>
          <div><strong>Ticket:</strong> ${data.ticketNumber}</div>
          <div><strong>Fecha:</strong> ${formatDateTime(data.date)}</div>
          ${data.customerName ? `<div><strong>Cliente:</strong> ${data.customerName}</div>` : ''}
          ${data.cashierName ? `<div><strong>Cajero:</strong> ${data.cashierName}</div>` : ''}
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr>
              <th>Cant</th>
              <th>Producto</th>
              <th class="price">P.U.</th>
              <th class="price">Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.items
              .map(
                (item) => `
              <tr>
                <td>${item.quantity}</td>
                <td style="max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${item.name}
                </td>
                <td class="price">$${item.price.toFixed(2)}</td>
                <td class="price">$${item.total.toFixed(2)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="divider"></div>

        <div>
          <div class="row"><span>Subtotal:</span><span>$${data.subtotal.toFixed(2)}</span></div>
          ${data.tax && data.tax > 0 ? `<div class="row"><span>IVA:</span><span>$${data.tax.toFixed(2)}</span></div>` : ''}
          ${data.discount && data.discount > 0 ? `<div class="row"><span>Descuento:</span><span>-$${data.discount.toFixed(2)}</span></div>` : ''}
          <div class="row total"><span>TOTAL:</span><span>$${data.total.toFixed(2)}</span></div>
        </div>

        <div class="divider"></div>

        <div>
          <div class="row"><span>Método:</span><span style="text-transform: capitalize;">${data.paymentMethod}</span></div>
          ${data.cashReceived ? `
            <div class="row"><span>Recibido:</span><span>$${data.cashReceived.toFixed(2)}</span></div>
            <div class="row"><span>Cambio:</span><span>$${(data.change || 0).toFixed(2)}</span></div>
          ` : ''}
        </div>

        <div class="center" style="margin-top: 10px; font-size: 10px;">
          ${data.footerText || 'Gracias por su compra'}
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// Configuración para diferentes tipos de impresoras
export const PRINTER_CONFIGS = {
  thermal80mm: {
    width: '80mm',
    fontSize: '12px',
    paperWidth: 80,
  },
  thermal58mm: {
    width: '58mm',
    fontSize: '10px',
    paperWidth: 58,
  },
  a4: {
    width: '210mm',
    fontSize: '14px',
    paperWidth: 210,
  },
};
