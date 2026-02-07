/**
 * SPEC-POS-001: Online Orders System - CheckoutForm Component
 *
 * Guest checkout form for completing orders without registration
 * Collects name, email, phone, and payment method
 */

import { useState, FormEvent } from 'react';
import type { GuestCheckoutData, PaymentMethod } from '@/types/online-orders';

interface CheckoutFormProps {
  subtotal: number;
  tax: number;
  total: number;
  onSubmit: (data: GuestCheckoutData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/**
 * Payment method options with labels
 */
const paymentMethods: { value: PaymentMethod; label: string; description: string }[] = [
  {
    value: 'on_arrival',
    label: 'Pagar en recepción',
    description: 'Paga con efectivo o tarjeta al recoger tu pedido',
  },
  {
    value: 'stripe',
    label: 'Pagar online',
    description: 'Pago seguro con tarjeta de crédito/débito',
  },
  {
    value: 'card_terminal',
    label: 'Terminal en tienda',
    description: 'Paga con tarjeta terminal al recoger',
  },
];

/**
 * Guest checkout form component
 */
export function CheckoutForm({
  subtotal,
  tax,
  total,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CheckoutFormProps) {
  const [formData, setFormData] = useState<GuestCheckoutData>({
    name: '',
    email: '',
    phone: '',
    pickupTime: '',
    paymentMethod: 'on_arrival',
    customerNotes: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof GuestCheckoutData, string>>>({});

  /**
   * Validate form fields
   */
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof GuestCheckoutData, string>> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    // Phone validation
    const phoneRegex = /^[\d\s\+\-\(\)]{10,}$/;
    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    } else if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Teléfono inválido (mínimo 10 dígitos)';
    }

    // Pickup time validation
    if (!formData.pickupTime) {
      newErrors.pickupTime = 'Selecciona una hora de recogida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (validate()) {
      onSubmit(formData);
    }
  };

  /**
   * Handle input change
   */
  const handleChange = (
    field: keyof GuestCheckoutData,
    value: string | PaymentMethod
  ) => {
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contact Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Información de Contacto
        </h3>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Juan Pérez"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="juan@ejemplo.com"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
            <p className="text-gray-500 text-sm mt-1">
              Te enviaremos la confirmación del pedido
            </p>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="+52 55 1234 5678"
              disabled={isSubmitting}
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Método de Pago
        </h3>

        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <label
              key={method.value}
              className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-colors ${
                formData.paymentMethod === method.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.value}
                  checked={formData.paymentMethod === method.value}
                  onChange={(e) => handleChange('paymentMethod', e.target.value as PaymentMethod)}
                  className="mt-1"
                  disabled={isSubmitting}
                />
                <div>
                  <span className="font-medium text-gray-900">{method.label}</span>
                  <p className="text-sm text-gray-500">{method.description}</p>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Customer Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notas adicionales
        </label>
        <textarea
          id="notes"
          value={formData.customerNotes}
          onChange={(e) => handleChange('customerNotes', e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Instrucciones especiales para tu pedido..."
          disabled={isSubmitting}
        />
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Resumen del Pedido
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">IVA (16%)</span>
            <span className="font-medium">${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Submit / Cancel */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Procesando...' : 'Confirmar Pedido'}
        </button>
      </div>
    </form>
  );
}
