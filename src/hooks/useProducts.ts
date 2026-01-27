import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../contexts/TenantContext';
import type { Database } from '../lib/supabase';

type Product = Database['public']['Tables']['products']['Row'];

export function useProducts(searchQuery: string = '', categoryId: string | null = null) {
  const { currentBusiness } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentBusiness) return;

    const searchProducts = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('products')
          .select('*')
          .eq('business_id', currentBusiness.id)
          .eq('is_active', true);

        if (searchQuery) {
          const trimmed = searchQuery.trim();
          query = query.or(
            `name.ilike.%${trimmed}%,sku.eq.${trimmed},barcode.eq.${trimmed}`
          );
        }

        if (categoryId) {
          query = query.eq('category_id', categoryId);
        }

        query = query.limit(20).order('name');

        const { data, error } = await query;

        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error('Error searching products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      searchProducts();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, categoryId, currentBusiness]);

  return { products, loading };
}
