/**
 * SPEC-POS-001: Phase 2 - Kanban Board Component
 *
 * Drag-and-drop kanban view for orders
 *
 * TAG-DESIGN: Kanban board for visual order management
 * TAG-FUNCTION: KanbanBoard component
 */

import { useState } from 'react';
import type { OnlineOrder, OnlineOrderStatus } from '@/types/online-orders';

// ============================================================================
// TYPES
// ============================================================================

export interface KanbanBoardProps {
  /** Business ID for the current business */
  businessId: string;
  /** Orders to display on the board */
  orders: OnlineOrder[];
  /** Callback when an order is clicked */
  onOrderClick?: (orderId: string) => void;
  /** Callback when status changes */
  onStatusChange?: (orderId: string, newStatus: OnlineOrderStatus) => void;
}

type ColumnStatus = OnlineOrderStatus;

// ============================================================================
// COLUMN CONFIGURATION
// ============================================================================

interface ColumnConfig {
  status: ColumnStatus;
  title: string;
  color: string;
}

const COLUMNS: ColumnConfig[] = [
  { status: 'pending', title: 'Pending', color: 'yellow' },
  { status: 'confirmed', title: 'Confirmed', color: 'blue' },
  { status: 'preparing', title: 'Preparing', color: 'orange' },
  { status: 'ready', title: 'Ready', color: 'green' },
  { status: 'picked_up', title: 'Picked Up', color: 'gray' },
  { status: 'cancelled', title: 'Cancelled', color: 'red' },
];

// ============================================================================
// MAIN KANBAN COMPONENT
// ============================================================================

export function KanbanBoard({ businessId, orders, onOrderClick, onStatusChange }: KanbanBoardProps) {
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);

  // Group orders by status
  const ordersByStatus = orders.reduce<Record<OnlineOrderStatus, OnlineOrder[]>>(
    (acc, order) => {
      if (!acc[order.status]) {
        acc[order.status] = [];
      }
      acc[order.status].push(order);
      return acc;
    },
    {
      pending: [],
      confirmed: [],
      preparing: [],
      ready: [],
      picked_up: [],
      cancelled: [],
    }
  );

  const handleDragStart = (orderId: string) => {
    setDraggedOrderId(orderId);
  };

  const handleDragEnd = () => {
    setDraggedOrderId(null);
  };

  const handleDrop = (targetStatus: OnlineOrderStatus) => {
    if (draggedOrderId && onStatusChange) {
      onStatusChange(draggedOrderId, targetStatus);
    }
    setDraggedOrderId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div data-testid="kanban-board" className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((column) => (
        <KanbanColumn
          key={column.status}
          column={column}
          orders={ordersByStatus[column.status] || []}
          draggedOrderId={draggedOrderId}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onOrderClick={onOrderClick}
        />
      ))}
    </div>
  );
}

// ============================================================================
// KANBAN COLUMN COMPONENT
// ============================================================================

interface KanbanColumnProps {
  column: ColumnConfig;
  orders: OnlineOrder[];
  draggedOrderId: string | null;
  onDragStart: (orderId: string) => void;
  onDragEnd: () => void;
  onDrop: (status: OnlineOrderStatus) => void;
  onDragOver: (e: React.DragEvent) => void;
  onOrderClick?: (orderId: string) => void;
}

function KanbanColumn({
  column,
  orders,
  draggedOrderId,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  onOrderClick,
}: KanbanColumnProps) {
  const colorClasses: Record<string, string> = {
    yellow: 'bg-yellow-50 border-yellow-200',
    blue: 'bg-blue-50 border-blue-200',
    orange: 'bg-orange-50 border-orange-200',
    green: 'bg-green-50 border-green-200',
    gray: 'bg-gray-50 border-gray-200',
    red: 'bg-red-50 border-red-200',
  };

  return (
    <div
      data-testid={`column-${column.status}`}
      className={`flex-shrink-0 w-72 ${colorClasses[column.color]} rounded-lg border-2 p-4`}
      onDragOver={onDragOver}
      onDrop={() => onDrop(column.status)}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800">{column.title}</h3>
        <span
          data-testid={`count-${column.status}`}
          className="bg-white px-2 py-1 rounded-full text-sm font-medium"
        >
          {orders.length}
        </span>
      </div>

      <div className="space-y-3 min-h-[200px]">
        {orders.map((order) => (
          <KanbanCard
            key={order.id}
            order={order}
            isDragging={draggedOrderId === order.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={() => onOrderClick?.(order.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// KANBAN CARD COMPONENT
// ============================================================================

interface KanbanCardProps {
  order: OnlineOrder;
  isDragging: boolean;
  onDragStart: (orderId: string) => void;
  onDragEnd: () => void;
  onClick: () => void;
}

function KanbanCard({ order, isDragging, onDragStart, onDragEnd, onClick }: KanbanCardProps) {
  const timeWaiting = Math.floor(
    (Date.now() - new Date(order.created_at).getTime()) / 60000
  );

  return (
    <div
      draggable
      onDragStart={() => onDragStart(order.id)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm border-2 p-3 cursor-pointer transition-all ${
        isDragging ? 'opacity-50 rotate-2' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-gray-900">{order.order_number}</span>
        <span className="text-xs text-gray-500">{timeWaiting}m</span>
      </div>

      <div className="text-sm text-gray-700 mb-2">{order.guest_name}</div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{order.items.length} items</span>
        <span className="font-medium">${order.total.toFixed(2)}</span>
      </div>

      <div className="text-xs text-gray-500 mt-2">
        Pickup: {new Date(order.pickup_time).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}
