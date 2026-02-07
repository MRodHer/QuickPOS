/**
 * SPEC-POS-001 Phase 3: Customer Profile Page
 *
 * Main profile page where customers can:
 * - View and edit personal information
 * - Configure fitness goals and macro targets
 * - Manage dietary preferences and allergies
 * - Set notification preferences
 */

import { useState, useEffect } from 'react';
import { useCustomerProfileStore, FITNESS_GOAL_PRESETS, DIETARY_PREFERENCE_LABELS, ALLERGEN_LABELS } from '@/stores/customerProfileStore';
import type { FitnessGoal, DietaryPreference, Allergen, NotificationChannel } from '@/types/online-orders';

interface CustomerProfileProps {
  userId: string;
  businessId: string;
}

export function CustomerProfile({ userId, businessId }: CustomerProfileProps) {
  const {
    profile,
    isLoading,
    error,
    fetchProfile,
    createProfile,
    setFitnessGoal,
    setDailyTargets,
    addDietaryPreference,
    removeDietaryPreference,
    addAllergy,
    removeAllergy,
    setNotificationPreference,
  } = useCustomerProfileStore();

  const [activeTab, setActiveTab] = useState<'info' | 'fitness' | 'preferences' | 'notifications'>('info');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchProfile(userId).then(() => {
        // Create profile if it doesn't exist
        if (!profile) {
          createProfile(userId, businessId);
        }
      });
    }
  }, [userId, businessId, fetchProfile, createProfile, profile]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-3 text-gray-600">Cargando perfil...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        Error: {error}
      </div>
    );
  }

  const tabs = [
    { id: 'info' as const, label: 'Información', icon: '👤' },
    { id: 'fitness' as const, label: 'Objetivos Fitness', icon: '🎯' },
    { id: 'preferences' as const, label: 'Preferencias', icon: '🥗' },
    { id: 'notifications' as const, label: 'Notificaciones', icon: '🔔' },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4" aria-label="Perfil de cliente">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mi Perfil</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'info' && (
          <ProfileInfoSection profile={profile} isEditing={isEditing} />
        )}

        {activeTab === 'fitness' && (
          <FitnessGoalsSection
            profile={profile}
            onSetGoal={setFitnessGoal}
            onSetTargets={setDailyTargets}
          />
        )}

        {activeTab === 'preferences' && (
          <PreferencesSection
            profile={profile}
            onAddDietaryPreference={addDietaryPreference}
            onRemoveDietaryPreference={removeDietaryPreference}
            onAddAllergy={addAllergy}
            onRemoveAllergy={removeAllergy}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsSection
            profile={profile}
            onSetPreference={setNotificationPreference}
          />
        )}
      </div>
    </div>
  );
}

// Sub-components
interface ProfileInfoSectionProps {
  profile: any;
  isEditing: boolean;
}

function ProfileInfoSection({ profile, isEditing }: ProfileInfoSectionProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Información Personal</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-500">Email</label>
          <p className="text-gray-900">{profile?.user_id || '-'}</p>
        </div>
        <div>
          <label className="block text-sm text-gray-500">Teléfono</label>
          <p className="text-gray-900">{profile?.phone_number || 'No configurado'}</p>
        </div>
        <div>
          <label className="block text-sm text-gray-500">Miembro desde</label>
          <p className="text-gray-900">
            {profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : '-'}
          </p>
        </div>
      </div>
    </div>
  );
}

interface FitnessGoalsSectionProps {
  profile: any;
  onSetGoal: (goal: FitnessGoal) => Promise<void>;
  onSetTargets: (targets: { calories: number; protein: number; carbs: number; fat: number }) => Promise<void>;
}

