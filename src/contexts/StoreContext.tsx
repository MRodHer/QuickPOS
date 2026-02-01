/**
 * SPEC-SAAS-001: StoreContext Provider
 *
 * React Context for managing store state across the application
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Store,
  StoreUser,
  UserStoreMembership,
  StoreContextValue,
} from '../types/store';
import { supabase } from '../lib/supabase';
import {
  getStoreBySlug,
  getStoreByCustomDomain,
  getUserStores,
  getStoreMembership,
  setCurrentStore,
  impersonateStore,
  stopImpersonation as stopImpersonationApi,
  logStoreAccess,
} from '../lib/store/api';
import { isImpersonating, refreshStoreSession } from '../lib/store/supabase';
import { getStoreSlug, isCustomDomain } from '../lib/store/subdomain';

// Query keys
export const storeKeys = {
  all: ['store'] as const,
  current: () => [...storeKeys.all, 'current'] as const,
  bySlug: (slug: string | null) => [...storeKeys.all, 'slug', slug] as const,
  userStores: () => [...storeKeys.all, 'user'] as const,
  membership: (storeId: string) => [...storeKeys.all, 'membership', storeId] as const,
};

const StoreContext = createContext<StoreContextValue | null>(null);

interface StoreProviderProps {
  children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);
  const [isImpersonatingValue, setIsImpersonatingValue] = useState(false);

  // Get store slug from subdomain
  const storeSlug = getStoreSlug();
  const isCustomDomainValue = isCustomDomain();

  // Fetch current store
  const {
    data: store,
    isLoading: storeLoading,
    refetch: refetchStore,
  } = useQuery({
    queryKey: storeKeys.bySlug(storeSlug),
    queryFn: async () => {
      if (isCustomDomainValue) {
        // For custom domains, we need to resolve via API
        const domain = window.location.hostname;
        return await getStoreByCustomDomain(domain);
      }
      return await getStoreBySlug(storeSlug);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  // Fetch user's stores
  const {
    data: userStores = [],
    isLoading: storesLoading,
  } = useQuery({
    queryKey: storeKeys.userStores(),
    queryFn: getUserStores,
    staleTime: 1000 * 60 * 5,
    enabled: !!store, // Only fetch after store is loaded
  });

  // Fetch current user's membership in store
  const {
    data: membership,
  } = useQuery({
    queryKey: storeKeys.membership(store?.id || ''),
    queryFn: async () => {
      if (!store) return null;

      // Get current user ID from auth
      const { data } = await supabase.auth.getUser();
      if (!data.user) return null;

      return await getStoreMembership(store.id, data.user.id);
    },
    enabled: !!store,
    staleTime: 1000 * 60 * 5,
  });

  // Check impersonation status
  useEffect(() => {
    const checkImpersonation = async () => {
      const impersonating = await isImpersonating();
      setIsImpersonatingValue(impersonating);
    };

    checkImpersonation();
  }, []);

  // Switch store action
  const switchStore = useCallback(async (storeId: string) => {
    try {
      const previousStoreId = store?.id || null;

      // Log the store switch
      await logStoreAccess(storeId, 'switch', previousStoreId);

      // Update current store in auth
      await setCurrentStore(storeId);

      // Refresh session to pick up changes
      await refreshStoreSession();

      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: storeKeys.all() });

      // If switching to a different store, redirect to that subdomain
      const targetStore = userStores.find((t) => t.store_id === storeId);
      if (targetStore && targetStore.store_slug !== storeSlug) {
        const protocol = window.location.protocol;
        const port = window.location.port ? `:${window.location.port}` : '';
        const newUrl = `${protocol}//${targetStore.store_slug}.${import.meta.env.VITE_MAIN_DOMAIN || 'avierp.com'}${port}`;
        window.location.href = newUrl;
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [store, storeSlug, userStores, queryClient]);

  // Refresh store action
  const refreshStore = useCallback(async () => {
    await refetchStore();
  }, [refetchStore]);

  // Start impersonation action (super admin only)
  const startImpersonation = useCallback(async (storeId: string) => {
    try {
      await impersonateStore(storeId);
      setIsImpersonatingValue(true);

      // Log impersonation start
      await logStoreAccess(storeId, 'impersonation_start', store?.id || null);

      // Refresh to pick up changes
      await refreshStoreSession();
      queryClient.invalidateQueries({ queryKey: storeKeys.all() });
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [store, queryClient]);

  // Stop impersonation action
  const stopImpersonation = useCallback(async () => {
    try {
      await stopImpersonationApi();
      setIsImpersonatingValue(false);

      // Log impersonation end
      if (store) {
        await logStoreAccess(store.id, 'impersonation_end', null);
      }

      // Refresh to pick up changes
      await refreshStoreSession();
      queryClient.invalidateQueries({ queryKey: storeKeys.all() });
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [store, queryClient]);

  // Context value
  const contextValue: StoreContextValue = {
    store: store || null,
    isLoading: storeLoading || storesLoading,
    error,
    membership: membership || null,
    userStores,
    switchStore,
    refreshStore,
    isImpersonating: isImpersonatingValue,
    startImpersonation,
    stopImpersonation,
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
}

/**
 * Hook to access store context
 * @throws Error if used outside StoreProvider
 */
export function useStore(): StoreContextValue {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }

  return context;
}

/**
 * Hook to access current store (shorthand)
 */
export function useCurrentStore(): Store | null {
  const { store } = useStore();
  return store;
}

/**
 * Hook to check if user has specific store role
 */
export function useStoreRole(): StoreUser['role'] | null {
  const { membership } = useStore();
  return membership?.role || null;
}

/**
 * Hook to check if user is store admin
 */
export function useIsStoreAdmin(): boolean {
  const role = useStoreRole();
  return role === 'store_admin';
}

/**
 * Hook to get store-specific enabled modules
 */
export function useStoreModules(): string[] {
  const { store } = useStore();
  return store?.enabled_modules || [];
}

/**
 * Hook to check if a specific module is enabled
 */
export function useIsModuleEnabled(moduleKey: string): boolean {
  const modules = useStoreModules();
  return modules.includes(moduleKey);
}
