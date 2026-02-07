/**
 * SPEC-POS-001 Phase 3: Customer Profile Store
 *
 * Zustand store for customer profile management including:
 * - Fitness goals and macro targets
 * - Dietary preferences and allergies
 * - Favorites management
 * - Order history
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type {
  CustomerProfile,
  FitnessGoal,
  DietaryPreference,
  Allergen,
  NotificationChannel,
  OnlineOrder,
  NutritionDisplay,
} from '@/types/online-orders';

interface CustomerProfileState {
  // Profile data
  profile: CustomerProfile | null;
  isLoading: boolean;
  error: string | null;

  // Order history
  orderHistory: OnlineOrder[];
  isLoadingHistory: boolean;

  // Actions - Profile
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<CustomerProfile>) => Promise<void>;
  createProfile: (userId: string, businessId: string) => Promise<void>;

  // Actions - Fitness Goals
  setFitnessGoal: (goal: FitnessGoal) => Promise<void>;
  setDailyTargets: (targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }) => Promise<void>;

  // Actions - Preferences
  addDietaryPreference: (pref: DietaryPreference) => Promise<void>;
  removeDietaryPreference: (pref: DietaryPreference) => Promise<void>;
  addAllergy: (allergy: Allergen) => Promise<void>;
  removeAllergy: (allergy: Allergen) => Promise<void>;

  // Actions - Favorites
  addFavorite: (productId: string) => Promise<void>;
  removeFavorite: (productId: string) => Promise<void>;
  isFavorite: (productId: string) => boolean;

  // Actions - Order History
  fetchOrderHistory: (limit?: number) => Promise<void>;

  // Actions - Notifications
  setNotificationPreference: (channel: NotificationChannel) => Promise<void>;

  // Helpers
  getDailyProgress: (currentNutrition: NutritionDisplay) => {
    calories: { current: number; target: number; percentage: number };
    protein: { current: number; target: number; percentage: number };
    carbs: { current: number; target: number; percentage: number };
    fat: { current: number; target: number; percentage: number };
  };

  // Reset
  clearProfile: () => void;
}

export const useCustomerProfileStore = create<CustomerProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      isLoading: false,
      error: null,
      orderHistory: [],
      isLoadingHistory: false,

      fetchProfile: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('customer_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          set({ profile: data, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Error fetching profile',
            isLoading: false,
          });
        }
      },

      createProfile: async (userId: string, businessId: string) => {
        set({ isLoading: true, error: null });
        try {
          const newProfile: Partial<CustomerProfile> = {
            user_id: userId,
            business_id: businessId,
            fitness_goal: null,
            daily_calorie_target: null,
            daily_protein_target: null,
            daily_carbs_target: null,
            daily_fat_target: null,
            dietary_preferences: [],
            allergies: [],
            preferred_notification_method: 'email',
            phone_number: null,
            telegram_chat_id: null,
            favorite_products: [],
          };

          const { data, error } = await supabase
            .from('customer_profiles')
            .insert(newProfile)
            .select()
            .single();

          if (error) throw error;

          set({ profile: data, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Error creating profile',
            isLoading: false,
          });
        }
      },

      updateProfile: async (updates: Partial<CustomerProfile>) => {
        const { profile } = get();
        if (!profile) return;

        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('customer_profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', profile.id)
            .select()
            .single();

          if (error) throw error;

          set({ profile: data, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Error updating profile',
            isLoading: false,
          });
        }
      },

      setFitnessGoal: async (goal: FitnessGoal) => {
        await get().updateProfile({ fitness_goal: goal });
      },

      setDailyTargets: async (targets) => {
        await get().updateProfile({
          daily_calorie_target: targets.calories,
          daily_protein_target: targets.protein,
          daily_carbs_target: targets.carbs,
          daily_fat_target: targets.fat,
        });
      },

      addDietaryPreference: async (pref: DietaryPreference) => {
        const { profile } = get();
        if (!profile) return;

        const updatedPrefs = [...profile.dietary_preferences, pref];
        await get().updateProfile({ dietary_preferences: updatedPrefs });
      },

      removeDietaryPreference: async (pref: DietaryPreference) => {
        const { profile } = get();
        if (!profile) return;

        const updatedPrefs = profile.dietary_preferences.filter((p) => p !== pref);
        await get().updateProfile({ dietary_preferences: updatedPrefs });
      },

      addAllergy: async (allergy: Allergen) => {
        const { profile } = get();
        if (!profile) return;

        const updatedAllergies = [...profile.allergies, allergy];
        await get().updateProfile({ allergies: updatedAllergies });
      },

      removeAllergy: async (allergy: Allergen) => {
        const { profile } = get();
        if (!profile) return;

        const updatedAllergies = profile.allergies.filter((a) => a !== allergy);
        await get().updateProfile({ allergies: updatedAllergies });
      },

      addFavorite: async (productId: string) => {
        const { profile } = get();
        if (!profile) return;

        if (profile.favorite_products.includes(productId)) return;

        const updatedFavorites = [...profile.favorite_products, productId];
        await get().updateProfile({ favorite_products: updatedFavorites });
      },

      removeFavorite: async (productId: string) => {
        const { profile } = get();
        if (!profile) return;

        const updatedFavorites = profile.favorite_products.filter(
          (id) => id !== productId
        );
        await get().updateProfile({ favorite_products: updatedFavorites });
      },

      isFavorite: (productId: string) => {
        const { profile } = get();
        return profile?.favorite_products.includes(productId) ?? false;
      },

      fetchOrderHistory: async (limit = 20) => {
        const { profile } = get();
        if (!profile?.user_id) return;

        set({ isLoadingHistory: true });
        try {
          const { data, error } = await supabase
            .from('online_orders')
            .select('*')
            .eq('user_id', profile.user_id)
            .order('created_at', { ascending: false })
            .limit(limit);

          if (error) throw error;

          set({ orderHistory: data || [], isLoadingHistory: false });
        } catch (err) {
          set({ isLoadingHistory: false });
        }
      },

      setNotificationPreference: async (channel: NotificationChannel) => {
        await get().updateProfile({ preferred_notification_method: channel });
      },

      getDailyProgress: (currentNutrition: NutritionDisplay) => {
        const { profile } = get();

        const calcProgress = (current: number, target: number | null) => ({
          current,
          target: target || 0,
          percentage: target ? Math.min((current / target) * 100, 100) : 0,
        });

        return {
          calories: calcProgress(
            currentNutrition.calories,
            profile?.daily_calorie_target ?? null
          ),
          protein: calcProgress(
            currentNutrition.protein,
            profile?.daily_protein_target ?? null
          ),
          carbs: calcProgress(
            currentNutrition.carbs,
            profile?.daily_carbs_target ?? null
          ),
          fat: calcProgress(
            currentNutrition.fat,
            profile?.daily_fat_target ?? null
          ),
        };
      },

      clearProfile: () => {
        set({
          profile: null,
          orderHistory: [],
          error: null,
        });
      },
    }),
    {
      name: 'customer-profile-storage',
      partialize: (state) => ({
        profile: state.profile,
      }),
    }
  )
);

/**
 * Hook for fitness goal presets
 */
