/**
 * SPEC-POS-001 Phase 3: Recommendations Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Recommendations, QuickRecommendation } from './Recommendations';
import type { MenuItem } from '@/types/online-orders';

const mockMenuItems: MenuItem[] = [
  {
    id: 'item-1',
    name: 'Bowl Proteico',
    description: 'Bowl alto en proteína',
    price: 150,
    image_url: '/images/bowl.jpg',
    is_available: true,
    category_id: 'cat-1',
    category_name: 'Post-entreno',
    nutrition: {
      id: 'nut-1',
      business_id: 'biz-1',
      product_id: 'item-1',
      serving_size: '350g',
      servings_per_container: 1,
      calories: 450,
      protein: 35,
      carbohydrates: 45,
      fat: 12,
      fiber: 8,
      sugar: 5,
      sodium: 400,
      vitamins: {},
      minerals: {},
      protein_score: 9,
      calorie_score: 7,
      health_score: 8,
      created_at: '',
      updated_at: '',
    },
    allergens: [],
    dietary_tags: ['keto'],
  },
  {
    id: 'item-2',
    name: 'Ensalada Light',
    description: 'Baja en calorías',
    price: 120,
    image_url: '/images/salad.jpg',
    is_available: true,
    category_id: 'cat-2',
    category_name: 'Ligero',
    nutrition: {
      id: 'nut-2',
      business_id: 'biz-1',
      product_id: 'item-2',
      serving_size: '300g',
      servings_per_container: 1,
      calories: 250,
      protein: 15,
      carbohydrates: 20,
      fat: 8,
      fiber: 10,
      sugar: 3,
      sodium: 200,
      vitamins: {},
      minerals: {},
      protein_score: 6,
      calorie_score: 9,
      health_score: 9,
      created_at: '',
      updated_at: '',
    },
    allergens: [],
    dietary_tags: ['vegan', 'gluten_free'],
  },
  {
    id: 'item-3',
    name: 'Wrap con Nueces',
    description: 'Contiene alérgenos',
    price: 130,
    image_url: '/images/wrap.jpg',
    is_available: true,
    category_id: 'cat-1',
    category_name: 'Post-entreno',
    nutrition: {
      id: 'nut-3',
      business_id: 'biz-1',
      product_id: 'item-3',
      serving_size: '280g',
      servings_per_container: 1,
      calories: 380,
      protein: 20,
      carbohydrates: 35,
      fat: 18,
      fiber: 5,
      sugar: 4,
      sodium: 350,
      vitamins: {},
      minerals: {},
      protein_score: 7,
      calorie_score: 7,
      health_score: 7,
      created_at: '',
      updated_at: '',
    },
    allergens: ['nuts'],
    dietary_tags: [],
  },
];

vi.mock('@/stores/customerProfileStore', () => ({
  useCustomerProfileStore: vi.fn((selector) => {
    const state = {
      profile: {
        id: 'profile-1',
        user_id: 'user-1',
        fitness_goal: 'gain_muscle',
        daily_calorie_target: 2500,
        daily_protein_target: 180,
        daily_carbs_target: 280,
        daily_fat_target: 80,
        dietary_preferences: ['keto'],
        allergies: ['nuts'],
        favorite_products: ['item-1'],
      },
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
  FITNESS_GOAL_PRESETS: {
    gain_muscle: { calories: 2500, protein: 180, carbs: 280, fat: 80, label: 'Ganar músculo' },
  },
}));

vi.mock('@/stores/onlineCartStore', () => ({
  useOnlineCartStore: vi.fn((selector) => {
    const state = {
      nutrition: () => ({ calories: 500, protein: 30, carbs: 50, fat: 15 }),
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

describe('Recommendations', () => {
  const mockOnAddToCart = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render recommendations title', () => {
      render(
        <Recommendations menuItems={mockMenuItems} onAddToCart={mockOnAddToCart} />
      );

      expect(screen.getByText('Recomendado para ti')).toBeInTheDocument();
    });

    it('should display recommended items', () => {
      render(
        <Recommendations menuItems={mockMenuItems} onAddToCart={mockOnAddToCart} />
      );

      // Should show Bowl Proteico (favorite + keto match)
      expect(screen.getByText('Bowl Proteico')).toBeInTheDocument();
    });

    it('should show reason for recommendation', () => {
      render(
        <Recommendations menuItems={mockMenuItems} onAddToCart={mockOnAddToCart} />
      );

      expect(screen.getByText('Tu favorito')).toBeInTheDocument();
    });

    it('should exclude items with allergens', () => {
      render(
        <Recommendations menuItems={mockMenuItems} onAddToCart={mockOnAddToCart} />
      );

      // Should NOT show Wrap con Nueces (contains nuts allergen)
      expect(screen.queryByText('Wrap con Nueces')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onAddToCart when add button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <Recommendations menuItems={mockMenuItems} onAddToCart={mockOnAddToCart} />
      );

      const addButtons = screen.getAllByText('+ Agregar');
      await user.click(addButtons[0]);

      expect(mockOnAddToCart).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria label', () => {
      render(
        <Recommendations menuItems={mockMenuItems} onAddToCart={mockOnAddToCart} />
      );

      expect(screen.getByLabelText('Recomendaciones personalizadas')).toBeInTheDocument();
    });
  });
});

describe('QuickRecommendation', () => {
  const mockOnAddToCart = vi.fn();

  it('should render high protein recommendations', () => {
    render(
      <QuickRecommendation
        type="high_protein"
        menuItems={mockMenuItems}
        onAddToCart={mockOnAddToCart}
      />
    );

    expect(screen.getByText('Proteína')).toBeInTheDocument();
    expect(screen.getByText('Bowl Proteico')).toBeInTheDocument();
  });

  it('should render low calorie recommendations', () => {
    render(
      <QuickRecommendation
        type="low_calorie"
        menuItems={mockMenuItems}
        onAddToCart={mockOnAddToCart}
      />
    );

    expect(screen.getByText('Ligero')).toBeInTheDocument();
    expect(screen.getByText('Ensalada Light')).toBeInTheDocument();
  });
});
