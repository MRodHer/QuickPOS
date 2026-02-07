/**
 * SPEC-POS-001: Online Orders System - NutritionInfo Component
 *
 * Detailed nutrition information modal/view for menu items
 * Shows macros, micros, and fitness scores
 */

import { X } from 'lucide-react';
import type { ProductNutritionInfo, MenuItem } from '@/types/online-orders';

interface NutritionInfoProps {
  product: MenuItem;
  onClose: () => void;
}

/**
 * Calculate daily value percentage for nutrition label
 */
function calculateDailyValue(amount: number, dailyValue: number): number {
  return Math.round((amount / dailyValue) * 100);
}

/**
 * Get color class for health score
 */
function getHealthScoreColor(score: number | null): string {
  if (!score) return 'bg-gray-100 text-gray-600';
  if (score >= 8) return 'bg-green-100 text-green-700';
  if (score >= 6) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

/**
 * Nutrition info modal component
 */
export function NutritionInfo({ product, onClose }: NutritionInfoProps) {
  const nutrition = product.nutrition;

  if (!nutrition) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Información Nutricional</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-gray-500">Información nutricional no disponible.</p>
      </div>
    );
  }

  const dailyValues = {
    calories: 2000,
    protein: 50,
    carbohydrates: 300,
    fat: 78,
    fiber: 28,
    sodium: 2300,
  };

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-md mx-auto max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Información Nutricional</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Product Info */}
      <div className="px-6 py-4 border-b">
        <h3 className="font-semibold text-gray-900">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-gray-500 mt-1">{product.description}</p>
        )}
      </div>

      {/* Serving Size */}
      {nutrition.serving_size && (
        <div className="px-6 py-3 border-b bg-gray-50">
          <p className="text-sm">
            <span className="font-medium">Tamaño de porción:</span> {nutrition.serving_size}
            {nutrition.servings_per_container && (
              <span className="ml-2">({nutrition.servings_per_container} porciones)</span>
            )}
          </p>
        </div>
      )}

      {/* Main Macros */}
      <div className="px-6 py-4 border-b">
        <div className="text-center mb-4">
          <span className="text-5xl font-bold text-gray-900">
            {nutrition.calories || 0}
          </span>
          <span className="text-gray-500 ml-1">calorías</span>
        </div>

        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">
              {nutrition.protein || 0}g
            </div>
            <div className="text-xs text-gray-500">Proteína</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">
              {nutrition.carbohydrates || 0}g
            </div>
            <div className="text-xs text-gray-500">Carbos</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">
              {nutrition.fat || 0}g
            </div>
            <div className="text-xs text-gray-500">Grasas</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">
              {nutrition.fiber || 0}g
            </div>
            <div className="text-xs text-gray-500">Fibra</div>
          </div>
        </div>
      </div>

      {/* Detailed Nutrition */}
      <div className="px-6 py-4 border-b">
        <h4 className="font-medium text-gray-900 mb-3">Desglose Nutricional</h4>

        <div className="space-y-2">
          {/* Protein */}
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Proteína</span>
            <div className="text-right">
              <span className="font-medium">{nutrition.protein || 0}g</span>
              {nutrition.protein && (
                <span className="text-gray-400 text-sm ml-2">
                  {calculateDailyValue(nutrition.protein, dailyValues.protein)}%
                </span>
              )}
            </div>
          </div>

          {/* Carbs */}
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Carbohidratos</span>
            <div className="text-right">
              <span className="font-medium">{nutrition.carbohydrates || 0}g</span>
              {nutrition.carbohydrates && (
                <span className="text-gray-400 text-sm ml-2">
                  {calculateDailyValue(nutrition.carbohydrates, dailyValues.carbohydrates)}%
                </span>
              )}
            </div>
          </div>

          {/* Fat */}
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Grasas</span>
            <div className="text-right">
              <span className="font-medium">{nutrition.fat || 0}g</span>
              {nutrition.fat && (
                <span className="text-gray-400 text-sm ml-2">
                  {calculateDailyValue(nutrition.fat, dailyValues.fat)}%
                </span>
              )}
            </div>
          </div>

          {/* Fiber */}
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Fibra</span>
            <div className="text-right">
              <span className="font-medium">{nutrition.fiber || 0}g</span>
              {nutrition.fiber && (
                <span className="text-gray-400 text-sm ml-2">
                  {calculateDailyValue(nutrition.fiber, dailyValues.fiber)}%
                </span>
              )}
            </div>
          </div>

          {/* Sugar */}
          {nutrition.sugar !== null && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Azúcar</span>
              <span className="font-medium">{nutrition.sugar}g</span>
            </div>
          )}

          {/* Sodium */}
          {nutrition.sodium !== null && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Sodio</span>
              <div className="text-right">
                <span className="font-medium">{nutrition.sodium}mg</span>
                <span className="text-gray-400 text-sm ml-2">
                  {calculateDailyValue(nutrition.sodium, dailyValues.sodium)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fitness Scores */}
      {(nutrition.protein_score || nutrition.health_score) && (
        <div className="px-6 py-4 border-b">
          <h4 className="font-medium text-gray-900 mb-3">Puntuaciones Fitness</h4>

          <div className="grid grid-cols-3 gap-3">
            {nutrition.protein_score && (
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {nutrition.protein_score}/10
                </div>
                <div className="text-xs text-gray-500">Proteína</div>
              </div>
            )}
            {nutrition.calorie_score && (
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {nutrition.calorie_score}/10
                </div>
                <div className="text-xs text-gray-500">Calorías</div>
              </div>
            )}
            {nutrition.health_score && (
              <div className="text-center">
                <div className={`text-2xl font-bold ${getHealthScoreColor(nutrition.health_score).split(' ')[1]}`}>
                  {nutrition.health_score}/10
                </div>
                <div className="text-xs text-gray-500">Salud</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Allergens & Dietary */}
      {(product.allergens?.length > 0 || product.dietary_tags?.length > 0) && (
        <div className="px-6 py-4">
          <h4 className="font-medium text-gray-900 mb-3">Información Adicional</h4>

          {product.allergens && product.allergens.length > 0 && (
            <div className="mb-3">
              <span className="text-sm text-gray-600 mr-2">Alérgenos:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {product.allergens.map((allergen) => (
                  <span
                    key={allergen}
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700"
                  >
                    Contiene {allergen}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.dietary_tags && product.dietary_tags.length > 0 && (
            <div>
              <span className="text-sm text-gray-600 mr-2">Etiquetas:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {product.dietary_tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700"
                  >
                    {tag.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
