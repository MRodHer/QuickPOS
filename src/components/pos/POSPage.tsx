import { useState, useRef, useEffect } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { useCashRegisterStore } from '../../stores/cashRegisterStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { ProductSearch } from './ProductSearch';
import { CartPanel } from './CartPanel';
import { CheckoutModal } from './CheckoutModal';
import { CameraScanner, ScanButton } from '../scanner/CameraScanner';
import { BluetoothPrinterStatus } from '../../hooks/useBluetoothPrinter';
import { AlertTriangle, Camera, Bluetooth, Users, UserCheck, User } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { supabase } from '../../lib/supabase';

export type PriceLevel = 'base' | 'medical' | 'public';

export function POSPage() {
  const { currentBusiness } = useTenant();
  const { isOpen, loadCurrentRegister } = useCashRegisterStore();
  const { addItem } = useCartStore();
  const [showCheckout, setShowCheckout] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [priceLevel, setPriceLevel] = useState<PriceLevel>('base');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Detect if on mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  useEffect(() => {
    if (currentBusiness) {
      loadCurrentRegister(currentBusiness.id);
    }
  }, [currentBusiness, loadCurrentRegister]);

  useKeyboardShortcuts({
    F1: () => searchInputRef.current?.focus(),
    F2: () => isOpen && setShowCheckout(true),
    F3: () => setShowScanner(true),
    Escape: () => {
      setShowCheckout(false);
      setShowScanner(false);
    },
  });

  const handleScan = async (barcode: string) => {
    if (!currentBusiness) return;

    // Close scanner
    setShowScanner(false);

    // Search for product by barcode
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .eq('barcode', barcode)
        .eq('active', true)
        .single();

      if (error || !product) {
        setScanFeedback(`No encontrado: ${barcode}`);
        setTimeout(() => setScanFeedback(null), 3000);
        return;
      }

      // Determine price based on level
      let selectedPrice = product.price;
      if (priceLevel === 'medical' && product.price_medical) {
        selectedPrice = product.price_medical;
      } else if (priceLevel === 'public' && product.price_public) {
        selectedPrice = product.price_public;
      }

      // Add to cart
      addItem({
        productId: product.id,
        name: product.name,
        price: selectedPrice,
        quantity: 1,
        taxRate: product.tax_rate || 0.16,
        taxIncluded: product.tax_included || false,
        trackStock: product.track_stock || false,
        maxStock: product.stock_quantity,
      });

      setScanFeedback(`Agregado: ${product.name}`);
      setTimeout(() => setScanFeedback(null), 2000);
    } catch (err) {
      console.error('Scan error:', err);
      setScanFeedback('Error al buscar producto');
      setTimeout(() => setScanFeedback(null), 3000);
    }
  };

  if (!isOpen) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="bg-red-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Caja Cerrada</h2>
          <p className="text-gray-600 mb-6">
            Para poder realizar ventas, primero debes abrir la caja.
          </p>
          <a
            href="/cash-register"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Ir a Caja
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Punto de Venta</h1>
        <div className="flex items-center gap-4">
          {/* Price Level Selector */}
          <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setPriceLevel('base')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                priceLevel === 'base'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Base</span>
            </button>
            <button
              onClick={() => setPriceLevel('medical')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                priceLevel === 'medical'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Médicos</span>
            </button>
            <button
              onClick={() => setPriceLevel('public')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                priceLevel === 'public'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Público</span>
            </button>
          </div>
          {/* Bluetooth printer status */}
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <Bluetooth className="w-4 h-4 text-gray-400" />
            <BluetoothPrinterStatus />
          </div>
          {/* Keyboard shortcuts (desktop only) */}
          <div className="hidden lg:block text-sm text-gray-600">
            <span className="font-medium">Atajos:</span> F1-Buscar | F2-Cobrar | F3-Escanear
          </div>
        </div>
      </div>

      {/* Scan feedback toast */}
      {scanFeedback && (
        <div
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse ${
            scanFeedback.includes('Agregado')
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {scanFeedback}
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6">
        <ProductSearch searchInputRef={searchInputRef} priceLevel={priceLevel} />
        <CartPanel onCheckout={() => setShowCheckout(true)} />
      </div>

      {/* Mobile scan button */}
      {isMobile && (
        <ScanButton
          onClick={() => setShowScanner(true)}
          className="bottom-24"
        />
      )}

      {/* Desktop scan button */}
      {!isMobile && (
        <button
          onClick={() => setShowScanner(true)}
          className="fixed bottom-4 right-4 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg flex items-center gap-2 hover:bg-blue-700 transition z-40"
        >
          <Camera className="w-5 h-5" />
          Escanear (F3)
        </button>
      )}

      {/* Camera Scanner Modal */}
      {showScanner && (
        <CameraScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          isOpen={showScanner}
        />
      )}

      {/* Checkout Modal */}
      {showCheckout && <CheckoutModal onClose={() => setShowCheckout(false)} />}
    </div>
  );
}
