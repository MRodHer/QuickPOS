import { useState } from 'react';
import { Printer, Bluetooth, Check, Loader2, Link2, Copy, MessageCircle, Clock } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { formatCurrency, formatDateTime } from '../../lib/constants';
import { useBluetoothPrinter } from '../../hooks/useBluetoothPrinter';
import type { CartItem } from '../../stores/cartStore';

interface TicketPreviewProps {
  sale: any;
  items: CartItem[];
  clipLinkUrl?: string;
  customerPhone?: string;
  onClose: () => void;
}

export function TicketPreview({ sale, items, clipLinkUrl, customerPhone, onClose }: TicketPreviewProps) {
  const { currentBusiness } = useTenant();
  const {
    isConnected,
    isConnecting,
    deviceName,
    connect,
    printTicket,
    isSupported,
  } = useBluetoothPrinter();
  const [isPrinting, setIsPrinting] = useState(false);
  const [printed, setPrinted] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);

  const isPendingPayment = sale.status === 'pending_payment';

  const generateTicketText = () => {
    const lines = [];
    lines.push(`*${currentBusiness?.name || 'Mi Negocio'}*`);
    if (currentBusiness?.address) lines.push(currentBusiness.address);
    if (currentBusiness?.rfc) lines.push(`RFC: ${currentBusiness.rfc}`);
    lines.push('');
    lines.push(`📄 Ticket: ${sale.ticket_number}`);
    lines.push(`📅 ${formatDateTime(sale.created_at)}`);
    lines.push('─'.repeat(20));

    items.forEach(item => {
      lines.push(`${item.quantity}x ${item.name}`);
      lines.push(`   ${formatCurrency(item.price * item.quantity)}`);
    });

    lines.push('─'.repeat(20));
    lines.push(`Subtotal: ${formatCurrency(sale.subtotal)}`);
    if (sale.tax_amount > 0) {
      lines.push(`IVA: ${formatCurrency(sale.tax_amount)}`);
    }
    lines.push(`*TOTAL: ${formatCurrency(sale.total)}*`);
    lines.push('');
    lines.push(`💳 Pago: ${sale.payment_method}`);
    if (sale.payment_method === 'cash') {
      lines.push(`Recibido: ${formatCurrency(sale.amount_paid)}`);
      lines.push(`Cambio: ${formatCurrency(sale.change_amount)}`);
    }
    lines.push('');
    lines.push(currentBusiness?.receipt_footer || '¡Gracias por su compra!');

    return lines.join('\n');
  };

  const handleWhatsAppShare = () => {
    const ticketText = generateTicketText();
    const encodedText = encodeURIComponent(ticketText);
    const phone = customerPhone?.replace(/\D/g, '') || '';
    const url = phone
      ? `https://wa.me/52${phone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;
    window.open(url, '_blank');
    setWhatsappSent(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    if (!clipLinkUrl) return;
    await navigator.clipboard.writeText(clipLinkUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleBluetoothPrint = async () => {
    if (!isConnected) {
      const connected = await connect();
      if (!connected) return;
    }

    setIsPrinting(true);
    try {
      const ticketData = {
        businessName: currentBusiness?.name || 'Mi Negocio',
        businessAddress: currentBusiness?.address,
        businessPhone: currentBusiness?.phone,
        ticketNumber: sale.ticket_number,
        date: formatDateTime(sale.created_at),
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
        subtotal: sale.subtotal,
        tax: sale.tax_amount,
        discount: sale.discount_amount,
        total: sale.total,
        paymentMethod: sale.payment_method,
        cashReceived: sale.amount_paid,
        change: sale.change_amount,
        footerText: currentBusiness?.receipt_footer || 'Gracias por su compra',
      };

      const success = await printTicket(ticketData);
      if (success) {
        setPrinted(true);
      }
    } catch (error) {
      console.error('Print error:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Success header */}
          <div className="text-center mb-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
              isPendingPayment ? 'bg-purple-100' : 'bg-green-100'
            }`}>
              {isPendingPayment ? (
                <Clock className="w-8 h-8 text-purple-600" />
              ) : (
                <Check className="w-8 h-8 text-green-600" />
              )}
            </div>
            <h2 className={`text-xl font-bold ${isPendingPayment ? 'text-purple-700' : 'text-green-700'}`}>
              {isPendingPayment ? 'Venta Pendiente de Pago' : 'Venta Completada'}
            </h2>
          </div>

          {/* Clip Payment Link */}
          {clipLinkUrl && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-purple-700 mb-2 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Link de pago generado
              </p>
              <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-purple-300">
                <input
                  type="text"
                  value={clipLinkUrl}
                  readOnly
                  className="flex-1 text-sm text-gray-700 bg-transparent outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-2 text-purple-600 hover:bg-purple-100 rounded transition"
                >
                  {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-purple-600 mt-2">
                Envía este link al cliente para que complete el pago
              </p>
            </div>
          )}

          {/* Ticket preview */}
          <div id="ticket" className="bg-gray-50 p-4 rounded-lg font-mono text-sm mb-6">
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

          {/* Print buttons */}
          <div className="space-y-3">
            {/* Bluetooth print button - primary on mobile */}
            {isSupported && (
              <button
                onClick={handleBluetoothPrint}
                disabled={isPrinting}
                className={`w-full px-6 py-4 rounded-lg font-medium transition flex items-center justify-center gap-3 ${
                  printed
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isPrinting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Imprimiendo...
                  </>
                ) : printed ? (
                  <>
                    <Check className="w-5 h-5" />
                    Impreso
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-5 h-5" />
                    {isConnected
                      ? `Imprimir en ${deviceName || 'Bluetooth'}`
                      : 'Imprimir Bluetooth'}
                  </>
                )}
              </button>
            )}

            {/* Regular print button */}
            <button
              onClick={handlePrint}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition flex items-center justify-center gap-2"
            >
              <Printer className="w-5 h-5" />
              {isSupported ? 'Imprimir (navegador)' : 'Imprimir Ticket'}
            </button>

            {/* WhatsApp button */}
            <button
              onClick={handleWhatsAppShare}
              className={`w-full px-6 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                whatsappSent
                  ? 'bg-green-100 text-green-700'
                  : 'bg-[#25D366] text-white hover:bg-[#128C7E]'
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              {whatsappSent ? 'Enviado a WhatsApp' : 'Enviar por WhatsApp'}
            </button>

            {/* New sale button */}
            <button
              onClick={onClose}
              className="w-full px-6 py-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition text-lg"
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
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}
