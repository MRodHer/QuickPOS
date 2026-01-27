import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          slug: string;
          business_type: string | null;
          rfc: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          logo_url: string | null;
          subscription_tier: 'basic' | 'professional' | 'enterprise';
          modules_enabled: string[];
          settings: Record<string, unknown>;
          receipt_header: string;
          receipt_footer: string;
          default_tax_rate: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['businesses']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['businesses']['Insert']>;
      };
      business_staff: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'manager' | 'cashier' | 'staff';
          display_name: string;
          pin: string | null;
          permissions: Record<string, unknown>;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['business_staff']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['business_staff']['Insert']>;
      };
      user_preferences: {
        Row: {
          user_id: string;
          current_business_id: string | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_preferences']['Row'], 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_preferences']['Insert']>;
      };
      product_categories: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          color: string;
          icon: string | null;
          sort_order: number;
          is_active: boolean;
        };
        Insert: Omit<Database['public']['Tables']['product_categories']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['product_categories']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          business_id: string;
          category_id: string | null;
          sku: string | null;
          barcode: string | null;
          name: string;
          description: string | null;
          price: number;
          cost: number;
          tax_included: boolean;
          tax_rate: number;
          track_stock: boolean;
          stock_quantity: number;
          stock_min: number;
          unit: string;
          image_url: string | null;
          is_service: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          rfc: string | null;
          address: string | null;
          notes: string | null;
          total_purchases: number;
          visit_count: number;
          last_visit_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      cash_registers: {
        Row: {
          id: string;
          business_id: string;
          opened_by: string;
          closed_by: string | null;
          opening_amount: number;
          closing_amount: number | null;
          expected_amount: number | null;
          difference: number | null;
          total_sales: number;
          total_cash: number;
          total_card: number;
          total_transfer: number;
          total_terminal: number;
          total_terminal_commissions: number;
          total_refunds: number;
          sale_count: number;
          notes: string | null;
          opened_at: string;
          closed_at: string | null;
          is_open: boolean;
        };
        Insert: Omit<Database['public']['Tables']['cash_registers']['Row'], 'id' | 'opened_at'>;
        Update: Partial<Database['public']['Tables']['cash_registers']['Insert']>;
      };
      sales: {
        Row: {
          id: string;
          business_id: string;
          cash_register_id: string | null;
          customer_id: string | null;
          seller_id: string;
          ticket_number: string;
          subtotal: number;
          tax_amount: number;
          discount_amount: number;
          discount_reason: string | null;
          total: number;
          payment_method: 'cash' | 'card' | 'transfer' | 'terminal' | 'mixed';
          amount_paid: number;
          change_amount: number;
          cash_amount: number;
          card_amount: number;
          transfer_amount: number;
          terminal_amount: number;
          card_reference: string | null;
          transfer_reference: string | null;
          terminal_reference: string | null;
          status: 'completed' | 'refunded' | 'partial_refund' | 'cancelled';
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sales']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['sales']['Insert']>;
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          tax_rate: number;
          discount_percent: number;
          subtotal: number;
          tax_amount: number;
          total: number;
        };
        Insert: Omit<Database['public']['Tables']['sale_items']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['sale_items']['Insert']>;
      };
      cash_movements: {
        Row: {
          id: string;
          business_id: string;
          cash_register_id: string;
          user_id: string;
          type: 'sale' | 'refund' | 'cash_in' | 'cash_out';
          amount: number;
          description: string | null;
          sale_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['cash_movements']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['cash_movements']['Insert']>;
      };
      stock_movements: {
        Row: {
          id: string;
          business_id: string;
          product_id: string;
          user_id: string;
          type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'damage' | 'count';
          quantity: number;
          previous_stock: number;
          new_stock: number;
          reference_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['stock_movements']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['stock_movements']['Insert']>;
      };
      terminal_configs: {
        Row: {
          id: string;
          business_id: string;
          provider: string;
          name: string;
          api_key_encrypted: string | null;
          device_id: string | null;
          commission_percent: number;
          is_active: boolean;
          settings: Record<string, unknown>;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['terminal_configs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['terminal_configs']['Insert']>;
      };
      terminal_payments: {
        Row: {
          id: string;
          business_id: string;
          sale_id: string;
          terminal_config_id: string | null;
          provider: string;
          amount: number;
          commission_amount: number;
          net_amount: number;
          reference_id: string | null;
          authorization_code: string | null;
          card_last_four: string | null;
          card_brand: string | null;
          status: string;
          provider_response: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['terminal_payments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['terminal_payments']['Insert']>;
      };
    };
  };
};
