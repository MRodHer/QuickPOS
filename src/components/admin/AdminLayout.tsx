import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  Shield,
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Settings,
  LogOut,
  ArrowLeft,
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

// List of super admin emails - add yours here
const SUPER_ADMIN_EMAILS = [
  'mauricio.rodher@gmail.com',
  'mauricio.rodher+admin@gmail.com',
];

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/admin/businesses', icon: Building2, label: 'Negocios' },
  { path: '/admin/users', icon: Users, label: 'Usuarios' },
  { path: '/admin/subscriptions', icon: CreditCard, label: 'Suscripciones' },
  { path: '/admin/settings', icon: Settings, label: 'Configuración' },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user is a super admin
    if (user?.email) {
      const authorized = SUPER_ADMIN_EMAILS.includes(user.email);
      setIsAuthorized(authorized);
      if (!authorized) {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <aside className="w-64 bg-gray-950 text-white flex flex-col fixed h-screen">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">QuickPOS</h1>
              <p className="text-xs text-purple-400">Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-6 py-3 transition ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-gray-800 space-y-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 text-gray-400 hover:text-white transition w-full"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Volver a QuickPOS</span>
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 text-gray-400 hover:text-white transition w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 ml-64">
        <header className="bg-gray-800 border-b border-gray-700 px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Panel de Administración</h2>
              <p className="text-sm text-gray-400">Gestiona todos los negocios y usuarios</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user?.email}</p>
              <p className="text-xs text-purple-400">Super Admin</p>
            </div>
          </div>
        </header>

        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}

export { SUPER_ADMIN_EMAILS };
