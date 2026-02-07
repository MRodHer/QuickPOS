/**
 * SPEC-POS-001 Phase 3: Favorite Button Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FavoriteButton, FavoritesCount } from './FavoriteButton';

const mockAddFavorite = vi.fn();
const mockRemoveFavorite = vi.fn();

vi.mock('@/stores/customerProfileStore', () => ({
  useCustomerProfileStore: vi.fn((selector) => {
    const state = {
      profile: {
        id: 'profile-1',
        favorite_products: ['prod-1', 'prod-2'],
      },
      isFavorite: (id: string) => ['prod-1', 'prod-2'].includes(id),
      addFavorite: mockAddFavorite,
      removeFavorite: mockRemoveFavorite,
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

describe('FavoriteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render heart icon for non-favorite product', () => {
      render(<FavoriteButton productId="prod-3" />);

      expect(screen.getByLabelText('Agregar a favoritos')).toBeInTheDocument();
    });

    it('should render filled heart for favorite product', () => {
      render(<FavoriteButton productId="prod-1" />);

      expect(screen.getByLabelText('Quitar de favoritos')).toBeInTheDocument();
    });

    it('should show label when showLabel is true', () => {
      render(<FavoriteButton productId="prod-1" showLabel />);

      expect(screen.getByText('Favorito')).toBeInTheDocument();
    });

    it('should show "Agregar" label for non-favorite with showLabel', () => {
      render(<FavoriteButton productId="prod-3" showLabel />);

      expect(screen.getByText('Agregar')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call addFavorite when clicking on non-favorite', async () => {
      const user = userEvent.setup();
      render(<FavoriteButton productId="prod-3" />);

      await user.click(screen.getByLabelText('Agregar a favoritos'));

      await waitFor(() => {
        expect(mockAddFavorite).toHaveBeenCalledWith('prod-3');
      });
    });

    it('should call removeFavorite when clicking on favorite', async () => {
      const user = userEvent.setup();
      render(<FavoriteButton productId="prod-1" />);

      await user.click(screen.getByLabelText('Quitar de favoritos'));

      await waitFor(() => {
        expect(mockRemoveFavorite).toHaveBeenCalledWith('prod-1');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have aria-pressed attribute', () => {
      render(<FavoriteButton productId="prod-1" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });
  });
});

describe('FavoritesCount', () => {
  it('should render count badge', () => {
    render(<FavoritesCount />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
