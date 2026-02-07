/**
 * SPEC-POS-001: Phase 2 - Kanban Board Component Tests
 *
 * TDD tests for kanban board component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KanbanBoard } from './KanbanBoard';
import type { OnlineOrder, OnlineOrderStatus } from '@/types/online-orders';

// Mock StatusChangeHandler
vi.mock('@/services/orders', () => ({
  StatusChangeHandler: class MockStatusChangeHandler {
    getAllowedTransitions = vi.fn(() => ['confirmed', 'cancelled']);
    updateOrderStatus = vi.fn(async () => ({ success: true }));
  },
}));

describe('KanbanBoard', () => {
  const mockBusinessId = 'business-123';
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

  it('should render kanban board with orders', () => {
    render(<KanbanBoard businessId={mockBusinessId} orders={mockOrders} />);
    expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
  });

  it('should render all status columns', () => {
    render(<KanbanBoard businessId={mockBusinessId} orders={mockOrders} />);

    expect(screen.getByTestId('column-pending')).toBeInTheDocument();
    expect(screen.getByTestId('column-confirmed')).toBeInTheDocument();
    expect(screen.getByTestId('column-preparing')).toBeInTheDocument();
    expect(screen.getByTestId('column-ready')).toBeInTheDocument();
    expect(screen.getByTestId('column-picked_up')).toBeInTheDocument();
    expect(screen.getByTestId('column-cancelled')).toBeInTheDocument();
  });

  it('should display order count per column', () => {
    render(<KanbanBoard businessId={mockBusinessId} orders={mockOrders} />);

    expect(screen.getByTestId('count-pending')).toHaveTextContent('1');
  });

  it('should render order cards with key info', () => {
    render(<KanbanBoard businessId={mockBusinessId} orders={mockOrders} />);

    expect(screen.getByText('KA-001')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should allow status change via quick action', () => {
    const onStatusChange = vi.fn();

    render(
      <KanbanBoard
        businessId={mockBusinessId}
        orders={mockOrders}
        onStatusChange={onStatusChange}
      />
    );

    const quickAction = screen.getByTestId(`quick-action-order-1`);
    fireEvent.click(quickAction);

    // Should show status change options
    expect(screen.getByTestId('status-change-menu')).toBeInTheDocument();
  });
});
