import { useState, FormEvent } from 'react';
import { X } from 'lucide-react';
import { useCashRegisterStore } from '../../stores/cashRegisterStore';
import { formatCurrency } from '../../lib/constants';

interface CloseRegisterModalProps {
  onClose: () => void;
}

export function CloseRegisterModal({ onClose }: CloseRegisterModalProps) {
  const { currentRegister, closeRegister } = useCashRegisterStore();
  const [closingAmount, setClosingAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!currentRegister) return null;

  const expectedAmount =
    currentRegister.opening_amount +
    currentRegister.total_cash -
    currentRegister.total_refunds;

  const difference = closingAmount ? parseFloat(closingAmount) - expectedAmount : 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await closeRegister(parseFloat(closingAmount), notes);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cerrar caja');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Cerrar Caja</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Fondo Inicial:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(currentRegister.opening_amount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Ventas en Efectivo:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(currentRegister.total_cash)}
              </span>
            </div>
            <div className="flex justify-between font-bold border-t border-gray-200 pt-2">
              <span className="text-gray-900">Esperado:</span>
              <span className="text-gray-900">{formatCurrency(expectedAmount)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conteo Real de Efectivo
            </label>
            <input
              type="number"
              step="0.01"
              value={closingAmount}
              onChange={(e) => setClosingAmount(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg"
              placeholder="0.00"
            />
          </div>

          {closingAmount && (
            <div
              className={`p-4 rounded-lg ${
                difference === 0
                  ? 'bg-green-50 border border-green-200'
                  : difference > 0
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <p className="text-sm font-medium mb-1">Diferencia:</p>
              <p
                className={`text-2xl font-bold ${
                  difference === 0
                    ? 'text-green-700'
                    : difference > 0
                    ? 'text-blue-700'
                    : 'text-red-700'
                }`}
              >
                {difference > 0 && '+'}
                {formatCurrency(Math.abs(difference))}
              </p>
              <p className="text-xs mt-1">
                {difference === 0
                  ? 'Cuadra perfecto'
                  : difference > 0
                  ? 'Sobrante'
                  : 'Faltante'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              placeholder="Observaciones del cierre..."
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !closingAmount}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Cerrando...' : 'Cerrar Caja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
