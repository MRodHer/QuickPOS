/**
 * SPEC-POS-001: Online Orders System - useOnlineMenu Hook Tests
 *
 * RED Phase: Write tests for useOnlineMenu hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { supabase } from '@/lib/supabase';
import { useOnlineMenu, useMenuItem } from './useOnlineMenu';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: null,
            error: null,
          })),
          in: vi.fn(() => ({
            data: null,
            error: null,
          })),
          single: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
    })),
  },
}));

const mockSupabase = supabase as unknown as {
  from: vi.Mock;
};

describe('useOnlineMenu', () => {
  const mockBusinessId = 'business-123';

  const mockCategories = [
    {
      id: 'cat-1',
      business_id: mockBusinessId,
      name: 'Pre-Entreno',
      slug: 'pre-workout',
      category_type: 'pre_workout' as const,
      is_active: true,
      sort_order: 1,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: 'cat-2',
      business_id: mockBusinessId,
      name: 'Post-Entreno',
      slug: 'post-workout',
      category_type: 'post_workout' as const,
      is_active: true,
      sort_order: 2,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
  ];

  const mockProducts = [
    {
      id: 'prod-1',
      business_id: mockBusinessId,
      name: 'Protein Bowl',
      description: 'High protein bowl',
      price: 15.99,
      image_url: 'https://example.com/bowl.jpg',
      is_active: true,
      is_available_online: true,
      online_category_id: 'cat-2',
      allergens: ['dairy'],
      dietary_tags: ['gluten_free'],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty state when businessId is null', () => {
    const { result } = renderHook(() => useOnlineMenu(null));

    expect(result.current.categories).toEqual([]);
    expect(result.current.products).toEqual([]);
    expect(result.current.isLoadingCategories).toBe(false);
    expect(result.current.isLoadingProducts).toBe(false);
  });

  it('should be disabled when enabled is false', () => {
    const { result } = renderHook(() =>
      useOnlineMenu(mockBusinessId, { enabled: false, fetchOnMount: false })
    );

    expect(result.current.categories).toEqual([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('should not fetch on mount when fetchOnMount is false', () => {
    const { result } = renderHook(() =>
      useOnlineMenu(mockBusinessId, { fetchOnMount: false })
    );

    expect(result.current.categories).toEqual([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('should set active category filter', () => {
    const { result } = renderHook(() =>
      useOnlineMenu(mockBusinessId, { fetchOnMount: false })
    );

    act(() => {
      result.current.setCategory('pre_workout');
    });

    expect(result.current.activeCategory).toBe('pre_workout');
  });

  it('should set search query', () => {
    const { result } = renderHook(() =>
      useOnlineMenu(mockBusinessId, { fetchOnMount: false })
    );

    act(() => {
      result.current.setSearchQuery('Chicken Salad');
    });

    expect(result.current.searchQuery).toBe('chicken salad');
  });

  it('should clear category filter when set to null', () => {
    const { result } = renderHook(() =>
      useOnlineMenu(mockBusinessId, { fetchOnMount: false })
    );

    act(() => {
      result.current.setCategory('pre_workout');
      result.current.setCategory(null);
    });

    expect(result.current.activeCategory).toBeNull();
  });
});

describe('useMenuItem', () => {
  it('should return null when productId is null', () => {
    const { result } = renderHook(() => useMenuItem(null));

    expect(result.current.item).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should return null when productId is empty string', () => {
    const { result } = renderHook(() => useMenuItem(''));

    expect(result.current.item).toBeNull();
  });
});
