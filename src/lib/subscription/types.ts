/**
 * SPEC-SAAS-003: QuickPOS Subscription Types
 *
 * Type definitions for subscription and billing system
 */

/**
 * QuickPOS subscription plans
 */
export type QuickPOSPlan = 'free' | 'basic' | 'pro' | 'enterprise';

/**
 * Subscription status
 */
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';

/**
 * Billing cycle
 */
export type BillingCycle = 'monthly' | 'yearly';

/**
 * Payment method types
 */
export type PaymentMethodType = 'card' | 'bank_account' | 'sepa_debit';

/**
 * Invoice status
 */
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

/**
 * QuickPOS plan configuration
 */
export interface QuickPOSPlanConfig {
  id: QuickPOSPlan;
  name: string;
  description: string;
  
  // Pricing
  price: {
    monthly: number;
    yearly: number;
  };
  currency: string;
  
  // Limits
  limits: {
    terminals: number; // -1 = unlimited
    products: number;
    users: number;
    stores: number;
  };
  
  // Features
  features: string[];
  
  // Stripe
  stripePriceIds?: {
    monthly?: string;
    yearly?: string;
  };
}

/**
 * Subscription entity
 */
export interface Subscription {
  id: string;
  store_id: string;
  plan_id: string;
  
  // Status
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  
  // Dates
  current_period_start: string;
  current_period_end: string;
  trial_start?: string;
  trial_end?: string;
  canceled_at?: string;
  
  // Cancellation
  cancel_at_period_end: boolean;
  
  // Payment
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  payment_method_id?: string;
  last_payment_date?: string;
  next_payment_date?: string;
  
  // Metadata
  metadata: Record<string, unknown>;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Relations
  plan?: SubscriptionPlan;
  store?: {
    id: string;
    name: string;
    slug: string;
  };
}

/**
 * Subscription plan from database
 */
export interface SubscriptionPlan {
  id: string;
  slug: QuickPOSPlan;
  name: string;
  description: string;
  
  price_monthly: number;
  price_yearly: number;
  currency: string;
  
  max_terminals: number;
  max_products: number;
  max_users: number;
  max_stores: number;
  
  is_active: boolean;
  is_public: boolean;
  
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  
  created_at: string;
  updated_at: string;
}

/**
 * Subscription feature
 */
export interface SubscriptionFeature {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  created_at: string;
  updated_at: string;
}

/**
 * Plan feature mapping
 */
export interface PlanFeature {
  id: string;
  plan_id: string;
  feature_id: string;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
}

/**
 * Payment method
 */
export interface PaymentMethod {
  id: string;
  store_id: string;
  
  type: PaymentMethodType;
  stripe_payment_method_id: string;
  
  // Card details
  card_last4?: string;
  card_brand?: string;
  card_exp_month?: number;
  card_exp_year?: number;
  
  // Bank details
  bank_name?: string;
  bank_last4?: string;
  
  is_default: boolean;
  
  created_at: string;
  updated_at: string;
}

/**
 * Invoice
 */
export interface Invoice {
  id: string;
  store_id: string;
  subscription_id: string;
  
  number: string;
  status: InvoiceStatus;
  
  amount: number;
  tax?: number;
  total: number;
  currency: string;
  
  period_start: string;
  period_end: string;
  due_date?: string;
  paid_at?: string;
  
  stripe_invoice_id?: string;
  stripe_invoice_url?: string;
  
  line_items: InvoiceLineItem[];
  
  created_at: string;
  updated_at: string;
}

/**
 * Invoice line item
 */
export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

/**
 * Usage metrics
 */
export interface SubscriptionUsage {
  terminals: {
    current: number;
    limit: number;
    percentage: number;
  };
  products: {
    current: number;
    limit: number;
    percentage: number;
  };
  users: {
    current: number;
    limit: number;
    percentage: number;
  };
  stores: {
    current: number;
    limit: number;
    percentage: number;
  };
}

/**
 * Subscription info with limits
 */
export interface SubscriptionInfo {
  plan_id: string;
  plan_slug: QuickPOSPlan;
  plan_name: string;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
  cancel_at_period_end: boolean;
  
  limits: {
    terminals: number;
    products: number;
    users: number;
    stores: number;
  };
  
  features: string[];
}

/**
 * QuickPOS plan configurations
 */
