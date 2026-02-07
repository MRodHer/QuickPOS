/**
 * SPEC-POS-001 Phase 3: Smart Recommendations Component
 *
 * Provides personalized product recommendations based on:
 * - Customer's fitness goals
 * - Order history and favorites
 * - Remaining daily macros
 * - Dietary preferences
 */

import { useMemo } from 'react';
import { useCustomerProfileStore, FITNESS_GOAL_PRESETS } from '@/stores/customerProfileStore';
import { useOnlineCartStore } from '@/stores/onlineCartStore';
import type { MenuItem, FitnessGoal, NutritionDisplay } from '@/types/online-orders';

interface RecommendationsProps {
  menuItems: MenuItem[];
  onAddToCart: (item: MenuItem) => void;
  maxItems?: number;
}

interface RecommendedItem extends MenuItem {
  reason: string;
  score: number;
}

export function Recommendations({
  menuItems,
  onAddToCart,
  maxItems = 4,
}: RecommendationsProps) {
  const profile = useCustomerProfileStore((state) => state.profile);
  const cartNutrition = useOnlineCartStore((state) => state.nutrition());

  const recommendations = useMemo((): RecommendedItem[] => {
    if (!profile || menuItems.length === 0) return [];

    const scored: RecommendedItem[] = menuItems
      .filter((item) => item.is_available)
      .map((item) => {
        let score = 0;
        let reasons: string[] = [];

        const nutrition = item.nutrition;

        // 1. Check if it's a favorite (highest priority)
        if (profile.favorite_products.includes(item.id)) {
          score += 50;
          reasons.push('Tu favorito');
        }

        // 2. Check dietary preferences match
        const matchedPrefs = item.dietary_tags.filter((tag) =>
          profile.dietary_preferences.includes(tag)
        );
        if (matchedPrefs.length > 0) {
          score += matchedPrefs.length * 15;
          reasons.push('Ideal para tu dieta');
        }

        // 3. Check allergen safety
        const hasAllergen = item.allergens.some((allergen) =>
          profile.allergies.includes(allergen)
        );
        if (hasAllergen) {
          score -= 100; // Exclude items with allergens
        }

        // 4. Score based on fitness goal
        if (profile.fitness_goal && nutrition) {
          score += scoreForFitnessGoal(
            profile.fitness_goal,
            nutrition,
            reasons
          );
        }

        // 5. Score based on remaining macros
        if (profile.daily_calorie_target && nutrition) {
          score += scoreForRemainingMacros(
            profile,
            cartNutrition,
            nutrition,
            reasons
          );
        }

        // 6. High protein score bonus for gym context
        if (nutrition && nutrition.protein && nutrition.protein >= 25) {
          score += 10;
          if (!reasons.includes('Alto en proteína')) {
            reasons.push('Alto en proteína');
          }
        }

        return {
          ...item,
          score,
          reason: reasons[0] || 'Recomendado para ti',
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxItems);

    return scored;
  }, [menuItems, profile, cartNutrition, maxItems]);

  if (!profile) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-gray-600">
          Inicia sesión para ver recomendaciones personalizadas
        </p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3" aria-label="Recomendaciones personalizadas">
      <div className="flex items-center gap-2">
        <span className="text-xl">✨</span>
        <h2 className="text-lg font-semibold text-gray-900">
          Recomendado para ti
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {recommendations.map((item) => (
          <RecommendationCard
            key={item.id}
            item={item}
            onAdd={() => onAddToCart(item)}
          />
        ))}
      </div>
    </div>
  );
}

interface RecommendationCardProps {
  item: RecommendedItem;
  onAdd: () => void;
}

function RecommendationCard({ item, onAdd }: RecommendationCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  return (
    <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      {item.image_url && (
        <div className="w-20 h-20 flex-shrink-0">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-3 flex flex-col justify-between">
        <div>
          <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
            {item.name}
          </h3>
          <p className="text-xs text-green-600 mt-0.5">{item.reason}</p>
          {item.nutrition && (
            <p className="text-xs text-gray-500 mt-1">
              {item.nutrition.calories} kcal · {item.nutrition.protein}g prot
            </p>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="font-semibold text-gray-900 text-sm">
            {formatCurrency(item.price)}
          </span>
          <button
            onClick={onAdd}
            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
          >
            + Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper functions for scoring
function scoreForFitnessGoal(
  goal: FitnessGoal,
  nutrition: any,
  reasons: string[]
): number {
  let score = 0;

  switch (goal) {
    case 'lose_weight':
      if (nutrition.calories && nutrition.calories < 400) {
        score += 20;
        reasons.push('Bajo en calorías');
      }
      if (nutrition.protein && nutrition.protein >= 20) {
        score += 15;
      }
      break;

    case 'gain_muscle':
      if (nutrition.protein && nutrition.protein >= 30) {
        score += 25;
        reasons.push('Alto en proteína');
      }
      if (nutrition.calories && nutrition.calories >= 500) {
        score += 10;
      }
      break;

    case 'performance':
      if (nutrition.carbohydrates && nutrition.carbohydrates >= 40) {
        score += 20;
        reasons.push('Rico en carbohidratos');
      }
      if (nutrition.protein && nutrition.protein >= 25) {
        score += 15;
      }
      break;

    case 'maintain':
    case 'general_health':
      // Balanced meals
      if (
        nutrition.protein >= 15 &&
        nutrition.carbohydrates >= 20 &&
        nutrition.fat <= 20
      ) {
        score += 20;
        reasons.push('Equilibrado');
      }
      break;
  }

  return score;
}

function scoreForRemainingMacros(
  profile: any,
  cartNutrition: NutritionDisplay,
  itemNutrition: any,
  reasons: string[]
): number {
  let score = 0;

  const remainingCalories =
    (profile.daily_calorie_target || 2000) - cartNutrition.calories;
  const remainingProtein =
    (profile.daily_protein_target || 120) - cartNutrition.protein;

  // Fits within remaining calories
  if (
    itemNutrition.calories &&
    itemNutrition.calories <= remainingCalories * 0.5
  ) {
    score += 15;
  }

  // Helps meet protein goal
  if (remainingProtein > 20 && itemNutrition.protein >= 20) {
    score += 20;
    reasons.push('Ayuda a cumplir tu meta de proteína');
  }

  // Penalize if would exceed daily limit significantly
  if (
    itemNutrition.calories &&
    cartNutrition.calories + itemNutrition.calories >
      profile.daily_calorie_target * 1.2
  ) {
    score -= 30;
  }

  return score;
}

/**
 * Quick recommendations for specific scenarios
 */
export function QuickRecommendation({
  type,
  menuItems,
  onAddToCart,
}: {
  type: 'pre_workout' | 'post_workout' | 'low_calorie' | 'high_protein';
  menuItems: MenuItem[];
  onAddToCart: (item: MenuItem) => void;
}) {
  const filtered = useMemo(() => {
    return menuItems
      .filter((item) => {
        if (!item.nutrition || !item.is_available) return false;

        switch (type) {
          case 'pre_workout':
            return (
              item.nutrition.carbohydrates !== null &&
              item.nutrition.carbohydrates >= 30 &&
              item.nutrition.fat !== null &&
              item.nutrition.fat < 15
            );
          case 'post_workout':
            return (
              item.nutrition.protein !== null && item.nutrition.protein >= 25
            );
          case 'low_calorie':
            return (
              item.nutrition.calories !== null && item.nutrition.calories < 350
            );
          case 'high_protein':
            return (
              item.nutrition.protein !== null && item.nutrition.protein >= 30
            );
          default:
            return true;
        }
      })
      .slice(0, 3);
  }, [menuItems, type]);

  const labels = {
    pre_workout: { icon: '⚡', title: 'Pre-entreno' },
    post_workout: { icon: '💪', title: 'Post-entreno' },
    low_calorie: { icon: '🥗', title: 'Ligero' },
    high_protein: { icon: '🥩', title: 'Proteína' },
  };

  if (filtered.length === 0) return null;

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span>{labels[type].icon}</span>
        <span className="font-medium text-sm">{labels[type].title}</span>
      </div>
      <div className="space-y-2">
        {filtered.map((item) => (
          <button
            key={item.id}
            onClick={() => onAddToCart(item)}
            className="w-full flex justify-between items-center text-sm p-2 bg-white rounded hover:bg-gray-100 transition-colors"
          >
            <span className="truncate">{item.name}</span>
            <span className="text-green-600 ml-2">+ Agregar</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default Recommendations;
