import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { formatCurrency, formatDateTime } from '../../lib/constants';
import type { Database } from '../../lib/supabase';
import {
  Search,
  Plus,
  Edit2,
  Users,
  X,
  ShoppingBag,
} from 'lucide-react';

type Customer = Database['public']['Tables']['customers']['Row'];

export function CustomersPage() {
  const { currentBusiness } = useTenant();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showDetail, setShowDetail] = useState<Customer | null>(null);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRfc, setFormRfc] = useState('');
  const [formStreet, setFormStreet] = useState('');
  const [formExtNumber, setFormExtNumber] = useState('');
  const [formIntNumber, setFormIntNumber] = useState('');
  const [formNeighborhood, setFormNeighborhood] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formZipCode, setFormZipCode] = useState('');
  const [formIsMedical, setFormIsMedical] = useState(false);
  const [formClinicName, setFormClinicName] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  const loadCustomers = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      let query = supabase
        .from('customers')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('name');

      if (search.trim()) {
        query = query.or(
          `name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%,rfc.ilike.%${search.trim()}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentBusiness) loadCustomers();
  }, [currentBusiness]);

  useEffect(() => {
    if (!currentBusiness) return;
    const timeout = setTimeout(loadCustomers, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const openForm = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormName(customer.name);
      setFormEmail(customer.email || '');
      setFormPhone(customer.phone || '');
      setFormRfc(customer.rfc || '');
      setFormStreet(customer.street || '');
      setFormExtNumber(customer.ext_number || '');
      setFormIntNumber(customer.int_number || '');
      setFormNeighborhood(customer.neighborhood || '');
      setFormCity(customer.city || '');
      setFormState(customer.state || '');
      setFormZipCode(customer.zip_code || '');
      setFormIsMedical(customer.is_medical || false);
      setFormClinicName(customer.clinic_name || '');
      setFormNotes(customer.notes || '');
    } else {
      setEditingCustomer(null);
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormRfc('');
      setFormStreet('');
      setFormExtNumber('');
      setFormIntNumber('');
      setFormNeighborhood('');
      setFormCity('');
      setFormState('');
      setFormZipCode('');
      setFormIsMedical(false);
      setFormClinicName('');
      setFormNotes('');
    }
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;
    setFormError('');
    setFormLoading(true);

    try {
      const data = {
        business_id: currentBusiness.id,
        name: formName.trim(),
        email: formEmail.trim() || null,
        phone: formPhone.trim() || null,
        rfc: formRfc.trim() || null,
        street: formStreet.trim() || null,
        ext_number: formExtNumber.trim() || null,
        int_number: formIntNumber.trim() || null,
        neighborhood: formNeighborhood.trim() || null,
        city: formCity.trim() || null,
        state: formState.trim() || null,
        zip_code: formZipCode.trim() || null,
        is_medical: formIsMedical,
        clinic_name: formClinicName.trim() || null,
        notes: formNotes.trim() || null,
        total_purchases: editingCustomer?.total_purchases || 0,
        visit_count: editingCustomer?.visit_count || 0,
        last_visit_at: editingCustomer?.last_visit_at || null,
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(data)
          .eq('id', editingCustomer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customers').insert(data);
        if (error) throw error;
      }

      closeForm();
      loadCustomers();
    } catch (err: any) {
      setFormError(err?.message || 'Error al guardar cliente');
    } finally {
      setFormLoading(false);
    }
  };

  const openDetail = async (customer: Customer) => {
    setShowDetail(customer);
    setPurchasesLoading(true);
    try {
      const { data } = await supabase
        .from('sales')
        .select('id, ticket_number, total, payment_method, created_at')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setPurchases(data || []);
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setPurchasesLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Nuevo Cliente
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email, teléfono o RFC..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Users className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">No se encontraron clientes</p>
            <p className="text-sm mt-1">Agrega tu primer cliente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Nombre</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Teléfono</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">RFC</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Compras</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Visitas</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{customer.name}</span>
                        {customer.is_medical && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Médico
                          </span>
                        )}
                      </div>
                      {customer.clinic_name && (
                        <p className="text-xs text-gray-500">{customer.clinic_name}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{customer.phone || '—'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{customer.email || '—'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{customer.rfc || '—'}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      {formatCurrency(customer.total_purchases)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-600">{customer.visit_count}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openDetail(customer)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Ver compras"
                        >
                          <ShoppingBag className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openForm(customer)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Nombre del cliente"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="10 dígitos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RFC</label>
                <input
                  type="text"
                  value={formRfc}
                  onChange={(e) => setFormRfc(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="RFC del cliente"
                />
              </div>

              <div className="border-t border-gray-200 pt-4 mt-2">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="isMedical"
                    checked={formIsMedical}
                    onChange={(e) => setFormIsMedical(e.target.checked)}
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <label htmlFor="isMedical" className="text-sm font-medium text-gray-700">
                    Es Médico / Veterinario
                  </label>
                  {formIsMedical && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      Precio médico aplicará
                    </span>
                  )}
                </div>

                {formIsMedical && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de Clínica / Consultorio
                    </label>
                    <input
                      type="text"
                      value={formClinicName}
                      onChange={(e) => setFormClinicName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      placeholder="Ej: Clínica Veterinaria San Marcos"
                    />
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4 mt-2">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Dirección</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Calle</label>
                    <input
                      type="text"
                      value={formStreet}
                      onChange={(e) => setFormStreet(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      placeholder="Nombre de la calle"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">No. Ext.</label>
                    <input
                      type="text"
                      value={formExtNumber}
                      onChange={(e) => setFormExtNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      placeholder="123"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">No. Int.</label>
                    <input
                      type="text"
                      value={formIntNumber}
                      onChange={(e) => setFormIntNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      placeholder="A, B..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Colonia</label>
                    <input
                      type="text"
                      value={formNeighborhood}
                      onChange={(e) => setFormNeighborhood(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      placeholder="Colonia"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Municipio</label>
                    <input
                      type="text"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      placeholder="Ciudad"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                    <input
                      type="text"
                      value={formState}
                      onChange={(e) => setFormState(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      placeholder="Estado"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">C.P.</label>
                    <input
                      type="text"
                      value={formZipCode}
                      onChange={(e) => setFormZipCode(e.target.value)}
                      maxLength={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      placeholder="12345"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="Notas adicionales"
                />
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading || !formName.trim()}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {formLoading ? 'Guardando...' : editingCustomer ? 'Actualizar' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{showDetail.name}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {showDetail.phone || showDetail.email || 'Sin contacto'}
                </p>
              </div>
              <button
                onClick={() => setShowDetail(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{showDetail.visit_count}</p>
                  <p className="text-xs text-blue-600">Visitas</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-green-700">{formatCurrency(showDetail.total_purchases)}</p>
                  <p className="text-xs text-green-600">Total</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-purple-700">
                    {showDetail.visit_count > 0
                      ? formatCurrency(showDetail.total_purchases / showDetail.visit_count)
                      : '$0.00'}
                  </p>
                  <p className="text-xs text-purple-600">Promedio</p>
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-3">Historial de Compras</h3>

              {purchasesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : purchases.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Sin compras registradas</p>
              ) : (
                <div className="space-y-2">
                  {purchases.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{sale.ticket_number}</p>
                        <p className="text-xs text-gray-600">{formatDateTime(sale.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(sale.total)}</p>
                        <p className="text-xs text-gray-600 capitalize">{sale.payment_method}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
