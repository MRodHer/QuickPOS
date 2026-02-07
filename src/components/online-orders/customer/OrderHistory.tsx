/**
 * SPEC-POS-001 Phase 3: Order History Component
 *
 * Displays customer's past orders with ability to:
 * - View order details
 * - Repeat a previous order
 */

import { useEffect, useState } from 'react';
import { useCustomerProfileStore } from '@/stores/customerProfileStore';
import { useOnlineCartStore } from '@/stores/onlineCartStore';
import type { OnlineOrder, OnlineOrderStatus } from '@/types/online-orders';

interface OrderHistoryProps {
  onViewOrder?: (order: OnlineOrder) => void;
}

const STATUS_LABELS: Record<OnlineOrderStatus, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800' },
  preparing: { label: 'Preparando', color: 'bg-purple-100 text-purple-800' },
  ready: { label: 'Listo', color: 'bg-green-100 text-green-800' },
  picked_up: { label: 'Recogido', color: 'bg-gray-100 text-gray-800' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
};

export function OrderHistory({ onViewOrder }: OrderHistoryProps) {
  const profile = useCustomerProfileStore((state) => state.profile);
  const orderHistory = useCustomerProfileStore((state) => state.orderHistory);
  const isLoading = useCustomerProfileStore((state) => state.isLoadingHistory);
  const fetchOrderHistory = useCustomerProfileStore((state) => state.fetchOrderHistory);
  const addItem = useOnlineCartStore((state) => state.addItem);

  const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null);
  const [repeatSuccess, setRepeatSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.user_id) {
      fetchOrderHistory(20);
    }
  }, [profile?.user_id, fetchOrderHistory]);

  const handleRepeatOrder = (order: OnlineOrder) => {
    order.items.forEach((item) => {
      addItem({
        productId: item.product_id,
        name: item.name,
        price: item.unit_price,
        quantity: item.quantity,
        notes: item.notes,
        nutritionInfo: item.nutrition_info,
      });
    });
    setRepeatSuccess(order.order_number);
    setTimeout(() => setRepeatSuccess(null), 3000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  if (!profile) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Inicia sesión para ver tu historial de pedidos.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-3 text-gray-600">Cargando historial...</span>
      </div>
    );
  }

  if (orderHistory.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-3">📋</div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Sin pedidos aún
        </h3>
        <p className="text-gray-500">
          Tus pedidos aparecerán aquí después de tu primera orden.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" aria-label="Historial de pedidos">
      <h2 className="text-lg font-semibold text-gray-900">Historial de Pedidos</h2>

      {repeatSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          ✓ Productos del pedido #{repeatSuccess} agregados al carrito
        </div>
      )}

      <div className="space-y-3">
        {orderHistory.map((order) => (
          <div
            key={order.id}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Order Header */}
            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    #{order.order_number}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_LABELS[order.status].color
                    }`}
                  >
                    {STATUS_LABELS[order.status].label}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(order.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  {formatCurrency(order.total)}
                </p>
                <p className="text-sm text-gray-500">
                  {order.items.length} producto{order.items.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Order Items Preview */}
            <div className="px-4 pb-3 border-t border-gray-100 pt-3">
              <div className="flex flex-wrap gap-1 mb-3">
                {order.items.slice(0, 3).map((item, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                  >
                    {item.quantity}x {item.name}
                  </span>
                ))}
                {order.items.length > 3 && (
                  <span className="text-xs text-gray-500 px-2 py-1">
                    +{order.items.length - 3} más
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedOrder(order);
                    onViewOrder?.(order);
                  }}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Ver detalles
                </button>
                {order.status !== 'cancelled' && (
                  <button
                    onClick={() => handleRepeatOrder(order)}
                    className="flex-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Repetir pedido
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onRepeat={() => {
            handleRepeatOrder(selectedOrder);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
}

interface OrderDetailModalProps {
  order: OnlineOrder;
  onClose: () => void;
  onRepeat: () => void;
}

function OrderDetailModal({ order, onClose, onRepeat }: OrderDetailModalProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Pedido #{order.order_number}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Estado:</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                STATUS_LABELS[order.status].color
              }`}
            >
              {STATUS_LABELS[order.status].label}
            </span>
          </div>

          {/* Items */}
          <div>
            <h4 className="font-medium mb-2">Productos:</h4>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span className="text-gray-600">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>IVA</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
            {order.tip > 0 && (
              <div className="flex justify-between text-sm">
                <span>Propina</span>
                <span>{formatCurrency(order.tip)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Pickup Time */}
          <div className="text-sm text-gray-600">
            <span className="font-medium">Hora de recogida: </span>
            {new Date(order.pickup_time).toLocaleString('es-MX')}
          </div>

          {/* Notes */}
          {order.customer_notes && (
            <div className="text-sm">
              <span className="font-medium">Notas: </span>
              {order.customer_notes}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cerrar
          </button>
          {order.status !== 'cancelled' && (
            <button
              onClick={onRepeat}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Repetir pedido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderHistory;
