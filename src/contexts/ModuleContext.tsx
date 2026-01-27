import { createContext, useContext, ReactNode } from 'react';
import { useTenant } from './TenantContext';

interface ModuleContextType {
  modulesEnabled: string[];
  isModuleActive: (module: string) => boolean;
}

const ModuleContext = createContext<ModuleContextType | null>(null);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const { currentBusiness } = useTenant();

  const modulesEnabled = currentBusiness?.modules_enabled || [];

  const isModuleActive = (module: string): boolean => {
    return modulesEnabled.includes(module);
  };

  return (
    <ModuleContext.Provider value={{ modulesEnabled, isModuleActive }}>
      {children}
    </ModuleContext.Provider>
  );
}

export function useModule() {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModule must be used within ModuleProvider');
  }
  return context;
}
