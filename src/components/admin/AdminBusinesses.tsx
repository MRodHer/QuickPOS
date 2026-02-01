import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Search,
  Building2,
  ArrowRight,
  ToggleLeft,
  ToggleRight,
  Puzzle,
} from 'lucide-react';

interface Business {
  id: string;
  name: string;
  business_type: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  modules_enabled: string[];
  created_at: string;
  _salesCount?: number;
  _usersCount?: number;
}

const AVAILABLE_MODULES = [
  { id: 'discounts', name: 'Descuentos', tier: 'premium' },
  { id: 'clip_payments', name: 'Pagos Clip', tier: 'premium' },
  { id: 'advanced_reports', name: 'Reportes Avanzados', tier: 'premium' },
  { id: 'multi_location', name: 'Multi-Sucursal', tier: 'premium' },
  { id: 'staff_permissions', name: 'Roles y Permisos', tier: 'premium' },
  { id: 'whatsapp_integration', name: 'WhatsApp', tier: 'premium' },
  { id: 'invoicing', name: 'Facturación CFDI', tier: 'premium' },
  { id: 'ecommerce', name: 'Tienda Online', tier: 'premium' },
  { id: 'api_access', name: 'API', tier: 'premium' },
];

export function AdminBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get additional stats for each business
      const businessesWithStats = await Promise.all(
        (data || []).map(async (business) => {
          const { count: salesCount } = await supabase
            .from('sales')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', business.id);

          const { count: usersCount } = await supabase
            .from('business_users')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', business.id);

          return {
            ...business,
            _salesCount: salesCount || 0,
            _usersCount: usersCount || 0,
          };
        })
      );

      setBusinesses(businessesWithStats);
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBusinessActive = async (business: Business) => {
    const newStatus = !business.is_active;
    const { error } = await supabase
      .from('businesses')
      .update({ is_active: newStatus })
      .eq('id', business.id);

    if (!error) {
      setBusinesses(prev =>
        prev.map(b => b.id === business.id ? { ...b, is_active: newStatus } : b)
      );
    }
  };

  const toggleModule = async (business: Business, moduleId: string) => {
    const currentModules = business.modules_enabled || [];
    const newModules = currentModules.includes(moduleId)
      ? currentModules.filter(m => m !== moduleId)
      : [...currentModules, moduleId];

    const { error } = await supabase
      .from('businesses')
      .update({ modules_enabled: newModules })
      .eq('id', business.id);

    if (!error) {
      setBusinesses(prev =>
        prev.map(b => b.id === business.id ? { ...b, modules_enabled: newModules } : b)
      );
      if (selectedBusiness?.id === business.id) {
        setSelectedBusiness({ ...business, modules_enabled: newModules });
      }
    }
  };

  const filteredBusinesses = businesses.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Negocios</h1>
          <p className="text-gray-400 mt-1">Gestiona todos los negocios de la plataforma</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Business List */}
          <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <p className="text-gray-400 text-sm">{filteredBusinesses.length} negocios</p>
            </div>
            <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
              {filteredBusinesses.length === 0 ? (
                <p className="p-6 text-gray-500 text-center">No se encontraron negocios</p>
              ) : (
                filteredBusinesses.map((business) => (
                  <button
                    key={business.id}
                    onClick={() => setSelectedBusiness(business)}
                    className={`w-full p-4 text-left hover:bg-gray-700/50 transition ${
                      selectedBusiness?.id === business.id ? 'bg-gray-700/50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          business.is_active ? 'bg-purple-600/20' : 'bg-gray-700'
                        }`}>
                          <Building2 className={`w-5 h-5 ${
                            business.is_active ? 'text-purple-400' : 'text-gray-500'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-white">{business.name}</p>
                          <p className="text-sm text-gray-400">
                            {business._usersCount} usuarios · {business._salesCount} ventas
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          business.is_active
                            ? 'bg-green-900/50 text-green-400'
                            : 'bg-red-900/50 text-red-400'
                        }`}>
                          {business.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        <ArrowRight className="w-5 h-5 text-gray-500" />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Business Details */}
          <div className="bg-gray-800 rounded-xl border border-gray-700">
            {selectedBusiness ? (
              <div>
                <div className="p-6 border-b border-gray-700">
                  <h2 className="text-xl font-bold text-white">{selectedBusiness.name}</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {selectedBusiness.business_type || 'Sin tipo'}
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Status Toggle */}
                  <div>
                    <p className="text-sm font-medium text-gray-400 mb-2">Estado</p>
                    <button
                      onClick={() => toggleBusinessActive(selectedBusiness)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        selectedBusiness.is_active
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-red-900/30 text-red-400'
                      }`}
                    >
                      {selectedBusiness.is_active ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                      {selectedBusiness.is_active ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>

                  {/* Contact Info */}
                  <div>
                    <p className="text-sm font-medium text-gray-400 mb-2">Contacto</p>
                    <div className="space-y-1 text-sm">
                      <p className="text-white">{selectedBusiness.email || 'Sin email'}</p>
                      <p className="text-white">{selectedBusiness.phone || 'Sin teléfono'}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div>
                    <p className="text-sm font-medium text-gray-400 mb-2">Estadísticas</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-white">{selectedBusiness._usersCount}</p>
                        <p className="text-xs text-gray-400">Usuarios</p>
                      </div>
                      <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-white">{selectedBusiness._salesCount}</p>
                        <p className="text-xs text-gray-400">Ventas</p>
                      </div>
                    </div>
                  </div>

                  {/* Modules */}
                  <div>
                    <p className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                      <Puzzle className="w-4 h-4" />
                      Módulos
                    </p>
                    <div className="space-y-2">
                      {AVAILABLE_MODULES.map((module) => {
                        const isEnabled = (selectedBusiness.modules_enabled || []).includes(module.id);
                        return (
                          <button
                            key={module.id}
                            onClick={() => toggleModule(selectedBusiness, module.id)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition ${
                              isEnabled
                                ? 'bg-purple-900/30 border border-purple-700'
                                : 'bg-gray-700/50 border border-gray-600'
                            }`}
                          >
                            <span className={isEnabled ? 'text-purple-300' : 'text-gray-400'}>
                              {module.name}
                            </span>
                            {isEnabled ? (
                              <ToggleRight className="w-5 h-5 text-purple-400" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-gray-500" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Created Date */}
                  <div>
                    <p className="text-sm font-medium text-gray-400 mb-1">Fecha de registro</p>
                    <p className="text-sm text-white">
                      {new Date(selectedBusiness.created_at).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Selecciona un negocio para ver detalles</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
