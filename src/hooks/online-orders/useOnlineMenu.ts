/**
 * SPEC-POS-001: Online Orders System - useOnlineMenu Hook
 *
 * Custom hook for fetching menu data with categories and products
 * Uses simple state management instead of TanStack Query for MVP
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { MenuItem, MenuCategory, MenuFilters, ProductNutritionInfo } from '@/types/online-orders';

/**
 * Hook return type
 */
interface UseOnlineMenuResult {
  // Data
  categories: MenuCategory[];
  products: MenuItem[];
  nutritionInfo: Map<string, ProductNutritionInfo>;

  // Loading states
  isLoadingCategories: boolean;
  isLoadingProducts: boolean;
  error: string | null;

  // Current filter state
  activeCategory: MenuCategoryType | null;
  searchQuery: string;

  // Actions
  setCategory: (category: MenuCategoryType | null) => void;
  setSearchQuery: (query: string) => void;
  refetch: () => Promise<void>;
}

/**
 * Menu category type for filtering
 */
type MenuCategoryType = 'pre_workout' | 'post_workout' | 'balanced' | 'snacks' | 'drinks';

/**
 * Custom hook for fetching online menu with filters
 * Designed for guest access (public menu) and authenticated users
 *
 * @param businessId - The business ID to fetch menu for
 * @param options - Optional configuration
 */
export function useOnlineMenu(
  businessId: string | null,
  options?: {
    enabled?: boolean;
    fetchOnMount?: boolean;
  }
): UseOnlineMenuResult {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [nutritionInfo, setNutritionInfo] = useState<Map<string, ProductNutritionInfo>>(new Map());

  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<MenuCategoryType | null>(null);
  const [searchQuery, setSearchQueryState] = useState('');

  const enabled = options?.enabled !== false;
  const fetchOnMount = options?.fetchOnMount !== false;

  /**
   * Fetch menu categories
   */
  const fetchCategories = useCallback(async () => {
    if (!businessId || !enabled) return;

    setIsLoadingCategories(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;
      setCategories(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching categories';
      setError(message);
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  }, [businessId, enabled]);

  /**
   * Fetch products with nutrition info
   */
  const fetchProducts = useCallback(async () => {
    if (!businessId || !enabled) return;

    setIsLoadingProducts(true);
    setError(null);

    try {
      // Fetch products available online
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          is_active,
          online_category_id,
          allergens,
          dietary_tags
        `)
        .eq('business_id', businessId)
        .eq('is_available_online', true)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (productsError) throw productsError;

      // Fetch nutrition info for all products
      const productIds = productsData?.map((p) => p.id) || [];
      const nutritionMap = new Map<string, ProductNutritionInfo>();

      if (productIds.length > 0) {
        const { data: nutritionData, error: nutritionError } = await supabase
          .from('product_nutrition_info')
          .select('*')
          .eq('business_id', businessId)
          .in('product_id', productIds);

        if (!nutritionError && nutritionData) {
          nutritionData.forEach((n) => {
            nutritionMap.set(n.product_id, n);
          });
        }
      }

      setNutritionInfo(nutritionMap);

      // Combine products with nutrition info
      const menuItems: MenuItem[] = (productsData || []).map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        image_url: product.image_url,
        is_available: product.is_active,
        category_id: product.online_category_id,
        category_name: null, // Will be joined with categories
        nutrition: nutritionMap.get(product.id) || null,
        allergens: product.allergens || [],
        dietary_tags: product.dietary_tags || [],
      }));

      setProducts(menuItems);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching products';
      setError(message);
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [businessId, enabled]);

  /**
   * Refetch all menu data
   */
  const refetch = useCallback(async () => {
    await Promise.all([fetchCategories(), fetchProducts()]);
  }, [fetchCategories, fetchProducts]);

  /**
   * Set search query
   */
  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query.toLowerCase().trim());
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (fetchOnMount && businessId && enabled) {
      fetchCategories();
      fetchProducts();
    }
  }, [fetchOnMount, businessId, enabled, fetchCategories, fetchProducts]);

  // Filter products by category and search
  const filteredProducts = products.filter((product) => {
    // Category filter
    if (activeCategory) {
      const categoryMatch = categories.find((c) => c.category_type === activeCategory);
      if (!categoryMatch || product.category_id !== categoryMatch.id) {
        return false;
      }
    }

    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery;
      return (
        product.name.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.dietary_tags?.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    return true;
  });

  return {
    categories,
    products: filteredProducts,
    nutritionInfo,
    isLoadingCategories,
    isLoadingProducts,
    error,
    activeCategory,
    searchQuery,
    setCategory: setActiveCategory,
    setSearchQuery,
    refetch,
  };
}

/**
 * Hook to get a single menu item by ID
 */
export function useMenuItem(productId: string | null) {
  const [item, setItem] = useState<MenuItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setItem(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        image_url,
        is_active,
        online_category_id,
        allergens,
        dietary_tags
      `)
      .eq('id', productId)
      .eq('is_available_online', true)
      .single()
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message);
          setItem(null);
        } else if (data) {
          // Fetch nutrition info separately
          supabase
            .from('product_nutrition_info')
            .select('*')
            .eq('product_id', productId)
            .single()
            .then(({ data: nutritionData }) => {
              const menuItem: MenuItem = {
                id: data.id,
                name: data.name,
                description: data.description,
                price: data.price,
                image_url: data.image_url,
                is_available: data.is_active,
                category_id: data.online_category_id,
                category_name: null,
                nutrition: nutritionData,
                allergens: data.allergens || [],
                dietary_tags: data.dietary_tags || [],
              };
              setItem(menuItem);
            });
        }
        setIsLoading(false);
      });
  }, [productId]);

  return { item, isLoading, error };
}

export type { MenuCategoryType };