function FitnessGoalsSection({ profile, onSetGoal, onSetTargets }: FitnessGoalsSectionProps) {
  const [selectedGoal, setSelectedGoal] = useState<FitnessGoal | null>(profile?.fitness_goal || null);
  const [customTargets, setCustomTargets] = useState({
    calories: profile?.daily_calorie_target || 2000,
    protein: profile?.daily_protein_target || 120,
    carbs: profile?.daily_carbs_target || 220,
    fat: profile?.daily_fat_target || 70,
  });
  const [isCustom, setIsCustom] = useState(false);

  const handleGoalSelect = async (goal: FitnessGoal) => {
    setSelectedGoal(goal);
    const preset = FITNESS_GOAL_PRESETS[goal];
    await onSetGoal(goal);
    await onSetTargets({
      calories: preset.calories,
      protein: preset.protein,
      carbs: preset.carbs,
      fat: preset.fat,
    });
    setCustomTargets({
      calories: preset.calories,
      protein: preset.protein,
      carbs: preset.carbs,
      fat: preset.fat,
    });
  };

  const handleCustomTargets = async () => {
    await onSetTargets(customTargets);
    setIsCustom(false);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Objetivos Fitness</h2>

      {/* Goal Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selecciona tu objetivo:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(FITNESS_GOAL_PRESETS) as FitnessGoal[]).map((goal) => (
            <button
              key={goal}
              onClick={() => handleGoalSelect(goal)}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                selectedGoal === goal
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="font-medium">{FITNESS_GOAL_PRESETS[goal].label}</span>
              <p className="text-xs text-gray-500 mt-1">
                {FITNESS_GOAL_PRESETS[goal].calories} kcal/día
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Daily Targets */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium">Metas diarias</h3>
          <button
            onClick={() => setIsCustom(!isCustom)}
            className="text-sm text-green-600 hover:text-green-700"
          >
            {isCustom ? 'Cancelar' : 'Personalizar'}
          </button>
        </div>

        {isCustom ? (
          <div className="space-y-3">
            {(['calories', 'protein', 'carbs', 'fat'] as const).map((macro) => (
              <div key={macro} className="flex items-center gap-3">
                <label className="w-24 text-sm capitalize">
                  {macro === 'calories' ? 'Calorías' : macro === 'protein' ? 'Proteína' : macro === 'carbs' ? 'Carbohidratos' : 'Grasa'}
                </label>
                <input
                  type="number"
                  value={customTargets[macro]}
                  onChange={(e) =>
                    setCustomTargets((prev) => ({
                      ...prev,
                      [macro]: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="flex-1 px-3 py-1 border rounded"
                />
                <span className="text-sm text-gray-500 w-12">
                  {macro === 'calories' ? 'kcal' : 'g'}
                </span>
              </div>
            ))}
            <button
              onClick={handleCustomTargets}
              className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Guardar metas
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {profile?.daily_calorie_target || '-'}
              </p>
              <p className="text-sm text-gray-500">kcal/día</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {profile?.daily_protein_target || '-'}g
              </p>
              <p className="text-sm text-gray-500">proteína</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {profile?.daily_carbs_target || '-'}g
              </p>
              <p className="text-sm text-gray-500">carbohidratos</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {profile?.daily_fat_target || '-'}g
              </p>
              <p className="text-sm text-gray-500">grasa</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface PreferencesSectionProps {
  profile: any;
  onAddDietaryPreference: (pref: DietaryPreference) => Promise<void>;
  onRemoveDietaryPreference: (pref: DietaryPreference) => Promise<void>;
  onAddAllergy: (allergy: Allergen) => Promise<void>;
  onRemoveAllergy: (allergy: Allergen) => Promise<void>;
}

function PreferencesSection({
  profile,
  onAddDietaryPreference,
  onRemoveDietaryPreference,
  onAddAllergy,
  onRemoveAllergy,
}: PreferencesSectionProps) {
  const dietaryPreferences = profile?.dietary_preferences || [];
  const allergies = profile?.allergies || [];

  const togglePreference = (pref: DietaryPreference) => {
    if (dietaryPreferences.includes(pref)) {
      onRemoveDietaryPreference(pref);
    } else {
      onAddDietaryPreference(pref);
    }
  };

  const toggleAllergy = (allergy: Allergen) => {
    if (allergies.includes(allergy)) {
      onRemoveAllergy(allergy);
    } else {
      onAddAllergy(allergy);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Preferencias Alimenticias</h2>

      {/* Dietary Preferences */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-700 mb-2">Tipo de dieta:</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(DIETARY_PREFERENCE_LABELS) as DietaryPreference[]).map((pref) => (
            <button
              key={pref}
              onClick={() => togglePreference(pref)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                dietaryPreferences.includes(pref)
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {DIETARY_PREFERENCE_LABELS[pref]}
            </button>
          ))}
        </div>
      </div>

      {/* Allergies */}
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Alergias:</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ALLERGEN_LABELS) as Allergen[]).map((allergy) => (
            <button
              key={allergy}
              onClick={() => toggleAllergy(allergy)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                allergies.includes(allergy)
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {ALLERGEN_LABELS[allergy]}
            </button>
          ))}
        </div>
        {allergies.length > 0 && (
          <p className="mt-2 text-sm text-red-600">
            Los productos con estos alérgenos serán marcados claramente.
          </p>
        )}
      </div>
    </div>
  );
}

interface NotificationsSectionProps {
  profile: any;
  onSetPreference: (channel: NotificationChannel) => Promise<void>;
}

function NotificationsSection({ profile, onSetPreference }: NotificationsSectionProps) {
  const currentMethod = profile?.preferred_notification_method || 'email';

  const channels: { id: NotificationChannel; label: string; description: string }[] = [
    { id: 'email', label: 'Email', description: 'Recibe notificaciones por correo electrónico' },
    { id: 'sms', label: 'SMS', description: 'Recibe mensajes de texto a tu teléfono' },
    { id: 'telegram', label: 'Telegram', description: 'Recibe mensajes por Telegram Bot' },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Preferencias de Notificación</h2>
      <p className="text-sm text-gray-600 mb-4">
        Elige cómo quieres recibir las notificaciones de tus pedidos.
      </p>

      <div className="space-y-3">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => onSetPreference(channel.id)}
            className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
              currentMethod === channel.id
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{channel.label}</span>
                <p className="text-sm text-gray-500">{channel.description}</p>
              </div>
              {currentMethod === channel.id && (
                <span className="text-green-600 text-xl">✓</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {currentMethod === 'telegram' && !profile?.telegram_chat_id && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Para recibir notificaciones por Telegram, necesitas vincular tu cuenta.
            Busca nuestro bot: @GymFitRestaurantBot
          </p>
        </div>
      )}
    </div>
  );
}

export default CustomerProfile;
