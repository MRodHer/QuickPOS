import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { formatCurrency, formatDateTime } from '../../lib/constants';
import { useAuth } from '../../hooks/useAuth';
import type { Database } from '../../lib/supabase';
import {
  Search,
  Package,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  RotateCcw,
  X,
} from 'lucide-react';

type Product = Database['public']['Tables']['products']['Row'];
type StockMovement = Database['public']['Tables']['stock_movements']['Row'];

interface AdjustmentModal {
  product: Product;
  type: 'purchase' | 'adjustment' | 'damage' | 'count';
}

export function InventoryPage() {
  const { currentBusiness } = useTenant();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'stock' | 'low' | 'movements'>('stock');
  const [adjustModal, setAdjustModal] = useState<AdjustmentModal | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  const loadProducts = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .eq('is_active', true)
        .eq('track_stock', true)
        .order('name');

      if (search.trim()) {
        query = query.or(`name.ilike.%${search.trim()}%,sku.ilike.%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    if (!currentBusiness) return;
    try {
      const { data } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setMovements(data || []);
    } catch (error) {
      console.error('Error loading movements:', error);
    }
  };

  useEffect(() => {
    if (currentBusiness) {
      loadProducts();
      loadMovements();
    }
  }, [currentBusiness]);

  useEffect(() => {
    if (!currentBusiness) return;
    const timeout = setTimeout(loadProducts, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const lowStockProducts = products.filter((p) => p.stock_quantity <= p.stock_min);

  const displayProducts = view === 'low' ? lowStockProducts : products;

  const handleAdjustment = async () => {
    if (!adjustModal || !currentBusiness || !user) return;
    setAdjustError('');
    setAdjustLoading(true);

    try {
      const qty = parseFloat(adjustQty);
      if (isNaN(qty) || qty === 0) throw new Error('Cantidad inválida');

      const product = adjustModal.product;
      let newStock: number;

      if (adjustModal.type === 'count') {
        newStock = qty;
      } else if (adjustModal.type === 'damage') {
        newStock = product.stock_quantity - Math.abs(qty);
      } else {
        newStock = product.stock_quantity + Math.abs(qty);
      }

      if (newStock < 0) throw new Error('El stock no puede ser negativo');

      const movementQty = adjustModal.type === 'count'
        ? qty - product.stock_quantity
        : adjustModal.type === 'damage'
        ? -Math.abs(qty)
        : Math.abs(qty);

      const { error: moveError } = await supabase.from('stock_movements').insert({
        business_id: currentBusiness.id,
        product_id: product.id,
        user_id: user.id,
        type: adjustModal.type,
        quantity: movementQty,
        previous_stock: product.stock_quantity,
        new_stock: newStock,
        notes: adjustNotes.trim() || null,
        reference_id: null,
      });
      if (moveError) throw moveError;

      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', product.id);
      if (updateError) throw updateError;

      setAdjustModal(null);
      setAdjustQty('');
      setAdjustNotes('');
      loadProducts();
      loadMovements();
    } catch (err: any) {
      setAdjustError(err?.message || 'Error al ajustar inventario');
    } finally {
      setAdjustLoading(false);
    }
  };

  const movementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      purchase: 'Compra',
      sale: 'Venta',
      adjustment: 'Ajuste',
      return: 'Devolución',
      damage: 'Merma',
      count: 'Conteo',
    };
    return labels[type] || type;
  };

  const movementTypeColor = (type: string) => {
    if (type === 'purchase' || type === 'return') return 'text-green-600';
    if (type === 'sale' || type === 'damage') return 'text-red-600';
    return 'text-blue-600';
  };

  const getProductName = (productId: string) => {
    return products.find((p) => p.id === productId)?.name || productId.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
        {lowStockProducts.length > 0 && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">{lowStockProducts.length} producto(s) con stock bajo</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {(['stock', 'low', 'movements'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              view === v
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {v === 'stock' && 'Stock Actual'}
            {v === 'low' && `Stock Bajo (${lowStockProducts.length})`}
            {v === 'movements' && 'Movimientos'}
          </button>
        ))}
      </div>

      {view !== 'movements' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Package className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">
                {view === 'low' ? 'No hay productos con stock bajo' : 'No se encontraron productos'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Producto</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">SKU</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Stock</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Mínimo</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Costo</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Valor</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {displayProducts.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{product.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{product.sku || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-bold ${
                            product.stock_quantity <= product.stock_min ? 'text-red-600' : 'text-gray-900'
                          }`}
                        >
                          {product.stock_quantity} {product.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600">
                        {product.stock_min} {product.unit}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600">
                        {formatCurrency(product.cost)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {formatCurrency(product.stock_quantity * product.cost)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setAdjustModal({ product, type: 'purchase' })}
                            className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition"
                            title="Entrada (compra)"
                          >
                            <ArrowUpCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setAdjustModal({ product, type: 'damage' })}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                            title="Merma"
                          >
                            <ArrowDownCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setAdjustModal({ product, type: 'count' })}
                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                            title="Conteo físico"
                          >
                            <RotateCcw className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Últimos Movimientos</h2>
          {movements.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay movimientos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Fecha</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Producto</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Tipo</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Cantidad</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Anterior</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Nuevo</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((mov) => (
                    <tr key={mov.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600">{formatDateTime(mov.created_at)}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {getProductName(mov.product_id)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-medium ${movementTypeColor(mov.type)}`}>
                          {movementTypeLabel(mov.type)}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${
                        mov.quantity > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {mov.quantity > 0 ? '+' : ''}{mov.quantity}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600">{mov.previous_stock}</td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">{mov.new_stock}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{mov.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {adjustModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {adjustModal.type === 'purchase' && 'Entrada de Stock'}
                  {adjustModal.type === 'damage' && 'Registrar Merma'}
                  {adjustModal.type === 'count' && 'Conteo Físico'}
                  {adjustModal.type === 'adjustment' && 'Ajuste de Stock'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">{adjustModal.product.name}</p>
                <p className="text-sm text-gray-500">
                  Stock actual: {adjustModal.product.stock_quantity} {adjustModal.product.unit}
                </p>
              </div>
              <button
                onClick={() => { setAdjustModal(null); setAdjustQty(''); setAdjustNotes(''); setAdjustError(''); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {adjustModal.type === 'count' ? 'Stock real (conteo)' :
                   adjustModal.type === 'damage' ? 'Cantidad perdida' :
                   'Cantidad a agregar'}
                </label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder={adjustModal.type === 'count' ? 'Cantidad real' : 'Cantidad'}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Razón del movimiento"
                />
              </div>

              {adjustError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {adjustError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setAdjustModal(null); setAdjustQty(''); setAdjustNotes(''); setAdjustError(''); }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAdjustment}
                  disabled={adjustLoading || !adjustQty}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {adjustLoading ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
