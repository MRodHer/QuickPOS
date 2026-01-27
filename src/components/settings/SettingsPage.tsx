import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { BUSINESS_TYPES, TERMINAL_PROVIDERS } from '../../lib/constants';
import type { Database } from '../../lib/supabase';
import {
  Settings,
  Store,
  Users,
  CreditCard,
  Receipt,
  Plus,
  Edit2,
  X,
  Trash2,
  Save,
} from 'lucide-react';

type Business = Database['public']['Tables']['businesses']['Row'];
type TerminalConfig = Database['public']['Tables']['terminal_configs']['Row'];

type Tab = 'business' | 'receipt' | 'tax' | 'terminals' | 'staff';

export function SettingsPage() {
  const { currentBusiness, refreshBusiness } = useTenant();
  const [activeTab, setActiveTab] = useState<Tab>('business');

  const tabs = [
    { id: 'business' as Tab, label: 'Negocio', icon: Store },
    { id: 'receipt' as Tab, label: 'Tickets', icon: Receipt },
    { id: 'tax' as Tab, label: 'Impuestos', icon: Settings },
    { id: 'terminals' as Tab, label: 'Terminales', icon: CreditCard },
    { id: 'staff' as Tab, label: 'Personal', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>

      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'business' && <BusinessSettings />}
      {activeTab === 'receipt' && <ReceiptSettings />}
      {activeTab === 'tax' && <TaxSettings />}
      {activeTab === 'terminals' && <TerminalSettings />}
      {activeTab === 'staff' && <StaffSettings />}
    </div>
  );
}

function BusinessSettings() {
  const { currentBusiness, refreshBusiness } = useTenant();
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [rfc, setRfc] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentBusiness) {
      setName(currentBusiness.name);
      setBusinessType(currentBusiness.business_type || '');
      setRfc(currentBusiness.rfc || '');
      setAddress(currentBusiness.address || '');
      setPhone(currentBusiness.phone || '');
      setEmail(currentBusiness.email || '');
    }
  }, [currentBusiness]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;
    setLoading(true);
    setSaved(false);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          name: name.trim(),
          business_type: businessType || null,
          rfc: rfc.trim() || null,
          address: address.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
        })
        .eq('id', currentBusiness.id);
      if (error) throw error;
      await refreshBusiness();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving business:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Datos del Negocio</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Negocio *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Negocio</label>
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="">Seleccionar</option>
            {BUSINESS_TYPES.map((bt) => (
              <option key={bt.value} value={bt.value}>{bt.label}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RFC</label>
            <input
              type="text"
              value={rfc}
              onChange={(e) => setRfc(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          {saved && <span className="text-green-600 font-medium">Guardado correctamente</span>}
        </div>
      </form>
    </div>
  );
}

function ReceiptSettings() {
  const { currentBusiness, refreshBusiness } = useTenant();
  const [header, setHeader] = useState('');
  const [footer, setFooter] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentBusiness) {
      setHeader(currentBusiness.receipt_header);
      setFooter(currentBusiness.receipt_footer);
    }
  }, [currentBusiness]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;
    setLoading(true);
    setSaved(false);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ receipt_header: header, receipt_footer: footer })
        .eq('id', currentBusiness.id);
      if (error) throw error;
      await refreshBusiness();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving receipt settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Configuración de Tickets</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Encabezado del Ticket</label>
          <textarea
            value={header}
            onChange={(e) => setHeader(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            placeholder="Nombre del negocio, dirección, etc."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pie del Ticket</label>
          <textarea
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            placeholder="Gracias por su compra, etc."
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          {saved && <span className="text-green-600 font-medium">Guardado correctamente</span>}
        </div>
      </form>
    </div>
  );
}

function TaxSettings() {
  const { currentBusiness, refreshBusiness } = useTenant();
  const [taxRate, setTaxRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentBusiness) {
      setTaxRate((currentBusiness.default_tax_rate * 100).toString());
    }
  }, [currentBusiness]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;
    setLoading(true);
    setSaved(false);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ default_tax_rate: parseFloat(taxRate) / 100 })
        .eq('id', currentBusiness.id);
      if (error) throw error;
      await refreshBusiness();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving tax settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Configuración de Impuestos</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tasa de IVA por Defecto (%)</label>
          <input
            type="number"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            step="1"
            min="0"
            max="100"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <p className="text-sm text-gray-500 mt-1">Esta tasa se aplicará por defecto a los nuevos productos</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          {saved && <span className="text-green-600 font-medium">Guardado correctamente</span>}
        </div>
      </form>
    </div>
  );
}

