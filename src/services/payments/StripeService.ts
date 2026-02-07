/**
 * SPEC-POS-001: Phase 2 - Stripe Payment Service
 *
 * Payment processing service using Stripe Checkout
 * Handles checkout sessions, payment intents, webhooks, and refunds
 *
 * TAG-DESIGN: Payment processing integration for online orders
 * TAG-FUNCTION: StripeService class
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import StripeLib from 'stripe';
import type Stripe from 'stripe';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Configuration for Stripe service
 */
export interface StripeServiceConfig {
  /** Stripe secret key (sk_test_* or sk_live_*) */
  secretKey: string;
  /** Webhook signing secret for signature verification */
  webhookSecret: string;
  /** Default Price ID for subscription products (optional) */
  priceId?: string;
  /** Publishable key for client-side operations */
  publishableKey?: string;
}

/**
 * Checkout session creation options
 */
export interface CheckoutSessionOptions {
  /** Order ID for metadata tracking */
  orderId: string;
  /** Human-readable order number */
  orderNumber: string;
  /** Payment amount in decimal (e.g., 25.50) */
  amount: number;
  /** Three-letter ISO currency code */
  currency: string;
  /** Customer email for pre-filling */
  customerEmail?: string;
  /** Customer name for pre-filling */
  customerName?: string;
  /** Business ID for multi-tenant tracking */
  businessId: string;
  /** Stripe customer ID if exists */
  stripeCustomerId?: string;
  /** URL to redirect to after successful payment */
  successUrl: string;
  /** URL to redirect to after cancelled payment */
  cancelUrl: string;
  /** Locale for Checkout page (e.g., 'es', 'en') */
  locale?: string;
  /** Additional metadata */
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Payment intent creation options
 */
export interface PaymentIntentOptions {
  /** Order ID for metadata tracking */
  orderId: string;
  /** Human-readable order number */
  orderNumber: string;
  /** Payment amount in decimal (e.g., 25.50) */
  amount: number;
  /** Three-letter ISO currency code */
  currency: string;
  /** Customer email */
  customerEmail?: string;
  /** Customer name */
  customerName?: string;
  /** Business ID for multi-tenant tracking */
  businessId: string;
  /** Existing Stripe customer ID */
  stripeCustomerId?: string;
  /** Payment method types to accept */
  paymentMethodTypes?: string[];
  /** Additional metadata */
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Checkout session result
 */
export interface CheckoutSessionResult {
  /** Whether session creation was successful */
  success: boolean;
  /** Stripe Checkout session ID */
  sessionId?: string;
  /** Checkout URL to redirect customer to */
  sessionUrl?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Payment intent result
 */
export interface PaymentIntentResult {
  /** Whether creation was successful */
  success: boolean;
  /** Payment intent ID */
  paymentIntentId?: string;
  /** Client secret for Elements */
  clientSecret?: string;
  /** Stripe customer ID */
  customerId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Webhook handling result
 */
export interface WebhookResult {
  /** Whether event was processed */
  processed: boolean;
  /** Event type that was handled */
  eventType?: string;
  /** Order ID if applicable */
  orderId?: string;
  /** Error message if processing failed */
  error?: string;
}

/**
 * Refund options
 */
export interface RefundOptions {
  /** Payment intent ID to refund */
  paymentIntentId: string;
  /** Order ID for record keeping */
  orderId: string;
  /** Refund amount in decimal (omit for full refund) */
  amount?: number;
  /** Reason for refund */
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'customer_request' | string;
}

/**
 * Refund result
 */
export interface RefundResult {
  /** Whether refund was successful */
  success: boolean;
  /** Refund ID */
  refundId?: string;
  /** Refund amount in decimal */
  amount?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Payment status info
 */
export interface PaymentStatusInfo {
  /** Payment intent status */
  status: string;
  /** Amount in decimal */
  amount: number;
  /** Currency code */
  currency: string;
  /** Customer ID */
  customerId?: string;
  /** Latest charge ID */
  chargeId?: string;
}

/**
 * Customer creation options
 */
export interface CreateCustomerOptions {
  /** Customer email */
  email: string;
  /** Customer name */
  name?: string;
  /** Customer phone */
  phone?: string;
  /** Additional metadata */
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Stripe customer info
 */
export interface StripeCustomer {
  /** Customer ID */
  id: string;
  /** Customer email */
  email?: string;
  /** Customer name */
  name?: string;
}

// ============================================================================
// STRIPE SERVICE CLASS
// ============================================================================

/**
 * Stripe Payment Service
 *
 * Provides integration with Stripe for:
 * - Checkout Sessions for hosted payment pages
 * - Payment Intents for custom checkout flows
 * - Webhook handling for async events
 * - Refund processing
 */
export class StripeService {
  private readonly supabase: SupabaseClient;
  private readonly config: StripeServiceConfig;
  private readonly stripe: Stripe;

