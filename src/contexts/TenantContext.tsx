import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';

type Business = Database['public']['Tables']['businesses']['Row'];
type BusinessStaff = Database['public']['Tables']['business_staff']['Row'];

interface TenantContextType {
  currentBusiness: Business | null;
  userBusinesses: Business[];
  userRole: BusinessStaff['role'] | null;
  isLoading: boolean;
  switchBusiness: (businessId: string) => Promise<void>;
  refreshBusiness: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [userBusinesses, setUserBusinesses] = useState<Business[]>([]);
  const [userRole, setUserRole] = useState<BusinessStaff['role'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadBusinessData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setIsLoading(false);
        return;
      }

      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('current_business_id')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      const { data: staffRecords } = await supabase
        .from('business_staff')
        .select('business_id, role')
        .eq('user_id', userData.user.id)
        .eq('is_active', true);

      if (!staffRecords || staffRecords.length === 0) {
        setIsLoading(false);
        return;
      }

      const businessIds = staffRecords.map((s) => s.business_id);
      const { data: businesses } = await supabase
        .from('businesses')
        .select('*')
        .in('id', businessIds)
        .eq('is_active', true);

      if (businesses && businesses.length > 0) {
        setUserBusinesses(businesses);

        let currentBiz = businesses[0];
        if (preferences?.current_business_id) {
          const preferredBiz = businesses.find(
            (b) => b.id === preferences.current_business_id
          );
          if (preferredBiz) currentBiz = preferredBiz;
        }

        setCurrentBusiness(currentBiz);

        const roleRecord = staffRecords.find(
          (s) => s.business_id === currentBiz.id
        );
        setUserRole(roleRecord?.role || null);
      }
    } catch (error) {
      console.error('Error loading business data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchBusiness = async (businessId: string) => {
    const business = userBusinesses.find((b) => b.id === businessId);
    if (!business) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userData.user.id,
          current_business_id: businessId,
        });

      setCurrentBusiness(business);

      const { data: staffRecord } = await supabase
        .from('business_staff')
        .select('role')
        .eq('user_id', userData.user.id)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .maybeSingle();

      setUserRole(staffRecord?.role || null);
    } catch (error) {
      console.error('Error switching business:', error);
    }
  };

  const refreshBusiness = async () => {
    await loadBusinessData();
  };

  useEffect(() => {
    loadBusinessData();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN') {
          loadBusinessData();
        } else if (event === 'SIGNED_OUT') {
          setCurrentBusiness(null);
          setUserBusinesses([]);
          setUserRole(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <TenantContext.Provider
      value={{
        currentBusiness,
        userBusinesses,
        userRole,
        isLoading,
        switchBusiness,
        refreshBusiness,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
}