function TerminalSettings() {
  const { currentBusiness } = useTenant();
  const [terminals, setTerminals] = useState<TerminalConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TerminalConfig | null>(null);
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formCommission, setFormCommission] = useState('');
  const [formDeviceId, setFormDeviceId] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const loadTerminals = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('terminal_configs')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('created_at');
      setTerminals(data || []);
    } catch (error) {
      console.error('Error loading terminals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTerminals();
  }, [currentBusiness]);

  const openForm = (terminal?: TerminalConfig) => {
    if (terminal) {
      setEditing(terminal);
      setFormName(terminal.name);
      setFormProvider(terminal.provider);
      setFormCommission(terminal.commission_percent.toString());
      setFormDeviceId(terminal.device_id || '');
    } else {
      setEditing(null);
      setFormName('');
      setFormProvider('');
      setFormCommission('3.6');
      setFormDeviceId('');
    }
    setFormError('');
    setShowForm(true);
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
        provider: formProvider,
        commission_percent: parseFloat(formCommission),
        device_id: formDeviceId.trim() || null,
        is_active: true,
        api_key_encrypted: null,
        settings: {},
      };

      if (editing) {
        const { error } = await supabase.from('terminal_configs').update(data).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('terminal_configs').insert(data);
        if (error) throw error;
      }

      setShowForm(false);
      loadTerminals();
    } catch (err: any) {
      setFormError(err?.message || 'Error al guardar terminal');
    } finally {
      setFormLoading(false);
    }
  };

  const deleteTerminal = async (id: string) => {
    if (!confirm('¿Eliminar esta configuración de terminal?')) return;
    try {
      await supabase.from('terminal_configs').delete().eq('id', id);
      loadTerminals();
    } catch (error) {
      console.error('Error deleting terminal:', error);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Terminales de Pago</h2>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Agregar Terminal
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : terminals.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No hay terminales configuradas</p>
      ) : (
        <div className="space-y-3">
          {terminals.map((terminal) => (
            <div key={terminal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{terminal.name}</p>
                <p className="text-sm text-gray-600">
                  {TERMINAL_PROVIDERS.find((p) => p.value === terminal.provider)?.label || terminal.provider}
                  {' · '}Comisión: {terminal.commission_percent}%
                  {terminal.device_id && ` · ID: ${terminal.device_id}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openForm(terminal)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteTerminal(terminal.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editing ? 'Editar Terminal' : 'Nueva Terminal'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
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
                  placeholder="Mi Terminal Clip"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
                <select
                  value={formProvider}
                  onChange={(e) => setFormProvider(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Seleccionar</option>
                  {TERMINAL_PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comisión (%)</label>
                <input
                  type="number"
                  value={formCommission}
                  onChange={(e) => setFormCommission(e.target.value)}
                  step="0.1"
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID del Dispositivo</label>
                <input
                  type="text"
                  value={formDeviceId}
                  onChange={(e) => setFormDeviceId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Opcional"
                />
              </div>
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{formError}</div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading || !formName.trim() || !formProvider}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {formLoading ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StaffSettings() {
  const { currentBusiness } = useTenant();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBusiness) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('business_staff')
          .select('*')
          .eq('business_id', currentBusiness.id)
          .order('created_at');
        setStaff(data || []);
      } catch (error) {
        console.error('Error loading staff:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentBusiness]);

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      owner: 'Propietario',
      admin: 'Administrador',
      manager: 'Gerente',
      cashier: 'Cajero',
      staff: 'Empleado',
    };
    return labels[role] || role;
  };

  const roleColor = (role: string) => {
    if (role === 'owner') return 'bg-purple-100 text-purple-700';
    if (role === 'admin') return 'bg-blue-100 text-blue-700';
    if (role === 'manager') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Personal del Negocio</h2>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : staff.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No hay personal registrado</p>
      ) : (
        <div className="space-y-3">
          {staff.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{member.display_name}</p>
                <p className="text-sm text-gray-600">{member.user_id.slice(0, 8)}...</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${roleColor(member.role)}`}>
                  {roleLabel(member.role)}
                </span>
                <span className={`w-2 h-2 rounded-full ${member.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
