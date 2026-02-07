/**
 * SPEC-POS-001: Online Orders System - Type Definitions
 *
 * TypeScript types for online ordering with scheduled pickup
 * Multi-tenant support with business_id
 */

// ============================================================================
// ORDER STATUS TYPES
// ============================================================================

/**
 * Status of an online order throughout its lifecycle
 */
export type OnlineOrderStatus =
  | 'pending'      // Order created, awaiting confirmation
  | 'confirmed'    // Payment confirmed (if applicable)
  | 'preparing'    // Kitchen started preparing
  | 'ready'        // Ready for pickup, notification sent
  | 'picked_up'    // Customer picked up the order
  | 'cancelled';   // Order was cancelled

/**
 * Payment method options for online orders
 */
export type PaymentMethod =
  | 'stripe'         // Online payment via Stripe
  | 'cash'           // Pay cash on pickup
  | 'card_terminal'  // Pay with card terminal on pickup
  | 'on_arrival';    // Generic pay on arrival

/**
 * Payment status tracking
 */
export type PaymentStatus =
  | 'pending'    // Payment not yet processed
  | 'paid'       // Payment completed
  | 'refunded'   // Payment was refunded
  | 'failed';    // Payment attempt failed

/**
 * Notification channel preferences
 */
export type NotificationChannel =
  | 'email'
  | 'sms'
  | 'telegram';

/**
 * Notification log status
 */
export type NotificationStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed';

// ============================================================================
// MENU CATEGORIES
// ============================================================================

/**
 * Fitness menu category types
 */
export type MenuCategoryType =
  | 'pre_workout'
  | 'post_workout'
  | 'balanced'
  | 'snacks'
  | 'drinks';

/**
 * Menu category for fitness menu organization
 */
export interface MenuCategory {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  category_type: MenuCategoryType;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  nutrition_highlight: NutritionHighlight;
  created_at: string;
  updated_at: string;
}

/**
 * Nutrition highlights displayed on category cards
 */
export interface NutritionHighlight {
  calories_range?: string;
  protein_range?: string;
  main_benefits?: string[];
  recommendation?: string;
}

// ============================================================================
// PRODUCT NUTRITION INFO
// ============================================================================

/**
 * Detailed nutritional information for a product
 */
export interface ProductNutritionInfo {
  id: string;
  business_id: string;
  product_id: string;
  serving_size: string | null;
  servings_per_container: number | null;

  // Macros per serving
  calories: number | null;
  protein: number | null;      // grams
  carbohydrates: number | null; // grams
  fat: number | null;          // grams
  fiber: number | null;        // grams
  sugar: number | null;        // grams
  sodium: number | null;       // mg

  // Micros (optional)
  vitamins: Record<string, number>;
  minerals: Record<string, number>;

  // Fitness scores (1-10)
  protein_score: number | null;
  calorie_score: number | null;
  health_score: number | null;

  created_at: string;
  updated_at: string;
}

/**
 * Simplified nutrition display format
 */
export interface NutritionDisplay {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

// ============================================================================
// CUSTOMER PROFILES
// ============================================================================

/**
 * Fitness goals for customer profiles
 */
export type FitnessGoal =
  | 'lose_weight'
  | 'gain_muscle'
  | 'maintain'
  | 'performance'
  | 'general_health';

/**
 * Dietary preference tags
 */
export type DietaryPreference =
  | 'vegan'
  | 'vegetarian'
  | 'keto'
  | 'paleo'
  | 'gluten_free'
  | 'dairy_free'
  | 'low_sodium'
  | 'sugar_free';

/**
 * Common allergen tags
 */
export type Allergen =
  | 'gluten'
  | 'dairy'
  | 'nuts'
  | 'eggs'
  | 'soy'
  | 'shellfish'
  | 'fish';

/**
 * Optional customer profile with fitness goals and preferences
 */
export interface CustomerProfile {
  id: string;
  business_id: string;
  user_id: string | null;
  customer_id: string | null;

  // Fitness goals
  fitness_goal: FitnessGoal | null;

  // Daily targets
  daily_calorie_target: number | null;
  daily_protein_target: number | null;  // grams
  daily_carbs_target: number | null;    // grams
  daily_fat_target: number | null;      // grams

  // Preferences
  dietary_preferences: DietaryPreference[];
  allergies: Allergen[];

  // Notifications
  preferred_notification_method: NotificationChannel;
  phone_number: string | null;
  telegram_chat_id: string | null;

  // Favorites
  favorite_products: string[];

  created_at: string;
  updated_at: string;
}

// ============================================================================
// ONLINE ORDERS
// ============================================================================

/**
 * Item in an online order (stored as JSONB in database)
 */
export interface OnlineOrderItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
  nutrition_info?: NutritionDisplay;
}

/**
 * Main online order entity
 */
export interface OnlineOrder {
  id: string;
  business_id: string;

