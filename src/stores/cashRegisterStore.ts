import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';

type CashRegister = Database['public']['Tables']['cash_registers']['Row'];

interface CashRegisterStore {
  currentRegister: CashRegister | null;
  isOpen: boolean;
  isLoading: boolean;
  loadCurrentRegister: (businessId: string) => Promise<void>;
  openRegister: (businessId: string, amount: number) => Promise<void>;
  closeRegister: (closingAmount: number, notes: string) => Promise<void>;
  refreshRegister: () => Promise<void>;
}

export const useCashRegisterStore = create<CashRegisterStore>((set, get) => ({
  currentRegister: null,
  isOpen: false,
  isLoading: false,

  loadCurrentRegister: async (businessId: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_open', true)
        .maybeSingle();

      if (error) throw error;

      set({
        currentRegister: data,
        isOpen: !!data,
      });
    } catch (error) {
      console.error('Error loading cash register:', error);
      set({ currentRegister: null, isOpen: false });
    } finally {
      set({ isLoading: false });
    }
  },

  openRegister: async (businessId: string, amount: number) => {
    set({ isLoading: true });
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('cash_registers')
        .insert({
          business_id: businessId,
          opened_by: userData.user.id,
          opening_amount: amount,
          is_open: true,
          total_sales: 0,
          total_cash: 0,
          total_card: 0,
          total_transfer: 0,
          total_terminal: 0,
          total_terminal_commissions: 0,
          total_refunds: 0,
          sale_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      set({
        currentRegister: data,
        isOpen: true,
      });
    } catch (error) {
      console.error('Error opening cash register:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  closeRegister: async (closingAmount: number, notes: string) => {
    const currentRegister = get().currentRegister;
    if (!currentRegister) throw new Error('No open register');

    set({ isLoading: true });
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No user found');

      const expectedAmount =
        currentRegister.opening_amount +
        currentRegister.total_cash -
        currentRegister.total_refunds;

      const difference = closingAmount - expectedAmount;

      const { error } = await supabase
        .from('cash_registers')
        .update({
          closed_by: userData.user.id,
          closing_amount: closingAmount,
          expected_amount: expectedAmount,
          difference: difference,
          notes: notes,
          closed_at: new Date().toISOString(),
          is_open: false,
        })
        .eq('id', currentRegister.id);

      if (error) throw error;

      set({
        currentRegister: null,
        isOpen: false,
      });
    } catch (error) {
      console.error('Error closing cash register:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  refreshRegister: async () => {
    const currentRegister = get().currentRegister;
    if (!currentRegister) return;

    const { data, error } = await supabase
      .from('cash_registers')
      .select('*')
      .eq('id', currentRegister.id)
      .single();

    if (error) {
      console.error('Error refreshing register:', error);
      return;
    }

    set({ currentRegister: data });
  },
}));
