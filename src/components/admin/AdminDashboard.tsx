import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Building2,
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

interface Stats {
  totalBusinesses: number;
  activeBusinesses: number;
  totalUsers: number;
  totalSales: number;
  totalRevenue: number;
  recentBusinesses: any[];
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalBusinesses: 0,
    activeBusinesses: 0,
    totalUsers: 0,
    totalSales: 0,
    totalRevenue: 0,
    recentBusinesses: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Get all businesses
      const { data: businesses, count: businessCount } = await supabase
        .from('businesses')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5);

      // Get all users count
      const { count: userCount } = await supabase
        .from('business_users')
        .select('*', { count: 'exact', head: true });

      // Get sales stats
      const { data: salesData } = await supabase
        .from('sales')
        .select('total')
        .eq('status', 'completed');

      const totalSales = salesData?.length || 0;
      const totalRevenue = salesData?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0;

      setStats({
        totalBusinesses: businessCount || 0,
        activeBusinesses: businesses?.filter(b => b.is_active !== false).length || 0,
        totalUsers: userCount || 0,
        totalSales,
        totalRevenue,
        recentBusinesses: businesses || [],
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Resumen general de la plataforma</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Negocios</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.totalBusinesses}</p>
              <p className="text-sm text-green-400 mt-1">{stats.activeBusinesses} activos</p>
            </div>
            <div className="bg-purple-600/20 p-3 rounded-lg">
              <Building2 className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Usuarios</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.totalUsers}</p>
              <p className="text-sm text-gray-500 mt-1">registrados</p>
            </div>
            <div className="bg-blue-600/20 p-3 rounded-lg">
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Ventas Totales</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.totalSales}</p>
              <p className="text-sm text-gray-500 mt-1">transacciones</p>
            </div>
            <div className="bg-green-600/20 p-3 rounded-lg">
              <ShoppingCart className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Ingresos Totales</p>
              <p className="text-2xl font-bold text-white mt-1">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-sm text-gray-500 mt-1">en ventas</p>
            </div>
            <div className="bg-yellow-600/20 p-3 rounded-lg">
              <DollarSign className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Businesses */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Negocios Recientes</h2>
          <Link
            to="/admin/businesses"
            className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="divide-y divide-gray-700">
          {stats.recentBusinesses.length === 0 ? (
            <p className="p-6 text-gray-500 text-center">No hay negocios registrados</p>
          ) : (
            stats.recentBusinesses.map((business) => (
              <div key={business.id} className="p-4 flex items-center justify-between hover:bg-gray-700/50">
                <div>
                  <p className="font-medium text-white">{business.name}</p>
                  <p className="text-sm text-gray-400">
                    {business.business_type || 'Sin tipo'} · Creado: {new Date(business.created_at).toLocaleDateString('es-MX')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    business.is_active !== false
                      ? 'bg-green-900/50 text-green-400'
                      : 'bg-red-900/50 text-red-400'
                  }`}>
                    {business.is_active !== false ? 'Activo' : 'Inactivo'}
                  </span>
                  <Link
                    to={`/admin/businesses/${business.id}`}
                    className="text-purple-400 hover:text-purple-300"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
