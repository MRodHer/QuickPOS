import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../hooks/useAuth';
import { useCashRegisterStore } from '../stores/cashRegisterStore';
import {
  Store,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  CreditCard,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Calendar,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/pos', icon: ShoppingCart, label: 'Punto de Venta' },
  { path: '/products', icon: Package, label: 'Productos' },
  { path: '/inventory', icon: Warehouse, label: 'Inventario' },
  { path: '/customers', icon: Users, label: 'Clientes' },
  { path: '/cash-register', icon: CreditCard, label: 'Caja' },
  { path: '/cash-cuts', icon: Calendar, label: 'Cortes' },
  { path: '/sales', icon: Receipt, label: 'Ventas' },
  { path: '/reports', icon: BarChart3, label: 'Reportes' },
  { path: '/settings', icon: Settings, label: 'Configuración' },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { currentBusiness, userRole } = useTenant();
  const { user, logout } = useAuth();
  const { isOpen } = useCashRegisterStore();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-gray-900 text-white flex flex-col fixed h-screen">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">QuickPOS</h1>
              <p className="text-xs text-gray-400">Punto de Venta</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-6 py-3 transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-gray-300 hover:text-white transition w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 ml-64">
        <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{currentBusiness?.name}</h2>
              <p className="text-sm text-gray-600">
                {userRole && (
                  <span className="capitalize">
                    {userRole === 'owner' && 'Propietario'}
                    {userRole === 'admin' && 'Administrador'}
                    {userRole === 'manager' && 'Gerente'}
                    {userRole === 'cashier' && 'Cajero'}
                    {userRole === 'staff' && 'Personal'}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isOpen ? 'bg-green-500' : 'bg-red-500'
                  }`}
                ></div>
                <span className="text-sm font-medium text-gray-700">
                  {isOpen ? 'Caja abierta' : 'Caja cerrada'}
                </span>
              </div>

              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-gray-600">{user?.email}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