  // Order identification
  order_number: string;

  // Customer (nullable for guest orders)
  user_id: string | null;
  customer_id: string | null;

  // Guest info (when not registered)
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;

  // Order details
  items: OnlineOrderItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;

  // Scheduling
  pickup_time: string;           // ISO datetime
  estimated_prep_time: number;   // minutes
  requested_time: string | null; // ISO datetime

  // Status
  status: OnlineOrderStatus;
  cancellation_reason: string | null;

  // Payment
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  stripe_payment_intent_id: string | null;
  stripe_customer_id: string | null;

  // Notifications
  notification_method: NotificationChannel;
  notification_sent: boolean;
  reminder_sent: boolean;

  // Notes
  customer_notes: string | null;
  staff_notes: string | null;
  internal_notes: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  started_preparing_at: string | null;
  ready_at: string | null;
  picked_up_at: string | null;
  cancelled_at: string | null;

  // Metadata
  metadata: Record<string, unknown>;
}

// ============================================================================
// ORDER STATUS HISTORY
// ============================================================================

/**
 * Audit log entry for order status changes
 */
export interface OrderStatusHistory {
  id: string;
  order_id: string;
  old_status: OnlineOrderStatus | null;
  new_status: OnlineOrderStatus;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

// ============================================================================
// NOTIFICATION LOGS
// ============================================================================

/**
 * Notification log entry
 */
export interface NotificationLog {
  id: string;
  business_id: string;
  order_id: string | null;
  recipient: string;
  channel: NotificationChannel;
  type: string;
  status: NotificationStatus;
  subject: string | null;
  content: string | null;
  external_id: string | null;
  error_message: string | null;
  retry_count: number;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

// ============================================================================
// CART TYPES
// ============================================================================

/**
 * Cart item for online ordering (simplified vs order item)
 */
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  nutritionInfo?: NutritionDisplay;
  imageUrl?: string;
  allergens?: Allergen[];
  dietaryTags?: DietaryPreference[];
}

/**
 * Cart state summary
 */
export interface CartSummary {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  tax: number;
  total: number;
}

// ============================================================================
// CHECKOUT TYPES
// ============================================================================

/**
 * Guest checkout form data
 */
export interface GuestCheckoutData {
  name: string;
  email: string;
  phone: string;
  pickupTime: string;
  customerNotes?: string;
  paymentMethod: PaymentMethod;
}

/**
 * Create order request
 */
export interface CreateOrderRequest {
  business_id: string;
  items: OnlineOrderItem[];
  guest_info?: {
    name: string;
    email: string;
    phone: string;
  };
  customer_id?: string;
  pickup_time: string;
  customer_notes?: string;
  payment_method: PaymentMethod;
  notification_method: NotificationChannel;
}

/**
 * Order confirmation response
 */
export interface OrderConfirmation {
  order: OnlineOrder;
  estimated_pickup_time: string;
  message: string;
}

// ============================================================================
// PICKUP TIME TYPES
// ============================================================================

/**
 * Available time slot for pickup
 */
export interface TimeSlot {
  time: string;        // ISO datetime
  display: string;     // Formatted time display
  available: boolean;
  capacity_remaining?: number;
}

/**
 * Pickup time selector configuration
 */
export interface PickupTimeConfig {
  opening_time: string;   // HH:mm format
  closing_time: string;   // HH:mm format
  prep_time_minutes: number;
  interval_minutes: number;
  capacity_per_slot?: number;
}

// ============================================================================
// STAFF DASHBOARD TYPES
// ============================================================================

/**
 * Order card summary for staff dashboard
 */
export interface StaffOrderSummary {
  id: string;
  order_number: string;
  status: OnlineOrderStatus;
  pickup_time: string;
  items_count: number;
  total: number;
  customer_name: string;
  time_waiting: number; // minutes since order
  is_overdue: boolean;
}

/**
 * Kanban column for staff dashboard
 */
export interface KanbanColumn {
  status: OnlineOrderStatus;
  title: string;
  orders: StaffOrderSummary[];
}

/**
 * Staff dashboard metrics
 */
export interface StaffDashboardMetrics {
  pending_count: number;
  preparing_count: number;
  ready_count: number;
  today_orders: number;
  today_revenue: number;
  avg_prep_time: number;
}

// ============================================================================
// FILTER AND SEARCH TYPES
// ============================================================================

/**
 * Menu filter options
 */
export interface MenuFilters {
  category?: MenuCategoryType;
  dietary?: DietaryPreference[];
  allergen_free?: Allergen[];
  max_calories?: number;
  min_protein?: number;
  search_query?: string;
}

/**
 * Product with nutrition for menu display
 */
export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  category_id: string | null;
  category_name: string | null;
  nutrition: ProductNutritionInfo | null;
  allergens: Allergen[];
  dietary_tags: DietaryPreference[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pages: number;
}

/**
 * API error response
 */
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}
