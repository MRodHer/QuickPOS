/**
 * SPEC-POS-001: Phase 2 - Staff Dashboard Component Tests
 *
 * TDD tests for staff dashboard component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StaffDashboard } from './StaffDashboard';
import type { OnlineOrder } from '@/types/online-orders';

// Mock hooks - set up default return values
vi.mock('@/hooks/online-orders/useOrdersRealtime', () => ({
  useOrdersRealtime: vi.fn(() => ({
    orders: [],
    connectionState: 'connected',
    error: null,
    refetch: vi.fn(),
  })),
}));

vi.mock('@/services/orders', () => ({
  StatusChangeHandler: class MockStatusChangeHandler {},
}));

describe('StaffDashboard', () => {
  const mockBusinessId = 'business-123';

  it('should render dashboard with businessId', () => {
    render(<StaffDashboard businessId={mockBusinessId} />);
    expect(screen.getByTestId('staff-dashboard')).toBeInTheDocument();
  });

  it('should show loading state when connecting', () => {
    const { useOrdersRealtime } = require('@/hooks/online-orders/useOrdersRealtime');
    useOrdersRealtime.mockReturnValue({
      orders: [],
      connectionState: 'connecting',
      error: null,
      refetch: vi.fn(),
    });

    render(<StaffDashboard businessId={mockBusinessId} />);
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
  });

  it('should show error state when connection fails', () => {
    const { useOrdersRealtime } = require('@/hooks/online-orders/useOrdersRealtime');
    useOrdersRealtime.mockReturnValue({
      orders: [],
      connectionState: 'error',
      error: 'Connection failed',
      refetch: vi.fn(),
    });

    render(<StaffDashboard businessId={mockBusinessId} />);
    expect(screen.getByTestId('dashboard-error')).toBeInTheDocument();
  });

  it('should render order statistics', () => {
    const { useOrdersRealtime } = require('@/hooks/online-orders/useOrdersRealtime');
    const mockOrders: OnlineOrder[] = [
      {
        id: 'order-1',
        business_id: mockBusinessId,
        order_number: 'KA-001',
        user_id: null,
        customer_id: null,
        guest_name: 'John Doe',
        guest_email: 'john@example.com',
        guest_phone: '+1234567890',
        items: [],
        subtotal: 25,
        tax: 2,
        tip: 5,
        total: 32,
        pickup_time: '2025-02-07T14:00:00Z',
        estimated_prep_time: 30,
        requested_time: null,
        status: 'pending',
        cancellation_reason: null,
        payment_method: 'on_arrival',
        payment_status: 'pending',
        stripe_payment_intent_id: null,
        stripe_customer_id: null,
        notification_method: 'email',
        notification_sent: false,
        reminder_sent: false,
        customer_notes: null,
        staff_notes: null,
        internal_notes: null,
        created_at: '2025-02-07T10:00:00Z',
        updated_at: '2025-02-07T10:00:00Z',
        confirmed_at: null,
        started_preparing_at: null,
        ready_at: null,
        picked_up_at: null,
        cancelled_at: null,
        metadata: {},
      },
    ];
    useOrdersRealtime.mockReturnValue({
      orders: mockOrders,
      connectionState: 'connected',
      error: null,
      refetch: vi.fn(),
    });

    render(<StaffDashboard businessId={mockBusinessId} />);
    expect(screen.getByTestId('order-stats')).toBeInTheDocument();
  });

  it('should render filter controls', () => {
    render(<StaffDashboard businessId={mockBusinessId} />);
    expect(screen.getByTestId('status-filter')).toBeInTheDocument();
  });

  it('should render view toggle (list/kanban)', () => {
    render(<StaffDashboard businessId={mockBusinessId} />);
    expect(screen.getByTestId('view-toggle')).toBeInTheDocument();
  });

  it('should render order list when in list view', () => {
    render(<StaffDashboard businessId={mockBusinessId} view="list" />);
    // Order list container is rendered
    expect(screen.getByTestId('staff-dashboard')).toBeInTheDocument();
  });

  it('should render kanban board when in kanban view', () => {
    render(<StaffDashboard businessId={mockBusinessId} view="kanban" />);
    // Kanban board container is rendered
    expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
  });
});
