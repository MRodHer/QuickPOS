import { useCartStore } from '../../stores/cartStore';
import { formatCurrency } from '../../lib/constants';
import { Trash2, Plus, Minus, ShoppingCart, Truck } from 'lucide-react';

interface CartPanelProps {
  onCheckout: () => void;
}

export function CartPanel({ onCheckout }: CartPanelProps) {
  const { items, subtotal, taxAmount, total, itemCount, updateQuantity, removeItem, clear, shippingAmount, setShipping } =
    useCartStore();

  const handleClear = () => {
    if (items.length === 0) return;
    if (confirm('¿Limpiar el carrito?')) {
      clear();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[calc(100vh-16rem)] flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            Carrito
          </h2>
          {items.length > 0 && (
            <button
              onClick={handleClear}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Carrito vacío
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.productId}
                className="bg-gray-50 rounded-lg p-3 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 flex-1 pr-2">{item.name}</h3>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="bg-white border border-gray-300 rounded p-1 hover:bg-gray-100"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-medium text-gray-900 w-12 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => {
                        if (item.trackStock && item.quantity >= item.availableStock) {
                          alert('No hay suficiente stock disponible');
                          return;
                        }
                        updateQuantity(item.productId, item.quantity + 1);
                      }}
                      className="bg-white border border-gray-300 rounded p-1 hover:bg-gray-100"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {formatCurrency(item.price)} x {item.quantity}
                    </p>
                    <p className="font-bold text-gray-900">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium text-gray-900">{formatCurrency(subtotal())}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">IVA (16%):</span>
            <span className="font-medium text-gray-900">{formatCurrency(taxAmount())}</span>
          </div>

          {/* Shipping */}
          <div className="flex items-center justify-between text-sm py-2 border-t border-gray-100">
            <span className="text-gray-600 flex items-center gap-1">
              <Truck className="w-4 h-4" />
              Envío:
            </span>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">$</span>
              <input
                type="number"
                value={shippingAmount || ''}
                onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                step="1"
                className="w-20 px-2 py-1 border border-gray-300 rounded text-right font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
            <span className="text-gray-900">TOTAL:</span>
            <span className="text-gray-900">{formatCurrency(total())}</span>
          </div>
        </div>

        <button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Cobrar ({itemCount()})
        </button>
      </div>
    </div>
  );
}
