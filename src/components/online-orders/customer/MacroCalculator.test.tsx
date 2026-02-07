/**
 * SPEC-POS-001 Phase 3: Macro Calculator Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MacroCalculator, MacroCalculatorCompact } from './MacroCalculator';

// Mock stores
const mockCartNutrition = {
  calories: 800,
  protein: 45,
  carbs: 80,
  fat: 25,
};

const mockProfile = {
  daily_calorie_target: 2000,
  daily_protein_target: 120,
  daily_carbs_target: 220,
  daily_fat_target: 70,
};

vi.mock('@/stores/onlineCartStore', () => ({
  useOnlineCartStore: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector({ nutrition: () => mockCartNutrition });
    }
    return { nutrition: () => mockCartNutrition };
  }),
}));

vi.mock('@/stores/customerProfileStore', () => ({
  useCustomerProfileStore: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector({ profile: mockProfile });
    }
    return { profile: mockProfile };
  }),
}));

describe('MacroCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render nutrition information', () => {
      render(<MacroCalculator />);

      expect(screen.getByText('Nutrición del pedido')).toBeInTheDocument();
      expect(screen.getByText('Calorías')).toBeInTheDocument();
      expect(screen.getByText('Proteína')).toBeInTheDocument();
      expect(screen.getByText('Carbohidratos')).toBeInTheDocument();
      expect(screen.getByText('Grasa')).toBeInTheDocument();
    });

    it('should display current values with targets', () => {
      render(<MacroCalculator />);

      expect(screen.getByText(/800/)).toBeInTheDocument();
      expect(screen.getByText(/2000/)).toBeInTheDocument();
    });

    it('should have proper aria label', () => {
      render(<MacroCalculator />);

      expect(screen.getByLabelText('Calculadora de macros')).toBeInTheDocument();
    });
  });

  describe('Progress Bars', () => {
    it('should render progress bars with correct roles', () => {
      render(<MacroCalculator />);

      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('Remaining Calories', () => {
    it('should show remaining calories when showDetails is true', () => {
      render(<MacroCalculator showDetails={true} />);

      expect(screen.getByText('Restante del día:')).toBeInTheDocument();
    });
  });
});

describe('MacroCalculatorCompact', () => {
  it('should render compact version with macro values', () => {
    render(<MacroCalculatorCompact />);

    expect(screen.getByText(/800 kcal/)).toBeInTheDocument();
    expect(screen.getByText(/45g/)).toBeInTheDocument();
  });
});
