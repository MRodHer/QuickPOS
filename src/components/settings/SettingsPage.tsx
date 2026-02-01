import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { TERMINAL_PROVIDERS } from '../../lib/constants';
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
  Puzzle,
  Tag,
  Link2,
  Check,
} from 'lucide-react';

type Business = Database['public']['Tables']['businesses']['Row'];
type TerminalConfig = Database['public']['Tables']['terminal_configs']['Row'];

type Tab = 'business' | 'receipt' | 'tax' | 'terminals' | 'staff' | 'modules';

export function SettingsPage() {
  const { currentBusiness, refreshBusiness } = useTenant();
  const [activeTab, setActiveTab] = useState<Tab>('business');

  const tabs = [
    { id: 'business' as Tab, label: 'Negocio', icon: Store },
    { id: 'receipt' as Tab, label: 'Tickets', icon: Receipt },
    { id: 'tax' as Tab, label: 'Impuestos', icon: Settings },
    { id: 'terminals' as Tab, label: 'Terminales', icon: CreditCard },
    { id: 'staff' as Tab, label: 'Personal', icon: Users },
    { id: 'modules' as Tab, label: 'Módulos', icon: Puzzle },
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
      {activeTab === 'modules' && <ModuleSettings />}
    </div>
  );
}

function BusinessSettings() {
  const { currentBusiness, refreshBusiness } = useTenant();
  const [businessTypes, setBusinessTypes] = useState<{value: string; label: string}[]>([]);
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [customBusinessType, setCustomBusinessType] = useState('');
  const [rfc, setRfc] = useState('');
  const [street, setStreet] = useState('');
  const [extNumber, setExtNumber] = useState('');
  const [intNumber, setIntNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from('business_types')
      .select('value, label')
      .order('is_default', { ascending: false })
      .order('label')
      .then(({ data }) => setBusinessTypes(data || []));
  }, []);

  useEffect(() => {
    if (currentBusiness && businessTypes.length > 0) {
      setName(currentBusiness.name);
      const bt = currentBusiness.business_type || '';
      const isKnownType = businessTypes.some(t => t.value === bt);
      if (isKnownType) {
        setBusinessType(bt);
        setCustomBusinessType('');
      } else if (bt) {
        setBusinessType('otro');
        setCustomBusinessType(bt);
      } else {
        setBusinessType('');
        setCustomBusinessType('');
      }
      setRfc(currentBusiness.rfc || '');
      setStreet(currentBusiness.street || '');
      setExtNumber(currentBusiness.ext_number || '');
      setIntNumber(currentBusiness.int_number || '');
      setNeighborhood(currentBusiness.neighborhood || '');
      setCity(currentBusiness.city || '');
      setState(currentBusiness.state || '');
      setZipCode(currentBusiness.zip_code || '');
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
      let finalBusinessType = businessType;
      if (businessType === 'otro' && customBusinessType.trim()) {
        const customValue = customBusinessType.trim().toLowerCase().replace(/\s+/g, '_');
        finalBusinessType = customValue;
        // Insertar en la tabla de tipos si no existe
        await supabase.from('business_types').upsert({
          value: customValue,
          label: customBusinessType.trim(),
          is_default: false
        }, { onConflict: 'value' });
      }
      const { error } = await supabase
        .from('businesses')
        .update({
          name: name.trim(),
          business_type: finalBusinessType || null,
          rfc: rfc.trim() || null,
          street: street.trim() || null,
          ext_number: extNumber.trim() || null,
          int_number: intNumber.trim() || null,
          neighborhood: neighborhood.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          zip_code: zipCode.trim() || null,
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
            onChange={(e) => {
              setBusinessType(e.target.value);
              if (e.target.value !== 'otro') setCustomBusinessType('');
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="">Seleccionar</option>
            {businessTypes.map((bt) => (
              <option key={bt.value} value={bt.value}>{bt.label}</option>
            ))}
            <option value="otro">Otro...</option>
          </select>
        </div>
        {businessType === 'otro' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Especifica el tipo</label>
            <input
              type="text"
              value={customBusinessType}
              onChange={(e) => setCustomBusinessType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Ej: Farmacia, Veterinaria, Laboratorio..."
            />
          </div>
        )}
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
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Dirección</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Calle</label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Nombre de la calle"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número Ext.</label>
              <input
                type="text"
                value={extNumber}
                onChange={(e) => setExtNumber(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número Int.</label>
              <input
                type="text"
                value={intNumber}
                onChange={(e) => setIntNumber(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="A, B, 1..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Colonia</label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Colonia"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Municipio/Ciudad</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Ciudad"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Estado"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código Postal</label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                maxLength={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="12345"
              />
            </div>
          </div>
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
  const [showHelp, setShowHelp] = useState(false);
  const [editing, setEditing] = useState<TerminalConfig | null>(null);
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formCommission, setFormCommission] = useState('');
  const [formDeviceId, setFormDeviceId] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formSecretKey, setFormSecretKey] = useState('');
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const [validating, setValidating] = useState(false);
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
      setFormApiKey(terminal.api_key || terminal.api_key_encrypted || '');
      setFormSecretKey(terminal.secret_key || '');
    } else {
      setEditing(null);
      setFormName('');
      setFormProvider('');
      setFormCommission('3.6');
      setFormDeviceId('');
      setFormApiKey('');
      setFormSecretKey('');
    }
    setFormError('');
    setApiKeyValid(null);
    setShowForm(true);
  };

  const validateApiKey = async () => {
    if (!formApiKey.trim()) return;
    setValidating(true);
    setApiKeyValid(null);
    try {
      // Por ahora solo validamos formato básico
      // En producción harías un test call a la API de Clip
      if (formProvider === 'clip' && formApiKey.length >= 20) {
        setApiKeyValid(true);
      } else if (formApiKey.length >= 10) {
        setApiKeyValid(true);
      } else {
        setApiKeyValid(false);
      }
    } catch {
      setApiKeyValid(false);
    } finally {
      setValidating(false);
    }
  };

  const getProviderHelpUrl = (provider: string) => {
    const urls: Record<string, string> = {
      clip: 'https://dashboard.clip.mx/settings/api',
      mercadopago: 'https://www.mercadopago.com.mx/developers/panel/credentials',
      stripe: 'https://dashboard.stripe.com/apikeys',
      square: 'https://developer.squareup.com/apps',
    };
    return urls[provider] || '';
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
        api_key: formApiKey.trim() || null,
        secret_key: formSecretKey.trim() || null,
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
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">API Key</label>
                  {formProvider && getProviderHelpUrl(formProvider) && (
                    <button
                      type="button"
                      onClick={() => setShowHelp(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      ¿Dónde la encuentro?
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={formApiKey}
                    onChange={(e) => {
                      setFormApiKey(e.target.value);
                      setApiKeyValid(null);
                    }}
                    className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      apiKeyValid === true ? 'border-green-500 bg-green-50' :
                      apiKeyValid === false ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Pega tu API key aquí"
                  />
                  <button
                    type="button"
                    onClick={validateApiKey}
                    disabled={!formApiKey.trim() || validating}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 transition"
                  >
                    {validating ? '...' : 'Validar'}
                  </button>
                </div>
                {apiKeyValid === true && (
                  <p className="text-sm text-green-600 mt-1">✓ API Key válida</p>
                )}
                {apiKeyValid === false && (
                  <p className="text-sm text-red-600 mt-1">✗ API Key inválida o muy corta</p>
                )}
              </div>

              {/* Secret Key - solo para Clip y otros que lo requieran */}
              {(formProvider === 'clip' || formProvider === 'stripe') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
                  <input
                    type="password"
                    value={formSecretKey}
                    onChange={(e) => setFormSecretKey(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Pega tu Secret Key aquí"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formProvider === 'clip' ? 'Lo encuentras en clip.mx → Dashboard → Desarrolladores' : 'Requerido para procesar pagos'}
                  </p>
                </div>
              )}

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

      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                ¿Cómo obtener tu API Key?
              </h2>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formProvider === 'clip' && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-bold text-blue-900 mb-2">Para Clip:</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                      <li>Inicia sesión en <strong>dashboard.clip.mx</strong></li>
                      <li>Ve a <strong>Configuración</strong> (ícono de engranaje)</li>
                      <li>Selecciona <strong>API</strong> en el menú lateral</li>
                      <li>Copia tu <strong>API Key</strong> (empieza con "sk_")</li>
                      <li>Pégala en el campo de arriba</li>
                    </ol>
                  </div>
                  <a
                    href="https://dashboard.clip.mx/settings/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
                  >
                    Ir a Clip Dashboard →
                  </a>
                </>
              )}
              {formProvider === 'mercadopago' && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-bold text-blue-900 mb-2">Para MercadoPago:</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                      <li>Inicia sesión en <strong>mercadopago.com.mx</strong></li>
                      <li>Ve a <strong>Tu negocio → Configuración</strong></li>
                      <li>Selecciona <strong>Credenciales</strong></li>
                      <li>Copia tu <strong>Access Token</strong> de producción</li>
                      <li>Pégalo en el campo de arriba</li>
                    </ol>
                  </div>
                  <a
                    href="https://www.mercadopago.com.mx/developers/panel/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-6 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition"
                  >
                    Ir a MercadoPago →
                  </a>
                </>
              )}
              {formProvider === 'stripe' && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-bold text-blue-900 mb-2">Para Stripe:</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                      <li>Inicia sesión en <strong>dashboard.stripe.com</strong></li>
                      <li>Ve a <strong>Developers → API keys</strong></li>
                      <li>Copia tu <strong>Secret key</strong> (empieza con "sk_")</li>
                      <li>Pégala en el campo de arriba</li>
                    </ol>
                  </div>
                  <a
                    href="https://dashboard.stripe.com/apikeys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition"
                  >
                    Ir a Stripe Dashboard →
                  </a>
                </>
              )}
              {!['clip', 'mercadopago', 'stripe'].includes(formProvider) && (
                <p className="text-gray-600">
                  Consulta la documentación de tu proveedor de pagos para obtener tu API Key.
                </p>
              )}
              <button
                onClick={() => setShowHelp(false)}
                className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Cerrar
              </button>
            </div>
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

// Available modules configuration
const AVAILABLE_MODULES = [
  // Premium modules
  {
    id: 'discounts',
    name: 'Descuentos y Cupones',
    description: 'Crea y gestiona códigos de descuento para tus clientes',
    icon: Tag,
    tier: 'premium',
  },
  {
    id: 'clip_payments',
    name: 'Pagos con Clip',
    description: 'Genera links de pago y recibe pagos con tarjeta vía Clip',
    icon: Link2,
    tier: 'premium',
  },
  {
    id: 'advanced_reports',
    name: 'Reportes Avanzados',
    description: 'Gráficas detalladas, exportar a Excel, análisis de ventas',
    icon: Settings,
    tier: 'premium',
  },
  {
    id: 'multi_location',
    name: 'Multi-Sucursal',
    description: 'Gestiona múltiples ubicaciones desde una cuenta',
    icon: Store,
    tier: 'premium',
  },
  {
    id: 'staff_permissions',
    name: 'Roles y Permisos',
    description: 'Control de acceso avanzado por empleado',
    icon: Users,
    tier: 'premium',
  },
  {
    id: 'whatsapp_integration',
    name: 'WhatsApp Integrado',
    description: 'Envío automático de tickets y notificaciones por WhatsApp',
    icon: Receipt,
    tier: 'premium',
  },
  {
    id: 'invoicing',
    name: 'Facturación CFDI',
    description: 'Timbrado de facturas electrónicas ante el SAT',
    icon: CreditCard,
    tier: 'premium',
  },
  {
    id: 'ecommerce',
    name: 'Tienda Online',
    description: 'Conecta tu POS con una tienda online',
    icon: Store,
    tier: 'premium',
  },
  {
    id: 'api_access',
    name: 'Acceso API',
    description: 'Integraciones personalizadas vía API REST',
    icon: Settings,
    tier: 'premium',
  },
];

function ModuleSettings() {
  const { currentBusiness, refreshBusiness } = useTenant();
  const [loading, setLoading] = useState(false);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);

  useEffect(() => {
    if (currentBusiness) {
      setEnabledModules(currentBusiness.modules_enabled || []);
    }
  }, [currentBusiness]);

  const toggleModule = async (moduleId: string) => {
    if (!currentBusiness) return;
    setLoading(true);

    const newModules = enabledModules.includes(moduleId)
      ? enabledModules.filter(m => m !== moduleId)
      : [...enabledModules, moduleId];

    try {
      const { error } = await supabase
        .from('businesses')
        .update({ modules_enabled: newModules })
        .eq('id', currentBusiness.id);

      if (error) throw error;

      setEnabledModules(newModules);
      await refreshBusiness();
    } catch (error) {
      console.error('Error updating modules:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-2">Módulos del Sistema</h2>
      <p className="text-gray-600 text-sm mb-6">
        Activa o desactiva funcionalidades según las necesidades de tu negocio
      </p>

      <div className="space-y-4">
        {AVAILABLE_MODULES.map((module) => {
          const Icon = module.icon;
          const isEnabled = enabledModules.includes(module.id);

          return (
            <div
              key={module.id}
              className={`flex items-center justify-between p-4 rounded-lg border-2 transition ${
                isEnabled
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${isEnabled ? 'bg-blue-100' : 'bg-gray-200'}`}>
                  <Icon className={`w-6 h-6 ${isEnabled ? 'text-blue-600' : 'text-gray-500'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{module.name}</h3>
                  <p className="text-sm text-gray-600">{module.description}</p>
                </div>
              </div>
              <button
                onClick={() => toggleModule(module.id)}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  isEnabled ? 'bg-blue-600' : 'bg-gray-300'
                } ${loading ? 'opacity-50' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Nota:</strong> Los módulos desactivados no aparecerán en el menú lateral.
          Puedes activarlos o desactivarlos en cualquier momento.
        </p>
      </div>
    </div>
  );
}
