/**
 * SPEC-SAAS-001: Store API Functions
 *
 * API functions for store operations
 */

import { supabase } from '../../lib/supabase';
import type {
  Store,
  StoreUser,
  UserStoreMembership,
  CreateStoreRequest,
  UpdateStoreRequest,
} from '../../types/store';

/**
 * Get store by slug (subdomain)
 */
export async function getStoreBySlug(slug: string | null): Promise<Store | null> {
  if (!slug) {
    // Return default store for main domain
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('slug', 'default')
      .single();

    if (error) {
      console.error('Error fetching default store:', error);
      return null;
    }

    return data;
  }

  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (error) {
    console.error('Error fetching store by slug:', error);
    return null;
  }

  return data;
}

/**
 * Get store by custom domain
 */
export async function getStoreByCustomDomain(domain: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('custom_domain', domain)
    .eq('status', 'active')
    .single();

  if (error) {
    console.error('Error fetching store by custom domain:', error);
    return null;
  }

  return data;
}

/**
 * Get store by ID
 */
export async function getStoreById(storeId: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .single();

  if (error) {
    console.error('Error fetching store by ID:', error);
    return null;
  }

  return data;
}

/**
 * Get all stores for current user
 */
export async function getUserStores(): Promise<UserStoreMembership[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('store_users')
    .select(`
      store_id,
      role,
      is_active,
      stores (
        id,
        name,
        slug,
        logo_url,
        primary_color
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching user stores:', error);
    return [];
  }

  return (data || []).map((tu: any) => ({
    store_id: tu.store_id,
    store_name: tu.stores.name,
    store_slug: tu.stores.slug,
    role: tu.role,
    is_active: tu.is_active,
    logo_url: tu.stores.logo_url,
    primary_color: tu.stores.primary_color,
  }));
}

/**
 * Get user membership in specific store
 */
export async function getStoreMembership(
  storeId: string,
  userId: string
): Promise<StoreUser | null> {
  const { data, error } = await supabase
    .from('store_users')
    .select('*')
    .eq('store_id', storeId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching store membership:', error);
    return null;
  }

  return data;
}

/**
 * Create a new store
 */
export async function createStore(
  request: CreateStoreRequest
): Promise<{ success: boolean; store?: Store; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Usuario no autenticado' };
  }

  // Check slug availability
  const { data: existing } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', request.slug)
    .single();

  if (existing) {
    return { success: false, error: 'El slug ya está en uso' };
  }

  // Create store
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .insert({
      name: request.name,
      slug: request.slug,
      company_name: request.company_name || request.name,
      company_rfc: request.company_rfc,
      company_email: request.company_email,
      primary_color: request.primary_color || '#16a34a',
      locale: request.locale || 'es-MX',
      timezone: request.timezone || 'America/Mexico_City',
      status: 'active',
    })
    .select()
    .single();

  if (storeError) {
    return { success: false, error: storeError.message };
  }

  // Add user as store admin
  const { error: membershipError } = await supabase
    .from('store_users')
    .insert({
      store_id: store.id,
      user_id: user.id,
      role: 'store_admin',
      is_active: true,
    });

  if (membershipError) {
    console.error('Error creating store membership:', membershipError);
  }

  return { success: true, store };
}

/**
 * Update store
 */
export async function updateStore(
  storeId: string,
  updates: UpdateStoreRequest
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('stores')
    .update(updates)
    .eq('id', storeId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Invite user to store
 */
export async function inviteUserToStore(
  storeId: string,
  email: string,
  role: 'store_admin' | 'store_manager' | 'store_user'
): Promise<{ success: boolean; error?: string }> {
  // This would typically trigger an email invitation flow
  // For now, we'll create the store_users record directly
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Usuario no autenticado' };
  }

  // Check if user exists
  const { data: existingUser } = await supabase.auth.admin.listUsers();
  const targetUser = existingUser.users.find((u) => u.email === email);

  if (!targetUser) {
    return { success: false, error: 'Usuario no encontrado' };
  }

  const { error } = await supabase
    .from('store_users')
    .insert({
      store_id: storeId,
      user_id: targetUser.id,
      role,
      is_active: true,
      invited_by: user.id,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Remove user from store
 */
export async function removeUserFromStore(
  storeId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('store_users')
    .update({ is_active: false })
    .eq('store_id', storeId)
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update user role in store
 */
export async function updateUserStoreRole(
  storeId: string,
  userId: string,
  role: 'store_admin' | 'store_manager' | 'store_user'
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('store_users')
    .update({ role })
    .eq('store_id', storeId)
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Validate custom domain availability
 */
export async function validateCustomDomain(domain: string): Promise<{
  available: boolean;
  error?: string;
}> {
  // Check domain format
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
  if (!domainRegex.test(domain)) {
    return { available: false, error: 'Formato de dominio inválido' };
  }

  // Check if already in use
  const { data: existing } = await supabase
    .from('stores')
    .select('id')
    .eq('custom_domain', domain)
    .single();

  if (existing) {
    return { available: false, error: 'El dominio ya está en uso' };
  }

  return { available: true };
}

/**
 * Set custom domain for store
 */
export async function setStoreCustomDomain(
  storeId: string,
  domain: string
): Promise<{ success: boolean; error?: string }> {
  const validation = await validateCustomDomain(domain);

  if (!validation.available) {
    return { success: false, error: validation.error };
  }

  const { error } = await supabase
    .from('stores')
    .update({ custom_domain: domain })
    .eq('id', storeId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Log store access for audit
 */
export async function logStoreAccess(
  storeId: string,
  accessType: 'login' | 'switch' | 'impersonation_start' | 'impersonation_end',
  previousStoreId: string | null = null
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  // This would typically go to a dedicated audit log table
  // For now, we'll use a simpler approach
  console.log('[Store Access Log]', {
    user_id: user.id,
    store_id: storeId,
    access_type: accessType,
    previous_store_id: previousStoreId,
    timestamp: new Date().toISOString(),
  });
}
