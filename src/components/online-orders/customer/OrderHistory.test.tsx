/**
 * SPEC-POS-001 Phase 3: Order History Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderHistory } from './OrderHistory';

const mockOrders = [
  {
    id: 'order-1',
    order_number: 'ORD-001',
    status: 'picked_up',
    created_at: '2025-02-01T12:00:00Z',
    pickup_time: '2025-02-01T12:30:00Z',
    total: 250.0,
    subtotal: 215.52,
    tax: 34.48,
    tip: 0,
    items: [
      { product_id: 'prod-1', name: 'Bowl Proteico', quantity: 2, unit_price: 95 },
      { product_id: 'prod-2', name: 'Smoothie Verde', quantity: 1, unit_price: 60 },
    ],
    customer_notes: 'Sin cebolla',
  },
  {
    id: 'order-2',
    order_number: 'ORD-002',
    status: 'cancelled',
    created_at: '2025-01-28T10:00:00Z',
    pickup_time: '2025-01-28T10:30:00Z',
    total: 150.0,
    subtotal: 129.31,
    tax: 20.69,
    tip: 0,
    items: [{ product_id: 'prod-3', name: 'Wrap Vegano', quantity: 1, unit_price: 129.31 }],
    customer_notes: null,
  },
];

const mockFetchOrderHistory = vi.fn();
const mockAddItem = vi.fn();

vi.mock('@/stores/customerProfileStore', () => ({
  useCustomerProfileStore: vi.fn((selector) => {
    const state = {
      profile: { user_id: 'user-1' },
      orderHistory: mockOrders,
      isLoadingHistory: false,
      fetchOrderHistory: mockFetchOrderHistory,
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

vi.mock('@/stores/onlineCartStore', () => ({
  useOnlineCartStore: vi.fn((selector) => {
    const state = { addItem: mockAddItem };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

describe('OrderHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render order history title', () => {
      render(<OrderHistory />);

      expect(screen.getByText('Historial de Pedidos')).toBeInTheDocument();
    });

    it('should display order cards', () => {
      render(<OrderHistory />);

      expect(screen.getByText('#ORD-001')).toBeInTheDocument();
      expect(screen.getByText('#ORD-002')).toBeInTheDocument();
    });

    it('should display order status badges', () => {
      render(<OrderHistory />);

      expect(screen.getByText('Recogido')).toBeInTheDocument();
      expect(screen.getByText('Cancelado')).toBeInTheDocument();
    });

    it('should display order totals', () => {
      render(<OrderHistory />);

      expect(screen.getByText('$250.00')).toBeInTheDocument();
      expect(screen.getByText('$150.00')).toBeInTheDocument();
    });

    it('should display item previews', () => {
      render(<OrderHistory />);

      expect(screen.getByText('2x Bowl Proteico')).toBeInTheDocument();
    });
  });

  describe('Order Actions', () => {
    it('should have view details button', () => {
      render(<OrderHistory />);

      const viewButtons = screen.getAllByText('Ver detalles');
      expect(viewButtons.length).toBe(2);
    });

    it('should have repeat order button for non-cancelled orders', () => {
      render(<OrderHistory />);

      const repeatButtons = screen.getAllByText('Repetir pedido');
      expect(repeatButtons.length).toBe(1); // Only for non-cancelled order
    });

    it('should call addItem when repeat order is clicked', async () => {
      const user = userEvent.setup();
      render(<OrderHistory />);

      const repeatButton = screen.getByText('Repetir pedido');
      await user.click(repeatButton);

      await waitFor(() => {
        expect(mockAddItem).toHaveBeenCalled();
      });
    });

    it('should show success message after repeat order', async () => {
      const user = userEvent.setup();
      render(<OrderHistory />);

      const repeatButton = screen.getByText('Repetir pedido');
      await user.click(repeatButton);

      await waitFor(() => {
        expect(screen.getByText(/ORD-001 agregados al carrito/)).toBeInTheDocument();
      });
    });
  });

  describe('Order Detail Modal', () => {
    it('should open modal when view details is clicked', async () => {
      const user = userEvent.setup();
      render(<OrderHistory />);

      const viewButtons = screen.getAllByText('Ver detalles');
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Pedido #ORD-001')).toBeInTheDocument();
      });
    });

    it('should display order items in modal', async () => {
      const user = userEvent.setup();
      render(<OrderHistory />);

      const viewButtons = screen.getAllByText('Ver detalles');
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Productos:')).toBeInTheDocument();
      });
    });

    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<OrderHistory />);

      const viewButtons = screen.getAllByText('Ver detalles');
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Pedido #ORD-001')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Cerrar'));

      await waitFor(() => {
        expect(screen.queryByText('Pedido #ORD-001')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria label', () => {
      render(<OrderHistory />);

      expect(screen.getByLabelText('Historial de pedidos')).toBeInTheDocument();
    });
  });
});
