# API Documentation - Online Orders Services

**QuickPOS - SPEC-POS-001**
**Version**: 2.0.0
**Last Updated**: 2026-02-07

---

## Table of Contents

- [StatusChangeHandler Service](#statuschangehandler-service)
- [NotificationService](#notificationservice)
- [StripeService](#stripeservice)
- [Custom Hooks](#custom-hooks)
- [Zustand Stores](#zustand-stores)

---

## StatusChangeHandler Service

**Location**: `src/services/orders/StatusChangeHandler.ts`

### Overview

Service for managing order status transitions with validation, logging, and automatic notifications.

### Class: StatusChangeHandler

#### Constructor

```typescript
constructor(
  supabase: SupabaseClient,
  notificationCallback?: NotificationTriggerCallback
)
```

#### Methods

##### validateStatusTransition

Validates if a status transition is allowed according to business rules.

```typescript
async validateStatusTransition(
  from: OnlineOrderStatus | null,
  to: OnlineOrderStatus
): Promise<boolean>
```

**Valid Transitions**:
```
pending -> confirmed, cancelled
confirmed -> preparing, cancelled
preparing -> ready, cancelled
ready -> picked_up, cancelled
picked_up -> (terminal state)
cancelled -> (terminal state)
```

**Returns**: `true` if transition is valid, `false` otherwise

---

##### updateOrderStatus

Updates an order's status with validation, logging, and notification triggers.

```typescript
async updateOrderStatus(
  orderId: string,
  newStatus: OnlineOrderStatus,
  options?: StatusUpdateOptions
): Promise<StatusChangeResult>
```

**Parameters**:
- `orderId`: The order ID to update
- `newStatus`: Target status
- `options.notes`: Optional notes for the change
- `options.changedBy`: ID of user/staff making the change
- `options.skipNotification`: Skip notification for this change
- `options.cancellationReason`: Reason when cancelling

**Returns**: `StatusChangeResult`

```typescript
interface StatusChangeResult {
  success: boolean;
  order?: OnlineOrder;
  error?: string;
  historyEntry?: OrderStatusHistory;
}
```

**Example**:
```typescript
const handler = new StatusChangeHandler(supabase);
const result = await handler.updateOrderStatus(
  'order-uuid',
  'ready',
  { changedBy: 'staff-uuid' }
);
```

---

##### bulkUpdateOrderStatus

Updates multiple orders to the same status.

```typescript
async bulkUpdateOrderStatus(
  orderIds: string[],
  newStatus: OnlineOrderStatus,
  options?: StatusUpdateOptions
): Promise<StatusChangeResult[]>
```

---

##### getStatusHistory

Retrieves the complete status history for an order.

```typescript
async getStatusHistory(orderId: string): Promise<OrderStatusHistory[]>
```

**Returns**:
```typescript
interface OrderStatusHistory {
  id: string;
  order_id: string;
  old_status: OnlineOrderStatus | null;
  new_status: OnlineOrderStatus;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}
```

---

##### canCancelOrder

Checks if an order can still be cancelled.

```typescript
async canCancelOrder(orderId: string): Promise<boolean>
```

**Returns**: `true` if order is not in terminal state (picked_up or cancelled)

---

##### getOrderStats

Gets order statistics grouped by status.

```typescript
async getOrderStats(businessId: string): Promise<Partial<Record<OnlineOrderStatus, number>>>
```

**Returns**: Object with counts per status

---

##### getOverdueOrders

Gets orders that are past their pickup time but not yet picked up.

```typescript
async getOverdueOrders(businessId: string): Promise<OnlineOrder[]>
```

---

## NotificationService

**Location**: `src/services/notifications/NotificationService.ts`

### Overview

Multi-channel notification service supporting Email, SMS, and Telegram notifications.

### Class: NotificationService

#### Constructor

```typescript
constructor(
  supabaseClient: SupabaseClient = supabase,
  config: NotificationServiceConfig = {}
)
```

**Configuration**:
```typescript
interface NotificationServiceConfig {
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  telegramBotToken?: string;
  maxRetries?: number;
}
```

#### Methods

##### sendEmail

Sends an email notification via Supabase Email.

```typescript
async sendEmail(options: EmailOptions): Promise<NotificationResult>
```

**Parameters**:
```typescript
interface EmailOptions {
  to: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  orderId?: string;
  businessId: string;
  locale?: 'en' | 'es';
}
```

---

##### sendSMS

Sends an SMS notification via Twilio.

```typescript
async sendSMS(options: SMSOptions): Promise<NotificationResult>
```

**Parameters**:
```typescript
interface SMSOptions {
  to: string;
  message: string;
  orderId?: string;
  businessId: string;
}
```

---

##### sendTelegram

Sends a notification via Telegram Bot.

```typescript
async sendTelegram(options: TelegramOptions): Promise<NotificationResult>
```

**Parameters**:
```typescript
interface TelegramOptions {
  chatId: string;
  message: string;
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  orderId?: string;
  businessId: string;
}
```

---

##### sendOrderReadyNotification

Sends a comprehensive "order ready" notification via the customer's preferred channel.

```typescript
async sendOrderReadyNotification(
  options: OrderReadyOptions
): Promise<NotificationResult>
```

**Parameters**:
```typescript
interface OrderReadyOptions {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerPhone?: string;
  customerTelegramChatId?: string;
  notificationMethod: NotificationChannel;
  businessId: string;
  pickupTime: string;
  sendToAllChannels?: boolean;
  locale?: 'en' | 'es';
}
```

---

##### batchSend

Sends multiple notifications in parallel batches.

```typescript
async batchSend(
  notifications: BatchNotificationItem[],
  options?: BatchSendOptions
): Promise<BatchSendResult>
```

**Parameters**:
```typescript
interface BatchNotificationItem {
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  content: string;
  orderId: string;
  businessId: string;
  priority?: NotificationPriority;
}

interface BatchSendOptions {
  prioritize?: boolean;
  concurrent?: number;
}
```

---

##### retryFailedNotifications

Retries failed notifications within a time window.

```typescript
async retryFailedNotifications(
  businessId: string,
  options?: RetryOptions
): Promise<{ retried: number; skipped: number; errors: number }>
```

---

##### getNotificationHistory

Gets notification history for an order.

```typescript
async getNotificationHistory(
  orderId: string,
  filters?: { channel?: NotificationChannel }
): Promise<NotificationLog[]>
```

---

## StripeService

**Location**: `src/services/payments/StripeService.ts`

### Overview

Payment processing service using Stripe Checkout for online orders.

### Class: StripeService

#### Constructor

```typescript
constructor(supabase: SupabaseClient, config: StripeServiceConfig)
```

**Configuration**:
```typescript
interface StripeServiceConfig {
  secretKey: string;
  webhookSecret: string;
  priceId?: string;
  publishableKey?: string;
}
```

#### Methods

##### createCheckoutSession

Creates a Stripe Checkout session for hosted payment flow.

```typescript
async createCheckoutSession(
  options: CheckoutSessionOptions
): Promise<CheckoutSessionResult>
```

**Parameters**:
```typescript
interface CheckoutSessionOptions {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  customerName?: string;
  businessId: string;
  stripeCustomerId?: string;
  successUrl: string;
  cancelUrl: string;
  locale?: string;
  metadata?: Record<string, string | number | boolean>;
}
```

**Returns**:
```typescript
interface CheckoutSessionResult {
  success: boolean;
  sessionId?: string;
  sessionUrl?: string;
  error?: string;
}
```

**Example**:
```typescript
const stripeService = new StripeService(supabase, {
  secretKey: 'sk_test_...',
  webhookSecret: 'whsec_...'
});

const result = await stripeService.createCheckoutSession({
  orderId: 'order-uuid',
  orderNumber: 'KAH-000001',
  amount: 25.50,
  currency: 'mxn',
  customerEmail: 'customer@example.com',
  businessId: 'business-uuid',
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel'
});

if (result.success) {
  window.location.href = result.sessionUrl;
}
```

---

##### createPaymentIntent

Creates a payment intent for custom checkout flow.

```typescript
async createPaymentIntent(
  options: PaymentIntentOptions
): Promise<PaymentIntentResult>
```

**Returns**:
```typescript
interface PaymentIntentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  customerId?: string;
  error?: string;
}
```

---

##### getPaymentStatus

Retrieves the current status of a payment intent.

```typescript
async getPaymentStatus(
  paymentIntentId: string
): Promise<PaymentStatusInfo>
```

---

##### verifyAndConstructWebhook

Verifies webhook signature and constructs event.

```typescript
verifyAndConstructWebhook(
  payload: string,
  signature: string
): Stripe.Event
```

---

##### handleWebhookEvent

Processes a Stripe webhook event.

```typescript
async handleWebhookEvent(
  event: Stripe.Event,
  signature: string
): Promise<WebhookResult>
```

**Supported Events**:
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

---

##### refundPayment

Creates a refund for a payment.

```typescript
async refundPayment(
  options: RefundOptions
): Promise<RefundResult>
```

**Parameters**:
```typescript
interface RefundOptions {
  paymentIntentId: string;
  orderId: string;
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' | string;
}
```

---

##### createCustomer

Creates a new Stripe customer.

```typescript
async createCustomer(
  options: CreateCustomerOptions
): Promise<StripeCustomer>
```

---

##### getPublishableKey

Returns the Stripe publishable key for client-side use.

```typescript
getPublishableKey(): string
```

---

## Custom Hooks

### useOnlineMenu

**Location**: `src/hooks/online-orders/useOnlineMenu.ts`

Hook for fetching menu data with categories and products.

```typescript
function useOnlineMenu(
  businessId: string | null,
  options?: {
    enabled?: boolean;
    fetchOnMount?: boolean;
  }
): UseOnlineMenuResult
```

**Returns**:
```typescript
interface UseOnlineMenuResult {
  categories: MenuCategory[];
  products: MenuItem[];
  nutritionInfo: Map<string, ProductNutritionInfo>;
  isLoadingCategories: boolean;
  isLoadingProducts: boolean;
  error: string | null;
  activeCategory: MenuCategoryType | null;
  searchQuery: string;
  setCategory: (category: MenuCategoryType | null) => void;
  setSearchQuery: (query: string) => void;
  refetch: () => Promise<void>;
}
```

**Example**:
```typescript
const { products, isLoading, error, setCategory } = useOnlineMenu(businessId);
```

---

### useOrdersRealtime

**Location**: `src/hooks/online-orders/useOrdersRealtime.ts`

Hook for subscribing to online order changes via Supabase Realtime.

```typescript
function useOrdersRealtime(
  options: UseOrdersRealtimeOptions
): UseOrdersRealtimeResult
```

**Parameters**:
```typescript
interface UseOrdersRealtimeOptions {
  businessId: string | null;
  status?: OnlineOrderStatus | OnlineOrderStatus[];
  enabled?: boolean;
  channelName?: string;
}
```

**Returns**:
```typescript
interface UseOrdersRealtimeResult {
  orders: OnlineOrder[];
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  error: string | null;
  refetch: () => Promise<void>;
}
```

**Example**:
```typescript
const { orders, connectionState } = useOrdersRealtime({
  businessId: 'business-uuid',
  status: ['pending', 'confirmed', 'preparing']
});
```

---

## Zustand Stores

### onlineCartStore

**Location**: `src/stores/onlineCartStore.ts`

Store for online shopping cart with localStorage persistence.

```typescript
interface OnlineCartState {
  // State
  items: CartItem[];

  // Actions
  addItem: (item) => void;
  removeItem: (productId) => void;
  updateQuantity: (productId, quantity) => void;
  updateNotes: (productId, notes) => void;
  clearCart: () => void;

  // Computed
  itemCount: () => number;
  subtotal: () => number;
  tax: () => number;  // 16% IVA
  total: () => number;
  nutrition: () => NutritionDisplay;

  // Helpers
  getItem: (productId) => CartItem | undefined;
  hasItem: (productId) => boolean;
}
```

**Example**:
```typescript
const addItem = useOnlineCartStore(state => state.addItem);
const total = useOnlineCartStore(state => state.total());

addItem({ productId: '123', name: 'Bowl', price: 150, quantity: 1 });
```

---

### ordersRealtimeStore

**Location**: `src/stores/ordersRealtimeStore.ts`

Store for managing realtime order updates.

```typescript
interface OrdersRealtimeState {
  orders: OnlineOrder[];
  connectionState: ConnectionState;
  error: string | null;

  setOrders: (orders) => void;
  addOrder: (order) => void;
  updateOrder: (orderId, updates) => void;
  removeOrder: (orderId) => void;
  setConnectionState: (state) => void;
  setError: (error) => void;
  clearOrders: () => void;
}
```

**Example**:
```typescript
const orders = useOrdersRealtimeStore(state => state.orders);
const updateOrder = useOrdersRealtimeStore(state => state.updateOrder);
```

---

## Type Definitions

### OnlineOrderStatus

```typescript
type OnlineOrderStatus =
  | 'pending'      // Order created, awaiting confirmation
  | 'confirmed'    // Payment confirmed
  | 'preparing'    // Kitchen started preparing
  | 'ready'        // Ready for pickup
  | 'picked_up'    // Customer picked up
  | 'cancelled';   // Order cancelled
```

### PaymentMethod

```typescript
type PaymentMethod =
  | 'stripe'         // Online payment
  | 'cash'           // Pay cash on pickup
  | 'card_terminal'  // Card terminal on pickup
  | 'on_arrival';    // Generic pay on arrival
```

### NotificationChannel

```typescript
type NotificationChannel =
  | 'email'
  | 'sms'
  | 'telegram';
```

---

## Error Handling

All services return result objects with success/error information:

```typescript
interface ResultType {
  success: boolean;
  error?: string;
  // ... other fields
}
```

Always check `success` before accessing other fields.

---

**Documentation Version**: 2.0.0
**Last Updated**: 2026-02-07
