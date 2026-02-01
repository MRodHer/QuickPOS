/**
 * SPEC-SAAS-003: Subscription Types
 *
 * Type definitions for subscription and billing system
 */

/**
 * Subscription plan types
 */
export type SubscriptionPlan = 'trial' | 'basic' | 'professional' | 'enterprise';

/**
 * Subscription status
 */
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';

/**
 * Billing cycle
 */
export type BillingCycle = 'monthly' | 'annual';

/**
 * Payment method types
 */
export type PaymentMethodType = 'card' | 'bank_account' | 'sepa_debit';

/**
 * Invoice status
 */
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

/**
 * Subscription plan configuration
 */
export interface PlanConfig {
  id: SubscriptionPlan;
  name: string;
  description: string;
  price: {
    monthly: number;
    annual: number;
  };
  currency: string;
  features: string[];
  limits: {
    users: number;
    flocks: number;
    storage: number; // in MB
    apiCalls: number; // per month
  };
  stripePriceId: {
    monthly?: string;
    annual?: string;
  };
}

/**
 * Subscription entity
 */
export interface Subscription {
  id: string;
  tenant_id: string;

  // Plan info
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;

  // Pricing
  amount: number;
  currency: string;

  // Dates
  current_period_start: string;
  current_period_end: string;
  trial_start?: string;
  trial_end?: string;
  canceled_at?: string;

  // Stripe integration
  stripe_subscription_id?: string;
  stripe_customer_id?: string;

  // Metadata
  cancel_at_period_end: boolean;
  collection_method: 'charge_automatically' | 'send_invoice';

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Payment method
 */
export interface PaymentMethod {
  id: string;
  tenant_id: string;
  type: PaymentMethodType;
  stripe_payment_method_id: string;

  // Card details (if card)
  card_last4?: string;
  card_brand?: string;
  card_exp_month?: number;
  card_exp_year?: number;

  // Bank details (if bank account)
  bank_name?: string;
  bank_last4?: string;

  // Default
  is_default: boolean;

  // Timestamps
  created_at: string;
}

/**
 * Invoice/Receipt
 */
export interface Invoice {
  id: string;
  tenant_id: string;
  subscription_id: string;

  // Invoice details
  number: string;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  tax?: number;
  total: number;

  // Dates
  period_start: string;
  period_end: string;
  due_date?: string;
  paid_at?: string;

  // Stripe
  stripe_invoice_id?: string;
  stripe_invoice_url?: string;

  // Timestamps
  created_at: string;
}

/**
 * Payment transaction
 */
export interface Payment {
  id: string;
  tenant_id: string;
  invoice_id?: string;

  // Payment details
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed';

  // Stripe
  stripe_payment_intent_id?: string;

  // Metadata
  description?: string;
  failure_reason?: string;

  // Timestamps
  created_at: string;
}

/**
 * Subscription usage metrics
 */
export interface SubscriptionUsage {
  tenant_id: string;
  period_start: string;
  period_end: string;

  // Current usage
  user_count: number;
  flock_count: number;
  storage_used: number; // in MB
  api_calls: number;

  // Limits
  limits: {
    users: number;
    flocks: number;
    storage: number;
    api_calls: number;
  };
}

/**
 * Plan comparison for UI
 */
export interface PlanComparison {
  plan: SubscriptionPlan;
  config: PlanConfig;
  current: boolean;
  canUpgrade: boolean;
  canDowngrade: boolean;
}

/**
 * Checkout session for new subscription
 */
export interface CheckoutSession {
  id: string;
  tenant_id: string;
  plan: SubscriptionPlan;
  billing_cycle: BillingCycle;

  // Stripe
  stripe_checkout_session_id: string;
  checkout_url: string;

  // Status
  status: 'pending' | 'completed' | 'expired';

  // Timestamps
  expires_at: string;
  created_at: string;
}

/**
 * Customer portal session
 */
export interface PortalSession {
  url: string;
  created_at: string;
}

/**
 * Subscription update request
 */
export interface UpdateSubscriptionRequest {
  plan?: SubscriptionPlan;
  billing_cycle?: BillingCycle;
  cancel_at_period_end?: boolean;
  quantity?: number;
}

/**
 * Proration calculation result
 */
export interface ProrationCalculation {
  currentPlan: SubscriptionPlan;
  newPlan: SubscriptionPlan;
  prorationDate: string;

  // Amounts
  remainingCredit: number;
  amountDue: number;
  total: number;

  // Breakdown
  unusedDays: number;
  daysInPeriod: number;
  creditPerDay: number;
}

/**
 * Feature access by plan
 */
export interface FeatureAccessMatrix {
  [plan: string]: {
    features: string[];
    limits: Record<string, number>;
  };
}

/**
 * Plan configuration constants
 */
export const PLAN_CONFIGS: Record<SubscriptionPlan, PlanConfig> = {
  trial: {
    id: 'trial',
    name: 'Trial',
    description: 'Try AviERP free for 14 days',
    price: { monthly: 0, annual: 0 },
    currency: 'MXN',
    features: [
      'dashboard',
      'production',
      'inventory',
      'basic_reports',
    ],
    limits: {
      users: 2,
      flocks: 2,
      storage: 100,
      apiCalls: 1000,
    },
    stripePriceId: {},
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    description: 'Essential tools for small poultry operations',
    price: { monthly: 499, annual: 4990 },
    currency: 'MXN',
    features: [
      'dashboard',
      'production',
      'inventory',
      'suppliers',
      'customers',
      'basic_reports',
    ],
    limits: {
      users: 5,
      flocks: 10,
      storage: 500,
      apiCalls: 10000,
    },
    stripePriceId: {},
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Advanced features for growing operations',
    price: { monthly: 1499, annual: 14990 },
    currency: 'MXN',
    features: [
      'dashboard',
      'production',
      'inventory',
      'suppliers',
      'customers',
      'purchases',
      'sales',
      'treasury',
      'accounting',
      'advanced_reports',
      'api_access',
    ],
    limits: {
      users: 20,
      flocks: 50,
      storage: 5000,
      apiCalls: 100000,
    },
    stripePriceId: {},
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Full-featured solution for large operations',
    price: { monthly: 4999, annual: 49990 },
    currency: 'MXN',
    features: [
      'dashboard',
      'production',
      'inventory',
      'suppliers',
      'customers',
      'purchases',
      'sales',
      'treasury',
      'accounting',
      'payroll',
      'advanced_reports',
      'api_access',
      'custom_integrations',
      'priority_support',
    ],
    limits: {
      users: -1, // unlimited
      flocks: -1,
      storage: -1,
      apiCalls: -1,
    },
    stripePriceId: {},
  },
};
