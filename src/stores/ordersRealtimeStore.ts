/**
 * SPEC-POS-001: Phase 2 - Orders Realtime Store
 *
 * Zustand store for managing realtime order updates
 */

import { create } from 'zustand';
import type { OnlineOrder, OnlineOrderStatus } from '@/types/online-orders';

/**
 * Connection states for realtime subscription
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Orders realtime store state
 */
interface OrdersRealtimeState {
  // Orders data
  orders: OnlineOrder[];

  // Connection state
  connectionState: ConnectionState;
  error: string | null;

  // Actions
  setOrders: (orders: OnlineOrder[]) => void;
  addOrder: (order: OnlineOrder) => void;
  updateOrder: (orderId: string, updates: Partial<OnlineOrder>) => void;
  removeOrder: (orderId: string) => void;
  setConnectionState: (state: ConnectionState) => void;
  setError: (error: string | null) => void;
  clearOrders: () => void;
}

/**
 * Orders realtime store using Zustand
 */
export const useOrdersRealtimeStore = create<OrdersRealtimeState>((set) => ({
  // Initial state
  orders: [],
  connectionState: 'disconnected',
  error: null,

  // Actions
  setOrders: (orders) => set({ orders }),

  addOrder: (order) =>
    set((state) => ({
      orders: [...state.orders, order],
    })),

  updateOrder: (orderId, updates) =>
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === orderId ? { ...order, ...updates } : order
      ),
    })),

  removeOrder: (orderId) =>
    set((state) => ({
      orders: state.orders.filter((order) => order.id !== orderId),
    })),

  setConnectionState: (connectionState) => set({ connectionState }),

  setError: (error) => set({ error }),

  clearOrders: () => set({ orders: [] }),
}));

/**
 * Selector hooks for optimized re-renders
 */
export const useOrders = () => useOrdersRealtimeStore((state) => state.orders);
export const useConnectionState = () =>
  useOrdersRealtimeStore((state) => state.connectionState);
export const useOrdersError = () => useOrdersRealtimeStore((state) => state.error);
