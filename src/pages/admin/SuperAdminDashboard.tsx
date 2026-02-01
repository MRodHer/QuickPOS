/**
 * SPEC-SAAS-002: Super Admin Dashboard
 *
 * Main dashboard for super admins to manage all stores
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Store } from '../../types/store';

interface DashboardStats {
  totalStores: number;
  activeStores: number;
  suspendedStores: number;
  totalUsers: number;
  totalRevenue: number;
  newStoresThisMonth: number;
  churnRate: number;
  avgRevenuePerStore: number;
}

interface StoreWithStats extends Store {
  userCount: number;
  lastActive: string | null;
  revenueThisMonth: number;
}

/**
 * Fetch dashboard stats for super admin
 */
async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if user is super admin
  const isSuperAdmin = user.app_metadata?.is_super_admin || user.user_metadata?.is_super_admin;
  if (!isSuperAdmin) {
    throw new Error('Access denied: Super admin only');
  }

  // Fetch store counts
  const { data: stores } = await supabase
    .from('stores')
    .select('id, status, created_at');

  const totalStores = stores?.length || 0;
  const activeStores = stores?.filter(t => t.status === 'active').length || 0;
  const suspendedStores = stores?.filter(t => t.status === 'suspended').length || 0;

  // This month's new stores
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  const newStoresThisMonth = stores?.filter(t => new Date(t.created_at) >= thisMonth).length || 0;

  // Fetch user count
  const { count: totalUsers } = await supabase
    .from('store_users')
    .select('*', { count: 'exact', head: true });

  return {
    totalStores,
    activeStores,
    suspendedStores,
    totalUsers: totalUsers || 0,
    totalRevenue: 0, // TODO: Implement billing
    newStoresThisMonth,
    churnRate: 0, // TODO: Calculate from historical data
    avgRevenuePerStore: 0, // TODO: Implement billing
  };
}

/**
 * Fetch all stores with their stats
 */
async function fetchAllStores(): Promise<StoreWithStats[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const isSuperAdmin = user.app_metadata?.is_super_admin || user.user_metadata?.is_super_admin;
  if (!isSuperAdmin) {
    throw new Error('Access denied: Super admin only');
  }

  const { data: stores, error } = await supabase
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // For each store, get user count
  const storesWithStats = await Promise.all(
    (stores || []).map(async (store) => {
      const { count } = await supabase
        .from('store_users')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', store.id);

      return {
        ...store,
        userCount: count || 0,
        lastActive: null, // TODO: Implement from activity logs
        revenueThisMonth: 0, // TODO: Implement from billing
      };
    })
  );

  return storesWithStats;
}

/**
 * Stat card component
 */
function StatCard({ title, value, subtitle, trend }: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      {subtitle && (
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      )}
      {trend && (
        <p className={`mt-2 text-sm ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
        </p>
      )}
    </div>
  );
}

/**
 * Store row component for table
 */
function StoreRow({ store, onEdit, onView, onSuspend }: {
  store: StoreWithStats;
  onEdit: (store: StoreWithStats) => void;
  onView: (store: StoreWithStats) => void;
  onSuspend: (storeId: string) => void;
}) {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
    provisioning: 'bg-yellow-100 text-yellow-800',
    deleted: 'bg-gray-100 text-gray-800',
  };

  const tierColors = {
    free: 'bg-gray-100 text-gray-800',
    basic: 'bg-blue-100 text-blue-800',
    pro: 'bg-purple-100 text-purple-800',
    enterprise: 'bg-orange-100 text-orange-800',
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div>
            <div className="text-sm font-medium text-gray-900">{store.name}</div>
            <div className="text-sm text-gray-500">{store.slug}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[store.status]}`}>
          {store.status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {store.userCount}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tierColors[store.subscription_tier]}`}>
          {store.subscription_tier}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(store.created_at).toLocaleDateString('es-MX')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          onClick={() => onView(store)}
          className="text-blue-600 hover:text-blue-900 mr-3"
        >
          Ver
        </button>
        <button
          onClick={() => onEdit(store)}
          className="text-indigo-600 hover:text-indigo-900 mr-3"
        >
          Editar
        </button>
        {store.status === 'active' && (
          <button
            onClick={() => onSuspend(store.id)}
            className="text-red-600 hover:text-red-900"
          >
            Suspender
          </button>
        )}
      </td>
    </tr>
  );
}

/**
 * Main Super Admin Dashboard component
 */
export function SuperAdminDashboard() {
  const [selectedStore, setSelectedStore] = useState<StoreWithStats | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch all stores
  const { data: stores = [], isLoading: storesLoading, error: storesError } = useQuery({
    queryKey: ['admin', 'stores'],
    queryFn: fetchAllStores,
    refetchInterval: 60000,
  });

  // Filter stores
  const filteredStores = stores.filter(store => {
    const matchesStatus = filterStatus === 'all' || store.status === filterStatus;
    const matchesSearch = !searchQuery ||
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.slug.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSuspend = async (storeId: string) => {
    if (!confirm('Are you sure you want to suspend this store?')) return;

    const { error } = await supabase
      .from('stores')
      .update({ status: 'suspended' })
      .eq('id', storeId);

    if (error) {
      alert('Error suspending store: ' + error.message);
    } else {
      window.location.reload();
    }
  };

  const handleView = (store: StoreWithStats) => {
    setSelectedStore(store);
    // TODO: Open store detail modal or navigate to detail page
  };

  const handleEdit = (store: StoreWithStats) => {
    setSelectedStore(store);
    // TODO: Open edit modal or navigate to edit page
  };

  if (statsLoading || storesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (statsError || storesError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading dashboard. Please verify you have super admin access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-500">Manage all AviERP stores</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + New Store
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Stores"
          value={stats?.totalStores || 0}
          subtitle={stats?.newStoresThisMonth ? `${stats.newStoresThisMonth} new this month` : undefined}
          trend={{ value: 5, label: 'vs last month' }}
        />
        <StatCard
          title="Active Stores"
          value={stats?.activeStores || 0}
        />
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
        />
        <StatCard
          title="Suspended"
          value={stats?.suspendedStores || 0}
        />
      </div>

      {/* Stores Table */}
      <div className="bg-white shadow rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">All Stores</h2>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search stores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="provisioning">Provisioning</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Store
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStores.map((store) => (
                <StoreRow
                  key={store.id}
                  store={store}
                  onView={handleView}
                  onEdit={handleEdit}
                  onSuspend={handleSuspend}
                />
              ))}
            </tbody>
          </table>
        </div>

        {filteredStores.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No stores found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
}
