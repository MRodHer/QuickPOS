/**
 * SPEC-SAAS-001: Multistore Architecture - Type Definitions
 *
 * Types for store entities and multistore operations
 */

/**
 * Store status values
 */
export type StoreStatus = 'provisioning' | 'active' | 'suspended' | 'deleted';

/**
 * Subscription tier levels
 */
export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';

/**
 * Subscription status values
 */
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'unpaid';

/**
 * Role of a user within a specific store
 */
export type StoreRole = 'store_admin' | 'store_manager' | 'store_user';

/**
 * Store entity
 */
export interface Store {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;

  // Status
  status: StoreStatus;

  // Branding
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  locale: string;
  timezone: string;
  currency: string;

  // Company Information
  company_name: string | null;
  company_rfc: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_email: string | null;

  // Module Configuration
  enabled_modules: string[];

  // Settings and Metadata
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;

  // Subscription
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  subscription_max_users: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Store user membership (pivot table)
 */
export interface StoreUser {
  id: string;
  store_id: string;
  user_id: string;
  role: StoreRole;
  is_active: boolean;
  invited_by: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations
  store?: Store;
  user?: {
    id: string;
    email: string;
    full_name: string;
  };
}

/**
 * User's store membership with role info
 */
export interface UserStoreMembership {
  store_id: string;
  store_name: string;
  store_slug: string;
  role: StoreRole;
  is_active: boolean;
  logo_url: string | null;
  primary_color: string;
}

/**
 * Context value for StoreContext
 */
export interface StoreContextValue {
  // Current store
  store: Store | null;
  isLoading: boolean;
  error: Error | null;

  // User's membership in current store
  membership: StoreUser | null;

  // All stores the user has access to
  userStores: UserStoreMembership[];

  // Actions
  switchStore: (storeId: string) => Promise<void>;
  refreshStore: () => Promise<void>;

  // Super admin impersonation
  isImpersonating: boolean;
  startImpersonation: (storeId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

/**
 * Subdomain detection result
 */
export interface SubdomainInfo {
  subdomain: string | null;
  isCustomDomain: boolean;
  isMainDomain: boolean;
  baseUrl: string;
}

/**
 * Store configuration for frontend
 */
export interface StoreConfig {
  storeId: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  locale: string;
  timezone: string;
  currency: string;
  enabledModules: string[];
}

/**
 * Request for creating a new store
 */
export interface CreateStoreRequest {
  name: string;
  slug: string;
  company_name?: string;
  company_rfc?: string;
  company_email?: string;
  primary_color?: string;
  locale?: string;
  timezone?: string;
}

/**
 * Request for updating store
 */
export interface UpdateStoreRequest {
  name?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  locale?: string;
  timezone?: string;
  currency?: string;
  company_name?: string;
  company_rfc?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  enabled_modules?: string[];
  settings?: Record<string, unknown>;
}

/**
 * Request for inviting user to store
 */
export interface InviteUserRequest {
  email: string;
  role: StoreRole;
  store_id: string;
}

/**
 * JWT claims extension for store context
 */
export interface StoreJwtClaims {
  store_id?: string;
  impersonating_store_id?: string;
  is_super_admin?: boolean;
}

/**
 * Database types extension for store_id
 * This extends the Database type to include store_id
 */
export interface WithStoreId {
  store_id: string;
}

/**
 * Query options with store filtering
 */
export interface StoreQueryOptions {
  storeId?: string;
  includeDeleted?: boolean;
}

/**
 * Audit log entry for store access
 */
export interface StoreAccessLog {
  id: string;
  user_id: string;
  store_id: string;
  access_type: 'login' | 'switch' | 'impersonation_start' | 'impersonation_end';
  previous_store_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
