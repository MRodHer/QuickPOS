/**
 * SPEC-POS-001 Phase 3: Customer Profile Store Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCustomerProfileStore, FITNESS_GOAL_PRESETS, DIETARY_PREFERENCE_LABELS, ALLERGEN_LABELS } from './customerProfileStore';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
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
              updated_at: '2025-01-01T00:00:00Z',
            },
            error: null,
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'new-profile' },
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'profile-1' },
              error: null,
            })),
          })),
        })),
      })),
    })),
  },
}));

describe('customerProfileStore', () => {
  beforeEach(() => {
    // Reset store state
    useCustomerProfileStore.getState().clearProfile();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have null profile initially', () => {
      const { profile } = useCustomerProfileStore.getState();
      expect(profile).toBeNull();
    });

    it('should have empty order history', () => {
      const { orderHistory } = useCustomerProfileStore.getState();
      expect(orderHistory).toEqual([]);
    });

    it('should not be loading', () => {
      const { isLoading } = useCustomerProfileStore.getState();
      expect(isLoading).toBe(false);
    });
  });

  describe('Fitness Goal Presets', () => {
    it('should have lose_weight preset', () => {
      expect(FITNESS_GOAL_PRESETS.lose_weight).toEqual({
        calories: 1800,
        protein: 130,
        carbs: 150,
        fat: 60,
        label: 'Perder peso',
      });
    });

    it('should have gain_muscle preset', () => {
      expect(FITNESS_GOAL_PRESETS.gain_muscle).toEqual({
        calories: 2500,
        protein: 180,
        carbs: 280,
        fat: 80,
        label: 'Ganar músculo',
      });
    });

    it('should have all 5 fitness goals', () => {
      const goals = Object.keys(FITNESS_GOAL_PRESETS);
      expect(goals).toHaveLength(5);
      expect(goals).toContain('lose_weight');
      expect(goals).toContain('gain_muscle');
      expect(goals).toContain('maintain');
      expect(goals).toContain('performance');
      expect(goals).toContain('general_health');
    });
  });

  describe('Dietary Preference Labels', () => {
    it('should have all dietary preference labels', () => {
      expect(DIETARY_PREFERENCE_LABELS.vegan).toBe('Vegano');
      expect(DIETARY_PREFERENCE_LABELS.keto).toBe('Keto');
      expect(DIETARY_PREFERENCE_LABELS.gluten_free).toBe('Sin gluten');
    });

    it('should have 8 dietary preferences', () => {
      expect(Object.keys(DIETARY_PREFERENCE_LABELS)).toHaveLength(8);
    });
  });

  describe('Allergen Labels', () => {
    it('should have all allergen labels', () => {
      expect(ALLERGEN_LABELS.gluten).toBe('Gluten');
      expect(ALLERGEN_LABELS.nuts).toBe('Nueces');
      expect(ALLERGEN_LABELS.dairy).toBe('Lácteos');
    });

    it('should have 7 allergens', () => {
      expect(Object.keys(ALLERGEN_LABELS)).toHaveLength(7);
    });
  });

  describe('isFavorite', () => {
    it('should return false when profile is null', () => {
      const result = useCustomerProfileStore.getState().isFavorite('prod-1');
      expect(result).toBe(false);
    });
  });

  describe('getDailyProgress', () => {
    it('should calculate progress correctly', () => {
      const { getDailyProgress } = useCustomerProfileStore.getState();
      const currentNutrition = {
        calories: 1000,
        protein: 50,
        carbs: 100,
        fat: 30,
      };

      const progress = getDailyProgress(currentNutrition);

      // With no profile, targets should be 0
      expect(progress.calories.current).toBe(1000);
      expect(progress.calories.target).toBe(0);
      expect(progress.calories.percentage).toBe(0);
    });
  });

  describe('clearProfile', () => {
    it('should reset profile to null', () => {
      useCustomerProfileStore.getState().clearProfile();

      const { profile, orderHistory, error } = useCustomerProfileStore.getState();
      expect(profile).toBeNull();
      expect(orderHistory).toEqual([]);
      expect(error).toBeNull();
    });
  });
});
