/**
 * SPEC-POS-001: Phase 2 - Order Detail Modal Tests
 *
 * TDD tests for order detail modal component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrderDetailModal } from './OrderDetailModal';
import type { OnlineOrder } from '@/types/online-orders';

vi.mock('@/services/orders', () => ({
  StatusChangeHandler: class MockStatusChangeHandler {
    getAllowedTransitions = vi.fn(() => ['confirmed', 'preparing', 'cancelled']);
    updateOrderStatus = vi.fn(async () => ({ success: true }));
    getStatusHistory = vi.fn(async () => []);
  },
}));

describe('OrderDetailModal', () => {
  const mockBusinessId = 'business-123';
  const mockOrder: OnlineOrder = {
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
    customer_notes: 'Extra napkins please',
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
  };

  it('should render modal when open', () => {
    render(
      <OrderDetailModal
        businessId={mockBusinessId}
        order={mockOrder}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
  });

  it('should not render modal when closed', () => {
    render(
      <OrderDetailModal
        businessId={mockBusinessId}
        order={mockOrder}
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByTestId('order-detail-modal')).not.toBeInTheDocument();
  });

  it('should display order number', () => {
    render(
      <OrderDetailModal
        businessId={mockBusinessId}
        order={mockOrder}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('KA-001')).toBeInTheDocument();
  });

  it('should display customer information', () => {
    render(
      <OrderDetailModal
        businessId={mockBusinessId}
        order={mockOrder}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should display pickup time', () => {
    render(
      <OrderDetailModal
        businessId={mockBusinessId}
        order={mockOrder}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('pickup-time')).toBeInTheDocument();
  });

  it('should display customer notes', () => {
    render(
      <OrderDetailModal
        businessId={mockBusinessId}
        order={mockOrder}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Extra napkins please')).toBeInTheDocument();
  });

  it('should call onClose when close button clicked', () => {
    const onClose = vi.fn();

    render(
      <OrderDetailModal
        businessId={mockBusinessId}
        order={mockOrder}
        isOpen={true}
        onClose={onClose}
      />
    );

    const closeButton = screen.getByTestId('close-modal-button');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should display status change actions', () => {
    render(
      <OrderDetailModal
        businessId={mockBusinessId}
        order={mockOrder}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('status-actions')).toBeInTheDocument();
  });

  it('should display order total', () => {
    render(
      <OrderDetailModal
        businessId={mockBusinessId}
        order={mockOrder}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('$32.00')).toBeInTheDocument();
  });
});
