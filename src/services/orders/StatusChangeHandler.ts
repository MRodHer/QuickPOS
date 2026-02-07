/**
 * SPEC-POS-001: Phase 2 - Status Change Handler Service
 *
 * Service to manage order status transitions with validation,
 * logging, and automatic notifications.
 *
 * TAG-DESIGN: Order status management with transition validation
 * TAG-FUNCTION: StatusChangeHandler class
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  OnlineOrderStatus,
  OrderStatusHistory,
  OnlineOrder,
} from '@/types/online-orders';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Status change update options
 */
export interface StatusUpdateOptions {
  /** Optional notes for the status change */
  notes?: string;
  /** ID of the user/staff making the change */
  changedBy?: string;
  /** Skip sending notification for this change */
  skipNotification?: boolean;
  /** Cancellation reason when status is cancelled */
  cancellationReason?: string;
}

/**
 * Status change result
 */
export interface StatusChangeResult {
  /** Whether the status change was successful */
  success: boolean;
  /** Updated order if successful */
  order?: OnlineOrder;
  /** Error message if failed */
  error?: string;
  /** History entry created */
  historyEntry?: OrderStatusHistory;
}

/**
 * Notification trigger callback
 */
export type NotificationTriggerCallback = (
  orderId: string,
  order: OnlineOrder
) => Promise<boolean>;

// ============================================================================
// STATUS CHANGE HANDLER CLASS
// ============================================================================

/**
 * Service for managing order status transitions
 *
 * Features:
 * - Validates status transitions follow business rules
 * - Updates order with proper timestamps
 * - Logs all status changes for audit trail
 * - Triggers notifications on specific status changes
 */
export class StatusChangeHandler {
  private readonly supabase: SupabaseClient;
  private notificationCallback?: NotificationTriggerCallback;

