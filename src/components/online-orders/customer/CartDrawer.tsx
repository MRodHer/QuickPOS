/**
 * SPEC-POS-001: Online Orders System - CartDrawer Component
 *
 * Slide-out cart drawer for managing items before checkout
 * Shows cart summary and allows quantity adjustments
 */

import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import type { CartItem } from '@/types/online-orders';
import { useCartSummary, useCartActions } from '@/stores/onlineCartStore';
import { useState } from 'react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

/**
 * Cart drawer component
 */
export function CartDrawer({ isOpen, onClose, onCheckout }: CartDrawerProps) {
  const { items, itemCount, subtotal, tax, total, nutrition } = useCartSummary();
  const { updateQuantity, removeItem, clearCart } = useCartActions();
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    updateQuantity(productId, newQuantity);
  };

  const handleRemove = (productId: string) => {
    setIsRemoving(productId);
    setTimeout(() => {
      removeItem(productId);
      setIsRemoving(null);
    }, 200);
  };

  const handleCheckout = () => {
    onClose();
    onCheckout();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-gray-600" />
            <h2 id="cart-title" className="text-lg font-semibold text-gray-900">
              Tu Carrito
            </h2>
            {itemCount > 0 && (
              <span className="bg-blue-600 text-white text-sm font-medium px-2 py-0.5 rounded-full">
                {itemCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                Limpiar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Cerrar carrito"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cart Content */}
        <div className="flex flex-col h-[calc(100%-180px)]">
          {items.length === 0 ? (
            // Empty state
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500 text-center">Tu carrito está vacío</p>
              <p className="text-gray-400 text-sm text-center mt-1">
                Agrega productos del menú para comenzar
              </p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <ul className="space-y-4">
                  {items.map((item) => (
                    <CartItem
                      key={item.productId}
                      item={item}
                      isRemoving={isRemoving === item.productId}
                      onQuantityChange={handleQuantityChange}
                      onRemove={handleRemove}
                    />
                  ))}
                </ul>
              </div>

              {/* Nutrition Summary */}
              {nutrition.calories > 0 && (
                <div className="px-6 py-3 border-t bg-gray-50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total nutricional:</span>
                    <div className="flex gap-4">
                      <span>🔥 {nutrition.calories} kcal</span>
                      {nutrition.protein > 0 && (
                        <span>💪 {nutrition.protein}g proteína</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with totals and checkout */}
        {items.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t px-6 py-4">
            {/* Totals */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">IVA (16%)</span>
                <span className="font-medium">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout button */}
            <button
              type="button"
              onClick={handleCheckout}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Finalizar Pedido
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Individual cart item component
 */
interface CartItemProps {
  item: CartItem;
  isRemoving: boolean;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

function CartItem({ item, isRemoving, onQuantityChange, onRemove }: CartItemProps) {
  const [notes, setNotes] = useState(item.notes || '');
  const { updateNotes } = useCartActions();

  const handleNotesBlur = () => {
    updateNotes(item.productId, notes);
  };

  return (
    <li
      className={`flex gap-3 pb-4 border-b last:border-b-0 transition-opacity ${
        isRemoving ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Image */}
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-16 h-16 rounded object-cover flex-shrink-0"
        />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
          {item.name}
        </h3>

        {/* Nutrition summary */}
        {item.nutritionInfo && (
          <div className="flex gap-2 mt-1 text-xs text-gray-500">
            <span>{item.nutritionInfo.calories} kcal</span>
            {item.nutritionInfo.protein >= 20 && (
              <span className="text-green-600">💪 {item.nutritionInfo.protein}g</span>
            )}
          </div>
        )}

        {/* Price */}
        <p className="text-sm font-medium text-gray-900 mt-1">
          ${item.price.toFixed(2)}
        </p>

        {/* Notes input */}
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Notas (sin cebolla, etc.)"
          className="mt-2 w-full text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Quantity controls */}
      <div className="flex flex-col items-end justify-between">
        <button
          type="button"
          onClick={() => onRemove(item.productId)}
          className="text-gray-400 hover:text-red-600 text-xs transition-colors"
        >
          Eliminar
        </button>

        <div className="flex items-center gap-2 border rounded">
          <button
            type="button"
            onClick={() => onQuantityChange(item.productId, item.quantity - 1)}
            disabled={item.quantity <= 1}
            className="p-1 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            aria-label="Reducir cantidad"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
          <button
            type="button"
            onClick={() => onQuantityChange(item.productId, item.quantity + 1)}
            className="p-1 hover:bg-gray-100 transition-colors"
            aria-label="Aumentar cantidad"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </li>
  );
}
