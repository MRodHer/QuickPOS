/**
 * SPEC-SAAS-001: React Query Hooks for Store-Aware Data Fetching
 *
 * These hooks automatically filter queries by store_id
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useCurrentStore } from '../../contexts/StoreContext';
import type { Database } from '../../types/database';

/**
 * Helper to create store-aware query options
 */
function useStoreQuery<T>(
  tableName: keyof Database['public']['Tables'],
  options?: Omit<UseQueryOptions<T[], Error>, 'queryKey' | 'queryFn'>
) {
  const store = useCurrentStore();

  return useQuery<T[], Error>({
    ...options,
    queryKey: [tableName, 'store', store?.id],
    queryFn: async () => {
      if (!store?.id) {
        throw new Error('No store selected');
      }

      const { data, error } = await supabase
        .from(tableName as string)
        .select('*')
        .eq('store_id', store.id);

      if (error) {
        throw error;
      }

      return data as T[];
    },
    enabled: !!store?.id && (options?.enabled !== false),
  });
}

/**
 * Helper to create store-aware mutation
 */
function useStoreMutation<T, V>(
  tableName: keyof Database['public']['Tables'],
  mutationType: 'insert' | 'update' | 'delete'
) {
  const queryClient = useQueryClient();
  const store = useCurrentStore();

  return useMutation<T, Error, V>({
    mutationFn: async (variables: V) => {
      if (!store?.id) {
        throw new Error('No store selected');
      }

      let query;

      switch (mutationType) {
        case 'insert':
          query = supabase
            .from(tableName as string)
            .insert({ ...(variables as any), store_id: store.id });
          break;
        case 'update':
          query = supabase
            .from(tableName as string)
            .update({ ...(variables as any), store_id: store.id });
          break;
        case 'delete':
          query = supabase
            .from(tableName as string)
            .delete();
          break;
        default:
          throw new Error(`Invalid mutation type: ${mutationType}`);
      }

      const { data, error } = await query.select();

      if (error) {
        throw error;
      }

      return data as T;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName, 'store', store?.id] });
    },
  });
}

/**
 * Hook to fetch flocks for current store
 */
export function useStoreFlocks() {
  return useStoreQuery<any>('flocks');
}

/**
 * Hook to fetch daily production for current store
 */
export function useStoreProduction() {
  return useStoreQuery<any>('daily_production');
}

/**
 * Hook to fetch inventory items for current store
 */
export function useStoreInventoryItems() {
  return useStoreQuery<any>('inventory_items');
}

/**
 * Hook to fetch inventory categories for current store
 */
export function useStoreInventoryCategories() {
  return useStoreQuery<any>('inventory_categories');
}

/**
 * Hook to fetch chart of accounts for current store
 */
export function useStoreChartOfAccounts() {
  return useStoreQuery<any>('chart_of_accounts');
}

/**
 * Hook to fetch journal entries for current store
 */
export function useStoreJournalEntries() {
  return useStoreQuery<any>('journal_entries');
}

/**
 * Hook to fetch accounting periods for current store
 */
export function useStoreAccountingPeriods() {
  return useStoreQuery<any>('accounting_periods');
}

/**
 * Hook to fetch mortality records for current store
 */
export function useStoreMortalityRecords() {
  return useStoreQuery<any>('mortality_records');
}

/**
 * Hook to fetch feed consumption for current store
 */
export function useStoreFeedConsumption() {
  return useStoreQuery<any>('feed_consumption');
}

/**
 * Hook to fetch weight samples for current store
 */
export function useStoreWeightSamples() {
  return useStoreQuery<any>('weight_samples');
}

/**
 * Hook to fetch inventory batches for current store
 */
export function useStoreInventoryBatches() {
  return useStoreQuery<any>('inventory_batches');
}

/**
 * Hook to fetch inventory movements for current store
 */
export function useStoreInventoryMovements() {
  return useStoreQuery<any>('inventory_movements');
}

/**
 * Hook to fetch inventory alerts for current store
 */
export function useStoreInventoryAlerts() {
  return useStoreQuery<any>('inventory_alerts');
}

/**
 * Hook to fetch journal entry lines for current store
 */
export function useStoreJournalEntryLines() {
  return useStoreQuery<any>('journal_entry_lines');
}

/**
 * Generic hook for store-aware queries with custom select
 */
export function useStoreQueryCustom<T>(
  tableName: string,
  select?: string,
  options?: Omit<UseQueryOptions<T[], Error>, 'queryKey' | 'queryFn'>
) {
  const store = useCurrentStore();

  return useQuery<T[], Error>({
    ...options,
    queryKey: [tableName, 'store', store?.id, select],
    queryFn: async () => {
      if (!store?.id) {
        throw new Error('No store selected');
      }

      const { data, error } = await supabase
        .from(tableName)
        .select(select || '*')
        .eq('store_id', store.id);

      if (error) {
        throw error;
      }

      return data as T[];
    },
    enabled: !!store?.id && (options?.enabled !== false),
  });
}

/**
 * Generic hook for store-aware queries with complex filters
 */
export function useStoreQueryWithFilters<T>(
  tableName: string,
  filters: Record<string, any>,
  options?: Omit<UseQueryOptions<T[], Error>, 'queryKey' | 'queryFn'>
) {
  const store = useCurrentStore();

  return useQuery<T[], Error>({
    ...options,
    queryKey: [tableName, 'store', store?.id, filters],
    queryFn: async () => {
      if (!store?.id) {
        throw new Error('No store selected');
      }

      let query = supabase
        .from(tableName)
        .select('*')
        .eq('store_id', store.id);

      // Apply additional filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data as T[];
    },
    enabled: !!store?.id && (options?.enabled !== false),
  });
}

/**
 * Hook to create a flock in current store
 */
export function useCreateFlock() {
  return useStoreMutation<any, any>('flocks', 'insert');
}

/**
 * Hook to update a flock in current store
 */
export function useUpdateFlock() {
  return useStoreMutation<any, any>('flocks', 'update');
}

/**
 * Hook to create a journal entry in current store
 */
export function useCreateJournalEntry() {
  return useStoreMutation<any, any>('journal_entries', 'insert');
}

/**
 * Hook to update a journal entry in current store
 */
export function useUpdateJournalEntry() {
  return useStoreMutation<any, any>('journal_entries', 'update');
}

/**
 * Hook to create an inventory item in current store
 */
export function useCreateInventoryItem() {
  return useStoreMutation<any, any>('inventory_items', 'insert');
}

/**
 * Hook to update an inventory item in current store
 */
export function useUpdateInventoryItem() {
  return useStoreMutation<any, any>('inventory_items', 'update');
}

/**
 * Hook to create an account in chart of accounts for current store
 */
export function useCreateAccount() {
  return useStoreMutation<any, any>('chart_of_accounts', 'insert');
}

/**
 * Hook to update an account in chart of accounts for current store
 */
export function useUpdateAccount() {
  return useStoreMutation<any, any>('chart_of_accounts', 'update');
}
