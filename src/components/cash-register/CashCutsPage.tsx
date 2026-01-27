import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { formatCurrency, formatDateTime, formatDate } from '../../lib/constants';
import { useExportData } from '../../hooks/useExportData';
import type { Database } from '../../lib/supabase';
import {
  Calendar,
  DollarSign,
  Download,
  X,
  Banknote,
  CreditCard,
} from 'lucide-react';

type CashRegister = Database['public']['Tables']['cash_registers']['Row'];

interface CutSummary {
  period: string;
  periodLabel: string;
  registers: CashRegister[];
  totalSales: number;
  totalCash: number;
  totalCard: number;
  totalTerminal: number;
  totalTransfer: number;
  totalRefunds: number;
  saleCount: number;
  totalCommissions: number;
}

type View = 'weekly' | 'monthly';

export function CashCutsPage() {
  const { currentBusiness } = useTenant();
  const { exportExcel, isExporting } = useExportData();
  const [view, setView] = useState<View>('weekly');
  const [cuts, setCuts] = useState<CutSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailCut, setDetailCut] = useState<CutSummary | null>(null);

  const loadCuts = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      const { data: registers } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .eq('is_open', false)
        .order('closed_at', { ascending: false })
        .limit(200);

      if (!registers || registers.length === 0) {
        setCuts([]);
        setLoading(false);
        return;
      }

      const grouped = new Map<string, CashRegister[]>();

      registers.forEach((reg) => {
        if (!reg.closed_at) return;
        const date = new Date(reg.closed_at);
        let key: string;

        if (view === 'weekly') {
          const startOfWeek = new Date(date);
          const day = startOfWeek.getDay();
          startOfWeek.setDate(startOfWeek.getDate() - (day === 0 ? 6 : day - 1));
          key = startOfWeek.toISOString().split('T')[0];
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(reg);
      });

      const summaries: CutSummary[] = Array.from(grouped.entries()).map(([period, regs]) => {
        let periodLabel: string;
        if (view === 'weekly') {
          const start = new Date(period + 'T12:00:00');
          const end = new Date(start);
          end.setDate(end.getDate() + 6);
          periodLabel = `${start.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        } else {
          const [year, month] = period.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          periodLabel = date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
        }

        return {
          period,
          periodLabel,
          registers: regs,
          totalSales: regs.reduce((s, r) => s + r.total_sales, 0),
          totalCash: regs.reduce((s, r) => s + r.total_cash, 0),
          totalCard: regs.reduce((s, r) => s + r.total_card, 0),
          totalTerminal: regs.reduce((s, r) => s + r.total_terminal, 0),
          totalTransfer: regs.reduce((s, r) => s + r.total_transfer, 0),
          totalRefunds: regs.reduce((s, r) => s + r.total_refunds, 0),
          saleCount: regs.reduce((s, r) => s + r.sale_count, 0),
          totalCommissions: regs.reduce((s, r) => s + r.total_terminal_commissions, 0),
        };
      });

      setCuts(summaries);
    } catch (error) {
      console.error('Error loading cash cuts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCuts();
  }, [currentBusiness, view]);

  const handleExport = () => {
    const rows = cuts.map((cut) => ({
      periodo: cut.periodLabel,
      ventas_total: cut.totalSales,
      efectivo: cut.totalCash,
      tarjeta: cut.totalCard,
      terminal: cut.totalTerminal,
      transferencia: cut.totalTransfer,
      devoluciones: cut.totalRefunds,
      comisiones: cut.totalCommissions,
      tickets: cut.saleCount,
      cierres: cut.registers.length,
    }));
    exportExcel(
      rows as unknown as Record<string, unknown>[],
      `cortes_${view}_${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'periodo', label: 'Periodo' },
        { key: 'ventas_total', label: 'Ventas Total' },
        { key: 'efectivo', label: 'Efectivo' },
        { key: 'tarjeta', label: 'Tarjeta' },
        { key: 'terminal', label: 'Terminal' },
        { key: 'transferencia', label: 'Transferencia' },
        { key: 'devoluciones', label: 'Devoluciones' },
        { key: 'comisiones', label: 'Comisiones Terminal' },
        { key: 'tickets', label: 'Tickets' },
        { key: 'cierres', label: 'Cierres de Caja' },
      ]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Cortes de Caja</h1>
        <button
          onClick={handleExport}
          disabled={isExporting || cuts.length === 0}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setView('weekly')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            view === 'weekly'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Semanal
        </button>
        <button
          onClick={() => setView('monthly')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            view === 'monthly'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Mensual
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : cuts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Calendar className="w-16 h-16 mb-4 text-gray-300" />
          <p className="text-lg font-medium">No hay cortes de caja</p>
          <p className="text-sm mt-1">Los cortes aparecerán cuando cierres cajas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cuts.map((cut) => (
            <div
              key={cut.period}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition"
              onClick={() => setDetailCut(cut)}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 capitalize">{cut.periodLabel}</h3>
                  <p className="text-sm text-gray-600">
                    {cut.registers.length} cierre(s) · {cut.saleCount} ticket(s)
                  </p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(cut.totalSales)}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600 font-medium">Efectivo</p>
                  <p className="text-lg font-bold text-green-900">{formatCurrency(cut.totalCash)}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium">Tarjeta</p>
                  <p className="text-lg font-bold text-blue-900">{formatCurrency(cut.totalCard)}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-600 font-medium">Terminal</p>
                  <p className="text-lg font-bold text-purple-900">{formatCurrency(cut.totalTerminal)}</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-xs text-yellow-600 font-medium">Transferencia</p>
                  <p className="text-lg font-bold text-yellow-900">{formatCurrency(cut.totalTransfer)}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-600 font-medium">Devoluciones</p>
                  <p className="text-lg font-bold text-red-900">{formatCurrency(cut.totalRefunds)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {detailCut && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-gray-900 capitalize">
                  Corte: {detailCut.periodLabel}
                </h2>
                <p className="text-sm text-gray-600">
                  {detailCut.registers.length} cierre(s) de caja
                </p>
              </div>
              <button onClick={() => setDetailCut(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(detailCut.totalSales)}</p>
                  <p className="text-xs text-gray-600">Ventas Totales</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{detailCut.saleCount}</p>
                  <p className="text-xs text-gray-600">Tickets</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {detailCut.saleCount > 0 ? formatCurrency(detailCut.totalSales / detailCut.saleCount) : '$0.00'}
                  </p>
                  <p className="text-xs text-gray-600">Promedio</p>
                </div>
              </div>

              {/* Payment breakdown */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Desglose de Pagos</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <Banknote className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-green-600">Efectivo</p>
                      <p className="font-bold text-green-900">{formatCurrency(detailCut.totalCash)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-blue-600">Tarjeta</p>
                      <p className="font-bold text-blue-900">{formatCurrency(detailCut.totalCard)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-purple-600">Terminal</p>
                      <p className="font-bold text-purple-900">{formatCurrency(detailCut.totalTerminal)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                    <DollarSign className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="text-sm text-yellow-600">Transferencia</p>
                      <p className="font-bold text-yellow-900">{formatCurrency(detailCut.totalTransfer)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {detailCut.totalCommissions > 0 && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm text-orange-600">Comisiones de Terminal</p>
                  <p className="text-xl font-bold text-orange-900">{formatCurrency(detailCut.totalCommissions)}</p>
                </div>
              )}

              {/* Individual register closings */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Detalle de Cierres</h3>
                <div className="space-y-2">
                  {detailCut.registers.map((reg) => (
                    <div key={reg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">
                          {reg.closed_at ? formatDateTime(reg.closed_at) : '—'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {reg.sale_count} tickets · Fondo: {formatCurrency(reg.opening_amount)}
                          {reg.difference !== null && reg.difference !== 0 && (
                            <span className={reg.difference > 0 ? ' text-green-600' : ' text-red-600'}>
                              {' '}· Diferencia: {formatCurrency(reg.difference)}
                            </span>
                          )}
                        </p>
                      </div>
                      <p className="font-bold text-gray-900">{formatCurrency(reg.total_sales)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
