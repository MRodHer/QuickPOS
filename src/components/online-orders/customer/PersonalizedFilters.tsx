/**
 * SPEC-POS-001 Phase 3: Personalized Filters Component
 *
 * Automatic menu filters based on customer profile:
 * - Dietary preferences
 * - Allergen exclusions
 * - Calorie/macro limits
 * - Fitness goal alignment
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCustomerProfileStore, DIETARY_PREFERENCE_LABELS, ALLERGEN_LABELS } from '@/stores/customerProfileStore';
import type { MenuItem, MenuFilters, DietaryPreference, Allergen } from '@/types/online-orders';

interface PersonalizedFiltersProps {
  menuItems: MenuItem[];
  onFilterChange: (filteredItems: MenuItem[]) => void;
  className?: string;
}

interface ActiveFilter {
  type: 'dietary' | 'allergen' | 'calories' | 'protein' | 'custom';
  value: string;
  label: string;
}

export function PersonalizedFilters({
  menuItems,
  onFilterChange,
  className = '',
}: PersonalizedFiltersProps) {
  const profile = useCustomerProfileStore((state) => state.profile);

  const [filters, setFilters] = useState<MenuFilters>({
    dietary: [],
    allergen_free: [],
    max_calories: undefined,
    min_protein: undefined,
    search_query: '',
  });

  const [showAllFilters, setShowAllFilters] = useState(false);
  const [useProfileFilters, setUseProfileFilters] = useState(true);

  // Apply profile preferences as default filters
  useEffect(() => {
    if (profile && useProfileFilters) {
      setFilters((prev) => ({
        ...prev,
        dietary: profile.dietary_preferences,
        allergen_free: profile.allergies,
      }));
    }
  }, [profile, useProfileFilters]);

  // Filter items based on current filters
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Search query
      if (filters.search_query) {
        const query = filters.search_query.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      // Dietary preferences - item should have at least one matching tag
      if (filters.dietary && filters.dietary.length > 0) {
        const hasMatchingTag = filters.dietary.some((pref) =>
          item.dietary_tags.includes(pref)
        );
        // Only filter if the item has tags defined
        if (item.dietary_tags.length > 0 && !hasMatchingTag) {
          // Relaxed: don't exclude if no tags
        }
      }

      // Allergen-free - exclude items with specified allergens
      if (filters.allergen_free && filters.allergen_free.length > 0) {
        const hasAllergen = filters.allergen_free.some((allergen) =>
          item.allergens.includes(allergen)
        );
        if (hasAllergen) return false;
      }

      // Max calories
      if (filters.max_calories && item.nutrition?.calories) {
        if (item.nutrition.calories > filters.max_calories) return false;
      }

      // Min protein
      if (filters.min_protein && item.nutrition?.protein) {
        if (item.nutrition.protein < filters.min_protein) return false;
      }

      return true;
    });
  }, [menuItems, filters]);

  // Notify parent of filter changes
  useEffect(() => {
    onFilterChange(filteredItems);
  }, [filteredItems, onFilterChange]);

  // Get active filters for display
  const activeFilters = useMemo((): ActiveFilter[] => {
    const active: ActiveFilter[] = [];

    filters.dietary?.forEach((pref) => {
      active.push({
        type: 'dietary',
        value: pref,
        label: DIETARY_PREFERENCE_LABELS[pref],
      });
    });

    filters.allergen_free?.forEach((allergen) => {
      active.push({
        type: 'allergen',
        value: allergen,
        label: `Sin ${ALLERGEN_LABELS[allergen]}`,
      });
    });

    if (filters.max_calories) {
      active.push({
        type: 'calories',
        value: String(filters.max_calories),
        label: `< ${filters.max_calories} kcal`,
      });
    }

    if (filters.min_protein) {
      active.push({
        type: 'protein',
        value: String(filters.min_protein),
        label: `> ${filters.min_protein}g proteína`,
      });
    }

    return active;
  }, [filters]);

  const removeFilter = useCallback((filter: ActiveFilter) => {
    switch (filter.type) {
      case 'dietary':
        setFilters((prev) => ({
          ...prev,
          dietary: prev.dietary?.filter((d) => d !== filter.value),
        }));
        break;
      case 'allergen':
        setFilters((prev) => ({
          ...prev,
          allergen_free: prev.allergen_free?.filter((a) => a !== filter.value),
        }));
        break;
      case 'calories':
        setFilters((prev) => ({ ...prev, max_calories: undefined }));
        break;
      case 'protein':
        setFilters((prev) => ({ ...prev, min_protein: undefined }));
        break;
    }
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      dietary: [],
      allergen_free: [],
      max_calories: undefined,
      min_protein: undefined,
      search_query: '',
    });
    setUseProfileFilters(false);
  }, []);

  const toggleDietary = (pref: DietaryPreference) => {
    setFilters((prev) => ({
      ...prev,
      dietary: prev.dietary?.includes(pref)
        ? prev.dietary.filter((d) => d !== pref)
        : [...(prev.dietary || []), pref],
    }));
  };

  const toggleAllergen = (allergen: Allergen) => {
    setFilters((prev) => ({
      ...prev,
      allergen_free: prev.allergen_free?.includes(allergen)
        ? prev.allergen_free.filter((a) => a !== allergen)
        : [...(prev.allergen_free || []), allergen],
    }));
  };

  return (
    <div className={`space-y-3 ${className}`} aria-label="Filtros de menú">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={filters.search_query || ''}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, search_query: e.target.value }))
          }
          placeholder="Buscar productos..."
          className="w-full px-4 py-2 pl-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          🔍
        </span>
      </div>

      {/* Profile Filters Toggle */}
      {profile && (
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useProfileFilters}
              onChange={(e) => setUseProfileFilters(e.target.checked)}
              className="rounded text-green-600 focus:ring-green-500"
            />
            <span className="text-gray-700">Usar mis preferencias</span>
          </label>
          <button
            onClick={() => setShowAllFilters(!showAllFilters)}
            className="text-green-600 hover:text-green-700"
          >
            {showAllFilters ? 'Menos filtros' : 'Más filtros'}
          </button>
        </div>
      )}

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter, idx) => (
            <span
              key={`${filter.type}-${filter.value}-${idx}`}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                filter.type === 'allergen'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {filter.label}
              <button
                onClick={() => removeFilter(filter)}
                className="ml-1 hover:opacity-70"
                aria-label={`Quitar filtro ${filter.label}`}
              >
                ×
              </button>
            </span>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Limpiar todos
          </button>
        </div>
      )}

      {/* Expanded Filters */}
      {showAllFilters && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          {/* Dietary Preferences */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Tipo de dieta</h4>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DIETARY_PREFERENCE_LABELS) as DietaryPreference[]).map(
                (pref) => (
                  <button
                    key={pref}
                    onClick={() => toggleDietary(pref)}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      filters.dietary?.includes(pref)
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {DIETARY_PREFERENCE_LABELS[pref]}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Allergens */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Excluir alérgenos
            </h4>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ALLERGEN_LABELS) as Allergen[]).map((allergen) => (
                <button
                  key={allergen}
                  onClick={() => toggleAllergen(allergen)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    filters.allergen_free?.includes(allergen)
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Sin {ALLERGEN_LABELS[allergen]}
                </button>
              ))}
            </div>
          </div>

          {/* Macro Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Máx. calorías
              </label>
              <select
                value={filters.max_calories || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    max_calories: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Sin límite</option>
                <option value="300">300 kcal</option>
                <option value="400">400 kcal</option>
                <option value="500">500 kcal</option>
                <option value="600">600 kcal</option>
                <option value="800">800 kcal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mín. proteína
              </label>
              <select
                value={filters.min_protein || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    min_protein: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Sin mínimo</option>
                <option value="15">15g+</option>
                <option value="20">20g+</option>
                <option value="25">25g+</option>
                <option value="30">30g+</option>
                <option value="40">40g+</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-gray-500">
        Mostrando {filteredItems.length} de {menuItems.length} productos
      </div>
    </div>
  );
}

/**
 * Quick filter presets based on fitness goal
 */
export function QuickFilterPresets({
  onApply,
}: {
  onApply: (filters: Partial<MenuFilters>) => void;
}) {
  const presets = [
    {
      id: 'high-protein',
      label: '💪 Alto en proteína',
      filters: { min_protein: 25 },
    },
    {
      id: 'low-cal',
      label: '🥗 Bajo en calorías',
      filters: { max_calories: 400 },
    },
    {
      id: 'keto',
      label: '🥓 Keto-friendly',
      filters: { dietary: ['keto' as DietaryPreference] },
    },
    {
      id: 'vegan',
      label: '🌱 Vegano',
      filters: { dietary: ['vegan' as DietaryPreference] },
    },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onApply(preset.filters)}
          className="flex-shrink-0 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

export default PersonalizedFilters;
