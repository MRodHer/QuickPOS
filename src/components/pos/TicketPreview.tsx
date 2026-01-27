import { useTenant } from '../../contexts/TenantContext';
import { formatCurrency, formatDateTime } from '../../lib/constants';
import type { CartItem } from '../../stores/cartStore';

interface TicketPreviewProps {
  sale: any;
  items: CartItem[];
  onClose: () => void;
}

export function TicketPreview({ sale, items, onClose }: TicketPreviewProps) {
  const { currentBusiness } = useTenant();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div id="ticket" className="bg-white p-6 font-mono text-sm">
            <div className="text-center mb-4">
              <h1 className="text-lg font-bold">{currentBusiness?.name}</h1>
              {currentBusiness?.address && (
                <p className="text-xs">{currentBusiness.address}</p>
              )}
              {currentBusiness?.rfc && (
                <p className="text-xs">RFC: {currentBusiness.rfc}</p>
              )}
            </div>

            <div className="border-t border-b border-gray-300 py-2 mb-4 text-xs">
              <p>Ticket: {sale.ticket_number}</p>
              <p>Fecha: {formatDateTime(sale.created_at)}</p>
            </div>

            <div className="mb-4">
              {items.map((item, index) => (
                <div key={index} className="mb-2">
                  <div className="flex justify-between">
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-300 pt-2 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (16%):</span>
                <span>{formatCurrency(sale.tax_amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-gray-300 pt-2 mt-2">
                <span>TOTAL:</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
            </div>

            <div className="border-t border-gray-300 mt-4 pt-2 text-xs">
              <div className="flex justify-between mb-1">
                <span>Pago:</span>
                <span className="capitalize">{sale.payment_method}</span>
              </div>
              {sale.payment_method === 'cash' && (
                <>
                  <div className="flex justify-between">
                    <span>Recibido:</span>
                    <span>{formatCurrency(sale.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cambio:</span>
                    <span>{formatCurrency(sale.change_amount)}</span>
                  </div>
                </>
              )}
            </div>

            {currentBusiness?.receipt_footer && (
              <div className="text-center mt-4 text-xs border-t border-gray-300 pt-4">
                <p>{currentBusiness.receipt_footer}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handlePrint}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
            >
              Nueva Venta
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #ticket, #ticket * {
            visibility: visible;
          }
          #ticket {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
          }
        }
      `}</style>
    </div>
  );
}
