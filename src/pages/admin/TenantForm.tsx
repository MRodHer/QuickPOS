/**
 * SPEC-SAAS-002: Store Form (Create/Edit)
 *
 * Form for creating or editing a store
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Store, CreateStoreRequest, UpdateStoreRequest } from '../../types/store';
import { generateSlugFromName, validateStoreSlug } from '../../lib/store/subdomain';

interface StoreFormProps {
  store?: Store | null;
  onSuccess?: (store: Store) => void;
  onCancel?: () => void;
}

const DEFAULT_COLORS = {
  primary: '#16a34a',
  secondary: '#1f2937',
};

/**
 * Store creation and edit form
 */
export function StoreForm({ store, onSuccess, onCancel }: StoreFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!store;

  const [formData, setFormData] = useState<CreateStoreRequest>({
    name: store?.name || '',
    slug: store?.slug || '',
    company_name: store?.company_name || '',
    company_rfc: store?.company_rfc || '',
    company_email: store?.company_email || '',
    primary_color: store?.primary_color || DEFAULT_COLORS.primary,
    locale: store?.locale || 'es-MX',
    timezone: store?.timezone || 'America/Mexico_City',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Create store mutation
   */
  const createMutation = useMutation({
    mutationFn: async (data: CreateStoreRequest) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const isSuperAdmin = user.app_metadata?.is_super_admin || user.user_metadata?.is_super_admin;
      if (!isSuperAdmin) {
        throw new Error('Access denied: Super admin only');
      }

      // Auto-generate slug from name if not provided
      let slug = data.slug;
      if (!slug && data.name) {
        slug = generateSlugFromName(data.name);
      }

      // Validate slug
      const slugValidation = validateStoreSlug(slug);
      if (!slugValidation.valid) {
        throw new Error(slugValidation.error);
      }

      const { data: newStore, error } = await supabase
        .from('stores')
        .insert({
          name: data.name,
          slug,
          company_name: data.company_name,
          company_rfc: data.company_rfc,
          company_email: data.company_email,
          primary_color: data.primary_color,
          locale: data.locale,
          timezone: data.timezone,
          status: 'provisioning',
          subscription_tier: 'free',
        })
        .select()
        .single();

      if (error) throw error;
      return newStore as Store;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stores'] });
      onSuccess?.(data);
    },
  });

  /**
   * Update store mutation
   */
  const updateMutation = useMutation({
    mutationFn: async (data: UpdateStoreRequest) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const isSuperAdmin = user.app_metadata?.is_super_admin || user.user_metadata?.is_super_admin;
      if (!isSuperAdmin) {
        throw new Error('Access denied: Super admin only');
      }

      const { data: updatedStore, error } = await supabase
        .from('stores')
        .update(data)
        .eq('id', store!.id)
        .select()
        .single();

      if (error) throw error;
      return updatedStore as Store;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stores'] });
      queryClient.invalidateQueries({ queryKey: ['store', 'slug', store?.slug] });
      onSuccess?.(data);
    },
  });

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!isEditing && !formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    }

    if (!isEditing && formData.slug) {
      const slugValidation = validateStoreSlug(formData.slug);
      if (!slugValidation.valid) {
        newErrors.slug = slugValidation.error;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync(formData);
      } else {
        await createMutation.mutateAsync(formData);
      }
    } catch (err) {
      setErrors({ submit: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle input change
   */
  const handleChange = (field: keyof CreateStoreRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="bg-white shadow rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">
          {isEditing ? 'Edit Store' : 'Create New Store'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {isEditing
            ? 'Update store configuration and settings'
            : 'Configure a new store organization'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Error message */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Basic Information */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Store Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => {
                  handleChange('name', e.target.value);
                  // Auto-generate slug if creating new
                  if (!isEditing && !store) {
                    const newSlug = generateSlugFromName(e.target.value);
                    handleChange('slug', newSlug);
                  }
                }}
                className={`mt-1 block w-full border rounded-lg px-3 py-2 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Acme Corporation"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Slug */}
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                Subdomain Slug *
              </label>
              <div className="mt-1 flex rounded-lg shadow-sm">
                <input
                  type="text"
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  disabled={isEditing}
                  className={`flex-1 border rounded-l-lg px-3 py-2 ${
                    errors.slug ? 'border-red-300' : 'border-gray-300'
                  } ${isEditing ? 'bg-gray-100' : ''}`}
                  placeholder="acme"
                />
                <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  .avierp.com
                </span>
              </div>
              {errors.slug && (
                <p className="mt-1 text-sm text-red-600">{errors.slug}</p>
              )}
              {!isEditing && (
                <p className="mt-1 text-xs text-gray-500">
                  Used for store URL: https://{formData.slug || 'slug'}.avierp.com
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4">Company Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Name */}
            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                Legal Company Name
              </label>
              <input
                type="text"
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Acme Corp S.A. de C.V."
              />
            </div>

            {/* RFC */}
            <div>
              <label htmlFor="company_rfc" className="block text-sm font-medium text-gray-700">
                RFC (Tax ID)
              </label>
              <input
                type="text"
                id="company_rfc"
                value={formData.company_rfc}
                onChange={(e) => handleChange('company_rfc', e.target.value.toUpperCase())}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 uppercase"
                placeholder="ABC123456XYZ"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="company_email" className="block text-sm font-medium text-gray-700">
                Company Email
              </label>
              <input
                type="email"
                id="company_email"
                value={formData.company_email}
                onChange={(e) => handleChange('company_email', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="contact@acme.com"
              />
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4">Appearance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Primary Color */}
            <div>
              <label htmlFor="primary_color" className="block text-sm font-medium text-gray-700">
                Primary Color
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  id="primary_color"
                  value={formData.primary_color}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  className="h-10 w-16 border border-gray-300 rounded"
                />
                <input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            {/* Locale */}
            <div>
              <label htmlFor="locale" className="block text-sm font-medium text-gray-700">
                Locale
              </label>
              <select
                id="locale"
                value={formData.locale}
                onChange={(e) => handleChange('locale', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="es-MX">Spanish (Mexico)</option>
                <option value="en-US">English (US)</option>
                <option value="pt-BR">Portuguese (Brazil)</option>
              </select>
            </div>

            {/* Timezone */}
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                Timezone
              </label>
              <select
                id="timezone"
                value={formData.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="America/Mexico_City">Central Time (Mexico City)</option>
                <option value="America/Tijuana">Pacific Time (Tijuana)</option>
                <option value="America/Merida">Eastern Time (Merida)</option>
                <option value="America/Chihuahua">Mountain Time (Chihuahua)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting
              ? 'Saving...'
              : isEditing
              ? 'Update Store'
              : 'Create Store'}
          </button>
        </div>
      </form>
    </div>
  );
}
