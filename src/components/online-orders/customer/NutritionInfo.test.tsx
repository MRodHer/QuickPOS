/**
 * SPEC-POS-001: Online Orders System - NutritionInfo Component Tests
 *
 * RED Phase: Write tests for NutritionInfo component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NutritionInfo } from './NutritionInfo';
import type { MenuItem } from '@/types/online-orders';

const mockProduct: MenuItem = {
  id: 'prod-1',
  name: 'Protein Bowl',
  description: 'High protein bowl',
  price: 15.99,
  image_url: null,
  is_available: true,
  category_id: 'cat-1',
  category_name: 'Post-Entreno',
  nutrition: {
    id: 'nutr-1',
    business_id: 'biz-1',
    product_id: 'prod-1',
    serving_size: '1 bowl (350g)',
    servings_per_container: 1,
    calories: 450,
    protein: 35,
    carbohydrates: 40,
    fat: 15,
    fiber: 8,
    sugar: 5,
    sodium: 800,
    vitamins: { a: 1000, c: 50 },
    minerals: { iron: 5, calcium: 200 },
    protein_score: 9,
    calorie_score: 6,
    health_score: 8,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  allergens: ['dairy', 'gluten'],
  dietary_tags: ['gluten_free', 'keto'],
};

const mockProductNoNutrition: MenuItem = {
  ...mockProduct,
  nutrition: null,
  allergens: [],
  dietary_tags: [],
};

describe('NutritionInfo', () => {
  it('should render product name', () => {
    const onClose = vi.fn();
    render(<NutritionInfo product={mockProduct} onClose={onClose} />);

    expect(screen.getByText('Protein Bowl')).toBeInTheDocument();
  });

  it('should render product description', () => {
    const onClose = vi.fn();
    render(<NutritionInfo product={mockProduct} onClose={onClose} />);

    expect(screen.getByText('High protein bowl')).toBeInTheDocument();
  });

  it('should render calories prominently', () => {
    const onClose = vi.fn();
    render(<NutritionInfo product={mockProduct} onClose={onClose} />);

    expect(screen.getByText('450')).toBeInTheDocument();
    expect(screen.getByText('calorías')).toBeInTheDocument();
  });

  it('should render macros', () => {
    const onClose = vi.fn();
    render(<NutritionInfo product={mockProduct} onClose={onClose} />);

    // Use getAllByText for values that appear multiple times
    expect(screen.getAllByText('35g').length).toBeGreaterThan(0); // Protein
    expect(screen.getAllByText('40g').length).toBeGreaterThan(0); // Carbs
    expect(screen.getAllByText('15g').length).toBeGreaterThan(0); // Fat
    expect(screen.getAllByText('8g').length).toBeGreaterThan(0); // Fiber
  });

  it('should render fitness scores', () => {
    const onClose = vi.fn();
    render(<NutritionInfo product={mockProduct} onClose={onClose} />);

    expect(screen.getByText(/9\/10/)).toBeInTheDocument(); // Protein score
    expect(screen.getByText(/8\/10/)).toBeInTheDocument(); // Health score
  });

  it('should render allergens', () => {
    const onClose = vi.fn();
    render(<NutritionInfo product={mockProduct} onClose={onClose} />);

    expect(screen.getByText('Contiene dairy')).toBeInTheDocument();
    expect(screen.getByText('Contiene gluten')).toBeInTheDocument();
  });

  it('should render dietary tags', () => {
    const onClose = vi.fn();
    render(<NutritionInfo product={mockProduct} onClose={onClose} />);

    expect(screen.getByText('gluten free')).toBeInTheDocument();
    expect(screen.getByText('keto')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<NutritionInfo product={mockProduct} onClose={onClose} />);

    const closeButton = screen.getByLabelText('Cerrar');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should show message when no nutrition info available', () => {
    const onClose = vi.fn();
    render(<NutritionInfo product={mockProductNoNutrition} onClose={onClose} />);

    expect(screen.getByText(/información nutricional no disponible/i)).toBeInTheDocument();
  });

  it('should render serving size', () => {
    const onClose = vi.fn();
    render(<NutritionInfo product={mockProduct} onClose={onClose} />);

    expect(screen.getByText(/Tamaño de porción:/i)).toBeInTheDocument();
    expect(screen.getByText(/1 bowl \(350g\)/i)).toBeInTheDocument();
  });

  it('should render sodium info', () => {
    const onClose = vi.fn();
    render(<NutritionInfo product={mockProduct} onClose={onClose} />);

    expect(screen.getByText('800mg')).toBeInTheDocument();
  });
});
