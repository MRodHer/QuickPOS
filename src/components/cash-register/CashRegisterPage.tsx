import { useState, useEffect } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { useCashRegisterStore } from '../../stores/cashRegisterStore';
import { OpenRegisterModal } from './OpenRegisterModal';
import { CloseRegisterModal } from './CloseRegisterModal';
import { formatCurrency, formatDateTime } from '../../lib/constants';
import { DollarSign, CreditCard, Receipt, TrendingUp } from 'lucide-react';

export function CashRegisterPage() {
  const { currentBusiness } = useTenant();
  const { currentRegister, isOpen, loadCurrentRegister } = useCashRegisterStore();
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  useEffect(() => {
    if (currentBusiness) {
      loadCurrentRegister(currentBusiness.id);
    }
  }, [currentBusiness, loadCurrentRegister]);

  if (!isOpen || !currentRegister) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Caja</h1>

        <div className="flex items-center justify-center h-96">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
            <div className="bg-red-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <DollarSign className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Caja Cerrada</h2>
            <p className="text-gray-600 mb-6">
              No hay ninguna caja abierta. Abre la caja para comenzar a trabajar.
            </p>
            <button
              onClick={() => setShowOpenModal(true)}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition"
            >
              Abrir Caja
            </button>
          </div>
        </div>

        {showOpenModal && (
          <OpenRegisterModal onClose={() => setShowOpenModal(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Caja Abierta</h1>
        <button
          onClick={() => setShowCloseModal(true)}
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition"
        >
          Cerrar Caja
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Apertura:</p>
            <p className="font-medium text-gray-900">{formatDateTime(currentRegister.opened_at)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Fondo Inicial:</p>
            <p className="font-medium text-gray-900">
              {formatCurrency(currentRegister.opening_amount)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Ventas</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(currentRegister.total_sales)}
              </p>
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
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {currentRegister.sale_count}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Receipt className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Efectivo</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(currentRegister.total_cash)}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tarjeta/Terminal</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(currentRegister.total_card + currentRegister.total_terminal)}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <CreditCard className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Desglose de Pagos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Efectivo</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(currentRegister.total_cash)}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Tarjeta</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(currentRegister.total_card)}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Terminal</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(currentRegister.total_terminal)}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Transferencia</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(currentRegister.total_transfer)}
            </p>
          </div>
        </div>
      </div>

      {showCloseModal && (
        <CloseRegisterModal onClose={() => setShowCloseModal(false)} />
      )}
    </div>
  );
}
