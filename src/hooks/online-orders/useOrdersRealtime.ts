/**
 * SPEC-POS-001: Phase 2 - Realtime Orders Hook
 *
 * Custom hook for subscribing to online order changes via Supabase Realtime
 *
 * TAG-DESIGN: Realtime subscription for order updates
 * TAG-FUNCTION: useOrdersRealtime hook
 */

import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrdersRealtimeStore } from '@/stores/ordersRealtimeStore';
import type { OnlineOrder, OnlineOrderStatus, RealtimeChannel } from '@/types/online-orders';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Hook options for useOrdersRealtime
 */
export interface UseOrdersRealtimeOptions {
  /** Business ID to filter orders */
  businessId: string | null;
  /** Specific status(es) to filter - defaults to all statuses */
  status?: OnlineOrderStatus | OnlineOrderStatus[];
  /** Whether the hook should be enabled */
  enabled?: boolean;
  /** Channel name for the subscription (optional, auto-generated if not provided) */
  channelName?: string;
}

/**
 * Hook return value
 */
export interface UseOrdersRealtimeResult {
  /** Current orders list from the store */
  orders: OnlineOrder[];
  /** Current connection state */
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  /** Error message if connection failed */
  error: string | null;
  /** Manually refetch orders */
  refetch: () => Promise<void>;
}

/**
 * Supabase realtime channel type
 */
interface SupabaseRealtimeChannel {
  on: (event: string, callback: () => void) => SupabaseRealtimeChannel;
  subscribe: (callback?: (status: string, error?: Error) => void) => {
    unsubscribe: () => void;
  };
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Subscribe to online orders changes in real-time
 *
 * This hook automatically:
 * - Subscribes to Supabase realtime changes for the business's orders
 * - Unsubscribes when the component unmounts or dependencies change
 * - Updates the Zustand store with incoming changes
 * - Handles connection state and errors
 *
 * @param options - Hook configuration options
 * @returns Orders list, connection state, and refetch function
 *
 * @example
 * ```tsx
 * function StaffDashboard() {
 *   const { orders, connectionState, error } = useOrdersRealtime({
 *     businessId: 'business-123',
 *     status: ['pending', 'confirmed', 'preparing'],
 *   });
 *
 *   if (connectionState === 'connecting') return <LoadingSpinner />;
 *   if (connectionState === 'error') return <ErrorDisplay error={error} />;
 *
 *   return <OrdersList orders={orders} />;
 * }
 * ```
 */
export function useOrdersRealtime(
  options: UseOrdersRealtimeOptions
): UseOrdersRealtimeResult {
  const { businessId, status, enabled = true, channelName } = options;

  // Store selectors
  const orders = useOrdersRealtimeStore((state) => state.orders);
  const connectionState = useOrdersRealtimeStore((state) => state.connectionState);
  const error = useOrdersRealtimeStore((state) => state.error);

  // Store actions
  const setOrders = useOrdersRealtimeStore((state) => state.setOrders);
  const addOrder = useOrdersRealtimeStore((state) => state.addOrder);
  const updateOrder = useOrdersRealtimeStore((state) => state.updateOrder);
  const removeOrder = useOrdersRealtimeStore((state) => state.removeOrder);
  const setConnectionState = useOrdersRealtimeStore((state) => state.setConnectionState);
  const setError = useOrdersRealtimeStore((state) => state.setError);

  // Keep track of current channel for cleanup
  const channelRef = useRef<SupabaseRealtimeChannel | null>(null);
  const mountedRef = useRef(true);

  /**
   * Build the filter for the realtime subscription
   */
  const buildFilter = useCallback((): string => {
    if (!businessId) return '';

    let filter = `business_id=eq.${businessId}`;

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      const statusFilter = statuses.map((s) => `status=eq.${s}`).join(',');
      filter = `${filter}&and=(${statusFilter})`;
    }

    return filter;
  }, [businessId, status]);

