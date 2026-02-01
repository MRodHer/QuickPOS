import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { formatCurrency, formatDateTime } from '../../lib/constants';
import { useAuth } from '../../hooks/useAuth';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { BarcodeGenerator, generateCode128 } from '../barcode/BarcodeGenerator';
import { SalesBarChart, PaymentPieChart } from '../charts/SalesChart';
import type { Database } from '../../lib/supabase';
import {
  Search,
  Package,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  RotateCcw,
  X,
  Barcode,
  ScanLine,
  TrendingUp,
  DollarSign,
  Boxes,
  Download,
  FileText,
  Pencil,
} from 'lucide-react';

type Product = Database['public']['Tables']['products']['Row'];
type StockMovement = Database['public']['Tables']['stock_movements']['Row'];
type Category = Database['public']['Tables']['product_categories']['Row'];

interface AdjustmentModal {
  product: Product;
  type: 'purchase' | 'adjustment' | 'damage' | 'count';
}

interface BarcodeModal {
  product: Product;
}

interface EditModal {
  product: Product;
}

export function InventoryPage() {
  const { currentBusiness } = useTenant();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'stock' | 'low' | 'movements' | 'analytics'>('stock');
  const [adjustModal, setAdjustModal] = useState<AdjustmentModal | null>(null);
  const [barcodeModal, setBarcodeModal] = useState<BarcodeModal | null>(null);
  const [editModal, setEditModal] = useState<EditModal | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editPriceMedical, setEditPriceMedical] = useState('');
  const [editPricePublic, setEditPricePublic] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editBarcode, setEditBarcode] = useState('');
  const [editStockMin, setEditStockMin] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTaxRate, setEditTaxRate] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Scanner integration
  const { lastScan, isScanning, clearBarcode } = useBarcodeScanner({
    onScan: (barcode) => {
      setSearch(barcode);
      // Auto-search when scanner detects barcode
      const product = products.find(
        (p) => p.barcode === barcode || p.sku === barcode
      );
      if (product) {
        // Highlight or select the product
        const row = document.getElementById(`product-row-${product.id}`);
        row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row?.classList.add('bg-yellow-100');
        setTimeout(() => row?.classList.remove('bg-yellow-100'), 2000);
      }
    },
    enabled: view === 'stock' || view === 'low',
  });

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
        query = query.or(
          `name.ilike.%${search.trim()}%,sku.ilike.%${search.trim()}%,barcode.eq.${search.trim()}`
        );
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

  const loadCategories = async () => {
    if (!currentBusiness) return;
    const { data } = await supabase
      .from('product_categories')
      .select('*')
      .eq('business_id', currentBusiness.id)
      .eq('is_active', true);
    setCategories(data || []);
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
      loadCategories();
      loadMovements();
    }
  }, [currentBusiness]);

  useEffect(() => {
    if (!currentBusiness) return;
    const timeout = setTimeout(loadProducts, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Inventory statistics
  const lowStockProducts = products.filter((p) => p.stock_quantity <= p.stock_min);
  const totalInventoryValue = products.reduce(
    (sum, p) => sum + p.stock_quantity * p.cost,
    0
  );
  const totalProducts = products.length;
  const totalUnits = products.reduce((sum, p) => sum + p.stock_quantity, 0);

  // Category breakdown for analytics
  const categoryData = categories
    .map((cat) => {
      const catProducts = products.filter((p) => p.category_id === cat.id);
      const value = catProducts.reduce((sum, p) => sum + p.stock_quantity * p.cost, 0);
      return { name: cat.name, value };
    })
    .filter((c) => c.value > 0);

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

      const movementQty =
        adjustModal.type === 'count'
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

  const openEditModal = (product: Product) => {
    setEditName(product.name);
    setEditPrice(product.price.toString());
    setEditPriceMedical((product as any).price_medical?.toString() || '');
    setEditPricePublic((product as any).price_public?.toString() || '');
    setEditCost(product.cost.toString());
    setEditSku(product.sku || '');
    setEditBarcode(product.barcode || '');
    setEditStockMin(product.stock_min.toString());
    setEditCategory(product.category_id || '');
    setEditTaxRate((product.tax_rate * 100).toString());
    setEditError('');
    setEditModal({ product });
  };

  const closeEditModal = () => {
    setEditModal(null);
    setEditName('');
    setEditPrice('');
    setEditPriceMedical('');
    setEditPricePublic('');
    setEditCost('');
    setEditSku('');
    setEditBarcode('');
    setEditStockMin('');
    setEditCategory('');
    setEditTaxRate('');
    setEditError('');
  };

  const handleEditSave = async () => {
    if (!editModal || !currentBusiness) return;
    setEditError('');
    setEditLoading(true);

    try {
      const price = parseFloat(editPrice);
      const cost = parseFloat(editCost);
      const stockMin = parseFloat(editStockMin);
      const priceMedical = editPriceMedical ? parseFloat(editPriceMedical) : null;
      const pricePublic = editPricePublic ? parseFloat(editPricePublic) : null;
      const taxRate = parseFloat(editTaxRate) / 100; // Convert from percent to decimal

      if (isNaN(price) || price < 0) throw new Error('Precio inválido');
      if (isNaN(cost) || cost < 0) throw new Error('Costo inválido');
      if (isNaN(stockMin) || stockMin < 0) throw new Error('Stock mínimo inválido');
      if (isNaN(taxRate) || taxRate < 0) throw new Error('IVA inválido');
      if (!editName.trim()) throw new Error('El nombre es requerido');

      const { error } = await supabase
        .from('products')
        .update({
          name: editName.trim(),
          price,
          price_medical: priceMedical,
          price_public: pricePublic,
          cost,
          tax_rate: taxRate,
          sku: editSku.trim() || null,
          barcode: editBarcode.trim() || null,
          stock_min: stockMin,
          category_id: editCategory || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editModal.product.id);

      if (error) throw error;

      closeEditModal();
      loadProducts();
    } catch (err: any) {
      setEditError(err?.message || 'Error al guardar producto');
    } finally {
      setEditLoading(false);
    }
  };

  const generateBarcode = async (product: Product) => {
    if (!currentBusiness) return;

    const newBarcode = generateCode128(currentBusiness.slug?.toUpperCase().slice(0, 3) || 'PRD');

    const { error } = await supabase
      .from('products')
      .update({ barcode: newBarcode })
      .eq('id', product.id);

    if (!error) {
      loadProducts();
      setBarcodeModal({ ...barcodeModal!, product: { ...product, barcode: newBarcode } });
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

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Sin categoría';
    return categories.find((c) => c.id === categoryId)?.name || 'Sin categoría';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
          {isScanning && (
            <p className="text-sm text-blue-600 flex items-center gap-1 mt-1">
              <ScanLine className="w-4 h-4 animate-pulse" />
              Escaneando...
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lowStockProducts.length > 0 && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">{lowStockProducts.length} stock bajo</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 opacity-80" />
            <div>
              <p className="text-sm text-blue-100">Productos</p>
              <p className="text-2xl font-bold">{totalProducts}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <Boxes className="w-8 h-8 opacity-80" />
            <div>
              <p className="text-sm text-green-100">Unidades</p>
              <p className="text-2xl font-bold">{totalUnits.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 opacity-80" />
            <div>
              <p className="text-sm text-purple-100">Valor Total</p>
              <p className="text-2xl font-bold">{formatCurrency(totalInventoryValue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 opacity-80" />
            <div>
              <p className="text-sm text-red-100">Stock Bajo</p>
              <p className="text-2xl font-bold">{lowStockProducts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['stock', 'low', 'movements', 'analytics'] as const).map((v) => (
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
            {v === 'analytics' && 'Análisis'}
          </button>
        ))}
      </div>

      {/* Analytics View */}
      {view === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Valor por Categoría</h2>
            {categoryData.length > 0 ? (
              <PaymentPieChart data={categoryData} height={280} />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-500">
                Sin datos de categorías
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Top 10 por Valor</h2>
            <SalesBarChart
              data={products
                .map((p) => ({
                  name: p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name,
                  value: p.stock_quantity * p.cost,
                }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10)}
              color="#8B5CF6"
              height={280}
            />
          </div>
        </div>
      )}

      {/* Stock and Low Stock Views */}
      {(view === 'stock' || view === 'low') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, SKU o código de barras..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              {lastScan && (
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  Escaneado: {lastScan}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Package className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">
                {view === 'low'
                  ? 'No hay productos con stock bajo'
                  : 'No se encontraron productos'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Producto
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      SKU/Barcode
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Categoría
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Stock
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Mínimo
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Costo
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Valor
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayProducts.map((product) => (
                    <tr
                      key={product.id}
                      id={`product-row-${product.id}`}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {product.name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        <div>{product.sku || '—'}</div>
                        {product.barcode && (
                          <div className="text-xs text-gray-400">{product.barcode}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {getCategoryName(product.category_id)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-bold ${
                            product.stock_quantity <= product.stock_min
                              ? 'text-red-600'
                              : 'text-gray-900'
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
                            onClick={() => openEditModal(product)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                            title="Editar producto"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
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
                          <button
                            onClick={() => setBarcodeModal({ product })}
                            className="p-2 text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition"
                            title="Código de barras"
                          >
                            <Barcode className="w-5 h-5" />
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
      )}

      {/* Movements View */}
      {view === 'movements' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Últimos Movimientos</h2>
          {movements.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay movimientos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Fecha
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Producto
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Tipo
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Cantidad
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Anterior
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Nuevo
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Notas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((mov) => (
                    <tr key={mov.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDateTime(mov.created_at)}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {getProductName(mov.product_id)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-sm font-medium ${movementTypeColor(mov.type)}`}
                        >
                          {movementTypeLabel(mov.type)}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-medium ${
                          mov.quantity > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {mov.quantity > 0 ? '+' : ''}
                        {mov.quantity}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600">
                        {mov.previous_stock}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                        {mov.new_stock}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {mov.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Adjustment Modal */}
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
                  Stock actual: {adjustModal.product.stock_quantity}{' '}
                  {adjustModal.product.unit}
                </p>
              </div>
              <button
                onClick={() => {
                  setAdjustModal(null);
                  setAdjustQty('');
                  setAdjustNotes('');
                  setAdjustError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {adjustModal.type === 'count'
                    ? 'Stock real (conteo)'
                    : adjustModal.type === 'damage'
                    ? 'Cantidad perdida'
                    : 'Cantidad a agregar'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas (opcional)
                </label>
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
                  onClick={() => {
                    setAdjustModal(null);
                    setAdjustQty('');
                    setAdjustNotes('');
                    setAdjustError('');
                  }}
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

      {/* Barcode Modal */}
      {barcodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Código de Barras</h2>
                <p className="text-sm text-gray-600 mt-1">{barcodeModal.product.name}</p>
              </div>
              <button
                onClick={() => setBarcodeModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {barcodeModal.product.barcode ? (
                <BarcodeGenerator
                  value={barcodeModal.product.barcode}
                  productName={barcodeModal.product.name}
                  price={barcodeModal.product.price}
                />
              ) : (
                <div className="text-center py-8">
                  <Barcode className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600 mb-4">
                    Este producto no tiene código de barras
                  </p>
                  <button
                    onClick={() => generateBarcode(barcodeModal.product)}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition"
                  >
                    Generar Código de Barras
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Editar Producto</h2>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Nombre del producto"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo (compra)
                  </label>
                  <input
                    type="number"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Base *
                  </label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Precio Médicos
                  </label>
                  <input
                    type="number"
                    value={editPriceMedical}
                    onChange={(e) => setEditPriceMedical(e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50"
                    placeholder="Precio para médicos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-700 mb-1">
                    Precio Público
                  </label>
                  <input
                    type="number"
                    value={editPricePublic}
                    onChange={(e) => setEditPricePublic(e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-green-50"
                    placeholder="Precio al público"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="SKU-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código de Barras
                  </label>
                  <input
                    type="text"
                    value={editBarcode}
                    onChange={(e) => setEditBarcode(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="7501234567890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Mínimo
                  </label>
                  <input
                    type="number"
                    value={editStockMin}
                    onChange={(e) => setEditStockMin(e.target.value)}
                    step="1"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IVA %
                  </label>
                  <input
                    type="number"
                    value={editTaxRate}
                    onChange={(e) => setEditTaxRate(e.target.value)}
                    step="1"
                    min="0"
                    max="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="16"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {editError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeEditModal}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={editLoading || !editName.trim()}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {editLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
