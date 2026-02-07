/**
 * SPEC-POS-001: Phase 2 - Staff Dashboard Component
 *
 * Main dashboard for staff to manage online orders
 *
 * TAG-DESIGN: Staff dashboard for order management
 * TAG-FUNCTION: StaffDashboard component
 */

import { useState } from 'react';
import { useOrdersRealtime } from '@/hooks/online-orders/useOrdersRealtime';
import { KanbanBoard } from './KanbanBoard';
import { OrderList } from './OrderList';
import { OrderDetailModal } from './OrderDetailModal';
import type { OnlineOrder, OnlineOrderStatus } from '@/types/online-orders';

// ============================================================================
// TYPES
// ============================================================================

export interface StaffDashboardProps {
  /** Business ID for the current business */
  businessId: string;
  /** Initial view mode */
  view?: 'list' | 'kanban';
}

type ViewMode = 'list' | 'kanban';
type StatusFilter = OnlineOrderStatus | 'all';

// ============================================================================
// STATISTICS COMPONENTS
// ============================================================================

interface OrderStatsProps {
  orders: OnlineOrder[];
}

function OrderStats({ orders }: OrderStatsProps) {
  const stats = {
    pending: orders.filter((o) => o.status === 'pending').length,
    confirmed: orders.filter((o) => o.status === 'confirmed').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    ready: orders.filter((o) => o.status === 'ready').length,
    total: orders.length,
    todayRevenue: orders.reduce((sum, o) => sum + o.total, 0),
  };

  return (
    <div data-testid="order-stats" className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <StatCard label="Pending" value={stats.pending} color="yellow" />
      <StatCard label="Confirmed" value={stats.confirmed} color="blue" />
      <StatCard label="Preparing" value={stats.preparing} color="orange" />
      <StatCard label="Ready" value={stats.ready} color="green" />
      <StatCard
        label="Today"
        value={`$${stats.todayRevenue.toFixed(2)}`}
        color="gray"
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  color: 'yellow' | 'blue' | 'orange' | 'green' | 'gray';
}

function StatCard({ label, value, color }: StatCardProps) {
  const colorClasses: Record<StatCardProps['color'], string> = {
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-800',
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium">{label}</div>
    </div>
  );
}

// ============================================================================
// FILTER CONTROLS
// ============================================================================

interface FilterControlsProps {
  currentFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  viewMode: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

function FilterControls({
  currentFilter,
  onFilterChange,
  viewMode,
  onViewChange,
}: FilterControlsProps) {
  const filters: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Preparing', value: 'preparing' },
    { label: 'Ready', value: 'ready' },
    { label: 'Picked Up', value: 'picked_up' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div data-testid="status-filter" className="flex gap-2">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentFilter === filter.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div data-testid="view-toggle" className="flex gap-2 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onViewChange('list')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'list'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          List
        </button>
        <button
          onClick={() => onViewChange('kanban')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'kanban'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Kanban
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export function StaffDashboard({ businessId, view: initialView = 'list' }: StaffDashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { orders, connectionState, error, refetch } = useOrdersRealtime({
    businessId,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null;

  // Loading state
  if (connectionState === 'connecting') {
    return (
      <div data-testid="dashboard-loading" className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Connecting to realtime updates...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (connectionState === 'error') {
    return (
      <div data-testid="dashboard-error" className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">!</div>
          <p className="text-red-600 font-medium mb-4">{error || 'Connection error'}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="staff-dashboard" className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
        <p className="text-gray-600">Manage online orders in real-time</p>
      </header>

      <OrderStats orders={orders} />

      <FilterControls
        currentFilter={statusFilter}
        onFilterChange={setStatusFilter}
        viewMode={viewMode}
        onViewChange={setViewMode}
      />

      {viewMode === 'list' ? (
        <OrderList
          businessId={businessId}
          orders={orders}
          onOrderClick={setSelectedOrderId}
        />
      ) : (
        <KanbanBoard
          businessId={businessId}
          orders={orders}
          onOrderClick={setSelectedOrderId}
        />
      )}

      {selectedOrder && (
        <OrderDetailModal
          businessId={businessId}
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// ORDER LIST COMPONENT
// ============================================================================

interface OrderListProps {
  businessId: string;
  orders: OnlineOrder[];
  onOrderClick: (orderId: string) => void;
}

function OrderList({ businessId, orders, onOrderClick }: OrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No orders to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <OrderListItem key={order.id} order={order} onClick={() => onOrderClick(order.id)} />
      ))}
    </div>
  );
}

interface OrderListItemProps {
  order: OnlineOrder;
  onClick: () => void;
}

function OrderListItem({ order, onClick }: OrderListItemProps) {
  const timeWaiting = Math.floor(
    (Date.now() - new Date(order.created_at).getTime()) / 60000
  );
  const isOverdue = order.status !== 'picked_up' && timeWaiting > 30;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
        isOverdue
          ? 'border-red-300 bg-red-50'
          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg">{order.order_number}</span>
            <StatusBadge status={order.status} />
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {order.guest_name} · {order.items.length} items · ${order.total.toFixed(2)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">{timeWaiting}m ago</div>
          <div className="text-sm font-medium">
            {new Date(order.pickup_time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// STATUS BADGE
// ============================================================================

interface StatusBadgeProps {
  status: OnlineOrderStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<OnlineOrderStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-orange-100 text-orange-800',
    ready: 'bg-green-100 text-green-800',
    picked_up: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const labels: Record<OnlineOrderStatus, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready',
    picked_up: 'Picked Up',
    cancelled: 'Cancelled',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