export const QUICKPOS_PLANS: Record<QuickPOSPlan, QuickPOSPlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Comienza gratis con QuickPOS',
    price: { monthly: 0, yearly: 0 },
    currency: 'MXN',
    limits: {
      terminals: 1,
      products: 100,
      users: 2,
      stores: 1,
    },
    features: [
      'dashboard',
      'pos',
      'products',
      'inventory',
      'customers',
      'suppliers',
      'sales',
      'cash_register',
      'reports',
      'employees',
    ],
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    description: 'Para pequeñas tiendas en crecimiento',
    price: { monthly: 499, yearly: 4990 },
    currency: 'MXN',
    limits: {
      terminals: 2,
      products: 500,
      users: 5,
      stores: 1,
    },
    features: [
      'dashboard',
      'pos',
      'products',
      'inventory',
      'customers',
      'suppliers',
      'sales',
      'purchases',
      'cash_register',
      'cash_movements',
      'reports',
      'employees',
      'clip_integration',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Para negocios con alto volumen de ventas',
    price: { monthly: 1299, yearly: 12990 },
    currency: 'MXN',
    limits: {
      terminals: 5,
      products: -1, // unlimited
      users: 20,
      stores: 3,
    },
    features: [
      'dashboard',
      'pos',
      'products',
      'inventory',
      'customers',
      'suppliers',
      'sales',
      'purchases',
      'cash_register',
      'cash_movements',
      'reports',
      'advanced_reports',
      'employees',
      'roles_permissions',
      'multi_store',
      'clip_integration',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Solución completa para cadenas y franquicias',
    price: { monthly: 2999, yearly: 29990 },
    currency: 'MXN',
    limits: {
      terminals: -1, // unlimited
      products: -1,
      users: -1,
      stores: -1,
    },
    features: [
      'dashboard',
      'pos',
      'products',
      'inventory',
      'customers',
      'suppliers',
      'sales',
      'purchases',
      'cash_register',
      'cash_movements',
      'reports',
      'advanced_reports',
      'employees',
      'roles_permissions',
      'multi_store',
      'api_access',
      'clip_integration',
      'priority_support',
      'onboarding',
    ],
  },
};

/**
 * Get plan by slug
 */
export function getPlanBySlug(slug: string): QuickPOSPlanConfig | undefined {
  return QUICKPOS_PLANS[slug as QuickPOSPlan];
}

/**
 * Get all plans
 */
export function getAllPlans(): QuickPOSPlanConfig[] {
  return Object.values(QUICKPOS_PLANS);
}

/**
 * Calculate price with discount
 */
export function calculateYearlyDiscount(monthlyPrice: number): number {
  const yearlyPrice = monthlyPrice * 12;
  return Math.round(yearlyPrice * 0.83); // 17% discount
}

/**
 * Format price
 */
export function formatPrice(amount: number, currency: string = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Check if plan has feature
 */
export function planHasFeature(planSlug: QuickPOSPlan, featureKey: string): boolean {
  const plan = QUICKPOS_PLANS[planSlug];
  return plan?.features.includes(featureKey) ?? false;
}

/**
 * Get next plan in tier
 */
export function getNextPlan(currentPlan: QuickPOSPlan): QuickPOSPlan | null {
  const plans: QuickPOSPlan[] = ['free', 'basic', 'pro', 'enterprise'];
  const currentIndex = plans.indexOf(currentPlan);
  if (currentIndex === -1 || currentIndex === plans.length - 1) {
    return null;
  }
  return plans[currentIndex + 1];
}

/**
 * Get previous plan in tier
 */
export function getPreviousPlan(currentPlan: QuickPOSPlan): QuickPOSPlan | null {
  const plans: QuickPOSPlan[] = ['free', 'basic', 'pro', 'enterprise'];
  const currentIndex = plans.indexOf(currentPlan);
  if (currentIndex <= 0) {
    return null;
  }
  return plans[currentIndex - 1];
}

/**
 * Check if upgrade is possible
 */
export function canUpgrade(currentPlan: QuickPOSPlan, targetPlan: QuickPOSPlan): boolean {
  const plans: QuickPOSPlan[] = ['free', 'basic', 'pro', 'enterprise'];
  const currentIndex = plans.indexOf(currentPlan);
  const targetIndex = plans.indexOf(targetPlan);
  return targetIndex > currentIndex;
}

/**
 * Check if downgrade is possible
 */
export function canDowngrade(currentPlan: QuickPOSPlan, targetPlan: QuickPOSPlan): boolean {
  const plans: QuickPOSPlan[] = ['free', 'basic', 'pro', 'enterprise'];
  const currentIndex = plans.indexOf(currentPlan);
  const targetIndex = plans.indexOf(targetPlan);
  return targetIndex < currentIndex && targetIndex >= 0;
}
