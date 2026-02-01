/**
 * SPEC-SAAS-003: Subscription Hooks
 *
 * React hooks for managing subscriptions and billing
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  Subscription,
  SubscriptionUsage,
  SubscriptionPlan,
  BillingCycle,
  PlanConfig,
  PLAN_CONFIGS,
} from '../types/subscription';

// Query keys
export const subscriptionKeys = {
  all: ['subscription'] as const,
  current: () => [...subscriptionKeys.all, 'current'] as const,
  usage: () => [...subscriptionKeys.all, 'usage'] as const,
  invoices: () => [...subscriptionKeys.all, 'invoices'] as const,
  paymentMethods: () => [...subscriptionKeys.all, 'payment-methods'] as const,
  plans: () => [...subscriptionKeys.all, 'plans'] as const,
};

/**
 * Fetch current subscription for store
 */
async function fetchCurrentSubscription(): Promise<Subscription | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const storeId = user.app_metadata?.store_id || user.user_metadata?.store_id;
  if (!storeId) return null;

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as Subscription | null;
}

/**
 * Fetch subscription usage metrics
 */
async function fetchSubscriptionUsage(): Promise<SubscriptionUsage | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const storeId = user.app_metadata?.store_id || user.user_metadata?.store_id;
  if (!storeId) return null;

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, current_period_start, current_period_end')
    .eq('store_id', storeId)
    .single();

  if (!subscription) return null;

  // Get actual usage counts
  const [userCount, flockCount] = await Promise.all([
    supabase.from('store_users').select('*', { count: 'exact', head: true }).eq('store_id', storeId),
    supabase.from('flocks').select('*', { count: 'exact', head: true }).eq('store_id', storeId),
  ]);

  // Get limits from plan config
  const { PLAN_CONFIGS } = await import('../types/subscription');
  const planConfig = PLAN_CONFIGS[subscription.plan as keyof typeof PLAN_CONFIGS];

  return {
    store_id: storeId,
    period_start: subscription.current_period_start,
    period_end: subscription.current_period_end,
    user_count: userCount.count || 0,
    flock_count: flockCount.count || 0,
    storage_used: 0, // TODO: Calculate from storage tracking
    api_calls: 0, // TODO: Calculate from API logs
    limits: planConfig.limits,
  };
}

/**
 * Fetch invoices for store
 */
