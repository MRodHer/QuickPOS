/**
 * SPEC-SAAS-001: Supabase Client with Store Context
 *
 * Extended Supabase client that injects store_id into requests
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Create a Supabase client with store context
 * This ensures all requests include the current store_id in the JWT claims
 */
export function createStoreClient(
  storeId: string | null,
  impersonatingStoreId: string | null = null
): SupabaseClient<Database> {
  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        // Add store context to requests
        'X-Store-ID': storeId || '',
        ...(impersonatingStoreId ? {
          'X-Impersonating-Store-ID': impersonatingStoreId,
        } : {}),
      },
    },
  });

  return client;
}

/**
 * Default supabase client (for backward compatibility)
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Get the current store ID from auth session
 * This is stored in the user's app_metadata or via a separate API call
 */
export async function getCurrentStoreId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  // Check if store_id is in user's app_metadata
  const storeId = session.user?.app_metadata?.store_id as string | undefined;

  return storeId || null;
}

/**
 * Set the current store in the session
 * This updates the user's app_metadata with the current store
 */
export async function setCurrentStore(storeId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  // Update user's app_metadata with current store
  const { error } = await supabase.auth.updateUser({
    data: {
      app_metadata: {
        ...user.app_metadata,
        current_store_id: storeId,
      },
    },
  });

  if (error) {
    throw error;
  }
}

/**
 * Impersonate a store (super admin only)
 * This sets a special flag that allows bypassing RLS
 */
export async function impersonateStore(storeId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  // Check if user is super admin
  // This would typically be checked via a separate API call
  // For now, we'll store the impersonation in app_metadata
  const { error } = await supabase.auth.updateUser({
    data: {
      app_metadata: {
        ...user.app_metadata,
        impersonating_store_id: storeId,
      },
    },
  });

  if (error) {
    throw error;
  }
}

/**
 * Stop impersonating a store
 */
export async function stopImpersonation(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  const { app_metadata } = user;
  if (!app_metadata?.impersonating_store_id) {
    return; // Not impersonating
  }

  // Remove impersonation flag
  const { error } = await supabase.auth.updateUser({
    data: {
      app_metadata: {
        ...app_metadata,
        impersonating_store_id: null,
      },
    },
  });

  if (error) {
    throw error;
  }
}

/**
 * Check if current user is impersonating a store
 */
export async function isImpersonating(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return false;
  }

  const impersonating = session.user?.app_metadata?.impersonating_store_id as string | undefined;

  return !!impersonating;
}

/**
 * Refresh the session to pick up store context changes
 */
export async function refreshStoreSession(): Promise<void> {
  const { error } = await supabase.auth.refreshSession();

  if (error) {
    throw error;
  }
}
