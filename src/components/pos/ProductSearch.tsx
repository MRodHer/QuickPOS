import { useState, RefObject } from 'react';
import { Search } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { useProducts } from '../../hooks/useProducts';
import { formatCurrency } from '../../lib/constants';

interface ProductSearchProps {
  searchInputRef: RefObject<HTMLInputElement>;
}

export function ProductSearch({ searchInputRef }: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { products, loading } = useProducts(searchQuery);
  const addItem = useCartStore((state) => state.addItem);

  const handleAddProduct = (product: typeof products[0]) => {
    if (product.track_stock && product.stock_quantity <= 0) {
      alert('Producto sin stock disponible');
      return;
    }

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
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
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            {searchQuery ? 'No se encontraron productos' : 'Busca un producto para comenzar'}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => handleAddProduct(product)}
                className="bg-gray-50 hover:bg-blue-50 border-2 border-transparent hover:border-blue-500 rounded-lg p-4 text-left transition group"
              >
                <div className="flex flex-col h-full">
                  <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-700">
                    {product.name}
                  </h3>
                  <div className="mt-auto">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(product.price)}</p>
                    {product.track_stock && (
                      <p
                        className={`text-xs mt-1 ${
                          product.stock_quantity <= product.stock_min
                            ? 'text-red-600 font-medium'
                            : 'text-gray-600'
                        }`}
                      >
                        Stock: {product.stock_quantity} {product.unit}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
