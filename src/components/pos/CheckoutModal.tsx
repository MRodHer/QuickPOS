import { useState, FormEvent } from 'react';
import { X } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { useCashRegisterStore } from '../../stores/cashRegisterStore';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency, QUICK_CASH_AMOUNTS } from '../../lib/constants';
import { TicketPreview } from './TicketPreview';

interface CheckoutModalProps {
  onClose: () => void;
}

type PaymentMethod = 'cash' | 'card' | 'terminal' | 'transfer' | 'mixed';

export function CheckoutModal({ onClose }: CheckoutModalProps) {
  const { items, total, clear } = useCartStore();
  const { currentRegister, refreshRegister } = useCashRegisterStore();
  const { currentBusiness } = useTenant();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [cardReference, setCardReference] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);

  const totalAmount = total();
  const change = paymentMethod === 'cash' ? Math.max(0, parseFloat(cashReceived || '0') - totalAmount) : 0;

  const handleQuickCash = (amount: number) => {
    setCashReceived(amount.toString());
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !currentRegister) return;

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No user found');

      const ticketNumberResult = await supabase.rpc('generate_ticket_number', {
        p_business_id: currentBusiness.id,
      });

      const ticketNumber = ticketNumberResult.data || `T-${Date.now()}`;

      let cashAmount = 0;
      let cardAmount = 0;
      let terminalAmount = 0;
      let transferAmount = 0;

      if (paymentMethod === 'cash') {
        cashAmount = totalAmount;
      } else if (paymentMethod === 'card') {
        cardAmount = totalAmount;
      } else if (paymentMethod === 'terminal') {
        terminalAmount = totalAmount;
      } else if (paymentMethod === 'transfer') {
        transferAmount = totalAmount;
      }

      const saleData: any = {
        business_id: currentBusiness.id,
        cash_register_id: currentRegister.id,
        seller_id: userData.user.id,
        ticket_number: ticketNumber,
        subtotal: items.reduce((sum, item) => {
          let price = item.price * item.quantity;
          if (item.taxIncluded) {
            price = price / (1 + item.taxRate);
          }
          return sum + price;
        }, 0),
        tax_amount: items.reduce((sum, item) => {
          let price = item.price * item.quantity;
          let subtotal = item.taxIncluded ? price / (1 + item.taxRate) : price;
          return sum + (subtotal * item.taxRate);
        }, 0),
        discount_amount: 0,
        total: totalAmount,
        payment_method: paymentMethod,
        amount_paid: paymentMethod === 'cash' ? parseFloat(cashReceived) : totalAmount,
        change_amount: change,
        cash_amount: cashAmount,
        card_amount: cardAmount,
        terminal_amount: terminalAmount,
        transfer_amount: transferAmount,
        card_reference: cardReference || null,
        transfer_reference: transferReference || null,
        status: 'completed',
      };

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert(saleData)
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItems = items.map((item) => {
        let itemSubtotal = item.price * item.quantity;
        if (item.taxIncluded) {
          itemSubtotal = itemSubtotal / (1 + item.taxRate);
        }
        const itemTax = itemSubtotal * item.taxRate;

        return {
          sale_id: sale.id,
          product_id: item.productId,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          tax_rate: item.taxRate,
          discount_percent: 0,
          subtotal: itemSubtotal,
          tax_amount: itemTax,
          total: itemSubtotal + itemTax,
        };
      });

      const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);

      if (itemsError) throw itemsError;

      for (const item of items) {
        if (item.trackStock) {
          const { data: product } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.productId)
            .single();

          if (product) {
            const newStock = product.stock_quantity - item.quantity;

            await supabase
              .from('products')
              .update({ stock_quantity: newStock })
              .eq('id', item.productId);

            await supabase.from('stock_movements').insert({
              business_id: currentBusiness.id,
              product_id: item.productId,
              user_id: userData.user.id,
              type: 'sale',
              quantity: -item.quantity,
              previous_stock: product.stock_quantity,
              new_stock: newStock,
              reference_id: sale.id,
            });
          }
        }
      }

      if (paymentMethod === 'cash') {
        await supabase.from('cash_movements').insert({
          business_id: currentBusiness.id,
          cash_register_id: currentRegister.id,
          user_id: userData.user.id,
          type: 'sale',
          amount: totalAmount,
          sale_id: sale.id,
        });
      }

      const updatedRegister = {
        total_sales: currentRegister.total_sales + totalAmount,
        total_cash: currentRegister.total_cash + cashAmount,
        total_card: currentRegister.total_card + cardAmount,
        total_terminal: currentRegister.total_terminal + terminalAmount,
        total_transfer: currentRegister.total_transfer + transferAmount,
        sale_count: currentRegister.sale_count + 1,
      };

      await supabase
        .from('cash_registers')
        .update(updatedRegister)
        .eq('id', currentRegister.id);

      await refreshRegister();
      setCompletedSale(sale);
    } catch (error) {
      console.error('Error completing sale:', error);
      alert('Error al completar la venta');
    } finally {
      setLoading(false);
    }
  };

  if (completedSale) {
    return (
      <TicketPreview
        sale={completedSale}
        items={items}
        onClose={() => {
          clear();
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">Cobrar</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="text-center py-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total a cobrar</p>
            <p className="text-5xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Método de Pago
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'cash', label: 'Efectivo' },
                { value: 'card', label: 'Tarjeta' },
                { value: 'terminal', label: 'Terminal' },
                { value: 'transfer', label: 'Transferencia' },
              ].map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value as PaymentMethod)}
                  className={`px-4 py-3 rounded-lg font-medium transition ${
                    paymentMethod === method.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'cash' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto Recibido
              </label>
              <input
                type="number"
                step="0.01"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg"
                placeholder="0.00"
              />
              <div className="grid grid-cols-5 gap-2 mt-3">
                {QUICK_CASH_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => handleQuickCash(amount)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm transition"
                  >
                    ${amount}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCashReceived(totalAmount.toFixed(2))}
                  className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium text-sm transition"
                >
                  Exacto
                </button>
              </div>

              {cashReceived && parseFloat(cashReceived) >= totalAmount && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 font-medium">Cambio:</p>
                  <p className="text-3xl font-bold text-green-700">{formatCurrency(change)}</p>
                </div>
              )}
            </div>
          )}

          {paymentMethod === 'card' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referencia (Opcional)
              </label>
              <input
                type="text"
                value={cardReference}
                onChange={(e) => setCardReference(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Últimos 4 dígitos o referencia"
              />
            </div>
          )}

          {paymentMethod === 'transfer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referencia (Opcional)
              </label>
              <input
                type="text"
                value={transferReference}
                onChange={(e) => setTransferReference(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Número de referencia"
              />
            </div>
          )}

          {paymentMethod === 'terminal' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                El cobro con terminal se registrará manualmente. Procesa el pago en tu dispositivo
                y confirma la transacción aquí.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                loading || (paymentMethod === 'cash' && parseFloat(cashReceived || '0') < totalAmount)
              }
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Procesando...' : 'Completar Venta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
