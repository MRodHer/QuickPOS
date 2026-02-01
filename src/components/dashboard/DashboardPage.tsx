import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDateTime } from '../../lib/constants';
import { SalesAreaChart, HourlySalesChart, PaymentPieChart } from '../charts/SalesChart';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';

interface DashboardStats {
  todaySales: number;
  todayTickets: number;
  averageTicket: number;
  cashAmount: number;
  cardAmount: number;
  terminalAmount: number;
  transferAmount: number;
  yesterdaySales: number;
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
  hourlySales: Array<{ hour: number; sales: number; tickets: number }>;
  weeklyTrend: Array<{ name: string; value: number }>;
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
    yesterdaySales: 0,
    lowStockProducts: [],
    recentSales: [],
    hourlySales: [],
    weeklyTrend: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    if (!currentBusiness) {
      setLoading(false);
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      // Today's sales
      const { data: salesData } = await supabase
        .from('sales')
        .select('total, payment_method, cash_amount, card_amount, terminal_amount, transfer_amount, created_at')
        .eq('business_id', currentBusiness.id)
        .gte('created_at', today)
        .eq('status', 'completed');

      // Yesterday's sales for comparison
      const { data: yesterdayData } = await supabase
        .from('sales')
        .select('total')
        .eq('business_id', currentBusiness.id)
        .gte('created_at', yesterday)
        .lt('created_at', today)
        .eq('status', 'completed');

      const todaySales = salesData?.reduce((sum, sale) => sum + sale.total, 0) || 0;
      const todayTickets = salesData?.length || 0;
      const averageTicket = todayTickets > 0 ? todaySales / todayTickets : 0;
      const yesterdaySales = yesterdayData?.reduce((sum, sale) => sum + sale.total, 0) || 0;

      const cashAmount = salesData?.reduce((sum, sale) => sum + (sale.cash_amount || 0), 0) || 0;
      const cardAmount = salesData?.reduce((sum, sale) => sum + (sale.card_amount || 0), 0) || 0;
      const terminalAmount = salesData?.reduce((sum, sale) => sum + (sale.terminal_amount || 0), 0) || 0;
      const transferAmount = salesData?.reduce((sum, sale) => sum + (sale.transfer_amount || 0), 0) || 0;

      // Hourly breakdown
      const hourlyMap = new Map<number, { sales: number; tickets: number }>();
      for (let h = 0; h < 24; h++) {
        hourlyMap.set(h, { sales: 0, tickets: 0 });
      }
      salesData?.forEach((sale) => {
        const hour = new Date(sale.created_at).getHours();
        const existing = hourlyMap.get(hour)!;
        hourlyMap.set(hour, {
          sales: existing.sales + sale.total,
          tickets: existing.tickets + 1,
        });
      });
      const hourlySales = Array.from(hourlyMap.entries())
        .filter(([h]) => h >= 7 && h <= 21) // Show only business hours
        .map(([hour, data]) => ({ hour, ...data }));

      // Weekly trend (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      const { data: weekData } = await supabase
        .from('sales')
        .select('total, created_at')
        .eq('business_id', currentBusiness.id)
        .gte('created_at', weekAgo)
        .eq('status', 'completed');

      const dailyMap = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        dailyMap.set(d.toISOString().split('T')[0], 0);
      }
      weekData?.forEach((sale) => {
        const date = sale.created_at.split('T')[0];
        if (dailyMap.has(date)) {
          dailyMap.set(date, dailyMap.get(date)! + sale.total);
        }
      });
      const weeklyTrend = Array.from(dailyMap.entries()).map(([date, value]) => ({
        name: new Date(date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
        value,
      }));

      // Low stock products
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, stock_quantity, stock_min')
        .eq('business_id', currentBusiness.id)
        .eq('is_active', true)
        .eq('track_stock', true)
        .limit(50);

      const lowStockFiltered = (productsData || [])
        .filter((p) => p.stock_quantity <= p.stock_min)
        .slice(0, 5);

      // Recent sales
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
        yesterdaySales,
        lowStockProducts: lowStockFiltered,
        recentSales: recentSalesData || [],
        hourlySales,
        weeklyTrend,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [currentBusiness]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const salesChange = stats.yesterdaySales > 0
    ? ((stats.todaySales - stats.yesterdaySales) / stats.yesterdaySales) * 100
    : stats.todaySales > 0 ? 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentBusiness) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-gray-600 text-lg">No hay negocio seleccionado</p>
        <p className="text-gray-500 mt-2">Contacta al administrador si crees que esto es un error.</p>
      </div>
    );
  }

  const paymentData = [
    { name: 'Efectivo', value: stats.cashAmount },
    { name: 'Tarjeta', value: stats.cardAmount },
    { name: 'Terminal', value: stats.terminalAmount },
    { name: 'Transferencia', value: stats.transferAmount },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Resumen de actividad de hoy</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-100">Ventas de Hoy</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(stats.todaySales)}</p>
              {stats.yesterdaySales > 0 && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${salesChange >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                  {salesChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {Math.abs(salesChange).toFixed(1)}% vs ayer
                </div>
              )}
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <DollarSign className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100">Tickets</p>
              <p className="text-3xl font-bold mt-2">{stats.todayTickets}</p>
              <p className="text-sm text-blue-200 mt-2">transacciones hoy</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Receipt className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-100">Ticket Promedio</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(stats.averageTicket)}</p>
              <p className="text-sm text-purple-200 mt-2">por transacción</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Tendencia Semanal</h2>
          {stats.weeklyTrend.some(d => d.value > 0) ? (
            <SalesAreaChart data={stats.weeklyTrend} height={250} />
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-500">
              Sin datos de ventas esta semana
            </div>
          )}
        </div>

        {/* Payment Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Distribución de Pagos</h2>
          <PaymentPieChart data={paymentData} height={250} />
        </div>
      </div>

      {/* Hourly Sales */}
      {stats.hourlySales.some(h => h.sales > 0) && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Ventas por Hora</h2>
          <HourlySalesChart data={stats.hourlySales} height={200} />
        </div>
      )}

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock */}
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
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-gray-600">Todo en orden</p>
              <p className="text-sm text-gray-500">No hay productos con stock bajo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"
                >
                  <span className="font-medium text-gray-900 truncate flex-1">{product.name}</span>
                  <span className="text-sm text-red-600 font-medium whitespace-nowrap ml-2">
                    {product.stock_quantity} / {product.stock_min}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sales */}
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
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-600">Sin ventas recientes</p>
              <p className="text-sm text-gray-500">Las ventas aparecerán aquí</p>
            </div>
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
