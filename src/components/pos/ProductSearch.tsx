import { useState, useEffect, RefObject, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { formatCurrency } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import type { PriceLevel } from './POSPage';

interface ProductSearchProps {
  searchInputRef: RefObject<HTMLInputElement>;
  priceLevel: PriceLevel;
}

// Extract number from product name for sorting (e.g., "StemVet 10 Millones" -> 10)
const extractPresentation = (name: string): number => {
  const match = name.match(/(\d+)\s*(millones|mill|m)?/i);
  return match ? parseInt(match[1]) : 0;
};

// Category order for display (matches actual category names in database)
const CATEGORY_ORDER = ['Células Madre', 'Exosomas', 'Implantes'];

export function ProductSearch({ searchInputRef, priceLevel }: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Células Madre', 'Exosomas', 'Implantes']));
  const { currentBusiness } = useTenant();
  const addItem = useCartStore((state) => state.addItem);

  // Fetch all products with stock > 0
  useEffect(() => {
    if (!currentBusiness) return;

    const fetchProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('business_id', currentBusiness.id)
        .eq('is_active', true)
        .gt('stock_quantity', 0)
        .order('name');

      if (!error && data) {
        setAllProducts(data);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [currentBusiness]);

  // Filter and group products
  const groupedProducts = useMemo(() => {
    let filtered = allProducts;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.barcode?.includes(query)
      );
    }

    // Group by category
    const groups: Record<string, any[]> = {};
    filtered.forEach(product => {
      const categoryName = product.categories?.name || 'Otros';
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(product);
    });

    // Sort products within each category by presentation number
    Object.keys(groups).forEach(cat => {
      groups[cat].sort((a, b) => extractPresentation(a.name) - extractPresentation(b.name));
    });

    // Return sorted by category order
    const sorted: { category: string; products: any[] }[] = [];
    CATEGORY_ORDER.forEach(cat => {
      if (groups[cat]) {
        sorted.push({ category: cat, products: groups[cat] });
        delete groups[cat];
      }
    });
    // Add remaining categories
    Object.keys(groups).sort().forEach(cat => {
      sorted.push({ category: cat, products: groups[cat] });
    });

    return sorted;
  }, [allProducts, searchQuery]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const getProductPrice = (product: typeof products[0]) => {
    if (priceLevel === 'medical' && (product as any).price_medical) {
      return (product as any).price_medical;
    }
    if (priceLevel === 'public' && (product as any).price_public) {
      return (product as any).price_public;
    }
    return product.price;
  };

  const handleAddProduct = (product: typeof products[0]) => {
    if (product.track_stock && product.stock_quantity <= 0) {
      alert('Producto sin stock disponible');
      return;
    }

    addItem({
      productId: product.id,
      name: product.name,
      price: getProductPrice(product),
      taxRate: product.tax_rate,
      taxIncluded: product.tax_included,
      unit: product.unit,
      trackStock: product.track_stock,
      availableStock: product.stock_quantity,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[calc(100vh-16rem)] flex flex-col">
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, SKU o código de barras..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : groupedProducts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            {searchQuery ? 'No se encontraron productos' : 'No hay productos con stock disponible'}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedProducts.map(({ category, products }) => (
              <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 transition"
                >
                  <span className="font-semibold text-gray-800">{category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{products.length} productos</span>
                    {expandedCategories.has(category) ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </button>

                {/* Products list */}
                {expandedCategories.has(category) && (
                  <div className="divide-y divide-gray-100">
                    {products.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleAddProduct(product)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition text-left"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{product.name}</h3>
                          <p className="text-sm text-gray-500">
                            Stock: {product.stock_quantity} {product.unit}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            priceLevel === 'medical' ? 'text-blue-700' :
                            priceLevel === 'public' ? 'text-green-700' : 'text-gray-900'
                          }`}>
                            {formatCurrency(getProductPrice(product))}
                          </p>
                          {priceLevel !== 'base' && getProductPrice(product) !== product.price && (
                            <p className="text-xs text-gray-400 line-through">
                              {formatCurrency(product.price)}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
