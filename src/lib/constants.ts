export const IVA_RATE = 0.16;
export const CURRENCY = 'MXN';
export const CURRENCY_SYMBOL = '$';

export const BUSINESS_TYPES = [
  { value: 'queseria', label: 'Quesería' },
  { value: 'cremeria', label: 'Cremería' },
  { value: 'taqueria', label: 'Taquería' },
  { value: 'abarrotes', label: 'Abarrotes' },
  { value: 'papeleria', label: 'Papelería' },
  { value: 'ropa', label: 'Tienda de Ropa' },
  { value: 'ferreteria', label: 'Ferretería' },
  { value: 'otro', label: 'Otro' },
];

export const PRODUCT_UNITS = [
  { value: 'pieza', label: 'Pieza' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'litro', label: 'Litro' },
  { value: 'metro', label: 'Metro' },
  { value: 'paquete', label: 'Paquete' },
  { value: 'caja', label: 'Caja' },
  { value: 'bolsa', label: 'Bolsa' },
];

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'terminal', label: 'Terminal' },
  { value: 'mixed', label: 'Mixto' },
];

export const TERMINAL_PROVIDERS = [
  { value: 'clip', label: 'Clip' },
  { value: 'mercadopago', label: 'MercadoPago' },
  { value: 'square', label: 'Square' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'manual', label: 'Manual' },
];

export const CARD_BRANDS = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'amex', label: 'American Express' },
  { value: 'other', label: 'Otra' },
];

export const QUICK_CASH_AMOUNTS = [50, 100, 200, 500, 1000];

export const formatCurrency = (amount: number): string => {
  return `${CURRENCY_SYMBOL}${amount.toFixed(2)}`;
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};