  /**
   * Create a new Stripe service instance
   *
   * @param supabase - Supabase client for database operations
   * @param config - Stripe service configuration
   */
  constructor(supabase: SupabaseClient, config: StripeServiceConfig) {
    this.supabase = supabase;
    this.config = config;

    // Create Stripe instance using the module
    // In test environment, vi.mock will replace the stripe module
    this.stripe = new StripeLib(config.secretKey, {
      apiVersion: '2024-11-20.acacia',
      typescript: true,
    });
  }

  // ========================================================================
  // CHECKOUT SESSION METHODS
  // ========================================================================

  /**
   * Create a Stripe Checkout session for hosted payment flow
   *
   * @param options - Checkout session options
   * @returns Checkout session result with URL
   */
  async createCheckoutSession(
    options: CheckoutSessionOptions
  ): Promise<CheckoutSessionResult> {
    try {
      // Convert decimal amount to cents for Stripe
      const amountInCents = Math.round(options.amount * 100);

      // Build session metadata
      const metadata: Record<string, string> = {
        orderId: options.orderId,
        orderNumber: options.orderNumber,
        businessId: options.businessId,
        ...(options.metadata || {}),
      };

      // Get or create Stripe customer
      let customerId = options.stripeCustomerId;
      if (!customerId && options.customerEmail) {
        const customer = await this.getOrCreateCustomer(
          options.customerEmail,
          options.customerName,
          options.businessId
        );
        customerId = customer.id;
      }

      // Create checkout session
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: options.currency,
              product_data: {
                name: `Orden ${options.orderNumber}`,
                description: options.metadata?.description as string || undefined,
                metadata: {
                  orderId: options.orderId,
                  orderNumber: options.orderNumber,
                },
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
        metadata,
        customer_email: !customerId ? options.customerEmail : undefined,
        customer: customerId || undefined,
        locale: (options.locale as Stripe.Checkout.SessionCreateParams.Locale) || 'auto',
        expires_at: Math.floor(Date.now() / 1000) + 60 * 30, // 30 minutes
      };

      const session = await this.stripe.checkout.sessions.create(sessionParams);

      // Update order with session info
      await this.updateOrderWithSessionInfo(options.orderId, session);

      return {
        success: true,
        sessionId: session.id,
        sessionUrl: session.url,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to create checkout session: ${errorMessage}`,
      };
    }
  }

  /**
   * Update order with Stripe session information
   */
  private async updateOrderWithSessionInfo(
    orderId: string,
    session: Stripe.Checkout.Session
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('online_orders')
        .update({
          stripe_customer_id: session.customer as string | null,
          metadata: {
            checkout_session_id: session.id,
            checkout_session_url: session.url,
          },
        })
        .eq('id', orderId);

      if (error) {
        console.error('Failed to update order with session info:', error);
      }
    } catch (error) {
      console.error('Error updating order with session info:', error);
    }
  }

  // ========================================================================
  // PAYMENT INTENT METHODS
  // ========================================================================

  /**
   * Create a payment intent for custom checkout flow
   *
   * @param options - Payment intent options
   * @returns Payment intent result with client secret
   */
  async createPaymentIntent(
    options: PaymentIntentOptions
  ): Promise<PaymentIntentResult> {
    try {
      // Convert decimal amount to cents for Stripe
      const amountInCents = Math.round(options.amount * 100);

      // Get or create Stripe customer
      let customerId = options.stripeCustomerId;
      if (!customerId && options.customerEmail) {
        const customer = await this.getOrCreateCustomer(
          options.customerEmail,
          options.customerName,
          options.businessId
        );
        customerId = customer.id;
      }

      // Build payment intent metadata
      const metadata: Record<string, string> = {
        orderId: options.orderId,
        orderNumber: options.orderNumber,
        businessId: options.businessId,
        ...(options.metadata || {}),
      };

      // Create payment intent
      const intentParams: Stripe.PaymentIntentCreateParams = {
        amount: amountInCents,
        currency: options.currency,
        customer: customerId,
        payment_method_types: options.paymentMethodTypes || ['card'],
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      };

      const intent = await this.stripe.paymentIntents.create(intentParams);

      // Update order with payment intent info
      await this.updateOrderWithPaymentIntent(options.orderId, intent.id);

      return {
        success: true,
        paymentIntentId: intent.id,
        clientSecret: intent.client_secret || undefined,
        customerId: intent.customer as string | undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to create payment intent: ${errorMessage}`,
      };
    }
  }

