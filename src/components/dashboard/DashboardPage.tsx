import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDateTime } from '../../lib/constants';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Banknote,
  ArrowRight,
} from 'lucide-react';

interface DashboardStats {
  todaySales: number;
  todayTickets: number;
  averageTicket: number;
  cashAmount: number;
  cardAmount: number;
  terminalAmount: number;
  transferAmount: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    stock_quantity: number;
    stock_min: number;
  }>;
  recentSales: Array<{
    id: string;
    ticket_number: string;
    total: number;
    payment_method: string;
    created_at: string;
  }>;
}

export function DashboardPage() {
  const { currentBusiness } = useTenant();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayTickets: 0,
    averageTicket: 0,
    cashAmount: 0,
    cardAmount: 0,
    terminalAmount: 0,
    transferAmount: 0,
    lowStockProducts: [],
    recentSales: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBusiness) return;

    const loadDashboardData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];

        const { data: salesData } = await supabase
          .from('sales')
          .select('total, payment_method, cash_amount, card_amount, terminal_amount, transfer_amount')
          .eq('business_id', currentBusiness.id)
          .gte('created_at', today)
          .eq('status', 'completed');

        const todaySales = salesData?.reduce((sum, sale) => sum + sale.total, 0) || 0;
        const todayTickets = salesData?.length || 0;
        const averageTicket = todayTickets > 0 ? todaySales / todayTickets : 0;

        const cashAmount = salesData?.reduce((sum, sale) => sum + (sale.cash_amount || 0), 0) || 0;
        const cardAmount = salesData?.reduce((sum, sale) => sum + (sale.card_amount || 0), 0) || 0;
        const terminalAmount = salesData?.reduce((sum, sale) => sum + (sale.terminal_amount || 0), 0) || 0;
        const transferAmount = salesData?.reduce((sum, sale) => sum + (sale.transfer_amount || 0), 0) || 0;

        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, stock_quantity, stock_min')
          .eq('business_id', currentBusiness.id)
          .eq('is_active', true)
          .eq('track_stock', true)
          .lte('stock_quantity', supabase.rpc('stock_min'))
          .limit(5);

        const { data: recentSalesData } = await supabase
          .from('sales')
          .select('id, ticket_number, total, payment_method, created_at')
          .eq('business_id', currentBusiness.id)
          .order('created_at', { ascending: false })
          .limit(5);

        setStats({
          todaySales,
          todayTickets,
          averageTicket,
          cashAmount,
          cardAmount,
          terminalAmount,
          transferAmount,
          lowStockProducts: productsData || [],
          recentSales: recentSalesData || [],
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [currentBusiness]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Resumen de actividad de hoy</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ventas de Hoy</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(stats.todaySales)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tickets</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.todayTickets}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Receipt className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ticket Promedio</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(stats.averageTicket)}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <Banknote className="w-6 h-6 text-green-600" />
            <div>
              <p className="text-xs font-medium text-gray-600">Efectivo</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.cashAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <div>
              <p className="text-xs font-medium text-gray-600">Tarjeta</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.cardAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-purple-600" />
            <div>
              <p className="text-xs font-medium text-gray-600">Terminal</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.terminalAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-yellow-600" />
            <div>
              <p className="text-xs font-medium text-gray-600">Transferencia</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.transferAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Stock Bajo
            </h2>
            <Link
              to="/inventory"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Ver todo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {stats.lowStockProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay productos con stock bajo</p>
          ) : (
            <div className="space-y-3">
              {stats.lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"
                >
                  <span className="font-medium text-gray-900">{product.name}</span>
                  <span className="text-sm text-red-600 font-medium">
                    Stock: {product.stock_quantity} / Mín: {product.stock_min}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              Últimas Ventas
            </h2>
            <Link
              to="/sales"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Ver todo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {stats.recentSales.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay ventas registradas hoy</p>
          ) : (
            <div className="space-y-3">
              {stats.recentSales.map((sale) => (
                <Link
                  key={sale.id}
                  to={`/sales/${sale.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div>
                    <p className="font-medium text-gray-900">{sale.ticket_number}</p>
                    <p className="text-xs text-gray-600">{formatDateTime(sale.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(sale.total)}</p>
                    <p className="text-xs text-gray-600 capitalize">{sale.payment_method}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
