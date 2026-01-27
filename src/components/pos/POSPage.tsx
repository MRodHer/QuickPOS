import { useState, useRef, useEffect } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { useCashRegisterStore } from '../../stores/cashRegisterStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { ProductSearch } from './ProductSearch';
import { CartPanel } from './CartPanel';
import { CheckoutModal } from './CheckoutModal';
import { AlertTriangle } from 'lucide-react';

export function POSPage() {
  const { currentBusiness } = useTenant();
  const { isOpen, loadCurrentRegister } = useCashRegisterStore();
  const [showCheckout, setShowCheckout] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentBusiness) {
      loadCurrentRegister(currentBusiness.id);
    }
  }, [currentBusiness, loadCurrentRegister]);

  useKeyboardShortcuts({
    F1: () => searchInputRef.current?.focus(),
    F2: () => isOpen && setShowCheckout(true),
    Escape: () => setShowCheckout(false),
  });

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Punto de Venta</h1>
        <div className="text-sm text-gray-600">
          <span className="font-medium">Atajos:</span> F1-Buscar | F2-Cobrar | F8-Limpiar
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6">
        <ProductSearch searchInputRef={searchInputRef} />
        <CartPanel onCheckout={() => setShowCheckout(true)} />
      </div>

      {showCheckout && <CheckoutModal onClose={() => setShowCheckout(false)} />}
    </div>
  );
}
