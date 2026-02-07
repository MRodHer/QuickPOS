/**
 * SPEC-POS-001 Phase 3: Favorite Button Component
 *
 * Button to add/remove products from favorites
 * Only visible for authenticated users with profiles.
 */

import { useState, useCallback } from 'react';
import { useCustomerProfileStore } from '@/stores/customerProfileStore';

interface FavoriteButtonProps {
  productId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export function FavoriteButton({
  productId,
  size = 'md',
  className = '',
  showLabel = false,
}: FavoriteButtonProps) {
  const profile = useCustomerProfileStore((state) => state.profile);
  const isFavorite = useCustomerProfileStore((state) => state.isFavorite(productId));
  const addFavorite = useCustomerProfileStore((state) => state.addFavorite);
  const removeFavorite = useCustomerProfileStore((state) => state.removeFavorite);

  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Don't show for guests
  if (!profile) return null;

  const handleToggle = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setIsAnimating(true);

    try {
      if (isFavorite) {
        await removeFavorite(productId);
      } else {
        await addFavorite(productId);
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [isLoading, isFavorite, productId, addFavorite, removeFavorite]);

  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-8 h-8 text-base',
    lg: 'w-10 h-10 text-lg',
  };

  const iconSize = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`
        ${showLabel ? 'flex items-center gap-2 px-3 py-1.5' : sizeClasses[size]}
        rounded-full
        transition-all duration-200
        ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
        ${
          isFavorite
            ? 'bg-red-50 hover:bg-red-100'
            : 'bg-gray-50 hover:bg-gray-100'
        }
        ${className}
      `}
      aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      aria-pressed={isFavorite}
    >
      <span
        className={`
          ${iconSize[size]}
          ${isAnimating ? 'animate-ping-once' : ''}
          ${isFavorite ? 'text-red-500' : 'text-gray-400'}
          transition-colors duration-200
        `}
      >
        {isFavorite ? '❤️' : '🤍'}
      </span>
      {showLabel && (
        <span
          className={`text-sm ${isFavorite ? 'text-red-600' : 'text-gray-600'}`}
        >
          {isFavorite ? 'Favorito' : 'Agregar'}
        </span>
      )}
    </button>
  );
}

/**
 * Favorites count badge for profile/header
 */
export function FavoritesCount() {
  const profile = useCustomerProfileStore((state) => state.profile);
  const count = profile?.favorite_products?.length || 0;

  if (!profile || count === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-sm">
      <span>❤️</span>
      <span>{count}</span>
    </span>
  );
}

export default FavoriteButton;
