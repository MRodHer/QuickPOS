/**
 * SPEC-POS-001: Phase 2 - Realtime Orders Hook Tests
 *
 * TDD tests for realtime order subscriptions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import type { OnlineOrder, OnlineOrderStatus } from '@/types/online-orders';

// Mock Supabase with proper mock implementation
const mockUnsubscribe = vi.fn();
let mockChannelSubscribe: any;
let mockChannelOn: any;

const setupMockChannel = () => {
  mockUnsubscribe.mockReset();
  mockChannelSubscribe = vi.fn((cb?: any) => {
    // Simulate successful subscription
    if (cb) {
      setTimeout(() => cb('SUBSCRIBED'), 0);
    }
    return { unsubscribe: mockUnsubscribe };
  });
  mockChannelOn = vi.fn(() => ({
    subscribe: mockChannelSubscribe,
  }));
};

setupMockChannel();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: (...args: any[]) => mockChannelOn(...args),
    })),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: [],
            error: null,
          })),
        })),
        in: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [],
            error: null,
          })),
        })),
        order: vi.fn(() => Promise.resolve({
          data: [],
          error: null,
        })),
      })),
    })),
  },
}));

// Import after mock setup
import { useOrdersRealtime } from './useOrdersRealtime';

describe('useOrdersRealtime', () => {
  const mockBusinessId = 'business-123';

  afterEach(() => {
    cleanup();
    setupMockChannel();
  });

  describe('subscription lifecycle', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() =>
        useOrdersRealtime({ businessId: mockBusinessId })
      );

      expect(result.current).toHaveProperty('orders');
      expect(result.current).toHaveProperty('connectionState');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refetch');
    });

    it('should return disconnected state when businessId is null', () => {
      const { result } = renderHook(() =>
        useOrdersRealtime({ businessId: null })
      );

      expect(result.current.connectionState).toBe('disconnected');
    });

    it('should return disconnected state when enabled is false', () => {
      const { result } = renderHook(() =>
        useOrdersRealtime({ businessId: mockBusinessId, enabled: false })
      );

      expect(result.current.connectionState).toBe('disconnected');
    });
  });

  describe('refetch function', () => {
    it('should provide refetch function', () => {
      const { result } = renderHook(() =>
        useOrdersRealtime({ businessId: mockBusinessId })
      );

      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('status filtering', () => {
    it('should accept single status filter option', () => {
      const { result } = renderHook(() =>
        useOrdersRealtime({ businessId: mockBusinessId, status: 'pending' })
      );

      expect(result.current).toHaveProperty('orders');
      expect(result.current).toHaveProperty('connectionState');
    });

    it('should accept multiple status filter options', () => {
      const { result } = renderHook(() =>
        useOrdersRealtime({
          businessId: mockBusinessId,
          status: ['pending', 'confirmed'],
        })
      );

      expect(result.current).toHaveProperty('orders');
      expect(result.current).toHaveProperty('connectionState');
    });

    it('should work without status filter', () => {
      const { result } = renderHook(() =>
        useOrdersRealtime({ businessId: mockBusinessId })
      );

      expect(result.current).toHaveProperty('orders');
      expect(result.current).toHaveProperty('connectionState');
    });
  });

  describe('store integration', () => {
    it('should use Zustand store for state management', () => {
      const { result } = renderHook(() =>
        useOrdersRealtime({ businessId: mockBusinessId })
      );

      // Store is being used - orders should be defined (array)
      expect(Array.isArray(result.current.orders)).toBe(true);
    });
  });

  describe('options', () => {
    it('should accept channelName option', () => {
      const { result } = renderHook(() =>
        useOrdersRealtime({
          businessId: mockBusinessId,
          channelName: 'custom-channel',
        })
      );

      expect(result.current).toHaveProperty('orders');
    });
  });
});
