/**
 * SPEC-POS-001: Online Orders System - Online Cart Store Tests
 *
 * RED Phase: Write tests for online cart store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOnlineCartStore } from './onlineCartStore';
import type { CartItem } from '@/types/online-orders';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('onlineCartStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useOnlineCartStore.getState().clearCart();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('addItem', () => {
    it('should add new item to empty cart', () => {
      const state = useOnlineCartStore.getState();

      state.addItem({
        productId: '123',
        name: 'Protein Bowl',
        price: 15.99,
        nutritionInfo: {
          calories: 450,
          protein: 35,
          carbs: 40,
          fat: 15,
        },
      });

      const items = useOnlineCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        productId: '123',
        name: 'Protein Bowl',
        price: 15.99,
        quantity: 1,
      });
    });

    it('should increment quantity if item already exists', () => {
      const state = useOnlineCartStore.getState();

      state.addItem({
        productId: '123',
        name: 'Protein Bowl',
        price: 15.99,
      });

      state.addItem({
        productId: '123',
        name: 'Protein Bowl',
        price: 15.99,
      });

      const items = useOnlineCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(2);
    });

    it('should add multiple items to cart', () => {
      const state = useOnlineCartStore.getState();

      state.addItem({
        productId: '123',
        name: 'Protein Bowl',
        price: 15.99,
      });

      state.addItem({
        productId: '456',
        name: 'Chicken Salad',
        price: 12.99,
      });

      const items = useOnlineCartStore.getState().items;
      expect(items).toHaveLength(2);
    });

    it('should use provided quantity instead of default 1', () => {
      const state = useOnlineCartStore.getState();

      state.addItem({
        productId: '123',
        name: 'Protein Bowl',
        price: 15.99,
        quantity: 3,
      });

      const items = useOnlineCartStore.getState().items;
      expect(items[0].quantity).toBe(3);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', () => {
      const state = useOnlineCartStore.getState();

      state.addItem({
        productId: '123',
        name: 'Protein Bowl',
        price: 15.99,
      });

      expect(useOnlineCartStore.getState().items).toHaveLength(1);

      state.removeItem('123');

      expect(useOnlineCartStore.getState().items).toHaveLength(0);
    });

    it('should not affect other items when removing', () => {
      const state = useOnlineCartStore.getState();

      state.addItem({
        productId: '123',
        name: 'Protein Bowl',
        price: 15.99,
      });

      state.addItem({
        productId: '456',
        name: 'Chicken Salad',
        price: 12.99,
      });

      state.removeItem('123');

      const items = useOnlineCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].productId).toBe('456');
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const state = useOnlineCartStore.getState();

      state.addItem({
        productId: '123',
        name: 'Protein Bowl',
        price: 15.99,
        quantity: 1,
      });

      state.updateQuantity('123', 5);

      const items = useOnlineCartStore.getState().items;
      expect(items[0].quantity).toBe(5);
    });

    it('should remove item if quantity is 0', () => {
      const state = useOnlineCartStore.getState();

      state.addItem({
        productId: '123',
        name: 'Protein Bowl',
        price: 15.99,
      });

      state.updateQuantity('123', 0);

      expect(useOnlineCartStore.getState().items).toHaveLength(0);
    });

    it('should remove item if quantity is negative', () => {
      const state = useOnlineCartStore.getState();

      state.addItem({
        productId: '123',
        name: 'Protein Bowl',
        price: 15.99,
      });

      state.updateQuantity('123', -1);

      expect(useOnlineCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('updateNotes', () => {
    it('should update item notes', () => {
      const state = useOnlineCartStore.getState();

      state.addItem({
        productId: '123',
        name: 'Protein Bowl',
        price: 15.99,
      });

      state.updateNotes('123', 'No onions please');

      const items = useOnlineCartStore.getState().items;
      expect(items[0].notes).toBe('No onions please');
    });
  });

  describe('clearCart', () => {
    it('should remove all items from cart', () => {
      const state = useOnlineCartStore.getState();

      state.addItem({
        productId: '123',
        name: 'Protein Bowl',
        price: 15.99,
      });

      state.addItem({
        productId: '456',
        name: 'Chicken Salad',
        price: 12.99,
      });

      expect(useOnlineCartStore.getState().items).toHaveLength(2);

      state.clearCart();

      expect(useOnlineCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('itemCount', () => {
    it('should return 0 for empty cart', () => {
      expect(useOnlineCartStore.getState().itemCount()).toBe(0);
    });

    it('should return total quantity of all items', () => {
      const state = useOnlineCartStore.getState();

      state.addItem({
        productId: '123',
        name: 'Protein Bowl',
        price: 15.99,
        quantity: 2,
      });

      state.addItem({
        productId: '456',
        name: 'Chicken Salad',
        price: 12.99,
        quantity: 3,
      });

      expect(useOnlineCartStore.getState().itemCount()).toBe(5);
    });
  });

  describe('subtotal', () => {
    it('should return 0 for empty cart', () => {
      expect(useOnlineCartStore.getState().subtotal()).toBe(0);
    });

    it('should calculate subtotal correctly', () => {
      const state = useOnlineCartStore.getState();

      state.addItem({
        productId: '123',
        name: 'Protein Bowl',
        price: 15.99,
        quantity: 2,
      });

      state.addItem({
        productId: '456',
        name: 'Chicken Salad',
        price: 12.99,
        quantity: 1,
      });

      expect(useOnlineCartStore.getState().subtotal()).toBe(44.97);
    });
  });

  describe('tax', () => {
    it('should return 0 for empty cart', () => {
      expect(useOnlineCartStore.getState().tax()).toBe(0);
    });

    it('should calculate 16% tax', () => {
      const state = useOnlineCartStore.getState();

      state.addItem({
        productId: '123',
        name: 'Protein Bowl',
        price: 100,
        quantity: 1,
      });

      expect(useOnlineCartStore.getState().tax()).toBe(16);
    });
  });

  describe('total', () => {
    it('should return 0 for empty cart', () => {
      expect(useOnlineCartStore.getState().total()).toBe(0);
    });

    it('should calculate subtotal + tax', () => {
      const state = useOnlineCartStore.getState();

      state.addItem({
        productId: '123',
        name: 'Protein Bowl',
        price: 100,
        quantity: 1,
      });

      expect(useOnlineCartStore.getState().total()).toBe(116);
    });
  });

  describe('nutrition', () => {
    it('should return zero nutrition for empty cart', () => {
      const nutrition = useOnlineCartStore.getState().nutrition();

      expect(nutrition.calories).toBe(0);
      expect(nutrition.protein).toBe(0);
      expect(nutrition.carbs).toBe(0);
      expect(nutrition.fat).toBe(0);
    });

    it('should sum nutrition for all items', () => {
      const state = useOnlineCartStore.getState();

      state.addItem({
        productId: '123',
        name: 'Protein Bowl',
        price: 15.99,
        quantity: 2,
        nutritionInfo: {
          calories: 450,
          protein: 35,
          carbs: 40,
          fat: 15,
          fiber: 5,
        },
      });

      const nutrition = useOnlineCartStore.getState().nutrition();

      expect(nutrition.calories).toBe(900);
      expect(nutrition.protein).toBe(70);
      expect(nutrition.carbs).toBe(80);
      expect(nutrition.fat).toBe(30);
      expect(nutrition.fiber).toBe(10);
    });

    it('should handle items without nutrition info', () => {
      const state = useOnlineCartStore.getState();

      state.addItem({
        productId: '123',
        name: 'Water Bottle',
        price: 2.99,
        quantity: 1,
      });

      const nutrition = useOnlineCartStore.getState().nutrition();

      expect(nutrition.calories).toBe(0);
    });
  });

  describe('getItem', () => {
    it('should return undefined for non-existent item', () => {
      expect(useOnlineCartStore.getState().getItem('123')).toBeUndefined();
    });

    it('should return item if exists', () => {
      const state = useOnlineCartStore.getState();

      state.addItem({
        productId: '123',
        name: 'Protein Bowl',
        price: 15.99,
      });

      const item = useOnlineCartStore.getState().getItem('123');

      expect(item).toBeDefined();
      expect(item?.productId).toBe('123');
    });
  });

  describe('hasItem', () => {
    it('should return false for non-existent item', () => {
      expect(useOnlineCartStore.getState().hasItem('123')).toBe(false);
    });

    it('should return true if item exists', () => {
      const state = useOnlineCartStore.getState();

      state.addItem({
        productId: '123',
        name: 'Protein Bowl',
        price: 15.99,
      });

      expect(useOnlineCartStore.getState().hasItem('123')).toBe(true);
    });
  });
});
