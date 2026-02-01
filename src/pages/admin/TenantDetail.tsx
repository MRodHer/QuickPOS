/**
 * SPEC-SAAS-002: Store Detail View
 *
 * Detailed view of a single store for super admins
 */

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Store } from '../../types/store';
import { StoreForm } from './StoreForm';

interface StoreDetailProps {
  storeId: string;
  onBack: () => void;
}

interface StoreStats {
  userCount: number;
  activeUserCount: number;
  flockCount: number;
  inventoryItemCount: number;
  journalEntryCount: number;
  storageUsed: number;
  lastActivity: string | null;
}

interface ActivityLog {
  id: string;
  user_id: string;
  user_email: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

/**
 * Fetch store details with stats
 */
async function fetchStoreWithStats(storeId: string): Promise<{ store: Store; stats: StoreStats }> {
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .single();

  if (storeError) throw storeError;

  // Get user count
  const { count: userCount } = await supabase
    .from('store_users')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId);

  const { count: activeUserCount } = await supabase
    .from('store_users')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('is_active', true);

  // Get other counts
  const { count: flockCount } = await supabase
    .from('flocks')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId);

  const { count: inventoryItemCount } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId);

  const { count: journalEntryCount } = await supabase
    .from('journal_entries')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId);

  const stats: StoreStats = {
    userCount: userCount || 0,
    activeUserCount: activeUserCount || 0,
    flockCount: flockCount || 0,
    inventoryItemCount: inventoryItemCount || 0,
    journalEntryCount: journalEntryCount || 0,
    storageUsed: 0, // TODO: Implement storage tracking
    lastActivity: null, // TODO: Implement from activity logs
  };

  return { store: store as Store, stats };
}

/**
 * Fetch store activity logs
 */
async function fetchStoreActivityLogs(storeId: string, limit = 20): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as ActivityLog[];
}

/**
 * Stat item component
 */
function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

/**
 * Info row component
 */
function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="py-3 sm:py-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value || '-'}</dd>
    </div>
  );
}

/**
 * Store detail component
 */
export function StoreDetail({ storeId, onBack }: StoreDetailProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: { store, stats }, isLoading, error } = useQuery({
    queryKey: ['admin', 'store', storeId],
    queryFn: () => fetchStoreWithStats(storeId),
    enabled: !!storeId && !isEditing,
  });

  const { data: activityLogs = [] } = useQuery({
    queryKey: ['admin', 'store', storeId, 'activity'],
    queryFn: () => fetchStoreActivityLogs(storeId),
    enabled: !!storeId && !isEditing,
  });

  /**
   * Update store status mutation
   */
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason?: string }) => {
      const { error } = await supabase
        .from('stores')
        .update({ status })
        .eq('id', storeId);

      if (error) throw error;

      // Log the status change
      await supabase.from('admin_audit_logs').insert({
        action: 'store_status_change',
        store_id: storeId,
        details: { newStatus: status, reason },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', storeId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading store details...</div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading store details.</p>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div>
        <button onClick={() => setIsEditing(false)} className="text-blue-600 hover:underline mb-4">
          ← Back to view mode
        </button>
        <StoreForm
          store={store}
          onSuccess={() => {
            setIsEditing(false);
            queryClient.invalidateQueries({ queryKey: ['admin', 'store', storeId] });
          }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
    provisioning: 'bg-yellow-100 text-yellow-800',
    deleted: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <button onClick={onBack} className="text-blue-600 hover:underline mb-2">
            ← Back to stores
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[store.status]}`}>
              {store.status}
            </span>
          </div>
          <p className="text-gray-500">{store.slug}.avierp.com</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Edit Store
          </button>
          {store.status === 'active' && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to suspend this store?')) {
                  updateStatusMutation.mutate({ status: 'suspended' });
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Suspend
            </button>
          )}
          {store.status === 'suspended' && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to activate this store?')) {
                  updateStatusMutation.mutate({ status: 'active' });
                }
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Activate
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatItem label="Total Users" value={stats.userCount} />
        <StatItem label="Active Users" value={stats.activeUserCount} />
        <StatItem label="Flocks" value={stats.flockCount} />
        <StatItem label="Inventory Items" value={stats.inventoryItemCount} />
        <StatItem label="Journal Entries" value={stats.journalEntryCount} />
      </div>

      {/* Store Information */}
      <div className="bg-white shadow rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Store Information</h2>
        </div>
        <dl className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Store ID" value={store.id} />
          <InfoRow label="Name" value={store.name} />
          <InfoRow label="Slug" value={store.slug} />
          <InfoRow label="Custom Domain" value={store.custom_domain} />
          <InfoRow label="Status" value={store.status} />
          <InfoRow label="Subscription Tier" value={store.subscription_tier} />
          <InfoRow label="Max Users" value={store.subscription_max_users} />
          <InfoRow label="Created" value={new Date(store.created_at).toLocaleString('es-MX')} />
        </dl>
      </div>

      {/* Company Information */}
      <div className="bg-white shadow rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Company Information</h2>
        </div>
        <dl className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Legal Name" value={store.company_name} />
          <InfoRow label="RFC" value={store.company_rfc} />
          <InfoRow label="Email" value={store.company_email} />
          <InfoRow label="Phone" value={store.company_phone} />
          <InfoRow label="Address" value={store.company_address} />
        </dl>
      </div>

      {/* Configuration */}
      <div className="bg-white shadow rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Configuration</h2>
        </div>
        <dl className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Locale" value={store.locale} />
          <InfoRow label="Timezone" value={store.timezone} />
          <InfoRow label="Currency" value={store.currency} />
          <InfoRow label="Primary Color" value={
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded" style={{ backgroundColor: store.primary_color }} />
              {store.primary_color}
            </span>
          } />
        </dl>

        {/* Enabled Modules */}
        <div className="px-6 pb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Enabled Modules</h3>
          <div className="flex flex-wrap gap-2">
            {store.enabled_modules.map((module) => (
              <span key={module} className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                {module}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Logs */}
      <div className="bg-white shadow rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
        </div>
        <div className="px-6 py-4">
          {activityLogs.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {activityLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-500 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900">{log.action}</p>
                    <p className="text-gray-500 text-xs">
                      {log.user_email || 'Unknown'} • {new Date(log.created_at).toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
