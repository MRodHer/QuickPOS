import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { formatCurrency, formatDateTime } from '../../lib/constants';
import { useExportData } from '../../hooks/useExportData';
import type { Database } from '../../lib/supabase';
import {
  Search,
  Receipt,
  Download,
  X,
  RotateCcw,
} from 'lucide-react';

type Sale = Database['public']['Tables']['sales']['Row'];
type SaleItem = Database['public']['Tables']['sale_items']['Row'];

export function SalesHistoryPage() {
  const { currentBusiness } = useTenant();
  const { exportCSV, exportExcel, isExporting } = useExportData();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [detailItems, setDetailItems] = useState<SaleItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const loadSales = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      let query = supabase
        .from('sales')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (search.trim()) {
        query = query.ilike('ticket_number', `%${search.trim()}%`);
      }
      if (filterMethod) query = query.eq('payment_method', filterMethod);
      if (filterStatus) query = query.eq('status', filterStatus);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

      const { data, error } = await query;
      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentBusiness) loadSales();
  }, [currentBusiness, filterMethod, filterStatus, dateFrom, dateTo]);

  useEffect(() => {
    if (!currentBusiness) return;
    const timeout = setTimeout(loadSales, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const openDetail = async (sale: Sale) => {
    setDetailSale(sale);
    setDetailLoading(true);
    try {
      const { data } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', sale.id);
      setDetailItems(data || []);
    } catch (error) {
      console.error('Error loading sale items:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!detailSale || !currentBusiness) return;
    setRefundError('');
    setRefundLoading(true);

    try {
      const { error } = await supabase
        .from('sales')
        .update({
          status: 'refunded',
          notes: `Devolución: ${refundReason.trim() || 'Sin razón especificada'}`,
        })
        .eq('id', detailSale.id);
      if (error) throw error;

      for (const item of detailItems) {
        if (item.product_id) {
          const { data: product } = await supabase
            .from('products')
            .select('stock_quantity, track_stock')
            .eq('id', item.product_id)
            .single();

          if (product?.track_stock) {
            await supabase
              .from('products')
              .update({ stock_quantity: product.stock_quantity + item.quantity })
              .eq('id', item.product_id);
          }
        }
      }

      setShowRefund(false);
      setRefundReason('');
      setDetailSale(null);
      loadSales();
    } catch (err: any) {
      setRefundError(err?.message || 'Error al procesar devolución');
    } finally {
      setRefundLoading(false);
    }
  };

  const handleExportCSV = () => {
    exportCSV(
      sales as unknown as Record<string, unknown>[],
      `ventas_${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'ticket_number', label: 'Ticket' },
        { key: 'total', label: 'Total' },
        { key: 'payment_method', label: 'Método de Pago' },
        { key: 'status', label: 'Estado' },
        { key: 'created_at', label: 'Fecha' },
      ]
    );
  };

  const handleExportExcel = () => {
    exportExcel(
      sales as unknown as Record<string, unknown>[],
      `ventas_${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'ticket_number', label: 'Ticket' },
        { key: 'subtotal', label: 'Subtotal' },
        { key: 'tax_amount', label: 'Impuesto' },
        { key: 'discount_amount', label: 'Descuento' },
        { key: 'total', label: 'Total' },
        { key: 'payment_method', label: 'Método de Pago' },
        { key: 'cash_amount', label: 'Efectivo' },
        { key: 'card_amount', label: 'Tarjeta' },
        { key: 'terminal_amount', label: 'Terminal' },
        { key: 'transfer_amount', label: 'Transferencia' },
        { key: 'status', label: 'Estado' },
        { key: 'created_at', label: 'Fecha' },
      ]
    );
  };

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: 'Completada',
      refunded: 'Devuelta',
      partial_refund: 'Dev. Parcial',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  };

  const statusColor = (status: string) => {
    if (status === 'completed') return 'bg-green-100 text-green-700';
    if (status === 'refunded') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  const methodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
      terminal: 'Terminal',
      mixed: 'Mixto',
    };
    return labels[method] || method;
  };

  const totalSales = sales.reduce((s, sale) => s + (sale.status === 'completed' ? sale.total : 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Historial de Ventas</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={isExporting || sales.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={handleExportExcel}
            disabled={isExporting || sales.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por número de ticket..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
            >
              <option value="">Todos los métodos</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="terminal">Terminal</option>
              <option value="transfer">Transferencia</option>
              <option value="mixed">Mixto</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
            >
              <option value="">Todos los estados</option>
              <option value="completed">Completada</option>
              <option value="refunded">Devuelta</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6 flex items-center justify-between">
          <span className="text-blue-700 font-medium">
            {sales.length} venta(s) encontrada(s)
          </span>
          <span className="text-blue-900 font-bold text-lg">
            Total: {formatCurrency(totalSales)}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Receipt className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">No se encontraron ventas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Ticket</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Fecha</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Método</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Subtotal</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Total</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Estado</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{sale.ticket_number}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{formatDateTime(sale.created_at)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{methodLabel(sale.payment_method)}</td>
                    <td className="py-3 px-4 text-right text-sm text-gray-600">
                      {formatCurrency(sale.subtotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColor(sale.status)}`}>
                        {statusLabel(sale.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openDetail(sale)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Ver detalle"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailSale && !showRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{detailSale.ticket_number}</h2>
                <p className="text-sm text-gray-600">{formatDateTime(detailSale.created_at)}</p>
              </div>
              <button onClick={() => setDetailSale(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {detailLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {detailItems.map((item) => (
                      <div key={item.id} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{item.product_name}</p>
                          <p className="text-sm text-gray-600">
                            {item.quantity} x {formatCurrency(item.unit_price)}
                            {item.discount_percent > 0 && ` (-${item.discount_percent}%)`}
                          </p>
                        </div>
                        <p className="font-bold text-gray-900">{formatCurrency(item.total)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(detailSale.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Impuesto</span>
                      <span>{formatCurrency(detailSale.tax_amount)}</span>
                    </div>
                    {detailSale.discount_amount > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Descuento</span>
                        <span>-{formatCurrency(detailSale.discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                      <span>Total</span>
                      <span>{formatCurrency(detailSale.total)}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
                    <p><span className="text-gray-600">Método:</span> <span className="font-medium">{methodLabel(detailSale.payment_method)}</span></p>
                    {detailSale.cash_amount > 0 && <p><span className="text-gray-600">Efectivo:</span> {formatCurrency(detailSale.cash_amount)}</p>}
                    {detailSale.card_amount > 0 && <p><span className="text-gray-600">Tarjeta:</span> {formatCurrency(detailSale.card_amount)}</p>}
                    {detailSale.terminal_amount > 0 && <p><span className="text-gray-600">Terminal:</span> {formatCurrency(detailSale.terminal_amount)}</p>}
                    {detailSale.transfer_amount > 0 && <p><span className="text-gray-600">Transferencia:</span> {formatCurrency(detailSale.transfer_amount)}</p>}
                    {detailSale.change_amount > 0 && <p><span className="text-gray-600">Cambio:</span> {formatCurrency(detailSale.change_amount)}</p>}
                  </div>

                  {detailSale.notes && (
                    <div className="bg-yellow-50 rounded-lg p-3 text-sm text-yellow-800">
                      {detailSale.notes}
                    </div>
                  )}

                  {detailSale.status === 'completed' && (
                    <button
                      onClick={() => setShowRefund(true)}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Procesar Devolución
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showRefund && detailSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-red-600">Confirmar Devolución</h2>
              <button onClick={() => { setShowRefund(false); setRefundReason(''); setRefundError(''); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">
                  Se devolverá el ticket <strong>{detailSale.ticket_number}</strong> por{' '}
                  <strong>{formatCurrency(detailSale.total)}</strong>. El stock de los productos será restaurado.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Razón de la devolución</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="Motivo de la devolución..."
                />
              </div>

              {refundError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {refundError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowRefund(false); setRefundReason(''); setRefundError(''); }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRefund}
                  disabled={refundLoading}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {refundLoading ? 'Procesando...' : 'Confirmar Devolución'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
