/**
 * SPEC-POS-001: Online Orders System - ProductCard Component Tests
 *
 * RED Phase: Write tests for ProductCard component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductCard, ProductCardCompact } from './ProductCard';
import type { MenuItem } from '@/types/online-orders';
import { useOnlineCartStore } from '@/stores/onlineCartStore';

// Mock cart store
vi.mock('@/stores/onlineCartStore', () => ({
  useCartActions: () => ({
    addItem: vi.fn(),
  }),
  useOnlineCartStore: {
    getState: vi.fn(() => ({
      items: [],
    })),
  },
}));

const mockProduct: MenuItem = {
  id: 'prod-1',
  name: 'Protein Bowl',
  description: 'High protein bowl with chicken and quinoa',
  price: 15.99,
  image_url: 'https://example.com/bowl.jpg',
  is_available: true,
  category_id: 'cat-1',
  category_name: 'Post-Entreno',
  nutrition: {
    id: 'nutr-1',
    business_id: 'biz-1',
    product_id: 'prod-1',
    serving_size: '1 bowl',
    calories: 450,
    protein: 35,
    carbohydrates: 40,
    fat: 15,
    fiber: 8,
    sugar: 5,
    sodium: 800,
    vitamins: {},
    minerals: {},
    protein_score: 9,
    calorie_score: 6,
    health_score: 8,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  allergens: ['dairy'],
  dietary_tags: ['gluten_free'],
};

const mockProductNoNutrition: MenuItem = {
  ...mockProduct,
  nutrition: null,
  allergens: [],
  dietary_tags: [],
};

describe('ProductCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render product name', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Protein Bowl')).toBeInTheDocument();
  });

  it('should render product description', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('High protein bowl with chicken and quinoa')).toBeInTheDocument();
  });

  it('should render product price', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('$15.99')).toBeInTheDocument();
  });

  it('should render nutrition calories badge', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('450 kcal')).toBeInTheDocument();
  });

  it('should render protein badge for high protein items', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText(/35g proteína/i)).toBeInTheDocument();
  });

  it('should render allergen icons', () => {
    render(<ProductCard product={mockProduct} />);

    const allergenIcon = screen.getByTitle('dairy');
    expect(allergenIcon).toBeInTheDocument();
    expect(allergenIcon).toHaveTextContent('🥛');
  });

  it('should render dietary tag icons', () => {
    render(<ProductCard product={mockProduct} />);

    const dietaryIcon = screen.getByTitle('gluten_free');
    expect(dietaryIcon).toBeInTheDocument();
  });

  it('should show out of stock when product is not available', () => {
    const unavailableProduct = { ...mockProduct, is_available: false };
    render(<ProductCard product={unavailableProduct} />);

    expect(screen.getByText('Agotado')).toBeInTheDocument();
  });

  it('should call onNutritionClick when info button is clicked', () => {
    const onNutritionClick = vi.fn();
    render(<ProductCard product={mockProduct} onNutritionClick={onNutritionClick} />);

    const infoButton = screen.getByLabelText('Ver información nutricional');
    fireEvent.click(infoButton);

    expect(onNutritionClick).toHaveBeenCalledWith(mockProduct);
  });

  it('should not show nutrition button when product has no nutrition info', () => {
    render(<ProductCard product={mockProductNoNutrition} />);

    const infoButton = screen.queryByLabelText('Ver información nutricional');
    expect(infoButton).not.toBeInTheDocument();
  });

  it('should not show protein badge for low protein items', () => {
    const lowProteinProduct = {
      ...mockProduct,
      nutrition: { ...mockProduct.nutrition!, protein: 15 } as const,
    };
    render(<ProductCard product={lowProteinProduct} />);

    expect(screen.queryByText(/proteína/i)).not.toBeInTheDocument();
  });
});

describe('ProductCardCompact', () => {
  it('should render compact layout', () => {
    render(<ProductCardCompact product={mockProduct} />);

    expect(screen.getByText('Protein Bowl')).toBeInTheDocument();
    expect(screen.getByText('$15.99')).toBeInTheDocument();
  });

  it('should render nutrition summary', () => {
    render(<ProductCardCompact product={mockProduct} />);

    expect(screen.getByText('450 kcal')).toBeInTheDocument();
    expect(screen.getByText(/35g/)).toBeInTheDocument();
  });

  it('should render add button', () => {
    render(<ProductCardCompact product={mockProduct} />);

    expect(screen.getByText('Agregar')).toBeInTheDocument();
  });
});
