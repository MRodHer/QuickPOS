import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { formatCurrency } from '../../lib/constants';
import { useExportData } from '../../hooks/useExportData';
import { usePDFExport } from '../../hooks/usePDFExport';
import {
  SalesAreaChart,
  SalesBarChart,
  PaymentPieChart,
  ComparisonLineChart,
} from '../charts/SalesChart';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  CreditCard,
  Banknote,
  Download,
  FileText,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Package,
} from 'lucide-react';

interface PeriodData {
  totalSales: number;
  totalTickets: number;
  averageTicket: number;
  cashAmount: number;
  cardAmount: number;
  terminalAmount: number;
  transferAmount: number;
  refundsAmount: number;
  refundsCount: number;
  topProducts: Array<{ name: string; quantity: number; total: number }>;
  dailyBreakdown: Array<{ date: string; total: number; tickets: number }>;
}

type Period = 'today' | 'week' | 'month' | 'custom';

export function ReportsPage() {
  const { currentBusiness } = useTenant();
  const { exportCSV, exportExcel, isExporting } = useExportData();
  const { exportSalesReportPDF } = usePDFExport();
  const [period, setPeriod] = useState<Period>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<PeriodData>({
    totalSales: 0,
    totalTickets: 0,
    averageTicket: 0,
    cashAmount: 0,
    cardAmount: 0,
    terminalAmount: 0,
    transferAmount: 0,
    refundsAmount: 0,
    refundsCount: 0,
    topProducts: [],
    dailyBreakdown: [],
  });
  const [prevData, setPrevData] = useState<PeriodData | null>(null);
  const [loading, setLoading] = useState(true);

  const getDateRange = (p: Period): { from: string; to: string; prevFrom: string; prevTo: string } => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (p === 'today') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        from: today,
        to: today,
        prevFrom: yesterday.toISOString().split('T')[0],
        prevTo: yesterday.toISOString().split('T')[0],
      };
    }

    if (p === 'week') {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - (day === 0 ? 6 : day - 1));
      const prevStart = new Date(startOfWeek);
      prevStart.setDate(prevStart.getDate() - 7);
      const prevEnd = new Date(startOfWeek);
      prevEnd.setDate(prevEnd.getDate() - 1);
      return {
        from: startOfWeek.toISOString().split('T')[0],
        to: today,
        prevFrom: prevStart.toISOString().split('T')[0],
        prevTo: prevEnd.toISOString().split('T')[0],
      };
    }

    if (p === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        from: startOfMonth.toISOString().split('T')[0],
        to: today,
        prevFrom: prevMonthStart.toISOString().split('T')[0],
        prevTo: prevMonthEnd.toISOString().split('T')[0],
      };
    }

    return {
      from: customFrom || today,
      to: customTo || today,
      prevFrom: '',
      prevTo: '',
    };
  };

  const fetchPeriodData = async (from: string, to: string): Promise<PeriodData> => {
    if (!currentBusiness) {
      return {
        totalSales: 0, totalTickets: 0, averageTicket: 0,
        cashAmount: 0, cardAmount: 0, terminalAmount: 0, transferAmount: 0,
        refundsAmount: 0, refundsCount: 0, topProducts: [], dailyBreakdown: [],
      };
    }

    const { data: sales } = await supabase
      .from('sales')
      .select('total, payment_method, cash_amount, card_amount, terminal_amount, transfer_amount, status, created_at')
      .eq('business_id', currentBusiness.id)
      .gte('created_at', from)
      .lte('created_at', to + 'T23:59:59');

    const completedSales = (sales || []).filter((s) => s.status === 'completed');
    const refundedSales = (sales || []).filter((s) => s.status === 'refunded');

    const totalSales = completedSales.reduce((s, sale) => s + sale.total, 0);
    const totalTickets = completedSales.length;
    const averageTicket = totalTickets > 0 ? totalSales / totalTickets : 0;
    const cashAmount = completedSales.reduce((s, sale) => s + (sale.cash_amount || 0), 0);
    const cardAmount = completedSales.reduce((s, sale) => s + (sale.card_amount || 0), 0);
    const terminalAmount = completedSales.reduce((s, sale) => s + (sale.terminal_amount || 0), 0);
    const transferAmount = completedSales.reduce((s, sale) => s + (sale.transfer_amount || 0), 0);
    const refundsAmount = refundedSales.reduce((s, sale) => s + sale.total, 0);
    const refundsCount = refundedSales.length;

    // Top products
    const { data: saleIds } = await supabase
      .from('sales')
      .select('id')
      .eq('business_id', currentBusiness.id)
      .eq('status', 'completed')
      .gte('created_at', from)
      .lte('created_at', to + 'T23:59:59');

    let topProducts: PeriodData['topProducts'] = [];
    if (saleIds && saleIds.length > 0) {
      const ids = saleIds.map((s) => s.id);
      const { data: items } = await supabase
        .from('sale_items')
        .select('product_name, quantity, total')
        .in('sale_id', ids);

      if (items) {
        const productMap = new Map<string, { quantity: number; total: number }>();
        items.forEach((item) => {
          const existing = productMap.get(item.product_name) || { quantity: 0, total: 0 };
          productMap.set(item.product_name, {
            quantity: existing.quantity + item.quantity,
            total: existing.total + item.total,
          });
        });
        topProducts = Array.from(productMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);
      }
    }

    // Daily breakdown
    const dailyMap = new Map<string, { total: number; tickets: number }>();
    completedSales.forEach((sale) => {
      const date = sale.created_at.split('T')[0];
      const existing = dailyMap.get(date) || { total: 0, tickets: 0 };
      dailyMap.set(date, { total: existing.total + sale.total, tickets: existing.tickets + 1 });
    });
    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalSales, totalTickets, averageTicket,
      cashAmount, cardAmount, terminalAmount, transferAmount,
      refundsAmount, refundsCount, topProducts, dailyBreakdown,
    };
  };

  const loadReport = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      const range = getDateRange(period);
      const currentData = await fetchPeriodData(range.from, range.to);
      setData(currentData);

      if (range.prevFrom && range.prevTo) {
        const prev = await fetchPeriodData(range.prevFrom, range.prevTo);
        setPrevData(prev);
      } else {
        setPrevData(null);
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [currentBusiness, period, customFrom, customTo]);

  const percentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const handleExportExcel = () => {
    const rows = data.dailyBreakdown.map((d) => ({
      date: d.date,
      total: d.total,
      tickets: d.tickets,
      average: d.tickets > 0 ? d.total / d.tickets : 0,
    }));
    exportExcel(
      rows as unknown as Record<string, unknown>[],
      `reporte_${period}_${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'date', label: 'Fecha' },
        { key: 'total', label: 'Total Ventas' },
        { key: 'tickets', label: 'Tickets' },
        { key: 'average', label: 'Promedio' },
      ]
    );
  };

  const handleExportPDF = () => {
    const range = getDateRange(period);
    exportSalesReportPDF(
      currentBusiness?.name || 'Mi Negocio',
      period,
      { from: range.from, to: range.to },
      data
    );
  };

  const salesChange = prevData ? percentChange(data.totalSales, prevData.totalSales) : null;
  const ticketsChange = prevData ? percentChange(data.totalTickets, prevData.totalTickets) : null;

  const maxDailyTotal = Math.max(...data.dailyBreakdown.map((d) => d.total), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            disabled={data.dailyBreakdown.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            disabled={isExporting || data.dailyBreakdown.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['today', 'week', 'month', 'custom'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {p === 'today' && 'Hoy'}
            {p === 'week' && 'Esta Semana'}
            {p === 'month' && 'Este Mes'}
            {p === 'custom' && 'Personalizado'}
          </button>
        ))}

        {period === 'custom' && (
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <span className="text-gray-500">a</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ventas Totales</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data.totalSales)}</p>
                  {salesChange !== null && (
                    <div className={`flex items-center gap-1 mt-1 text-sm ${salesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {salesChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {Math.abs(salesChange).toFixed(1)}% vs periodo anterior
                    </div>
                  )}
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tickets</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{data.totalTickets}</p>
                  {ticketsChange !== null && (
                    <div className={`flex items-center gap-1 mt-1 text-sm ${ticketsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {ticketsChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {Math.abs(ticketsChange).toFixed(1)}%
                    </div>
                  )}
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ticket Promedio</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data.averageTicket)}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Devoluciones</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(data.refundsAmount)}</p>
                  <p className="text-xs text-gray-500 mt-1">{data.refundsCount} devolución(es)</p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Desglose por Método de Pago</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Banknote className="w-5 h-5 text-green-600" />
                  <p className="text-sm font-medium text-green-700">Efectivo</p>
                </div>
                <p className="text-xl font-bold text-green-900">{formatCurrency(data.cashAmount)}</p>
                {data.totalSales > 0 && (
                  <p className="text-xs text-green-600 mt-1">{((data.cashAmount / data.totalSales) * 100).toFixed(1)}%</p>
                )}
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <p className="text-sm font-medium text-blue-700">Tarjeta</p>
                </div>
                <p className="text-xl font-bold text-blue-900">{formatCurrency(data.cardAmount)}</p>
                {data.totalSales > 0 && (
                  <p className="text-xs text-blue-600 mt-1">{((data.cardAmount / data.totalSales) * 100).toFixed(1)}%</p>
                )}
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                  <p className="text-sm font-medium text-purple-700">Terminal</p>
                </div>
                <p className="text-xl font-bold text-purple-900">{formatCurrency(data.terminalAmount)}</p>
                {data.totalSales > 0 && (
                  <p className="text-xs text-purple-600 mt-1">{((data.terminalAmount / data.totalSales) * 100).toFixed(1)}%</p>
                )}
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                  <p className="text-sm font-medium text-yellow-700">Transferencia</p>
                </div>
                <p className="text-xl font-bold text-yellow-900">{formatCurrency(data.transferAmount)}</p>
                {data.totalSales > 0 && (
                  <p className="text-xs text-yellow-600 mt-1">{((data.transferAmount / data.totalSales) * 100).toFixed(1)}%</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Trend Chart */}
            {data.dailyBreakdown.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Tendencia de Ventas</h2>
                <SalesAreaChart
                  data={data.dailyBreakdown.map((d) => ({
                    name: new Date(d.date + 'T12:00:00').toLocaleDateString('es-MX', {
                      weekday: 'short',
                      day: 'numeric',
                    }),
                    value: d.total,
                  }))}
                  height={280}
                />
              </div>
            )}

            {/* Payment Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Métodos de Pago</h2>
              <PaymentPieChart
                data={[
                  { name: 'Efectivo', value: data.cashAmount },
                  { name: 'Tarjeta', value: data.cardAmount },
                  { name: 'Terminal', value: data.terminalAmount },
                  { name: 'Transferencia', value: data.transferAmount },
                ]}
                height={280}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Breakdown Bar Chart */}
            {data.dailyBreakdown.length > 1 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Ventas por Día</h2>
                <SalesBarChart
                  data={data.dailyBreakdown.map((d) => ({
                    name: new Date(d.date + 'T12:00:00').toLocaleDateString('es-MX', {
                      weekday: 'short',
                      day: 'numeric',
                    }),
                    value: d.total,
                  }))}
                  color="#10B981"
                  height={280}
                />
              </div>
            )}

            {/* Top Products */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Productos Más Vendidos</h2>
              {data.topProducts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Sin datos de productos</p>
              ) : (
                <div className="space-y-3">
                  {data.topProducts.map((product, i) => (
                    <div key={product.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-400 w-6">{i + 1}</span>
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-600">{product.quantity} unidades</p>
                        </div>
                      </div>
                      <p className="font-bold text-gray-900">{formatCurrency(product.total)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
