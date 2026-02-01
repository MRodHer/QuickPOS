import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface PaymentLinkData {
  amount: number;
  description: string;
  orderId?: string;
}

interface PaymentLinkResponse {
  id: string;
  url: string;
  shortUrl: string;
  amount: number;
  status: string;
  expiresAt: string;
}

interface UseClipPayment {
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  createPaymentLink: (businessId: string, data: PaymentLinkData) => Promise<PaymentLinkResponse | null>;
  checkPaymentStatus: (businessId: string, paymentId: string) => Promise<string | null>;
  checkConfig: (businessId: string) => Promise<boolean>;
}

export function useClipPayment(): UseClipPayment {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkConfig = useCallback(async (businessId: string): Promise<boolean> => {
    try {
      const { data, error: dbError } = await supabase
        .from('terminal_configs')
        .select('id')
        .eq('business_id', businessId)
        .eq('provider', 'clip')
        .eq('is_active', true)
        .single();

      const configured = !dbError && !!data;
      setIsConfigured(configured);
      return configured;
    } catch {
      setIsConfigured(false);
      return false;
    }
  }, []);

  const createPaymentLink = useCallback(
    async (businessId: string, data: PaymentLinkData): Promise<PaymentLinkResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        // Get session for auth header
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        // Use fetch directly with proper auth
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(`${supabaseUrl}/functions/v1/clip-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({
            action: 'create_payment_link',
            businessId,
            amount: data.amount,
            description: data.description,
            orderId: data.orderId,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }

        return {
          id: result.id,
          url: result.url || result.payment_url,
          shortUrl: result.short_url || result.url,
          amount: data.amount,
          status: result.status || 'pending',
          expiresAt: result.expires_at,
        };
      } catch (err) {
        console.error('Clip payment link error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Error al crear link de pago';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const checkPaymentStatus = useCallback(
    async (businessId: string, paymentId: string): Promise<string | null> => {
      try {
        const { data: result, error: fnError } = await supabase.functions.invoke('clip-payment', {
          body: {
            action: 'check_payment_status',
            businessId,
            paymentId,
          },
        });

        if (fnError || result.error) {
          return null;
        }

        return result.status;
      } catch {
        return null;
      }
    },
    []
  );

  return {
    isConfigured,
    isLoading,
    error,
    createPaymentLink,
    checkPaymentStatus,
    checkConfig,
  };
}

// Helper to generate WhatsApp link with payment URL
export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

// Helper to copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  }
}
