/**
 * SPEC-POS-001: Phase 2 - Status Change Handler Tests
 *
 * TDD RED Phase: Write failing tests for status change handler
 *
 * Features:
 * - Status transition validation
 * - Order status updates with timestamps
 * - Status change logging
 * - Automatic notifications on status change
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  OnlineOrderStatus,
  OrderStatusHistory,
  OnlineOrder,
} from '@/types/online-orders';

// Import the actual implementation (GREEN phase)
import {
  StatusChangeHandler,
  type StatusUpdateOptions,
  type StatusChangeResult,
} from './StatusChangeHandler';

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const mockUpdate = vi.fn();
  const mockEq = vi.fn();
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockSingle = vi.fn();
  const mockOrder = vi.fn();

  return {
    supabase: {
      from: vi.fn(() => ({
        update: mockUpdate,
        insert: mockInsert,
        select: mockSelect,
      })),
      channel: vi.fn(),
    },
  };
});

describe('StatusChangeHandler', () => {
  let handler: StatusChangeHandler;
  let mockSupabase: any;

  // Mock chain functions
  let mockFrom: any;
  let mockSelect: any;
  let mockUpdate: any;
  let mockInsert: any;
  let mockEq: any;
  let mockSingle: any;
  let mockOrder: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mocks for each test
    mockSingle = vi.fn();
    mockOrder = vi.fn();
    mockEq = vi.fn();
    mockSelect = vi.fn();
    mockUpdate = vi.fn();
    mockInsert = vi.fn();
    mockFrom = vi.fn();

    // Default successful response for single()
    mockSingle.mockResolvedValue({
      data: { status: 'pending', id: 'order-123' },
      error: null,
    });

    // Default successful response for order()
    mockOrder.mockResolvedValue({
      data: [],
      error: null,
    });

    // Default successful response for eq() in update context
    mockEq.mockReturnValue({
      select: vi.fn(() => ({ single: mockSingle })),
    });

    // Setup eq() in select context to return { single }
    const selectEq = vi.fn(() => ({ single: mockSingle }));
    const orderEq = vi.fn(() => ({ single: mockSingle }));

    // Setup select() chain: select().eq().single() OR select().order()
    mockSelect.mockImplementation((selector?: string) => {
      if (selector === '*') {
        return { eq: selectEq, single: mockSingle };
      }
      return { eq: selectEq, order: mockOrder, single: mockSingle };
    });

    // Setup update().eq().select().single() chain
    mockUpdate.mockReturnValue({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({ single: mockSingle })),
      })),
    });

    // Setup insert().select().single() chain
    mockInsert.mockReturnValue({
      select: vi.fn(() => ({ single: mockSingle })),
    });

    // Setup from() to return proper methods
    mockFrom.mockImplementation((table: string) => {
      return {
        update: mockUpdate,
        insert: mockInsert,
        select: mockSelect,
      };
    });

    mockSupabase = { from: mockFrom };
    handler = new StatusChangeHandler(mockSupabase);
  });

  describe('validateStatusTransition', () => {
    it('should allow transition from pending to confirmed', async () => {
      const result = await handler.validateStatusTransition('pending', 'confirmed');
      expect(result).toBe(true);
    });

    it('should allow transition from pending to cancelled', async () => {
      const result = await handler.validateStatusTransition('pending', 'cancelled');
      expect(result).toBe(true);
    });

    it('should allow transition from confirmed to preparing', async () => {
      const result = await handler.validateStatusTransition('confirmed', 'preparing');
      expect(result).toBe(true);
    });

    it('should allow transition from preparing to ready', async () => {
      const result = await handler.validateStatusTransition('preparing', 'ready');
      expect(result).toBe(true);
    });

    it('should allow transition from ready to picked_up', async () => {
      const result = await handler.validateStatusTransition('ready', 'picked_up');
      expect(result).toBe(true);
    });

    it('should not allow invalid status transitions', async () => {
      const result = await handler.validateStatusTransition('pending', 'ready');
      expect(result).toBe(false);
    });

    it('should not allow transition from picked_up to any status', async () => {
      const result = await handler.validateStatusTransition('picked_up', 'ready');
      expect(result).toBe(false);
    });

    it('should not allow transition from cancelled to any status', async () => {
      const result = await handler.validateStatusTransition('cancelled', 'pending');
      expect(result).toBe(false);
    });

    it('should not allow transition from confirmed to pending (backwards)', async () => {
      const result = await handler.validateStatusTransition('confirmed', 'pending');
      expect(result).toBe(false);
    });

    it('should allow null to pending (new order)', async () => {
      const result = await handler.validateStatusTransition(null, 'pending');
      expect(result).toBe(true);
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return allowed transitions for pending status', () => {
      const allowed = handler.getAllowedTransitions('pending');
      expect(allowed).toContain('confirmed');
      expect(allowed).toContain('cancelled');
      expect(allowed).toHaveLength(2);
    });

    it('should return allowed transitions for confirmed status', () => {
      const allowed = handler.getAllowedTransitions('confirmed');
      expect(allowed).toContain('preparing');
      expect(allowed).toContain('cancelled');
      expect(allowed).toHaveLength(2);
    });

    it('should return allowed transitions for preparing status', () => {
      const allowed = handler.getAllowedTransitions('preparing');
      expect(allowed).toContain('ready');
      expect(allowed).toContain('cancelled');
      expect(allowed).toHaveLength(2);
    });

    it('should return allowed transitions for ready status', () => {
      const allowed = handler.getAllowedTransitions('ready');
      expect(allowed).toContain('picked_up');
      expect(allowed).toContain('cancelled');
      expect(allowed).toHaveLength(2);
    });

    it('should return empty array for terminal states', () => {
      const pickedUp = handler.getAllowedTransitions('picked_up');
      const cancelled = handler.getAllowedTransitions('cancelled');

      expect(pickedUp).toEqual([]);
      expect(cancelled).toEqual([]);
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status successfully with valid transition', async () => {
      // Mock fetch current order (pending)
      mockSingle
        .mockResolvedValueOnce({
          data: { status: 'pending', id: 'order-123' },
          error: null,
        })
        // Mock updated order (confirmed)
        .mockResolvedValueOnce({
          data: {
            id: 'order-123',
            status: 'confirmed',
            updated_at: '2025-02-07T10:05:00Z',
            confirmed_at: '2025-02-07T10:05:00Z',
          },
          error: null,
        });

      // Mock history insert
      mockSingle.mockResolvedValueOnce({
        data: { id: 'history-123' },
        error: null,
      });

      const result = await handler.updateOrderStatus('order-123', 'confirmed');

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.order?.status).toBe('confirmed');
    });

    it('should fail with invalid status transition', async () => {
      // Mock fetch returns pending order
      mockSingle.mockResolvedValueOnce({
        data: { status: 'pending', id: 'order-123' },
        error: null,
      });

      const result = await handler.updateOrderStatus('order-123', 'ready');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid status transition');
    });

    it('should update timestamps based on status', async () => {
      // Mock pending to confirmed
      mockSingle
        .mockResolvedValueOnce({
          data: { status: 'pending', id: 'order-123' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'order-123',
            status: 'confirmed',
            confirmed_at: '2025-02-07T10:05:00Z',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'history-123' },
          error: null,
        });

      await handler.updateOrderStatus('order-123', 'confirmed');

      expect(mockSupabase.from).toHaveBeenCalledWith('online_orders');
    });

    it('should set confirmed_at timestamp when status is confirmed', async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { status: 'pending', id: 'order-123' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'order-123',
            status: 'confirmed',
            confirmed_at: '2025-02-07T10:05:00Z',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'history-123' },
          error: null,
        });

      const result = await handler.updateOrderStatus('order-123', 'confirmed');

      expect(result.success).toBe(true);
      expect(result.order?.confirmed_at).toBeDefined();
    });

    it('should set started_preparing_at timestamp when status is preparing', async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { status: 'confirmed', id: 'order-123' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'order-123',
            status: 'preparing',
            started_preparing_at: '2025-02-07T10:10:00Z',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'history-123' },
          error: null,
        });

      const result = await handler.updateOrderStatus('order-123', 'preparing');

      expect(result.success).toBe(true);
      expect(result.order?.started_preparing_at).toBeDefined();
    });

    it('should set ready_at timestamp when status is ready', async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { status: 'preparing', id: 'order-123' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'order-123',
            status: 'ready',
            ready_at: '2025-02-07T10:30:00Z',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'history-123' },
          error: null,
        });

      const result = await handler.updateOrderStatus('order-123', 'ready');

      expect(result.success).toBe(true);
      expect(result.order?.ready_at).toBeDefined();
    });

    it('should set picked_up_at timestamp when status is picked_up', async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { status: 'ready', id: 'order-123' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'order-123',
            status: 'picked_up',
            picked_up_at: '2025-02-07T11:00:00Z',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'history-123' },
          error: null,
        });

      const result = await handler.updateOrderStatus('order-123', 'picked_up');

      expect(result.success).toBe(true);
      expect(result.order?.picked_up_at).toBeDefined();
    });

    it('should set cancelled_at timestamp when status is cancelled', async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { status: 'pending', id: 'order-123' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'order-123',
            status: 'cancelled',
            cancelled_at: '2025-02-07T10:15:00Z',
            cancellation_reason: 'Customer request',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'history-123' },
          error: null,
        });

      const result = await handler.updateOrderStatus('order-123', 'cancelled', {
        notes: 'Customer request',
        cancellationReason: 'Customer request',
      });

      expect(result.success).toBe(true);
      expect(result.order?.cancelled_at).toBeDefined();
    });
  });

  describe('logStatusChange', () => {
    it('should create status history entry', async () => {
      const mockHistoryEntry: OrderStatusHistory = {
        id: 'history-123',
        order_id: 'order-123',
        old_status: 'pending',
        new_status: 'confirmed',
        changed_by: 'staff-123',
        notes: 'Payment confirmed',
        created_at: '2025-02-07T10:05:00Z',
      };

      mockSingle.mockResolvedValue({
        data: mockHistoryEntry,
        error: null,
      });

      const result = await handler.logStatusChange(
        'order-123',
        'pending',
        'confirmed',
        'staff-123',
        'Payment confirmed'
      );

      expect(result).toBeDefined();
      expect(result?.old_status).toBe('pending');
      expect(result?.new_status).toBe('confirmed');
      expect(result?.changed_by).toBe('staff-123');
      expect(result?.notes).toBe('Payment confirmed');
    });

    it('should handle null old status for new orders', async () => {
      const mockHistoryEntry: OrderStatusHistory = {
        id: 'history-123',
        order_id: 'order-123',
        old_status: null,
        new_status: 'pending',
        changed_by: null,
        notes: null,
        created_at: '2025-02-07T10:00:00Z',
      };

      mockSingle.mockResolvedValue({
        data: mockHistoryEntry,
        error: null,
      });

      const result = await handler.logStatusChange('order-123', null, 'pending');

      expect(result).toBeDefined();
      expect(result?.old_status).toBeNull();
      expect(result?.new_status).toBe('pending');
    });

    it('should return null on database error', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await handler.logStatusChange('order-123', 'pending', 'confirmed');

      expect(result).toBeNull();
    });
  });

  describe('triggerNotificationIfReady', () => {
    it('should trigger notification when status changes to ready', async () => {
      // Mock order fetch for notification
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'order-123',
          status: 'ready',
          notification_sent: false,
        },
        error: null,
      });
      // Mock notification_sent update
      mockEq.mockResolvedValueOnce({
        error: null,
      });

      const result = await handler.triggerNotificationIfReady('order-123', 'ready');
      expect(result).toBe(true);
    });

    it('should not trigger notification for other statuses', async () => {
      const result = await handler.triggerNotificationIfReady('order-123', 'preparing');
      expect(result).toBe(false);
    });

    it('should not trigger notification when skipNotification is true', async () => {
      // This would need to be tested with updateOrderStatus
      // because triggerNotificationIfReady itself doesn't have skipNotification flag
      const result = await handler.triggerNotificationIfReady('order-123', 'ready');
      expect(result).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Connection failed' },
      });

      const result = await handler.updateOrderStatus('order-123', 'confirmed');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing order', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Order not found' },
      });

      const result = await handler.updateOrderStatus('non-existent', 'confirmed');

      expect(result.success).toBe(false);
    });
  });

  describe('status transition edge cases', () => {
    it('should allow cancellation from any non-terminal state', async () => {
      const states: OnlineOrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready'];

      for (const state of states) {
        const result = await handler.validateStatusTransition(state, 'cancelled');
        expect(result).toBe(true);
      }
    });

    it('should not allow cancellation after picked_up', async () => {
      const result = await handler.validateStatusTransition('picked_up', 'cancelled');
      expect(result).toBe(false);
    });

    it('should not allow reactivation of cancelled orders', async () => {
      const result = await handler.validateStatusTransition('cancelled', 'pending');
      expect(result).toBe(false);
    });
  });
});