  /**
   * Valid status transitions following business rules
   * pending -> confirmed -> preparing -> ready -> picked_up
   * Any state -> cancelled (except terminal states)
   */
  private readonly validTransitions: Record<OnlineOrderStatus, OnlineOrderStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['picked_up', 'cancelled'],
    picked_up: [], // Terminal state
    cancelled: [], // Terminal state
  };

  /**
   * Timestamp fields to set for each status
   */
  private readonly timestampFields: Partial<Record<OnlineOrderStatus, keyof OnlineOrder>> = {
    confirmed: 'confirmed_at',
    preparing: 'started_preparing_at',
    ready: 'ready_at',
    picked_up: 'picked_up_at',
    cancelled: 'cancelled_at',
  };

  /**
   * Create a new StatusChangeHandler instance
   *
   * @param supabase - Supabase client for database operations
   * @param notificationCallback - Optional callback for triggering notifications
   */
  constructor(
    supabase: SupabaseClient,
    notificationCallback?: NotificationTriggerCallback
  ) {
    this.supabase = supabase;
    this.notificationCallback = notificationCallback;
  }

  // ========================================================================
  // VALIDATION METHODS
  // ========================================================================

  /**
   * Validate if a status transition is allowed
   *
   * @param from - Current status (null for new orders)
   * @param to - Target status
   * @returns Whether the transition is valid
   */
  async validateStatusTransition(
    from: OnlineOrderStatus | null,
    to: OnlineOrderStatus
  ): Promise<boolean> {
    // New orders can start with 'pending'
    if (from === null && to === 'pending') {
      return true;
    }

    // If no current status, only pending is valid
    if (!from) {
      return false;
    }

    // Check if transition is in valid list
    const allowed = this.validTransitions[from] || [];
    return allowed.includes(to);
  }

  /**
   * Get all allowed transitions from a given status
   *
   * @param fromStatus - Current status
   * @returns Array of allowed target statuses
   */
  getAllowedTransitions(fromStatus: OnlineOrderStatus): OnlineOrderStatus[] {
    return this.validTransitions[fromStatus] || [];
  }

  // ========================================================================
  // STATUS UPDATE METHODS
  // ========================================================================

  /**
   * Update order status with validation and logging
   *
   * @param orderId - The order ID to update
   * @param newStatus - The target status
   * @param options - Optional update parameters
   * @returns Status change result
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OnlineOrderStatus,
    options?: StatusUpdateOptions
  ): Promise<StatusChangeResult> {
    try {
      // Fetch current order
      const { data: order, error: fetchError } = await this.supabase
        .from('online_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError || !order) {
        return {
          success: false,
          error: fetchError?.message || 'Order not found',
        };
      }

      const currentStatus = order.status as OnlineOrderStatus;

      // Validate transition
      const isValid = await this.validateStatusTransition(currentStatus, newStatus);
      if (!isValid) {
        return {
          success: false,
          error: `Invalid status transition from ${currentStatus} to ${newStatus}`,
        };
      }

      // Build update data with timestamp
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Add status-specific timestamp
      const timestampField = this.timestampFields[newStatus];
      if (timestampField) {
        updateData[timestampField] = new Date().toISOString();
      }

      // Add cancellation reason if provided
      if (newStatus === 'cancelled' && options?.cancellationReason) {
        updateData.cancellation_reason = options.cancellationReason;
      }

      // Update order
      const { data: updatedOrder, error: updateError } = await this.supabase
        .from('online_orders')
        .update(updateData)
        .eq('id', orderId)
        .select('*')
        .single();

      if (updateError || !updatedOrder) {
        return {
          success: false,
          error: updateError?.message || 'Failed to update order',
        };
      }

      // Log status change
      const historyEntry = await this.logStatusChange(
        orderId,
        currentStatus,
        newStatus,
        options?.changedBy,
        options?.notes
      );

      // Trigger notification if ready and not skipped
      let notificationSent = false;
      if (newStatus === 'ready' && !options?.skipNotification) {
        notificationSent = await this.triggerNotificationIfReady(orderId, newStatus);
      }

      return {
        success: true,
        order: updatedOrder as OnlineOrder,
        historyEntry: historyEntry || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Bulk update multiple orders to the same status
   *
   * @param orderIds - Array of order IDs to update
   * @param newStatus - The target status
   * @param options - Optional update parameters
   * @returns Array of status change results
   */
  async bulkUpdateOrderStatus(
    orderIds: string[],
    newStatus: OnlineOrderStatus,
    options?: StatusUpdateOptions
  ): Promise<StatusChangeResult[]> {
    const results: StatusChangeResult[] = [];

    for (const orderId of orderIds) {
      const result = await this.updateOrderStatus(orderId, newStatus, options);
      results.push(result);
    }

    return results;
  }

  // ========================================================================
  // LOGGING METHODS
  // ========================================================================

  /**
   * Log a status change to the order status history table
   *
   * @param orderId - The order ID
   * @param oldStatus - Previous status (null for new orders)
   * @param newStatus - New status
   * @param changedBy - User/staff ID who made the change
   * @param notes - Optional notes
   * @returns Created history entry or null on error
   */
  async logStatusChange(
    orderId: string,
    oldStatus: OnlineOrderStatus | null,
    newStatus: OnlineOrderStatus,
    changedBy?: string,
    notes?: string
  ): Promise<OrderStatusHistory | null> {
    try {
      const { data, error } = await this.supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          old_status: oldStatus,
          new_status: newStatus,
          changed_by: changedBy || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (error || !data) {
        console.error('Failed to log status change:', error);
        return null;
      }

      return data as OrderStatusHistory;
    } catch (error) {
      console.error('Error logging status change:', error);
      return null;
    }
  }

  /**
   * Get status history for an order
   *
   * @param orderId - The order ID
   * @returns Array of status history entries
   */
  async getStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
    try {
      const { data, error } = await this.supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) {
        return [];
      }

      return (data as OrderStatusHistory[]) || [];
    } catch {
      return [];
    }
  }

  // ========================================================================
  // NOTIFICATION METHODS
  // ========================================================================

  /**
   * Trigger notification if order status changed to ready
   *
   * @param orderId - The order ID
   * @param newStatus - The new status
   * @returns Whether notification was triggered
   */
  async triggerNotificationIfReady(
    orderId: string,
    newStatus: OnlineOrderStatus
  ): Promise<boolean> {
    if (newStatus !== 'ready') {
      return false;
    }

    // Fetch order details for notification
    const { data: order } = await this.supabase
      .from('online_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) {
      return false;
    }

    // Use callback if provided
    if (this.notificationCallback) {
      return this.notificationCallback(orderId, order as OnlineOrder);
    }

    // Default: just mark notification as sent in order
    try {
      await this.supabase
        .from('online_orders')
        .update({ notification_sent: true })
        .eq('id', orderId);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Set notification callback for triggering notifications
   *
   * @param callback - The notification callback function
   */
  setNotificationCallback(callback: NotificationTriggerCallback): void {
    this.notificationCallback = callback;
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Check if an order can be cancelled
   *
   * @param orderId - The order ID
   * @returns Whether the order can be cancelled
   */
  async canCancelOrder(orderId: string): Promise<boolean> {
    const { data: order } = await this.supabase
      .from('online_orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (!order) {
      return false;
    }

    const status = order.status as OnlineOrderStatus;
    return status !== 'picked_up' && status !== 'cancelled';
  }

  /**
   * Get order statistics by status
   *
   * @param businessId - The business ID
   * @returns Object with counts per status
   */
  async getOrderStats(businessId: string): Promise<Partial<Record<OnlineOrderStatus, number>>> {
    try {
      const { data, error } = await this.supabase
        .from('online_orders')
        .select('status')
        .eq('business_id', businessId);

      if (error || !data) {
        return {};
      }

      const stats: Partial<Record<OnlineOrderStatus, number>> = {};
      for (const order of data) {
        const status = order.status as OnlineOrderStatus;
        stats[status] = (stats[status] || 0) + 1;
      }

      return stats;
    } catch {
      return {};
    }
  }

  /**
   * Get overdue orders (orders past pickup time not yet picked up)
   *
   * @param businessId - The business ID
   * @returns Array of overdue orders
   */
  async getOverdueOrders(businessId: string): Promise<OnlineOrder[]> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await this.supabase
        .from('online_orders')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'ready')
        .lt('pickup_time', now);

      if (error || !data) {
        return [];
      }

      return data as OnlineOrder[];
    } catch {
      return [];
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a status is a terminal state
 */
export function isTerminalStatus(status: OnlineOrderStatus): boolean {
  return status === 'picked_up' || status === 'cancelled';
}

/**
 * Check if a status transition is valid (utility function)
 */
export function isValidTransition(
  from: OnlineOrderStatus | null,
  to: OnlineOrderStatus
): boolean {
  if (from === null && to === 'pending') {
    return true;
  }

  if (!from) {
    return false;
  }

  const transitions: Record<OnlineOrderStatus, OnlineOrderStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['picked_up', 'cancelled'],
    picked_up: [],
    cancelled: [],
  };

  return (transitions[from] || []).includes(to);
}

/**
 * Get next status in the normal flow
 */
export function getNextNormalStatus(current: OnlineOrderStatus): OnlineOrderStatus | null {
  const flow: Record<OnlineOrderStatus, OnlineOrderStatus | null> = {
    pending: 'confirmed',
    confirmed: 'preparing',
    preparing: 'ready',
    ready: 'picked_up',
    picked_up: null,
    cancelled: null,
  };

  return flow[current];
}