async function fetchInvoices(): Promise<any[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const storeId = user.app_metadata?.store_id || user.user_metadata?.store_id;
  if (!storeId) return [];

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch payment methods for store
 */
async function fetchPaymentMethods(): Promise<any[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const storeId = user.app_metadata?.store_id || user.user_metadata?.store_id;
  if (!storeId) return [];

  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('store_id', storeId)
    .order('is_default', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get plan configurations
 */
function getPlanConfigs(): Record<string, PlanConfig> {
  // Dynamic import to avoid circular dependencies
  const { PLAN_CONFIGS: configs } = require('../types/subscription');
  return configs;
}

/**
 * Hook for current subscription
 */
export function useSubscription() {
  const { data: subscription, isLoading, error } = useQuery({
    queryKey: subscriptionKeys.current(),
    queryFn: fetchCurrentSubscription,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const isTrialing = subscription?.status === 'trialing';
  const isPastDue = subscription?.status === 'past_due';
  const isCanceled = subscription?.status === 'canceled';

  const daysUntilExpiration = subscription?.current_period_end
    ? Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    subscription,
    isLoading,
    error,
    isActive,
    isTrialing,
    isPastDue,
    isCanceled,
    daysUntilExpiration,
    canAccessFeatures: isActive,
  };
}

/**
 * Hook for subscription usage
 */
export function useSubscriptionUsage() {
  const { data: usage, isLoading, error } = useQuery({
    queryKey: subscriptionKeys.usage(),
    queryFn: fetchSubscriptionUsage,
    staleTime: 1000 * 60 * 15, // 15 minutes
    enabled: true,
  });

  const isOverLimit = (key: string): boolean => {
    if (!usage) return false;
    const limit = usage.limits[key as keyof typeof usage.limits];
    const current = usage[key as keyof typeof usage] as number;
    return limit > 0 && current > limit;
  };

  const usagePercentage = (key: string): number => {
    if (!usage) return 0;
    const limit = usage.limits[key as keyof typeof usage.limits];
    const current = usage[key as keyof typeof usage] as number;
    if (limit < 0) return 0; // unlimited
    if (limit === 0) return 100;
    return Math.min(100, Math.round((current / limit) * 100));
  };

  return {
    usage,
    isLoading,
    error,
    isOverLimit,
    usagePercentage,
  };
}

/**
 * Hook for invoices
 */
export function useInvoices() {
  const { data: invoices, isLoading, error } = useQuery({
    queryKey: subscriptionKeys.invoices(),
    queryFn: fetchInvoices,
    staleTime: 1000 * 60 * 5,
  });

  return {
    invoices: invoices || [],
    isLoading,
    error,
  };
}

/**
 * Hook for payment methods
 */
export function usePaymentMethods() {
  const { data: paymentMethods, isLoading, error } = useQuery({
    queryKey: subscriptionKeys.paymentMethods(),
    queryFn: fetchPaymentMethods,
    staleTime: 1000 * 60 * 5,
  });

  const defaultMethod = paymentMethods?.find((pm) => pm.is_default);

  return {
    paymentMethods: paymentMethods || [],
    defaultMethod,
    isLoading,
    error,
  };
}

/**
 * Hook for plan configurations
 */
export function usePlans() {
  const plans = getPlanConfigs();

  const getPlan = (planId: SubscriptionPlan): PlanConfig | undefined => {
    return plans[planId];
  };

  const getAllPlans = (): PlanConfig[] => {
    return Object.values(plans);
  };

  const getPlanComparison = (currentPlan: SubscriptionPlan) => {
    return getAllPlans().map((plan) => ({
      ...plan,
      current: plan.id === currentPlan,
      canUpgrade: getAllPlans().indexOf(getPlan(currentPlan)!) < getAllPlans().indexOf(plan),
      canDowngrade: getAllPlans().indexOf(getPlan(currentPlan)!) > getAllPlans().indexOf(plan),
    }));
  };

  return {
    plans,
    getPlan,
    getAllPlans,
    getPlanComparison,
  };
}

/**
 * Hook for upgrading/changing subscription
 */
export function useChangeSubscription() {
  const queryClient = useQueryClient();

  const changePlan = async ({ plan, billingCycle }: {
    plan: SubscriptionPlan;
    billingCycle?: BillingCycle;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const storeId = user.app_metadata?.store_id || user.user_metadata?.store_id;
    if (!storeId) throw new Error('No store found');

    // Call edge function to create Stripe checkout session
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { storeId, plan, billingCycle },
    });

    if (error) throw error;
    return data;
  };

  return useMutation({
    mutationFn: changePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all() });
    },
  });
}

/**
 * Hook for canceling subscription
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  const cancelSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const storeId = user.app_metadata?.store_id || user.user_metadata?.store_id;
    if (!storeId) throw new Error('No store found');

    const { error } = await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: true })
      .eq('store_id', storeId);

    if (error) throw error;
  };

  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.current() });
    },
  });
}

/**
 * Hook for managing subscription (portal link)
 */
export function useSubscriptionPortal() {
  const portal = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const storeId = user.app_metadata?.store_id || user.user_metadata?.store_id;
    if (!storeId) throw new Error('No store found');

    // Call edge function to create Stripe portal session
    const { data, error } = await supabase.functions.invoke('create-portal-session', {
      body: { storeId },
    });

    if (error) throw error;
    return data.url;
  };

  return useMutation({
    mutationFn: portal,
  });
}

/**
 * Hook to check if a feature is available in current plan
 */
export function useFeatureAccess(featureKey: string) {
  const { subscription, isActive } = useSubscription();
  const { plans } = usePlans();

  const planConfig = subscription ? plans[subscription.plan] : null;
  const hasAccess = isActive && planConfig?.features.includes(featureKey);

  return {
    hasAccess,
    plan: subscription?.plan || null,
    requiresUpgrade: !hasAccess && isActive,
  };
}