  /**
   * Update order with payment intent ID
   */
  private async updateOrderWithPaymentIntent(
    orderId: string,
    paymentIntentId: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('online_orders')
        .update({
          stripe_payment_intent_id: paymentIntentId,
        })
        .eq('id', orderId);

      if (error) {
        console.error('Failed to update order with payment intent:', error);
      }
    } catch (error) {
      console.error('Error updating order with payment intent:', error);
    }
  }

  /**
   * Retrieve payment status for a payment intent
   *
   * @param paymentIntentId - Payment intent ID
   * @returns Payment status information
   */
  async getPaymentStatus(paymentIntentId: string): Promise<PaymentStatusInfo> {
    try {
      const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        status: intent.status,
        amount: intent.amount / 100, // Convert back to decimal
        currency: intent.currency,
        customerId: intent.customer as string | undefined,
        chargeId: intent.latest_charge as string | undefined,
      };
    } catch (error) {
      throw new Error(
        `Failed to retrieve payment status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ========================================================================
  // WEBHOOK HANDLING
  // ========================================================================

  /**
   * Verify and construct webhook event from raw payload
   *
   * @param payload - Raw request body as string
   * @param signature - Stripe-Signature header value
   * @returns Parsed Stripe event
   */
  verifyAndConstructWebhook(payload: string, signature: string): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );
    } catch (error) {
      throw new Error(
        `Invalid webhook signature: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle Stripe webhook event
   *
   * Processes events from Stripe and updates database accordingly.
   * Supported events:
   * - checkout.session.completed
   * - payment_intent.succeeded
   * - payment_intent.payment_failed
   *
   * @param event - Stripe webhook event
   * @param signature - Webhook signature for verification
   * @returns Webhook processing result
   */
  async handleWebhookEvent(
    event: Stripe.Event,
    signature: string
  ): Promise<WebhookResult> {
    try {
      // Verify signature
      this.stripe.webhooks.constructEvent(
        JSON.stringify(event.data),
        signature,
        this.config.webhookSecret
      );

      // Handle event based on type
      switch (event.type) {
        case 'checkout.session.completed':
          return await this.handleCheckoutSessionCompleted(
            event.data.object as Stripe.Checkout.Session
          );

        case 'payment_intent.succeeded':
          return await this.handlePaymentIntentSucceeded(
            event.data.object as Stripe.PaymentIntent
          );

        case 'payment_intent.payment_failed':
          return await this.handlePaymentIntentFailed(
            event.data.object as Stripe.PaymentIntent
          );

        case 'charge.refunded':
          return await this.handleChargeRefunded(
            event.data.object as Stripe.Charge
          );

        default:
          return {
            processed: false,
            eventType: event.type,
          };
      }
    } catch (error) {
      return {
        processed: false,
        eventType: event.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle checkout.session.completed event
   */
  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session
  ): Promise<WebhookResult> {
    try {
      const orderId = session.metadata?.orderId;
      if (!orderId) {
        return {
          processed: false,
          eventType: 'checkout.session.completed',
          error: 'No orderId in session metadata',
        };
      }

      // Update order with payment info
      const updateData: any = {
        stripe_customer_id: session.customer,
        payment_status: session.payment_status === 'paid' ? 'paid' : 'pending',
      };

      // Set payment intent ID if available
      if (session.payment_intent) {
        updateData.stripe_payment_intent_id = session.payment_intent as string;
      }

      // Update status to confirmed if payment is paid
      if (session.payment_status === 'paid') {
        updateData.status = 'confirmed';
        updateData.confirmed_at = new Date().toISOString();
      }

      const { error } = await this.supabase
        .from('online_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) {
        return {
          processed: false,
          eventType: 'checkout.session.completed',
          orderId,
          error: error.message,
        };
      }

      return {
        processed: true,
        eventType: 'checkout.session.completed',
        orderId,
      };
    } catch (error) {
      return {
        processed: false,
        eventType: 'checkout.session.completed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle payment_intent.succeeded event
   */
  private async handlePaymentIntentSucceeded(
    intent: Stripe.PaymentIntent
  ): Promise<WebhookResult> {
    try {
      const orderId = intent.metadata?.orderId;
      if (!orderId) {
        return {
          processed: false,
          eventType: 'payment_intent.succeeded',
          error: 'No orderId in intent metadata',
        };
      }

      // Update order payment status
      const { error } = await this.supabase
        .from('online_orders')
        .update({
          payment_status: 'paid',
          stripe_payment_intent_id: intent.id,
          stripe_customer_id: intent.customer as string | null,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) {
        return {
          processed: false,
          eventType: 'payment_intent.succeeded',
          orderId,
          error: error.message,
        };
      }

      return {
        processed: true,
        eventType: 'payment_intent.succeeded',
        orderId,
      };
    } catch (error) {
      return {
        processed: false,
        eventType: 'payment_intent.succeeded',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle payment_intent.payment_failed event
   */
  private async handlePaymentIntentFailed(
    intent: Stripe.PaymentIntent
  ): Promise<WebhookResult> {
    try {
      const orderId = intent.metadata?.orderId;
      if (!orderId) {
        return {
          processed: false,
          eventType: 'payment_intent.payment_failed',
          error: 'No orderId in intent metadata',
        };
      }

      // Update order with failed status
      const updateData: any = {
        payment_status: 'failed',
        stripe_payment_intent_id: intent.id,
      };

      // Add error message to staff notes
      const errorMessage = intent.last_payment_error?.message || 'Payment failed';
      updateData.staff_notes = `Payment failed: ${errorMessage}`;

      const { error } = await this.supabase
        .from('online_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) {
        return {
          processed: false,
          eventType: 'payment_intent.payment_failed',
          orderId,
          error: error.message,
        };
      }

      return {
        processed: true,
        eventType: 'payment_intent.payment_failed',
        orderId,
      };
    } catch (error) {
      return {
        processed: false,
        eventType: 'payment_intent.payment_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle charge.refunded event
   */
  private async handleChargeRefunded(
    charge: Stripe.Charge
  ): Promise<WebhookResult> {
    try {
      // Get payment intent to find order ID
      const intent = await this.stripe.paymentIntents.retrieve(
        charge.payment_intent as string
      );

      const orderId = intent.metadata?.orderId;
      if (!orderId) {
        return {
          processed: false,
          eventType: 'charge.refunded',
          error: 'No orderId in payment intent metadata',
        };
      }

      // Update order payment status
      const { error } = await this.supabase
        .from('online_orders')
        .update({
          payment_status: 'refunded',
        })
        .eq('id', orderId);

      if (error) {
        return {
          processed: false,
          eventType: 'charge.refunded',
          orderId,
          error: error.message,
        };
      }

      return {
        processed: true,
        eventType: 'charge.refunded',
        orderId,
      };
    } catch (error) {
      return {
        processed: false,
        eventType: 'charge.refunded',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ========================================================================
  // REFUND METHODS
  // ========================================================================

  /**
   * Create a refund for a payment intent
   *
   * @param options - Refund options
   * @returns Refund result
   */
  async refundPayment(options: RefundOptions): Promise<RefundResult> {
    try {
      // Build refund params
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: options.paymentIntentId,
        reason: this.mapRefundReason(options.reason),
      };

      // Add amount if partial refund
      if (options.amount !== undefined) {
        refundParams.amount = Math.round(options.amount * 100);
      }

      // Add metadata
      refundParams.metadata = {
        orderId: options.orderId,
        ...(options.reason && { reason: options.reason }),
      };

      const refund = await this.stripe.refunds.create(refundParams);

      // Update order payment status if full refund
      if (options.amount === undefined) {
        await this.updateOrderRefundStatus(options.orderId);
      }

      return {
        success: refund.status === 'succeeded',
        refundId: refund.id,
        amount: refund.amount / 100, // Convert to decimal
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Refund failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Map custom reason to Stripe reason
   */
  private mapRefundReason(
    reason?: string
  ): Stripe.RefundCreateParams.Reason | undefined {
    switch (reason) {
      case 'duplicate':
        return 'duplicate';
      case 'fraudulent':
        return 'fraudulent';
      case 'customer_request':
      case 'requested_by_customer':
        return 'requested_by_customer';
      default:
        return undefined;
    }
  }

  /**
   * Update order to refunded status
   */
  private async updateOrderRefundStatus(orderId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('online_orders')
        .update({
          payment_status: 'refunded',
        })
        .eq('id', orderId);

      if (error) {
        console.error('Failed to update order refund status:', error);
      }
    } catch (error) {
      console.error('Error updating order refund status:', error);
    }
  }

  // ========================================================================
  // CUSTOMER METHODS
  // ========================================================================

  /**
   * Create a new Stripe customer
   *
   * @param options - Customer creation options
   * @returns Created customer info
   */
  async createCustomer(options: CreateCustomerOptions): Promise<StripeCustomer> {
    try {
      const customer = await this.stripe.customers.create({
        email: options.email,
        name: options.name,
        phone: options.phone,
        metadata: options.metadata,
      });

      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
      };
    } catch (error) {
      throw new Error(
        `Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get or create a Stripe customer by email
   *
   * @param email - Customer email
   * @param name - Customer name (for new customers)
   * @param businessId - Business ID for metadata
   * @returns Customer info
   */
  private async getOrCreateCustomer(
    email: string,
    name: string | undefined,
    businessId: string
  ): Promise<StripeCustomer> {
    try {
      // Try to find existing customer by email
      const existingCustomers = await this.stripe.customers.list({
        email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        const customer = existingCustomers.data[0];
        return {
          id: customer.id,
          email: customer.email,
          name: customer.name,
        };
      }

      // Create new customer
      return await this.createCustomer({
        email,
        name,
        metadata: { businessId },
      });
    } catch (error) {
      // If search fails, try creating anyway
      return await this.createCustomer({
        email,
        name,
        metadata: { businessId },
      });
    }
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Get the Stripe publishable key for client-side use
   */
  getPublishableKey(): string {
    return this.config.publishableKey || '';
  }
}
