/**
 * SPEC-POS-001: Online Orders System - Online Cart Store
 *
 * Zustand store for online shopping cart with localStorage persistence
 * Supports guest checkout (no authentication required)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, NutritionDisplay, Allergen, DietaryPreference } from '@/types/online-orders';

/**
 * Calculate nutrition totals for cart items
 */
function calculateCartNutrition(items: CartItem[]): NutritionDisplay {
  return items.reduce(
    (acc, item) => {
      const nutrition = item.nutritionInfo;
      if (nutrition) {
        return {
          calories: acc.calories + nutrition.calories * item.quantity,
          protein: acc.protein + nutrition.protein * item.quantity,
          carbs: acc.carbs + nutrition.carbs * item.quantity,
          fat: acc.fat + nutrition.fat * item.quantity,
          fiber: (acc.fiber || 0) + (nutrition.fiber || 0) * item.quantity,
        };
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

/**
 * Online cart store interface
 */
interface OnlineCartState {
  // Cart items
  items: CartItem[];

  // Actions
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateNotes: (productId: string, notes: string) => void;
  clearCart: () => void;

  // Computed values
  itemCount: () => number;
  subtotal: () => number;
  tax: () => number;
  total: () => number;
  nutrition: () => NutritionDisplay;

  // Helpers
  getItem: (productId: string) => CartItem | undefined;
  hasItem: (productId: string) => boolean;
}

/**
 * Online cart store with localStorage persistence
 * Uses Zustand with persist middleware for guest cart support
 */
export const useOnlineCartStore = create<OnlineCartState>()(
  persist(
    (set, get) => ({
      items: [],

      /**
       * Add item to cart or update quantity if already exists
       */
      addItem: (item) => {
        const items = get().items;
        const existingIndex = items.findIndex((i) => i.productId === item.productId);

        if (existingIndex >= 0) {
          // Update existing item quantity
          set({
            items: items.map((i, idx) =>
              idx === existingIndex
                ? { ...i, quantity: i.quantity + (item.quantity || 1) }
                : i
            ),
          });
        } else {
          // Add new item
          set({
            items: [...items, { ...item, quantity: item.quantity || 1 }],
          });
        }
      },

      /**
       * Remove item from cart
       */
      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.productId !== productId) });
      },

      /**
       * Update item quantity, remove if quantity is 0 or less
       */
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        });
      },

      /**
       * Update item notes
       */
      updateNotes: (productId, notes) => {
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, notes } : i
          ),
        });
      },

      /**
       * Clear all items from cart
       */
      clearCart: () => {
        set({ items: [] });
      },

      /**
       * Get total number of items in cart
       */
      itemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      /**
       * Calculate subtotal (sum of all item prices * quantities)
       */
      subtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
      },

      /**
       * Calculate tax (16% IVA for Mexico)
       */
      tax: () => {
        const subtotal = get().subtotal();
        return subtotal * 0.16;
      },

      /**
       * Calculate total (subtotal + tax)
       */
      total: () => {
        return get().subtotal() + get().tax();
      },

      /**
       * Calculate combined nutrition for all cart items
       */
      nutrition: () => {
        return calculateCartNutrition(get().items);
      },

      /**
       * Get specific item from cart
       */
      getItem: (productId) => {
        return get().items.find((i) => i.productId === productId);
      },

      /**
       * Check if item exists in cart
       */
      hasItem: (productId) => {
        return get().items.some((i) => i.productId === productId);
      },
    }),
    {
      name: 'online-cart-storage',
      // Only persist these fields
      partialize: (state) => ({
        items: state.items,
      }),
    }
  )
);

/**
 * Hook to get cart summary (computed values)
 */
export const useCartSummary = () => {
  const items = useOnlineCartStore((state) => state.items);
  const itemCount = useOnlineCartStore((state) => state.itemCount());
  const subtotal = useOnlineCartStore((state) => state.subtotal());
  const tax = useOnlineCartStore((state) => state.tax());
  const total = useOnlineCartStore((state) => state.total());
  const nutrition = useOnlineCartStore((state) => state.nutrition());

  return {
    items,
    itemCount,
    subtotal,
    tax,
    total,
    nutrition,
  };
};

/**
 * Hook to get cart actions
 */
export const useCartActions = () => ({
  addItem: useOnlineCartStore((state) => state.addItem),
  removeItem: useOnlineCartStore((state) => state.removeItem),
  updateQuantity: useOnlineCartStore((state) => state.updateQuantity),
  updateNotes: useOnlineCartStore((state) => state.updateNotes),
  clearCart: useOnlineCartStore((state) => state.clearCart),
});
