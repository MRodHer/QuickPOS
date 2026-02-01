import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Tag, Percent, DollarSign, Copy, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { formatCurrency } from '../../lib/constants';

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number;
  times_used: number;
  min_purchase: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export function DiscountsPage() {
  const { currentBusiness } = useTenant();
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('1');
  const [minPurchase, setMinPurchase] = useState('0');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (currentBusiness) {
      loadDiscounts();
    }
  }, [currentBusiness]);

  const loadDiscounts = async () => {
    if (!currentBusiness) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('business_id', currentBusiness.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDiscounts(data);
    }
    setLoading(false);
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  const resetForm = () => {
    setCode('');
    setDescription('');
    setDiscountType('percentage');
    setDiscountValue('');
    setMaxUses('1');
    setMinPurchase('0');
    setExpiresAt('');
    setIsActive(true);
    setEditingDiscount(null);
  };

  const openModal = (discount?: DiscountCode) => {
    if (discount) {
      setEditingDiscount(discount);
      setCode(discount.code);
      setDescription(discount.description || '');
      setDiscountType(discount.discount_type);
      setDiscountValue(discount.discount_value.toString());
      setMaxUses(discount.max_uses.toString());
      setMinPurchase(discount.min_purchase.toString());
      setExpiresAt(discount.expires_at ? discount.expires_at.split('T')[0] : '');
      setIsActive(discount.is_active);
    } else {
      resetForm();
      generateRandomCode();
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;

    const discountData = {
      business_id: currentBusiness.id,
      code: code.toUpperCase().trim(),
      description: description || null,
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      max_uses: parseInt(maxUses),
      min_purchase: parseFloat(minPurchase) || 0,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      is_active: isActive,
    };

    if (editingDiscount) {
      const { error } = await supabase
        .from('discount_codes')
        .update(discountData)
        .eq('id', editingDiscount.id);

      if (error) {
        alert('Error al actualizar: ' + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('discount_codes')
        .insert(discountData);

      if (error) {
        if (error.code === '23505') {
          alert('Ya existe un cupón con ese código');
        } else {
          alert('Error al crear: ' + error.message);
        }
        return;
      }
    }

    setShowModal(false);
    resetForm();
    loadDiscounts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este cupón de descuento?')) return;

    const { error } = await supabase
      .from('discount_codes')
      .delete()
      .eq('id', id);

    if (!error) {
      loadDiscounts();
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleActive = async (discount: DiscountCode) => {
    const { error } = await supabase
      .from('discount_codes')
      .update({ is_active: !discount.is_active })
      .eq('id', discount.id);

    if (!error) {
      loadDiscounts();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Descuentos</h1>
          <p className="text-gray-600 mt-1">Gestiona cupones y códigos de descuento</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Nuevo Cupón
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : discounts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay cupones</h3>
          <p className="text-gray-600 mb-4">Crea tu primer cupón de descuento</p>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Crear Cupón
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Código</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Descuento</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Usos</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Estado</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Expira</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {discounts.map((discount) => {
                const remaining = discount.max_uses - discount.times_used;
                const isExpired = discount.expires_at && new Date(discount.expires_at) < new Date();
                const isUsedUp = remaining <= 0;

                return (
                  <tr key={discount.id} className={`hover:bg-gray-50 ${(!discount.is_active || isExpired || isUsedUp) ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-3 py-1 rounded font-mono text-sm font-bold">
                          {discount.code}
                        </code>
                        <button
                          onClick={() => handleCopyCode(discount.code)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Copiar código"
                        >
                          {copiedCode === discount.code ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {discount.description && (
                        <p className="text-sm text-gray-500 mt-1">{discount.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {discount.discount_type === 'percentage' ? (
                          <>
                            <Percent className="w-4 h-4 text-blue-600" />
                            <span className="font-semibold text-blue-600">{discount.discount_value}%</span>
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="font-semibold text-green-600">{formatCurrency(discount.discount_value)}</span>
                          </>
                        )}
                      </div>
                      {discount.min_purchase > 0 && (
                        <p className="text-xs text-gray-500">Min: {formatCurrency(discount.min_purchase)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${isUsedUp ? 'text-red-600' : 'text-gray-900'}`}>
                        {discount.times_used} / {discount.max_uses}
                      </span>
                      <p className="text-xs text-gray-500">
                        {remaining > 0 ? `${remaining} disponibles` : 'Agotado'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(discount)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          discount.is_active && !isExpired && !isUsedUp
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isUsedUp ? 'Agotado' : isExpired ? 'Expirado' : discount.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {discount.expires_at
                        ? new Date(discount.expires_at).toLocaleDateString('es-MX')
                        : 'Sin expiración'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal(discount)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(discount.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingDiscount ? 'Editar Cupón' : 'Nuevo Cupón'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código de descuento
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono uppercase"
                    placeholder="DESCUENTO10"
                    required
                  />
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
                  >
                    Generar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descuento de lanzamiento"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de descuento
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto fijo ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {discountType === 'percentage' ? 'Porcentaje' : 'Monto'}
                  </label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={discountType === 'percentage' ? '10' : '100'}
                    min="0"
                    max={discountType === 'percentage' ? '100' : undefined}
                    step={discountType === 'percentage' ? '1' : '0.01'}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de cupones
                  </label>
                  <input
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="10"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Compra mínima
                  </label>
                  <input
                    type="number"
                    value={minPurchase}
                    onChange={(e) => setMinPurchase(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de expiración (opcional)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Cupón activo
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {editingDiscount ? 'Guardar' : 'Crear Cupón'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
