/**
 * SPEC-SAAS-003: QuickPOS Subscription API
 *
 * API functions for subscription management
 */

import { supabase } from '../supabase';
import type {
  Subscription,
  SubscriptionPlan,
  SubscriptionFeature,
  PaymentMethod,
  Invoice,
  SubscriptionInfo,
  SubscriptionUsage,
  QuickPOSPlan,
} from './types';

/**
 * Get subscription for store
 */
export async function getStoreSubscription(
  storeId: string
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      plan:subscription_plans(*),
      store:stores(id, name, slug)
    `)
    .eq('store_id', storeId)
    .single();

  if (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }

  return data;
}

/**
 * Get subscription info using database function
 */
export async function getSubscriptionInfo(
  storeId: string
): Promise<SubscriptionInfo | null> {
  const { data, error } = await supabase
    .rpc('get_subscription_info', { p_store_id: storeId })
    .single();

  if (error) {
    console.error('Error fetching subscription info:', error);
    return null;
  }

  return data as SubscriptionInfo;
}

/**
 * Check if store has feature
 */
export async function hasSubscriptionFeature(
  storeId: string,
  featureKey: string
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('has_subscription_feature', {
      p_store_id: storeId,
      p_feature_key: featureKey,
    })
    .single();

  if (error) {
    console.error('Error checking feature:', error);
    return false;
  }

  return data ?? false;
}

/**
 * Get all subscription plans
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_monthly', { ascending: true });

  if (error) {
    console.error('Error fetching plans:', error);
    return [];
  }

  return data || [];
}

/**
 * Get plan by slug
 */
export async function getPlanBySlug(slug: string): Promise<SubscriptionPlan | null> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching plan:', error);
    return null;
  }

  return data;
}

/**
 * Get all subscription features
 */
export async function getSubscriptionFeatures(): Promise<SubscriptionFeature[]> {
  const { data, error } = await supabase
    .from('subscription_features')
    .select('*')
    .order('category', { ascending: true });

  if (error) {
    console.error('Error fetching features:', error);
    return [];
  }

  return data || [];
}

/**
 * Get features for a plan
 */
export async function getPlanFeatures(planId: string): Promise<SubscriptionFeature[]> {
  const { data, error } = await supabase
    .from('plan_features')
    .select(`
      enabled,
      config,
      feature:subscription_features(*)
    `)
    .eq('plan_id', planId)
    .eq('enabled', true);

  if (error) {
    console.error('Error fetching plan features:', error);
    return [];
  }

  return (data || []).map((pf: any) => pf.feature);
}

/**
 * Create subscription for store
 */
export async function createSubscription(
  storeId: string,
  planId: string,
  billingCycle: 'monthly' | 'yearly' = 'monthly'
): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
  // Get plan details
  const plan = await getPlanBySlug(planId);
  if (!plan) {
    return { success: false, error: 'Plan no encontrado' };
  }

  // Calculate period dates
  const now = new Date();
  const periodEnd = new Date(now);
  if (billingCycle === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  // Create subscription
  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      store_id: storeId,
      plan_id: plan.id,
      status: 'active',
      billing_cycle: billingCycle,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, subscription: data };
}

/**
 * Update subscription plan
 */
export async function updateSubscriptionPlan(
  subscriptionId: string,
  newPlanId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('subscriptions')
    .update({ plan_id: newPlanId })
    .eq('id', subscriptionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      cancel_at_period_end: cancelAtPeriodEnd,
      canceled_at: cancelAtPeriodEnd ? null : new Date().toISOString(),
    })
    .eq('id', subscriptionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Resume canceled subscription
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      cancel_at_period_end: false,
      canceled_at: null,
    })
    .eq('id', subscriptionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get subscription usage metrics
 */
export async function getSubscriptionUsage(
  storeId: string
): Promise<SubscriptionUsage | null> {
  const subscription = await getStoreSubscription(storeId);
  if (!subscription) {
    return null;
  }

  const plan = subscription.plan;
  if (!plan) {
    return null;
  }

  // Get current usage
  const [terminalsResult, productsResult, usersResult] = await Promise.all([
    supabase.from('terminals').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
    supabase.from('store_users').select('id', { count: 'exact', head: true }).eq('store_id', storeId).eq('is_active', true),
  ]);

  const terminals = terminalsResult.count || 0;
  const products = productsResult.count || 0;
  const users = usersResult.count || 0;

  const calculatePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0; // unlimited
    return Math.round((current / limit) * 100);
  };

  return {
    terminals: {
      current: terminals,
      limit: plan.max_terminals,
      percentage: calculatePercentage(terminals, plan.max_terminals),
    },
    products: {
      current: products,
      limit: plan.max_products,
      percentage: calculatePercentage(products, plan.max_products),
    },
    users: {
      current: users,
      limit: plan.max_users,
      percentage: calculatePercentage(users, plan.max_users),
    },
    stores: {
      current: 1, // TODO: implement multi-store counting
      limit: plan.max_stores,
      percentage: calculatePercentage(1, plan.max_stores),
    },
  };
}

/**
 * Check if store can add resource
 */
export async function canAddResource(
  storeId: string,
  resourceType: 'terminals' | 'products' | 'users' | 'stores'
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('check_subscription_limits', {
      p_store_id: storeId,
      p_limit_type: resourceType,
    })
    .single();

  if (error) {
    console.error('Error checking limits:', error);
    return false;
  }

  // -1 means unlimited, any positive number means available slots
  return (data ?? 0) > 0 || data === -1;
}

/**
 * Get payment methods for store
 */
export async function getPaymentMethods(storeId: string): Promise<PaymentMethod[]> {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('store_id', storeId)
    .order('is_default', { ascending: false });

  if (error) {
    console.error('Error fetching payment methods:', error);
    return [];
  }

  return data || [];
}

/**
 * Get invoices for store
 */
export async function getInvoices(storeId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all subscriptions (super admin)
 */
export async function getAllSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      plan:subscription_plans(*),
      store:stores(id, name, slug)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all subscriptions:', error);
    return [];
  }

  return data || [];
}

/**
 * Update subscription status (super admin)
 */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: 'active' | 'past_due' | 'canceled' | 'unpaid'
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('subscriptions')
    .update({ status })
    .eq('id', subscriptionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get subscription stats (super admin)
 */
export async function getSubscriptionStats(): Promise<{
  total: number;
  active: number;
  trialing: number;
  pastDue: number;
  canceled: number;
  byPlan: Record<string, number>;
  mrr: number; // Monthly Recurring Revenue
}> {
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('status, plan_id, billing_cycle')
    .order('created_at', { ascending: false });

  if (!subscriptions) {
    return {
      total: 0,
      active: 0,
      trialing: 0,
      pastDue: 0,
      canceled: 0,
      byPlan: {},
      mrr: 0,
    };
  }

  const stats = {
    total: subscriptions.length,
    active: 0,
    trialing: 0,
    pastDue: 0,
    canceled: 0,
    byPlan: {} as Record<string, number>,
    mrr: 0,
  };

  // Get plans for pricing
  const plans = await getSubscriptionPlans();
  const planMap = new Map(plans.map(p => [p.id, p]));

  for (const sub of subscriptions) {
    // Count by status
    switch (sub.status) {
      case 'active':
        stats.active++;
        break;
      case 'trialing':
        stats.trialing++;
        break;
      case 'past_due':
        stats.pastDue++;
        break;
      case 'canceled':
        stats.canceled++;
        break;
    }

    // Count by plan
    const plan = planMap.get(sub.plan_id);
    if (plan) {
      stats.byPlan[plan.slug] = (stats.byPlan[plan.slug] || 0) + 1;

      // Calculate MRR (only for active subscriptions)
      if (sub.status === 'active') {
        const monthlyPrice = sub.billing_cycle === 'yearly'
          ? plan.price_yearly / 12
          : plan.price_monthly;
        stats.mrr += monthlyPrice;
      }
    }
  }

  return stats;
}
