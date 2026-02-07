/**
 * SPEC-POS-001: Phase 2 - Order Detail Modal Component
 *
 * Modal to show full order details with status change actions
 *
 * TAG-DESIGN: Order detail modal for staff
 * TAG-FUNCTION: OrderDetailModal component
 */

import { useState } from 'react';
import { StatusChangeHandler, type StatusUpdateOptions } from '@/services/orders';
import { supabase } from '@/lib/supabase';
import type { OnlineOrder, OnlineOrderStatus, OrderStatusHistory } from '@/types/online-orders';

// ============================================================================
// TYPES
// ============================================================================

export interface OrderDetailModalProps {
  /** Business ID for the current business */
  businessId: string;
  /** Order to display */
  order: OnlineOrder | null;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
}

// ============================================================================
// MAIN MODAL COMPONENT
// ============================================================================

export function OrderDetailModal({ businessId, order, isOpen, onClose }: OrderDetailModalProps) {
  const [statusHistory, setStatusHistory] = useState<OrderStatusHistory[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const statusHandler = new StatusChangeHandler(supabase);

  // Fetch status history when order changes
  if (order && statusHistory.length === 0 && isOpen) {
    statusHandler.getStatusHistory(order.id).then(setStatusHistory);
  }

  const handleStatusChange = async (newStatus: OnlineOrderStatus) => {
    if (!order) return;

    setIsUpdating(true);
    setUpdateError(null);

    const options: StatusUpdateOptions = {
      notes: notes || undefined,
      changedBy: 'staff', // In real app, use actual user ID
    };

    const result = await statusHandler.updateOrderStatus(order.id, newStatus, options);

    if (result.success) {
      onClose();
    } else {
      setUpdateError(result.error || 'Failed to update status');
    }

    setIsUpdating(false);
  };

  if (!isOpen || !order) {
    return null;
  }

  const statusHandlerInstance = new StatusChangeHandler(supabase);
  const allowedTransitions = statusHandlerInstance.getAllowedTransitions(order.status);

  return (
    <div
      data-testid="order-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{order.order_number}</h2>
            <p className="text-sm text-gray-600">
              Created {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <button
            data-testid="close-modal-button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Customer Info */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Customer Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-3">
                <span className="font-medium">{order.guest_name}</span>
              </div>
              <div className="text-sm text-gray-600">
                <div>{order.guest_email}</div>
                <div>{order.guest_phone}</div>
              </div>
            </div>
          </section>

          {/* Pickup Time */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Pickup Time
            </h3>
            <div data-testid="pickup-time" className="bg-gray-50 rounded-lg p-4">
              <div className="text-lg font-medium">
                {new Date(order.pickup_time).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div className="text-sm text-gray-600">
                Est. prep time: {order.estimated_prep_time} minutes
              </div>
            </div>
          </section>

          {/* Order Items */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Order Items
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span>
                    {item.quantity} x {item.name}
                  </span>
                  <span className="font-medium">${(item.unit_price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax</span>
                  <span>${order.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tip</span>
                  <span>${order.tip.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Notes */}
          {order.customer_notes && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Customer Notes
              </h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                {order.customer_notes}
              </div>
            </section>
          )}

          {/* Status History Timeline */}
          {statusHistory.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Status Timeline
              </h3>
              <div className="space-y-3">
                {statusHistory.map((entry) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      {entry !== statusHistory[statusHistory.length - 1] && (
                        <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="font-medium capitalize">{entry.new_status}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(entry.created_at).toLocaleString()}
                      </div>
                      {entry.notes && (
                        <div className="text-sm text-gray-500 mt-1">{entry.notes}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Error Message */}
          {updateError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {updateError}
            </div>
          )}

          {/* Status Actions */}
          <div data-testid="status-actions">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Change Status
            </h3>
            <div className="flex flex-wrap gap-2">
              {allowedTransitions.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={isUpdating}
                  className={`px-4 py-2 rounded-lg font-medium capitalize ${
                    isUpdating
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Notes input */}
            <div className="mt-4">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add a note about this status change..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