export const FITNESS_GOAL_PRESETS: Record<
  FitnessGoal,
  { calories: number; protein: number; carbs: number; fat: number; label: string }
> = {
  lose_weight: {
    calories: 1800,
    protein: 130,
    carbs: 150,
    fat: 60,
    label: 'Perder peso',
  },
  gain_muscle: {
    calories: 2500,
    protein: 180,
    carbs: 280,
    fat: 80,
    label: 'Ganar músculo',
  },
  maintain: {
    calories: 2000,
    protein: 120,
    carbs: 220,
    fat: 70,
    label: 'Mantener peso',
  },
  performance: {
    calories: 2800,
    protein: 160,
    carbs: 350,
    fat: 90,
    label: 'Rendimiento deportivo',
  },
  general_health: {
    calories: 2000,
    protein: 100,
    carbs: 250,
    fat: 65,
    label: 'Salud general',
  },
};

/**
 * Hook for dietary preference labels
 */
export const DIETARY_PREFERENCE_LABELS: Record<DietaryPreference, string> = {
  vegan: 'Vegano',
  vegetarian: 'Vegetariano',
  keto: 'Keto',
  paleo: 'Paleo',
  gluten_free: 'Sin gluten',
  dairy_free: 'Sin lácteos',
  low_sodium: 'Bajo en sodio',
  sugar_free: 'Sin azúcar',
};

/**
 * Hook for allergen labels
 */
export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: 'Gluten',
  dairy: 'Lácteos',
  nuts: 'Nueces',
  eggs: 'Huevo',
  soy: 'Soya',
  shellfish: 'Mariscos',
  fish: 'Pescado',
};
