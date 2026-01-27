import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { formatCurrency } from '../../lib/constants';
import { ProductForm } from './ProductForm';
import type { Database } from '../../lib/supabase';
import {
  Search,
  Plus,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Package,
  Filter,
} from 'lucide-react';

type Product = Database['public']['Tables']['products']['Row'];
type Category = Database['public']['Tables']['product_categories']['Row'];

export function ProductsPage() {
  const { currentBusiness } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadProducts = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('name');

      if (filterStatus === 'active') query = query.eq('is_active', true);
      if (filterStatus === 'inactive') query = query.eq('is_active', false);
      if (filterCategory) query = query.eq('category_id', filterCategory);
      if (search.trim()) {
        query = query.or(
          `name.ilike.%${search.trim()}%,sku.ilike.%${search.trim()}%,barcode.eq.${search.trim()}`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
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
      .eq('is_active', true)
      .order('sort_order');
    setCategories(data || []);
  };

  useEffect(() => {
    if (currentBusiness) {
      loadProducts();
      loadCategories();
    }
  }, [currentBusiness, filterCategory, filterStatus]);

  useEffect(() => {
    if (!currentBusiness) return;
    const timeout = setTimeout(loadProducts, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const toggleActive = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);
      if (error) throw error;
      loadProducts();
    } catch (error) {
      console.error('Error toggling product:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleSaved = () => {
    handleFormClose();
    loadProducts();
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '—';
    return categories.find((c) => c.id === categoryId)?.name || '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Nuevo Producto
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, SKU o código de barras..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="pl-9 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
              >
                <option value="">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Package className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">No se encontraron productos</p>
            <p className="text-sm mt-1">Agrega tu primer producto para comenzar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Producto</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">SKU</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Categoría</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Precio</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Costo</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Stock</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Estado</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        {product.is_service && (
                          <span className="text-xs text-purple-600 font-medium">Servicio</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{product.sku || '—'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{getCategoryName(product.category_id)}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-600">
                      {formatCurrency(product.cost)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {product.track_stock ? (
                        <span
                          className={`font-medium ${
                            product.stock_quantity <= product.stock_min
                              ? 'text-red-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {product.stock_quantity} {product.unit}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          product.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {product.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(product)}
                          className={`p-2 rounded-lg transition ${
                            product.is_active
                              ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={product.is_active ? 'Desactivar' : 'Activar'}
                        >
                          {product.is_active ? (
                            <ToggleRight className="w-5 h-5" />
                          ) : (
                            <ToggleLeft className="w-5 h-5" />
                          )}
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

      {showForm && (
        <ProductForm
          product={editingProduct}
          onClose={handleFormClose}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
