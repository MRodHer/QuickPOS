/**
 * SPEC-POS-001: Online Orders System - ProductCard Component
 *
 * Product card for displaying menu items with nutrition information
 * Supports quick add to cart and detailed view
 */

import { useState } from 'react';
import { Plus, Info } from 'lucide-react';
import type { MenuItem, NutritionDisplay, Allergen, DietaryPreference } from '@/types/online-orders';
import { useCartActions } from '@/stores/onlineCartStore';

interface ProductCardProps {
  product: MenuItem;
  onNutritionClick?: (product: MenuItem) => void;
}

const allergenIcons: Record<Allergen, string> = {
  gluten: '🌾',
  dairy: '🥛',
  nuts: '🥜',
  eggs: '🥚',
  soy: '🫘',
  shellfish: '🦐',
  fish: '🐟',
};

const dietaryIcons: Record<DietaryPreference, string> = {
  vegan: '🌱',
  vegetarian: '🥬',
  keto: '🥑',
  paleo: '🍖',
  gluten_free: '🌾',
  dairy_free: '🥛',
  low_sodium: '🧂',
  sugar_free: '🚫',
};

/**
 * Format nutrition display for card
 */
function formatNutritionCard(nutrition: NutritionDisplay | null) {
  if (!nutrition) return null;

  return {
    calories: nutrition.calories,
    protein: nutrition.protein,
  };
}

/**
 * Product card component with nutrition info
 */
export function ProductCard({ product, onNutritionClick }: ProductCardProps) {
  const { addItem } = useCartActions();
  const [isAdding, setIsAdding] = useState(false);

  const nutrition = formatNutritionCard(product.nutrition);
  const imageUrl = product.image_url || '/placeholder-food.jpg';

  const handleAddToCart = () => {
    setIsAdding(true);
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      nutritionInfo: product.nutrition || undefined,
      imageUrl: product.image_url || undefined,
      allergens: product.allergens,
      dietaryTags: product.dietary_tags,
    });

    // Reset button state after animation
    setTimeout(() => setIsAdding(false), 500);
  };

  const handleNutritionClick = () => {
    onNutritionClick?.(product);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Product Image */}
      <div className="relative aspect-square bg-gray-100">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Quick info badges */}
        {nutrition && (
          <div className="absolute top-2 right-2 flex gap-1">
            <span className="bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-medium">
              {nutrition.calories} kcal
            </span>
          </div>
        )}
        {/* Out of stock indicator */}
        {!product.is_available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-900 px-3 py-1 rounded font-medium">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-1">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-gray-500 text-xs sm:text-sm mt-1 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          {product.dietary_tags?.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs"
              title={tag}
              aria-label={tag}
            >
              {dietaryIcons[tag]}
            </span>
          ))}
          {product.allergens?.slice(0, 2).map((allergen) => (
            <span
              key={allergen}
              className="text-xs"
              title={allergen}
              aria-label={allergen}
            >
              {allergenIcons[allergen]}
            </span>
          ))}
        </div>

        {/* Nutrition info (protein badge) */}
        {nutrition && nutrition.protein >= 20 && (
          <div className="mt-2">
            <span className="inline-flex items-center text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">
              💪 {nutrition.protein}g proteína
            </span>
          </div>
        )}

        {/* Price and Actions */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">
            ${product.price.toFixed(2)}
          </span>

          <div className="flex gap-2">
            {/* Nutrition info button */}
            {product.nutrition && (
              <button
                type="button"
                onClick={handleNutritionClick}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Ver información nutricional"
              >
                <Info className="w-5 h-5" />
              </button>
            )}

            {/* Add to cart button */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!product.is_available || isAdding}
              className={`p-2 rounded-full transition-colors ${
                !product.is_available
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : isAdding
                  ? 'bg-green-100 text-green-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              aria-label="Agregar al carrito"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Product card compact variant for list views
 */
export function ProductCardCompact({ product, onNutritionClick }: ProductCardProps) {
  const { addItem } = useCartActions();
  const [isAdding, setIsAdding] = useState(false);

  const nutrition = formatNutritionCard(product.nutrition);

  const handleAddToCart = () => {
    setIsAdding(true);
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      nutritionInfo: product.nutrition || undefined,
      imageUrl: product.image_url || undefined,
      allergens: product.allergens,
      dietaryTags: product.dietary_tags,
    });
    setTimeout(() => setIsAdding(false), 500);
  };

  return (
    <div className="flex gap-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
        <img
          src={product.image_url || '/placeholder-food.jpg'}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-gray-500 text-xs line-clamp-1 mt-0.5">
            {product.description}
          </p>
        )}

        {/* Nutrition summary */}
        {nutrition && (
          <div className="flex gap-2 mt-1 text-xs text-gray-600">
            <span>{nutrition.calories} kcal</span>
            {nutrition.protein >= 20 && (
              <span className="text-green-600">💪 {nutrition.protein}g</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-gray-900">
            ${product.price.toFixed(2)}
          </span>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!product.is_available || isAdding}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              !product.is_available
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : isAdding
                ? 'bg-green-100 text-green-600'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isAdding ? 'Agregado' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}
