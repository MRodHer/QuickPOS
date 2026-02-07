/**
 * SPEC-POS-001 Phase 3: Registration Form with Benefits
 *
 * Customer registration form showing benefits of creating an account:
 * - Order history
 * - Favorite products
 * - Nutritional profile
 * - Personalized recommendations
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface RegistrationFormProps {
  onSuccess: (user: User) => void;
  onCancel: () => void;
  businessId?: string;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  phone?: string;
  general?: string;
}

const BENEFITS = [
  {
    icon: '📋',
    title: 'Historial de pedidos',
    description: 'Revisa y repite tus pedidos anteriores fácilmente',
  },
  {
    icon: '⭐',
    title: 'Productos favoritos',
    description: 'Guarda tus favoritos para ordenar rápido',
  },
  {
    icon: '🥗',
    title: 'Perfil nutricional',
    description: 'Configura tus objetivos de macros y calorías',
  },
  {
    icon: '🎯',
    title: 'Recomendaciones personalizadas',
    description: 'Recibe sugerencias basadas en tus objetivos fitness',
  },
];

export function RegistrationForm({
  onSuccess,
  onCancel,
  businessId,
}: RegistrationFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateField = useCallback(
    (name: keyof FormData, value: string): string | undefined => {
      switch (name) {
        case 'name':
          if (!value.trim()) return 'El nombre es requerido';
          if (value.length < 2) return 'Mínimo 2 caracteres';
          break;
        case 'email':
          if (!value.trim()) return 'El email es requerido';
          if (!validateEmail(value)) return 'Email inválido';
          break;
        case 'password':
          if (!value) return 'La contraseña es requerida';
          if (value.length < 8) return 'Mínimo 8 caracteres';
          break;
        case 'confirmPassword':
          if (!value) return 'Confirma tu contraseña';
          if (value !== formData.password) return 'Las contraseñas no coinciden';
          break;
        case 'phone':
          if (!value.trim()) return 'El teléfono es requerido';
          if (!/^\d{10}$/.test(value.replace(/\D/g, '')))
            return 'Teléfono inválido (10 dígitos)';
          break;
      }
      return undefined;
    },
    [formData.password]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (touched[name]) {
      const error = validateField(name as keyof FormData, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name as keyof FormData, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const isFormValid = (): boolean => {
    const allFields: (keyof FormData)[] = [
      'name',
      'email',
      'password',
      'confirmPassword',
      'phone',
    ];
    return allFields.every((field) => {
      const value = formData[field];
      return value.trim() !== '' && !validateField(field, value);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone,
            business_id: businessId,
          },
        },
      });

      if (error) {
        setErrors({ general: error.message });
        return;
      }

      if (data.user) {
        onSuccess(data.user);
      }
    } catch (err) {
      setErrors({ general: 'Error al crear la cuenta. Intenta de nuevo.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Crear Cuenta</h2>
      <p className="text-gray-600 mb-6">
        Disfruta de beneficios exclusivos al registrarte
      </p>

      {/* Benefits Section */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg">
        <h3 className="text-sm font-semibold text-green-800 mb-3">
          Beneficios de tu cuenta:
        </h3>
        <ul className="space-y-2">
          {BENEFITS.map((benefit) => (
            <li key={benefit.title} className="flex items-start gap-2">
              <span className="text-lg">{benefit.icon}</span>
              <div>
                <span className="font-medium text-green-700">
                  {benefit.title}
                </span>
                <p className="text-xs text-green-600">{benefit.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Nombre completo
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Juan Pérez"
            aria-label="Nombre"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="tu@email.com"
            aria-label="Email"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
              errors.password ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Mínimo 8 caracteres"
            aria-label="Contraseña"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
              errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Repite tu contraseña"
            aria-label="Confirmar contraseña"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Phone Field */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Teléfono
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="5512345678"
            aria-label="Teléfono"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!isFormValid() || isLoading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default RegistrationForm;
