/**
 * SPEC-SAAS-003: Subscription Card Component
 *
 * Component displaying current subscription status and plan info
 */

import { useSubscription, useSubscriptionUsage } from '../../hooks/useSubscription';
import type { SubscriptionPlan } from '../../types/subscription';

interface SubscriptionCardProps {
  onManage?: () => void;
  onUpgrade?: () => void;
}

const PLAN_NAMES: Record<SubscriptionPlan, string> = {
  trial: 'Prueba Gratis',
  basic: 'Plan Basic',
  professional: 'Plan Profesional',
  enterprise: 'Plan Enterprise',
};

const PLAN_COLORS: Record<SubscriptionPlan, string> = {
  trial: 'bg-purple-100 text-purple-800',
  basic: 'bg-blue-100 text-blue-800',
  professional: 'bg-orange-100 text-orange-800',
  enterprise: 'bg-gray-100 text-gray-800',
};

/**
 * Subscription status card
 */
export function SubscriptionCard({ onManage, onUpgrade }: SubscriptionCardProps) {
  const { subscription, isActive, isTrialing, isPastDue, isCanceled, daysUntilExpiration } = useSubscription();
  const { usage, usagePercentage } = useSubscriptionUsage();

  if (!subscription) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Subscription</h3>
        <p className="text-gray-500 text-sm mb-4">Select a plan to get started</p>
        {onUpgrade && (
          <button
            onClick={onUpgrade}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            View Plans
          </button>
        )}
      </div>
    );
  }

  const planColor = PLAN_COLORS[subscription.plan as SubscriptionPlan];

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Current Plan</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${planColor}`}>
              {PLAN_NAMES[subscription.plan as SubscriptionPlan]}
            </span>
            {isTrialing && (
              <span className="text-sm text-orange-600">
                Trial ends in {daysUntilExpiration} days
              </span>
            )}
            {isPastDue && (
              <span className="text-sm text-red-600">Payment past due</span>
            )}
            {isCanceled && (
              <span className="text-sm text-gray-500">
                Cancels on {new Date(subscription.current_period_end).toLocaleDateString('es-MX')}
              </span>
            )}
          </div>
        </div>
        {onManage && isActive && (
          <button
            onClick={onManage}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Manage
          </button>
        )}
      </div>

      {/* Pricing */}
      <div className="mb-4">
        <p className="text-2xl font-semibold text-gray-900">
          ${subscription.amount}
          <span className="text-sm font-normal text-gray-500">
            /{subscription.billing_cycle === 'monthly' ? 'month' : 'year'}
          </span>
        </p>
      </div>

      {/* Usage limits (if applicable) */}
      {usage && (
        <div className="space-y-3 mb-4">
          {/* Users */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Users</span>
              <span className="text-gray-900">
                {usage.user_count} / {usage.limits.users < 0 ? 'Unlimited' : usage.limits.users}
              </span>
            </div>
            {usage.limits.users > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min(100, usagePercentage('user_count'))}%` }}
                />
              </div>
            )}
          </div>

          {/* Flocks */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Flocks</span>
              <span className="text-gray-900">
                {usage.flock_count} / {usage.limits.flocks < 0 ? 'Unlimited' : usage.limits.flocks}
              </span>
            </div>
            {usage.limits.flocks > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${Math.min(100, usagePercentage('flock_count'))}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        {onUpgrade && !isCanceled && (
          <button
            onClick={onUpgrade}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
          >
            {subscription.plan === 'trial' ? 'Choose Plan' : 'Upgrade'}
          </button>
        )}
        {isCanceled && onUpgrade && (
          <button
            onClick={onUpgrade}
            className="flex-1 border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 text-sm"
          >
            Resubscribe
          </button>
        )}
      </div>
    </div>
  );
}
