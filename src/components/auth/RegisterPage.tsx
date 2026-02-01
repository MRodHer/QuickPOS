import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Store } from 'lucide-react';

export function RegisterPage() {
  const [businessTypes, setBusinessTypes] = useState<{value: string; label: string}[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [customBusinessType, setCustomBusinessType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from('business_types')
      .select('value, label')
      .order('is_default', { ascending: false })
      .order('label')
      .then(({ data }) => setBusinessTypes(data || []));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Crear usuario
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (!signUpData.user) {
        throw new Error('No se pudo crear el usuario');
      }

      // 2. Iniciar sesión inmediatamente para establecer el token
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // Pequeña espera para asegurar que el token esté disponible
      await new Promise(resolve => setTimeout(resolve, 500));

      const slug = businessName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      let finalBusinessType = businessType;
      if (businessType === 'otro' && customBusinessType.trim()) {
        const customValue = customBusinessType.trim().toLowerCase().replace(/\s+/g, '_');
        finalBusinessType = customValue;
        await supabase.from('business_types').upsert({
          value: customValue,
          label: customBusinessType.trim(),
          is_default: false
        }, { onConflict: 'value' });
      }
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .insert({
          name: businessName,
          slug: `${slug}-${Date.now()}`,
          business_type: finalBusinessType,
          is_active: true,
          subscription_tier: 'basic',
          modules_enabled: ['pos', 'products', 'customers', 'cash_register', 'reports', 'inventory'],
          settings: {},
          receipt_header: '',
          receipt_footer: 'Gracias por su compra',
          default_tax_rate: 0.16,
        })
        .select()
        .single();

      if (businessError) throw businessError;

      const { error: staffError } = await supabase.from('business_staff').insert({
        business_id: businessData.id,
        user_id: signUpData.user.id,
        role: 'owner',
        display_name: email.split('@')[0],
        is_active: true,
        permissions: {},
      });

      if (staffError) throw staffError;

      const { error: preferencesError } = await supabase.from('user_preferences').insert({
        user_id: signUpData.user.id,
        current_business_id: businessData.id,
      });

      if (preferencesError) throw preferencesError;

      const { error: categoriesError } = await supabase.rpc('create_default_categories', {
        p_business_id: businessData.id,
      });

      if (categoriesError) {
        console.error('Error creating default categories:', categoriesError);
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-xl mb-4">
            <Store className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">QuickPOS</h1>
          <p className="text-gray-600 mt-2">Crea tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Negocio
            </label>
            <input
              id="businessName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="Mi Negocio"
            />
          </div>

          <div>
            <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Negocio
            </label>
            <select
              id="businessType"
              value={businessType}
              onChange={(e) => {
                setBusinessType(e.target.value);
                if (e.target.value !== 'otro') setCustomBusinessType('');
              }}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            >
              <option value="">Selecciona un tipo</option>
              {businessTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
              <option value="otro">Otro...</option>
            </select>
          </div>

          {businessType === 'otro' && (
            <div>
              <label htmlFor="customBusinessType" className="block text-sm font-medium text-gray-700 mb-2">
                Especifica el tipo
              </label>
              <input
                id="customBusinessType"
                type="text"
                value={customBusinessType}
                onChange={(e) => setCustomBusinessType(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Ej: Farmacia, Veterinaria, Laboratorio..."
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
