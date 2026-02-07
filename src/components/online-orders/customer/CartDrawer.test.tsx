/**
 * SPEC-POS-001: Online Orders System - CartDrawer Component Tests
 *
 * RED Phase: Write tests for CartDrawer component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CartDrawer } from './CartDrawer';
import { useOnlineCartStore } from '@/stores/onlineCartStore';
import type { CartItem } from '@/types/online-orders';

// Mock cart store
const mockUpdateQuantity = vi.fn();
const mockRemoveItem = vi.fn();
const mockClearCart = vi.fn();
const mockUpdateNotes = vi.fn();

vi.mock('@/stores/onlineCartStore', () => ({
  useCartSummary: vi.fn(() => ({
    items: [],
    itemCount: 0,
    subtotal: 0,
    tax: 0,
    total: 0,
    nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  })),
  useCartActions: vi.fn(() => ({
    updateQuantity: mockUpdateQuantity,
    removeItem: mockRemoveItem,
    clearCart: mockClearCart,
    updateNotes: mockUpdateNotes,
  })),
  useOnlineCartStore: vi.fn(),
}));

const mockCartItems: CartItem[] = [
  {
    productId: 'prod-1',
    name: 'Protein Bowl',
    price: 15.99,
    quantity: 2,
    imageUrl: 'https://example.com/image.jpg',
    notes: '',
    nutritionInfo: {
      calories: 450,
      protein: 35,
      carbs: 40,
      fat: 15,
      fiber: 8,
    },
  },
];

describe('CartDrawer', () => {
  const mockOnClose = vi.fn();
  const mockOnCheckout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    const { container } = render(
      <CartDrawer isOpen={false} onClose={mockOnClose} onCheckout={mockOnCheckout} />
    );

    // Check backdrop is hidden
    const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50');
    expect(backdrop).toHaveClass('pointer-events-none');
  });

  it('should render when open', () => {
    render(
      <CartDrawer isOpen={true} onClose={mockOnClose} onCheckout={mockOnCheckout} />
    );

    expect(screen.getByText('Tu Carrito')).toBeInTheDocument();
  });

  it('should show empty state when no items', () => {
    render(
      <CartDrawer isOpen={true} onClose={mockOnClose} onCheckout={mockOnCheckout} />
    );

    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument();
    expect(screen.getByText('Agrega productos del menú para comenzar')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <CartDrawer isOpen={true} onClose={mockOnClose} onCheckout={mockOnCheckout} />
    );

    const closeButton = screen.getByLabelText('Cerrar carrito');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show cart with items', () => {
    const { useCartSummary } = require('@/stores/onlineCartStore');
    useCartSummary.mockReturnValue({
      items: mockCartItems,
      itemCount: 2,
      subtotal: 31.98,
      tax: 5.12,
      total: 37.10,
      nutrition: { calories: 900, protein: 70, carbs: 80, fat: 30, fiber: 16 },
    });

    render(
      <CartDrawer isOpen={true} onClose={mockOnClose} onCheckout={mockOnCheckout} />
    );

    expect(screen.getByText('Protein Bowl')).toBeInTheDocument();
    expect(screen.getByText('$15.99')).toBeInTheDocument();
    expect(screen.getByText('900 kcal')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should display item count badge when items exist', () => {
    const { useCartSummary } = require('@/stores/onlineCartStore');
    useCartSummary.mockReturnValue({
      items: mockCartItems,
      itemCount: 3,
      subtotal: 31.98,
      tax: 5.12,
      total: 37.10,
      nutrition: { calories: 900, protein: 70, carbs: 80, fat: 30, fiber: 16 },
    });

    render(
      <CartDrawer isOpen={true} onClose={mockOnClose} onCheckout={mockOnCheckout} />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should show clear cart button when items exist', () => {
    const { useCartSummary } = require('@/stores/onlineCartStore');
    useCartSummary.mockReturnValue({
      items: mockCartItems,
      itemCount: 2,
      subtotal: 31.98,
      tax: 5.12,
      total: 37.10,
      nutrition: { calories: 900, protein: 70, carbs: 80, fat: 30, fiber: 16 },
    });

    render(
      <CartDrawer isOpen={true} onClose={mockOnClose} onCheckout={mockOnCheckout} />
    );

    expect(screen.getByText('Limpiar')).toBeInTheDocument();
  });

  it('should call clearCart when Limpiar button is clicked', () => {
    const { useCartSummary } = require('@/stores/onlineCartStore');
    useCartSummary.mockReturnValue({
      items: mockCartItems,
      itemCount: 2,
      subtotal: 31.98,
      tax: 5.12,
      total: 37.10,
      nutrition: { calories: 900, protein: 70, carbs: 80, fat: 30, fiber: 16 },
    });

    render(
      <CartDrawer isOpen={true} onClose={mockOnClose} onCheckout={mockOnCheckout} />
    );

    const clearButton = screen.getByText('Limpiar');
    fireEvent.click(clearButton);

    expect(mockClearCart).toHaveBeenCalledTimes(1);
  });

  it('should display totals when items exist', () => {
    const { useCartSummary } = require('@/stores/onlineCartStore');
    useCartSummary.mockReturnValue({
      items: mockCartItems,
      itemCount: 2,
      subtotal: 31.98,
      tax: 5.12,
      total: 37.10,
      nutrition: { calories: 900, protein: 70, carbs: 80, fat: 30, fiber: 16 },
    });

    render(
      <CartDrawer isOpen={true} onClose={mockOnClose} onCheckout={mockOnCheckout} />
    );

    expect(screen.getByText('$31.98')).toBeInTheDocument();
    expect(screen.getByText('$5.12')).toBeInTheDocument();
    expect(screen.getByText('$37.10')).toBeInTheDocument();
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
    expect(screen.getByText('IVA (16%)')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('should show checkout button when items exist', () => {
    const { useCartSummary } = require('@/stores/onlineCartStore');
    useCartSummary.mockReturnValue({
      items: mockCartItems,
      itemCount: 2,
      subtotal: 31.98,
      tax: 5.12,
      total: 37.10,
      nutrition: { calories: 900, protein: 70, carbs: 80, fat: 30, fiber: 16 },
    });

    render(
      <CartDrawer isOpen={true} onClose={mockOnClose} onCheckout={mockOnCheckout} />
    );

    expect(screen.getByText('Finalizar Pedido')).toBeInTheDocument();
  });

  it('should call onClose and onCheckout when checkout button is clicked', () => {
    const { useCartSummary } = require('@/stores/onlineCartStore');
    useCartSummary.mockReturnValue({
      items: mockCartItems,
      itemCount: 2,
      subtotal: 31.98,
      tax: 5.12,
      total: 37.10,
      nutrition: { calories: 900, protein: 70, carbs: 80, fat: 30, fiber: 16 },
    });

    render(
      <CartDrawer isOpen={true} onClose={mockOnClose} onCheckout={mockOnCheckout} />
    );

    const checkoutButton = screen.getByText('Finalizar Pedido');
    fireEvent.click(checkoutButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnCheckout).toHaveBeenCalledTimes(1);
  });

  it('should show nutrition summary when items have nutrition info', () => {
    const { useCartSummary } = require('@/stores/onlineCartStore');
    useCartSummary.mockReturnValue({
      items: mockCartItems,
      itemCount: 2,
      subtotal: 31.98,
      tax: 5.12,
      total: 37.10,
      nutrition: { calories: 900, protein: 70, carbs: 80, fat: 30, fiber: 16 },
    });

    render(
      <CartDrawer isOpen={true} onClose={mockOnClose} onCheckout={mockOnCheckout} />
    );

    expect(screen.getByText('Total nutricional:')).toBeInTheDocument();
    expect(screen.getByText('900 kcal')).toBeInTheDocument();
    expect(screen.getByText('70g proteína')).toBeInTheDocument();
  });

  it('should not show protein badge when protein is below 20g per item', () => {
    const { useCartSummary } = require('@/stores/onlineCartStore');
    const lowProteinItems: CartItem[] = [
      {
        ...mockCartItems[0],
        nutritionInfo: { calories: 300, protein: 15, carbs: 30, fat: 10, fiber: 5 },
      },
    ];
    useCartSummary.mockReturnValue({
      items: lowProteinItems,
      itemCount: 1,
      subtotal: 15.99,
      tax: 2.56,
      total: 18.55,
      nutrition: { calories: 300, protein: 15, carbs: 30, fat: 10, fiber: 5 },
    });

    const { container } = render(
      <CartDrawer isOpen={true} onClose={mockOnClose} onCheckout={mockOnCheckout} />
    );

    // Protein badge only shows when >= 20g
    expect(container.textContent).not.toContain('💪 15g');
  });
});