  /**
   * Fetch initial orders
   */
  const refetch = useCallback(async () => {
    if (!businessId || !enabled || !mountedRef.current) {
      return;
    }

    try {
      let query = supabase
        .from('online_orders')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (status) {
        const statuses = Array.isArray(status) ? status : [status];
        query = query.in('status', statuses);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      if (mountedRef.current) {
        setOrders((data as OnlineOrder[]) || []);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      }
    }
  }, [businessId, status, enabled, setOrders, setError]);

  /**
   * Setup realtime subscription
   */
  useEffect(() => {
    mountedRef.current = true;

    // Don't subscribe if no businessId or disabled
    if (!businessId || !enabled) {
      setConnectionState('disconnected');
      return;
    }

    let subscription: { unsubscribe: () => void } | null = null;

    const setupSubscription = async () => {
      try {
        setConnectionState('connecting');
        setError(null);

        // Fetch initial orders
        await refetch();

        // Create channel name
        const channel = channelName || `online-orders:${businessId}`;

        // Build filter
        const filter = buildFilter();

        // Create realtime channel
        const realtimeChannel = supabase.channel(channel) as SupabaseRealtimeChannel;

        // Subscribe to changes
        const realtimeSubscription = realtimeChannel
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'online_orders',
              filter: filter || undefined,
            },
            (payload: any) => {
              if (!mountedRef.current) return;

              const { eventType, new: newRecord, old: oldRecord } = payload;

              switch (eventType) {
                case 'INSERT':
                  addOrder(newRecord as OnlineOrder);
                  break;

                case 'UPDATE':
                  updateOrder((newRecord as OnlineOrder).id, newRecord as Partial<OnlineOrder>);
                  break;

                case 'DELETE':
                  removeOrder((oldRecord as OnlineOrder).id);
                  break;
              }
            }
          )
          .subscribe((status, error) => {
            if (!mountedRef.current) return;

            if (error) {
              setConnectionState('error');
              setError(error.message);
            } else if (status === 'SUBSCRIBED') {
              setConnectionState('connected');
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              setConnectionState('disconnected');
            }
          });

        channelRef.current = realtimeChannel;
        subscription = realtimeSubscription;
      } catch (err) {
        setConnectionState('error');
        setError(err instanceof Error ? err.message : 'Failed to setup subscription');
      }
    };

    setupSubscription();

    // Cleanup function
    return () => {
      mountedRef.current = false;
      if (subscription) {
        subscription.unsubscribe();
      }
      // Note: Supabase channels are automatically cleaned up when all subscriptions are removed
    };
  }, [businessId, status, enabled, channelName, buildFilter, refetch]);

  return {
    orders,
    connectionState,
    error,
    refetch,
  };
}

/**
 * Hook to subscribe to a single order's changes
 *
 * @param orderId - The order ID to watch
 * @returns Order data and connection state
 */
export function useOrderRealtime(orderId: string | null) {
  const [order, setOrder] = React.useState<OnlineOrder | null>(null);
  const [connectionState, setConnectionState] = React.useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setConnectionState('disconnected');
      return;
    }

    let subscription: { unsubscribe: () => void } | null = null;

    const setupSubscription = async () => {
      try {
        setConnectionState('connecting');
        setError(null);

        // Fetch initial order
        const { data, error: fetchError } = await supabase
          .from('online_orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        setOrder(data as OnlineOrder);

        // Create realtime channel for single order
        const channel = supabase.channel(`order:${orderId}`) as SupabaseRealtimeChannel;

        const realtimeSubscription = channel
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'online_orders',
              filter: `id=eq.${orderId}`,
            },
            (payload: any) => {
              if (payload.eventType === 'UPDATE') {
                setOrder(payload.new as OnlineOrder);
              } else if (payload.eventType === 'DELETE') {
                setOrder(null);
              }
            }
          )
          .subscribe((status, err) => {
            if (err) {
              setConnectionState('error');
              setError(err.message);
            } else if (status === 'SUBSCRIBED') {
              setConnectionState('connected');
            }
          });

        subscription = realtimeSubscription;
      } catch (err) {
        setConnectionState('error');
        setError(err instanceof Error ? err.message : 'Failed to setup subscription');
      }
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [orderId]);

  return { order, connectionState, error };
}

// Import React for useState in useOrderRealtime
import React from 'react';
