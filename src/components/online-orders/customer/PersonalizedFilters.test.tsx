/**
 * SPEC-POS-001 Phase 3: Personalized Filters Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonalizedFilters, QuickFilterPresets } from './PersonalizedFilters';
import type { MenuItem } from '@/types/online-orders';

const mockMenuItems: MenuItem[] = [
  {
    id: 'item-1',
    name: 'Bowl Proteico',
    description: 'Alto en proteína',
    price: 150,
    image_url: null,
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
    name: 'Ensalada Vegana',
    description: 'Sin ingredientes animales',
    price: 120,
    image_url: null,
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
      protein: 10,
      carbohydrates: 30,
      fat: 8,
      fiber: 12,
      sugar: 5,
      sodium: 150,
      vitamins: {},
      minerals: {},
      protein_score: 4,
      calorie_score: 9,
      health_score: 9,
      created_at: '',
      updated_at: '',
    },
    allergens: ['gluten'],
    dietary_tags: ['vegan', 'vegetarian'],
  },
  {
    id: 'item-3',
    name: 'Wrap con Nueces',
    description: 'Contiene nueces',
    price: 130,
    image_url: null,
    is_available: true,
    category_id: 'cat-1',
    category_name: 'Snacks',
    nutrition: {
      id: 'nut-3',
      business_id: 'biz-1',
      product_id: 'item-3',
      serving_size: '200g',
      servings_per_container: 1,
      calories: 380,
      protein: 18,
      carbohydrates: 35,
      fat: 22,
      fiber: 6,
      sugar: 8,
      sodium: 300,
      vitamins: {},
      minerals: {},
      protein_score: 6,
      calorie_score: 6,
      health_score: 6,
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
        dietary_preferences: ['keto'],
        allergies: ['nuts'],
      },
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
  DIETARY_PREFERENCE_LABELS: {
    vegan: 'Vegano',
    vegetarian: 'Vegetariano',
    keto: 'Keto',
    paleo: 'Paleo',
    gluten_free: 'Sin gluten',
    dairy_free: 'Sin lácteos',
    low_sodium: 'Bajo en sodio',
    sugar_free: 'Sin azúcar',
  },
  ALLERGEN_LABELS: {
    gluten: 'Gluten',
    dairy: 'Lácteos',
    nuts: 'Nueces',
    eggs: 'Huevo',
    soy: 'Soya',
    shellfish: 'Mariscos',
    fish: 'Pescado',
  },
}));

describe('PersonalizedFilters', () => {
  const mockOnFilterChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render search input', () => {
      render(
        <PersonalizedFilters
          menuItems={mockMenuItems}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByPlaceholderText('Buscar productos...')).toBeInTheDocument();
    });

    it('should render profile preferences toggle', () => {
      render(
        <PersonalizedFilters
          menuItems={mockMenuItems}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('Usar mis preferencias')).toBeInTheDocument();
    });

    it('should display active filters from profile', () => {
      render(
        <PersonalizedFilters
          menuItems={mockMenuItems}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('Keto')).toBeInTheDocument();
      expect(screen.getByText('Sin Nueces')).toBeInTheDocument();
    });

    it('should display results count', () => {
      render(
        <PersonalizedFilters
          menuItems={mockMenuItems}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText(/Mostrando \d+ de \d+ productos/)).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter items by search query', async () => {
      const user = userEvent.setup();
      render(
        <PersonalizedFilters
          menuItems={mockMenuItems}
          onFilterChange={mockOnFilterChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Buscar productos...');
      await user.type(searchInput, 'Bowl');

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalled();
      });
    });
  });

  describe('Filter Actions', () => {
    it('should remove filter when X is clicked', async () => {
      const user = userEvent.setup();
      render(
        <PersonalizedFilters
          menuItems={mockMenuItems}
          onFilterChange={mockOnFilterChange}
        />
      );

      const removeButtons = screen.getAllByLabelText(/Quitar filtro/);
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalled();
      });
    });

    it('should clear all filters when clicked', async () => {
      const user = userEvent.setup();
      render(
        <PersonalizedFilters
          menuItems={mockMenuItems}
          onFilterChange={mockOnFilterChange}
        />
      );

      await user.click(screen.getByText('Limpiar todos'));

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalled();
      });
    });

    it('should toggle expanded filters view', async () => {
      const user = userEvent.setup();
      render(
        <PersonalizedFilters
          menuItems={mockMenuItems}
          onFilterChange={mockOnFilterChange}
        />
      );

      await user.click(screen.getByText('Más filtros'));

      expect(screen.getByText('Tipo de dieta')).toBeInTheDocument();
      expect(screen.getByText('Excluir alérgenos')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria label', () => {
      render(
        <PersonalizedFilters
          menuItems={mockMenuItems}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByLabelText('Filtros de menú')).toBeInTheDocument();
    });
  });
});

describe('QuickFilterPresets', () => {
  it('should render preset buttons', () => {
    const mockOnApply = vi.fn();
    render(<QuickFilterPresets onApply={mockOnApply} />);

    expect(screen.getByText(/Alto en proteína/)).toBeInTheDocument();
    expect(screen.getByText(/Bajo en calorías/)).toBeInTheDocument();
    expect(screen.getByText(/Keto-friendly/)).toBeInTheDocument();
    expect(screen.getByText(/Vegano/)).toBeInTheDocument();
  });

  it('should call onApply when preset is clicked', async () => {
    const user = userEvent.setup();
    const mockOnApply = vi.fn();
    render(<QuickFilterPresets onApply={mockOnApply} />);

    await user.click(screen.getByText(/Alto en proteína/));

    expect(mockOnApply).toHaveBeenCalledWith({ min_protein: 25 });
  });
});
