/**
 * SPEC-POS-001 Phase 3: Macro Calculator Component
 *
 * Displays nutritional totals of cart vs customer's daily targets
 * with visual alerts when exceeding limits.
 */

import { useMemo } from 'react';
import { useOnlineCartStore } from '@/stores/onlineCartStore';
import { useCustomerProfileStore } from '@/stores/customerProfileStore';
import type { NutritionDisplay } from '@/types/online-orders';

interface MacroCalculatorProps {
  className?: string;
  showDetails?: boolean;
}

interface MacroProgress {
  name: string;
  current: number;
  target: number;
  percentage: number;
  unit: string;
  color: string;
  isOverLimit: boolean;
}

export function MacroCalculator({ className = '', showDetails = true }: MacroCalculatorProps) {
  const cartNutrition = useOnlineCartStore((state) => state.nutrition());
  const profile = useCustomerProfileStore((state) => state.profile);

  const macroProgress = useMemo((): MacroProgress[] => {
    const hasTargets = profile?.daily_calorie_target;

    if (!hasTargets) {
      return [
        {
          name: 'Calorías',
          current: cartNutrition.calories,
          target: 0,
          percentage: 0,
          unit: 'kcal',
          color: 'gray',
          isOverLimit: false,
        },
        {
          name: 'Proteína',
          current: cartNutrition.protein,
          target: 0,
          percentage: 0,
          unit: 'g',
          color: 'green',
          isOverLimit: false,
        },
        {
          name: 'Carbohidratos',
          current: cartNutrition.carbs,
          target: 0,
          percentage: 0,
          unit: 'g',
          color: 'blue',
          isOverLimit: false,
        },
        {
          name: 'Grasa',
          current: cartNutrition.fat,
          target: 0,
          percentage: 0,
          unit: 'g',
          color: 'orange',
          isOverLimit: false,
        },
      ];
    }

    const calcMacro = (
      name: string,
      current: number,
      target: number | null,
      unit: string,
      color: string
    ): MacroProgress => {
      const t = target || 0;
      const percentage = t > 0 ? (current / t) * 100 : 0;
      return {
        name,
        current: Math.round(current),
        target: t,
        percentage: Math.min(percentage, 100),
        unit,
        color,
        isOverLimit: percentage > 100,
      };
    };

    return [
      calcMacro('Calorías', cartNutrition.calories, profile.daily_calorie_target, 'kcal', 'gray'),
      calcMacro('Proteína', cartNutrition.protein, profile.daily_protein_target, 'g', 'green'),
      calcMacro('Carbohidratos', cartNutrition.carbs, profile.daily_carbs_target, 'g', 'blue'),
      calcMacro('Grasa', cartNutrition.fat, profile.daily_fat_target, 'g', 'orange'),
    ];
  }, [cartNutrition, profile]);

  const hasOverLimit = macroProgress.some((m) => m.isOverLimit);
  const hasTargets = profile?.daily_calorie_target;

  if (cartNutrition.calories === 0) {
    return null;
  }

  const getColorClasses = (color: string, isOverLimit: boolean) => {
    if (isOverLimit) return 'bg-red-500';
    switch (color) {
      case 'green':
        return 'bg-green-500';
      case 'blue':
        return 'bg-blue-500';
      case 'orange':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div
      className={`p-4 rounded-lg ${
        hasOverLimit ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
      } ${className}`}
      aria-label="Calculadora de macros"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">
          Nutrición del pedido
        </h3>
        {hasOverLimit && (
          <span className="text-sm text-red-600 font-medium flex items-center gap-1">
            <span>⚠️</span> Excede tus metas
          </span>
        )}
      </div>

      {!hasTargets && (
        <p className="text-sm text-gray-500 mb-3">
          Configura tu perfil para ver el progreso hacia tus metas.
        </p>
      )}

      <div className="space-y-3">
        {macroProgress.map((macro) => (
          <div key={macro.name}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{macro.name}</span>
              <span className={macro.isOverLimit ? 'text-red-600 font-medium' : 'text-gray-900'}>
                {macro.current}
                {hasTargets && macro.target > 0 && ` / ${macro.target}`}
                {' '}{macro.unit}
              </span>
            </div>
            {hasTargets && macro.target > 0 && (
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getColorClasses(
                    macro.color,
                    macro.isOverLimit
                  )}`}
                  style={{ width: `${Math.min(macro.percentage, 100)}%` }}
                  role="progressbar"
                  aria-valuenow={macro.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {showDetails && hasTargets && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Restante del día:</span>
            <span className="font-medium text-gray-900">
              {Math.max(0, (profile?.daily_calorie_target || 0) - cartNutrition.calories)} kcal
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for cart drawer
 */
export function MacroCalculatorCompact() {
  const cartNutrition = useOnlineCartStore((state) => state.nutrition());
  const profile = useCustomerProfileStore((state) => state.profile);

  if (cartNutrition.calories === 0) return null;

  const isOverCalories =
    profile?.daily_calorie_target &&
    cartNutrition.calories > profile.daily_calorie_target;

  return (
    <div
      className={`flex items-center gap-4 p-2 rounded text-sm ${
        isOverCalories ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'
      }`}
    >
      <span>🔥 {Math.round(cartNutrition.calories)} kcal</span>
      <span className="text-green-600">🥩 {Math.round(cartNutrition.protein)}g</span>
      <span className="text-blue-600">🍞 {Math.round(cartNutrition.carbs)}g</span>
      <span className="text-orange-600">🥑 {Math.round(cartNutrition.fat)}g</span>
    </div>
  );
}

export default MacroCalculator;
