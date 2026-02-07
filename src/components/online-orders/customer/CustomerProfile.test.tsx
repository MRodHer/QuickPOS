/**
 * SPEC-POS-001 Phase 3: Customer Profile Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerProfile } from './CustomerProfile';

// Mock stores
vi.mock('@/stores/customerProfileStore', () => ({
  useCustomerProfileStore: vi.fn((selector) => {
    const state = {
      profile: {
        id: 'profile-1',
        user_id: 'user-1',
        business_id: 'business-1',
        fitness_goal: 'gain_muscle',
        daily_calorie_target: 2500,
        daily_protein_target: 180,
        daily_carbs_target: 280,
        daily_fat_target: 80,
        dietary_preferences: ['keto'],
        allergies: ['nuts'],
        preferred_notification_method: 'email',
        favorite_products: ['prod-1'],
        created_at: '2025-01-01T00:00:00Z',
      },
      isLoading: false,
      error: null,
      fetchProfile: vi.fn(),
      createProfile: vi.fn(),
      setFitnessGoal: vi.fn(),
      setDailyTargets: vi.fn(),
      addDietaryPreference: vi.fn(),
      removeDietaryPreference: vi.fn(),
      addAllergy: vi.fn(),
      removeAllergy: vi.fn(),
      setNotificationPreference: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
  FITNESS_GOAL_PRESETS: {
    lose_weight: { calories: 1800, protein: 130, carbs: 150, fat: 60, label: 'Perder peso' },
    gain_muscle: { calories: 2500, protein: 180, carbs: 280, fat: 80, label: 'Ganar músculo' },
    maintain: { calories: 2000, protein: 120, carbs: 220, fat: 70, label: 'Mantener peso' },
    performance: { calories: 2800, protein: 160, carbs: 350, fat: 90, label: 'Rendimiento deportivo' },
    general_health: { calories: 2000, protein: 100, carbs: 250, fat: 65, label: 'Salud general' },
  },
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

describe('CustomerProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render profile page with tabs', () => {
      render(<CustomerProfile userId="user-1" businessId="business-1" />);

      expect(screen.getByText('Mi Perfil')).toBeInTheDocument();
      expect(screen.getByText('Información')).toBeInTheDocument();
      expect(screen.getByText('Objetivos Fitness')).toBeInTheDocument();
      expect(screen.getByText('Preferencias')).toBeInTheDocument();
      expect(screen.getByText('Notificaciones')).toBeInTheDocument();
    });

    it('should render profile information section by default', () => {
      render(<CustomerProfile userId="user-1" businessId="business-1" />);

      expect(screen.getByText('Información Personal')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to fitness goals tab when clicked', async () => {
      const user = userEvent.setup();
      render(<CustomerProfile userId="user-1" businessId="business-1" />);

      await user.click(screen.getByText('Objetivos Fitness'));

      expect(screen.getByText('Selecciona tu objetivo:')).toBeInTheDocument();
    });

    it('should switch to preferences tab when clicked', async () => {
      const user = userEvent.setup();
      render(<CustomerProfile userId="user-1" businessId="business-1" />);

      await user.click(screen.getByText('Preferencias'));

      expect(screen.getByText('Preferencias Alimenticias')).toBeInTheDocument();
    });

    it('should switch to notifications tab when clicked', async () => {
      const user = userEvent.setup();
      render(<CustomerProfile userId="user-1" businessId="business-1" />);

      await user.click(screen.getByText('Notificaciones'));

      expect(screen.getByText('Preferencias de Notificación')).toBeInTheDocument();
    });
  });

  describe('Fitness Goals', () => {
    it('should display fitness goal options', async () => {
      const user = userEvent.setup();
      render(<CustomerProfile userId="user-1" businessId="business-1" />);

      await user.click(screen.getByText('Objetivos Fitness'));

      expect(screen.getByText('Perder peso')).toBeInTheDocument();
      expect(screen.getByText('Ganar músculo')).toBeInTheDocument();
      expect(screen.getByText('Mantener peso')).toBeInTheDocument();
    });

    it('should display daily macro targets', async () => {
      const user = userEvent.setup();
      render(<CustomerProfile userId="user-1" businessId="business-1" />);

      await user.click(screen.getByText('Objetivos Fitness'));

      expect(screen.getByText('kcal/día')).toBeInTheDocument();
      expect(screen.getByText('proteína')).toBeInTheDocument();
    });
  });

  describe('Dietary Preferences', () => {
    it('should display dietary preference buttons', async () => {
      const user = userEvent.setup();
      render(<CustomerProfile userId="user-1" businessId="business-1" />);

      await user.click(screen.getByText('Preferencias'));

      expect(screen.getByText('Vegano')).toBeInTheDocument();
      expect(screen.getByText('Keto')).toBeInTheDocument();
      expect(screen.getByText('Sin gluten')).toBeInTheDocument();
    });

    it('should display allergen buttons', async () => {
      const user = userEvent.setup();
      render(<CustomerProfile userId="user-1" businessId="business-1" />);

      await user.click(screen.getByText('Preferencias'));

      expect(screen.getByText('Gluten')).toBeInTheDocument();
      expect(screen.getByText('Lácteos')).toBeInTheDocument();
      expect(screen.getByText('Nueces')).toBeInTheDocument();
    });
  });

  describe('Notifications', () => {
    it('should display notification channel options', async () => {
      const user = userEvent.setup();
      render(<CustomerProfile userId="user-1" businessId="business-1" />);

      await user.click(screen.getByText('Notificaciones'));

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('SMS')).toBeInTheDocument();
      expect(screen.getByText('Telegram')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels', () => {
      render(<CustomerProfile userId="user-1" businessId="business-1" />);

      expect(screen.getByLabelText('Perfil de cliente')).toBeInTheDocument();
    });
  });
});
