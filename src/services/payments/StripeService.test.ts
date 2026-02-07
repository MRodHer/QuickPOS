/**
 * SPEC-POS-001: Phase 2 - Stripe Payment Service Tests
 *
 * TDD GREEN Phase: Tests for Stripe payment service
 *
 * Features:
 * - Stripe Checkout session creation
 * - Payment intent management
 * - Webhook event handling
 * - Payment status updates
 * - Refund processing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Stripe module - factory function
// All mocks must be defined inline to avoid hoisting issues
vi.mock('stripe', () => {
  const paymentIntentsCreate = vi.fn();
  const paymentIntentsRetrieve = vi.fn();
  const paymentIntentsUpdate = vi.fn();
  const checkoutSessionsCreate = vi.fn();
  const checkoutSessionsRetrieve = vi.fn();
  const refundsCreate = vi.fn();
  const customersCreate = vi.fn();
  const customersRetrieve = vi.fn();
  const customersList = vi.fn();
  const webhooksConstructEvent = vi.fn();

  // Create a mock Stripe class
  class MockStripe {
    constructor(secretKey: string, config?: any) {
      // Stub constructor
    }

    paymentIntents = {
      create: paymentIntentsCreate,
      retrieve: paymentIntentsRetrieve,
      update: paymentIntentsUpdate,
    };

    checkout = {
      sessions: {
        create: checkoutSessionsCreate,
        retrieve: checkoutSessionsRetrieve,
      },
    };

    refunds = {
      create: refundsCreate,
    };

    customers = {
      create: customersCreate,
      retrieve: customersRetrieve,
      list: customersList,
    };

    webhooks = {
      constructEvent: webhooksConstructEvent,
    };
  }

  // Store mock functions on the class for access in tests
  (MockStripe as any).mockFns = {
    paymentIntentsCreate,
    paymentIntentsRetrieve,
    paymentIntentsUpdate,
    checkoutSessionsCreate,
    checkoutSessionsRetrieve,
    refundsCreate,
    customersCreate,
    customersRetrieve,
    customersList,
    webhooksConstructEvent,
  };

  return {
    default: MockStripe,
  };
});

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const from = vi.fn();
  return {
    supabase: {
      from,
      channel: vi.fn(),
    },
  };
});

// Import after mocks
import { StripeService } from './StripeService';
import { supabase } from '@/lib/supabase';
import type Stripe from 'stripe';
import StripeLib from 'stripe';

// Get mock functions from the mocked Stripe class
const stripeMockFns = (StripeLib as any).mockFns;

describe('StripeService', () => {
  let service: StripeService;
  let mockInsert: any;
  let mockSelect: any;
  let mockUpdate: any;
  let mockEq: any;
  let mockSingle: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset all mock functions to default implementations
    stripeMockFns.paymentIntentsCreate.mockResolvedValue({
      id: 'pi_test_123',
      amount: 2500,
      currency: 'usd',
      status: 'succeeded',
      customer: 'cus_test_123',
      client_secret: 'pi_test_123_secret_xyz',
      metadata: {},
    });

    stripeMockFns.paymentIntentsRetrieve.mockResolvedValue({
      id: 'pi_test_123',
      amount: 2500,
      currency: 'usd',
      status: 'succeeded',
      customer: 'cus_test_123',
      latest_charge: 'ch_test_123',
      metadata: {},
    });

    stripeMockFns.paymentIntentsUpdate.mockResolvedValue({
      id: 'pi_test_123',
      amount: 2500,
      currency: 'usd',
      status: 'succeeded',
      customer: 'cus_test_123',
    });

    stripeMockFns.checkoutSessionsCreate.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/test',
      payment_status: 'unpaid',
      payment_intent: null,
      customer: 'cus_test_123',
      metadata: {},
    });

    stripeMockFns.checkoutSessionsRetrieve.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/test',
      payment_status: 'paid',
      payment_intent: 'pi_test_123',
      customer: 'cus_test_123',
      metadata: { orderId: 'order-123' },
    });

    stripeMockFns.refundsCreate.mockResolvedValue({
      id: 're_test_123',
      amount: 2500,
      status: 'succeeded',
    });

    stripeMockFns.customersCreate.mockResolvedValue({
      id: 'cus_test_123',
      email: 'test@example.com',
      name: 'Test Customer',
    });

    stripeMockFns.customersRetrieve.mockResolvedValue({
      id: 'cus_test_123',
      email: 'test@example.com',
      name: 'Test Customer',
    });

    stripeMockFns.customersList.mockResolvedValue({
      data: [],
      object: 'list',
      has_more: false,
      url: '/v1/customers',
    });

    stripeMockFns.webhooksConstructEvent.mockImplementation((payload: string) => {
      try {
        return JSON.parse(payload);
      } catch {
        throw new Error('Invalid payload');
      }
    });

    // Setup Supabase chain mocks
    mockInsert = vi.fn();
    mockSelect = vi.fn();
    mockUpdate = vi.fn();
    mockEq = vi.fn();
    mockSingle = vi.fn();

    // Default mockSingle to resolve with data
    mockSingle.mockResolvedValue({
      data: { id: 'order-123' },
      error: null,
    });

    // Create eq result that has single
    const eqResult = {
      single: mockSingle,
    };

    // Create select result that has eq
    const selectResult = {
      eq: mockEq,
    };

    // Setup return values
    mockSelect.mockReturnValue(selectResult);
    mockEq.mockReturnValue(eqResult);

    // insert().select().single() chain
    const insertSelectFn = vi.fn(() => ({ single: mockSingle }));
    mockInsert.mockReturnValue({ select: insertSelectFn });

    // update().eq() chain
    const updateEqFn = vi.fn(() => Promise.resolve({ error: null }));
    mockUpdate.mockReturnValue({ eq: updateEqFn });

    // Mock the from function return value
    (supabase.from as any).mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
    });

    // Create service with test config
    service = new StripeService(supabase as any, {
      secretKey: 'sk_test_123',
      webhookSecret: 'whsec_test_123',
      priceId: 'price_test_123',
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('createCheckoutSession', () => {
    it('should create a Stripe Checkout session for an order', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test/session',
        payment_status: 'unpaid',
        customer: 'cus_test_123',
      };

      stripeMockFns.checkoutSessionsCreate.mockResolvedValue(mockSession);
      mockSingle.mockResolvedValue({
        data: {
          id: 'order-123',
          order_number: 'ORD-001',
          total: 25.50,
        },
        error: null,
      });

      const result = await service.createCheckoutSession({
        orderId: 'order-123',
        orderNumber: 'ORD-001',
        amount: 25.50,
        currency: 'usd',
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
        businessId: 'business-123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(result.success).toBe(true);
      expect(result.sessionUrl).toBe('https://checkout.stripe.com/test/session');
      expect(result.sessionId).toBe('cs_test_123');
      expect(stripeMockFns.checkoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          line_items: expect.any(Array),
          // Note: service creates a Stripe customer first, so customer field is set instead of customer_email
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel',
        })
      );
    });

    it('should store session metadata with order info', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
        payment_status: 'unpaid',
        metadata: { orderId: 'order-123', orderNumber: 'ORD-001' },
      };

      stripeMockFns.checkoutSessionsCreate.mockResolvedValue(mockSession);
      mockSingle.mockResolvedValue({
        data: { id: 'order-123' },
        error: null,
      });

      await service.createCheckoutSession({
        orderId: 'order-123',
        orderNumber: 'ORD-001',
        amount: 25.50,
        currency: 'usd',
        businessId: 'business-123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(stripeMockFns.checkoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            orderId: 'order-123',
            orderNumber: 'ORD-001',
            businessId: 'business-123',
          }),
        })
      );
    });

    it('should handle checkout session creation errors', async () => {
      stripeMockFns.checkoutSessionsCreate.mockRejectedValue(
        new Error('Stripe API error')
      );

      const result = await service.createCheckoutSession({
        orderId: 'order-123',
        orderNumber: 'ORD-001',
        amount: 25.50,
        currency: 'usd',
        businessId: 'business-123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should convert decimal amount to cents for Stripe', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      };

      stripeMockFns.checkoutSessionsCreate.mockResolvedValue(mockSession);

      await service.createCheckoutSession({
        orderId: 'order-123',
        orderNumber: 'ORD-001',
        amount: 25.50,
        currency: 'usd',
        businessId: 'business-123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      const callArgs = stripeMockFns.checkoutSessionsCreate.mock.calls[0][0];
      expect(callArgs.line_items[0].price_data.unit_amount).toBe(2550); // 25.50 * 100
    });

    it('should support Spanish locale for checkout', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      };

      stripeMockFns.checkoutSessionsCreate.mockResolvedValue(mockSession);

      await service.createCheckoutSession({
        orderId: 'order-123',
        orderNumber: 'ORD-001',
        amount: 25.50,
        currency: 'usd',
        businessId: 'business-123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        locale: 'es',
      });

      expect(stripeMockFns.checkoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: 'es',
        })
      );
    });
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent for direct payment', async () => {
      const mockIntent = {
        id: 'pi_test_123',
        amount: 2550,
        currency: 'usd',
        status: 'requires_payment_method',
        client_secret: 'pi_test_123_secret_xyz',
        customer: 'cus_test_123',
      };

      stripeMockFns.paymentIntentsCreate.mockResolvedValue(mockIntent);
      mockSingle.mockResolvedValue({
        data: { id: 'order-123' },
        error: null,
      });

      const result = await service.createPaymentIntent({
        orderId: 'order-123',
        orderNumber: 'ORD-001',
        amount: 25.50,
        currency: 'usd',
        customerEmail: 'customer@example.com',
        businessId: 'business-123',
      });

      expect(result.success).toBe(true);
      expect(result.clientSecret).toBe('pi_test_123_secret_xyz');
      expect(result.paymentIntentId).toBe('pi_test_123');
      expect(stripeMockFns.paymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 2550,
          currency: 'usd',
          metadata: expect.objectContaining({
            orderId: 'order-123',
            orderNumber: 'ORD-001',
          }),
        })
      );
    });

    it('should create or retrieve Stripe customer', async () => {
      const mockIntent = {
        id: 'pi_test_123',
        customer: 'cus_test_123',
        client_secret: 'pi_test_123_secret',
      };

      stripeMockFns.customersCreate.mockResolvedValue({
        id: 'cus_new_123',
        email: 'newcustomer@example.com',
        name: 'New Customer',
      });
      stripeMockFns.paymentIntentsCreate.mockResolvedValue(mockIntent);
      stripeMockFns.customersList.mockResolvedValue({ data: [] }); // No existing customer

      await service.createPaymentIntent({
        orderId: 'order-123',
        orderNumber: 'ORD-001',
        amount: 25.50,
        currency: 'usd',
        customerEmail: 'newcustomer@example.com',
        businessId: 'business-123',
      });

      expect(stripeMockFns.customersCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newcustomer@example.com',
        })
      );
    });

    it('should reuse existing customer by email', async () => {
      const mockIntent = {
        id: 'pi_test_123',
        customer: 'cus_existing_123',
        client_secret: 'pi_test_123_secret',
      };

      const existingCustomer = {
        id: 'cus_existing_123',
        email: 'existing@example.com',
        name: 'Existing Customer',
      };

      stripeMockFns.customersList.mockResolvedValue({ data: [existingCustomer] });
      stripeMockFns.paymentIntentsCreate.mockResolvedValue(mockIntent);

      await service.createPaymentIntent({
        orderId: 'order-123',
        orderNumber: 'ORD-001',
        amount: 25.50,
        currency: 'usd',
        customerEmail: 'existing@example.com',
        businessId: 'business-123',
      });

      // Should not create a new customer since one exists
      expect(stripeMockFns.customersCreate).not.toHaveBeenCalled();
    });
  });

  describe('handleWebhookEvent', () => {
    it('should handle checkout.session.completed event', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'paid',
            payment_intent: 'pi_test_123',
            customer: 'cus_test_123',
            metadata: {
              orderId: 'order-123',
              orderNumber: 'ORD-001',
              businessId: 'business-123',
            },
            amount_total: 2550,
          },
        },
      };

      const updateEqFn = vi.fn().mockResolvedValue({
        data: { id: 'order-123' },
        error: null,
      });
      mockUpdate.mockReturnValue({ eq: updateEqFn });

      const result = await service.handleWebhookEvent(
        mockEvent as Stripe.Event,
        'stripe-signature'
      );

      expect(result.processed).toBe(true);
      expect(result.eventType).toBe('checkout.session.completed');
    });

    it('should update order payment status on payment success', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'paid',
            payment_intent: 'pi_test_123',
            metadata: {
              orderId: 'order-123',
            },
          },
        },
      };

      const updateEqFn = vi.fn().mockResolvedValue({
        data: {
          id: 'order-123',
          payment_status: 'paid',
          stripe_payment_intent_id: 'pi_test_123',
        },
        error: null,
      });
      mockUpdate.mockReturnValue({ eq: updateEqFn });

      await service.handleWebhookEvent(
        mockEvent as Stripe.Event,
        'stripe-signature'
      );

      expect(supabase.from).toHaveBeenCalledWith('online_orders');
    });

    it('should handle payment_intent.succeeded event', async () => {
      const mockEvent = {
        id: 'evt_test_456',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 2550,
            currency: 'usd',
            status: 'succeeded',
            customer: 'cus_test_123',
            metadata: {
              orderId: 'order-123',
            },
          },
        },
      };

      const updateEqFn = vi.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: updateEqFn });

      const result = await service.handleWebhookEvent(
        mockEvent as Stripe.Event,
        'stripe-signature'
      );

      expect(result.processed).toBe(true);
      expect(result.eventType).toBe('payment_intent.succeeded');
    });

    it('should handle payment_intent.payment_failed event', async () => {
      const mockEvent = {
        id: 'evt_test_789',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 2550,
            currency: 'usd',
            status: 'requires_payment_method',
            last_payment_error: {
              message: 'Card declined',
            },
            metadata: {
              orderId: 'order-123',
            },
          },
        },
      };

      const updateEqFn = vi.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: updateEqFn });

      const result = await service.handleWebhookEvent(
        mockEvent as Stripe.Event,
        'stripe-signature'
      );

      expect(result.processed).toBe(true);
      expect(result.eventType).toBe('payment_intent.payment_failed');
    });

    it('should handle unknown event types gracefully', async () => {
      const mockEvent = {
        id: 'evt_test_unknown',
        type: 'unknown.event',
        data: {
          object: {},
        },
      };

      const result = await service.handleWebhookEvent(
        mockEvent as Stripe.Event,
        'stripe-signature'
      );

      expect(result.processed).toBe(false);
      expect(result.eventType).toBe('unknown.event');
    });

    it('should verify webhook signature', async () => {
      const mockPayload = JSON.stringify({ test: 'data' });
      const mockSignature = 't=123,v1=abc123';

      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'paid',
            metadata: { orderId: 'order-123' },
          },
        },
      };

      stripeMockFns.webhooksConstructEvent.mockReturnValue(mockEvent);

      const result = await service.verifyAndConstructWebhook(
        mockPayload,
        mockSignature
      );

      expect(stripeMockFns.webhooksConstructEvent).toHaveBeenCalledWith(
        mockPayload,
        mockSignature,
        'whsec_test_123'
      );
      expect(result).toEqual(mockEvent);
    });

    it('should throw on invalid webhook signature', () => {
      const mockPayload = JSON.stringify({ test: 'data' });
      const mockSignature = 'invalid-signature';

      stripeMockFns.webhooksConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      expect(() => {
        service.verifyAndConstructWebhook(mockPayload, mockSignature);
      }).toThrow('Invalid webhook signature');
    });
  });

  describe('refundPayment', () => {
    it('should create refund for payment intent', async () => {
      const mockRefund = {
        id: 're_test_123',
        amount: 2550,
        currency: 'usd',
        status: 'succeeded',
        payment_intent: 'pi_test_123',
      };

      stripeMockFns.refundsCreate.mockResolvedValue(mockRefund);

      const updateEqFn = vi.fn().mockResolvedValue({
        data: { id: 'order-123' },
        error: null,
      });
      mockUpdate.mockReturnValue({ eq: updateEqFn });

      const result = await service.refundPayment({
        paymentIntentId: 'pi_test_123',
        orderId: 'order-123',
        amount: 25.50,
        reason: 'customer_request',
      });

      expect(result.success).toBe(true);
      expect(result.refundId).toBe('re_test_123');
      expect(stripeMockFns.refundsCreate).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: 2550,
        reason: 'requested_by_customer',
        metadata: expect.objectContaining({
          orderId: 'order-123',
          reason: 'customer_request',
        }),
      });
    });

    it('should handle partial refunds', async () => {
      const mockRefund = {
        id: 're_test_123',
        amount: 1275, // Half of 2550
        status: 'succeeded',
      };

      stripeMockFns.refundsCreate.mockResolvedValue(mockRefund);

      await service.refundPayment({
        paymentIntentId: 'pi_test_123',
        orderId: 'order-123',
        amount: 12.75,
        reason: 'partial_refund',
      });

      expect(stripeMockFns.refundsCreate).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: 1275,
        reason: undefined,
        metadata: expect.any(Object),
      });
    });

    it('should handle refund errors', async () => {
      stripeMockFns.refundsCreate.mockRejectedValue(
        new Error('Refund failed: Payment already refunded')
      );

      const result = await service.refundPayment({
        paymentIntentId: 'pi_test_123',
        orderId: 'order-123',
        amount: 25.50,
        reason: 'customer_request',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Refund failed');
    });

    it('should update order payment status after refund', async () => {
      const mockRefund = {
        id: 're_test_123',
        amount: 2550,
        status: 'succeeded',
      };

      stripeMockFns.refundsCreate.mockResolvedValue(mockRefund);

      const updateEqFn = vi.fn().mockResolvedValue({
        data: { id: 'order-123', payment_status: 'refunded' },
        error: null,
      });
      mockUpdate.mockReturnValue({ eq: updateEqFn });

      // Full refund (no amount specified) should update order status
      await service.refundPayment({
        paymentIntentId: 'pi_test_123',
        orderId: 'order-123',
        reason: 'customer_request',
        // No amount specified = full refund
      });

      expect(supabase.from).toHaveBeenCalledWith('online_orders');
    });
  });

  describe('getPaymentStatus', () => {
    it('should retrieve payment intent status', async () => {
      const mockIntent = {
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 2550,
        currency: 'usd',
      };

      stripeMockFns.paymentIntentsRetrieve.mockResolvedValue(mockIntent);

      const result = await service.getPaymentStatus('pi_test_123');

      expect(result.status).toBe('succeeded');
      expect(result.amount).toBe(25.50);
      expect(stripeMockFns.paymentIntentsRetrieve).toHaveBeenCalledWith('pi_test_123');
    });

    it('should handle non-existent payment intent', async () => {
      stripeMockFns.paymentIntentsRetrieve.mockRejectedValue(
        new Error('No such payment_intent: pi nonexistent')
      );

      await expect(
        service.getPaymentStatus('pi_nonexistent')
      ).rejects.toThrow();
    });
  });

  describe('createCustomer', () => {
    it('should create Stripe customer', async () => {
      const mockCustomer = {
        id: 'cus_new_123',
        email: 'customer@example.com',
        name: 'John Doe',
      };

      stripeMockFns.customersCreate.mockResolvedValue(mockCustomer);

      const result = await service.createCustomer({
        email: 'customer@example.com',
        name: 'John Doe',
        metadata: { businessId: 'business-123' },
      });

      expect(result.id).toBe('cus_new_123');
      expect(stripeMockFns.customersCreate).toHaveBeenCalledWith({
        email: 'customer@example.com',
        name: 'John Doe',
        metadata: { businessId: 'business-123' },
      });
    });
  });

  describe('Error handling', () => {
    it('should handle Stripe API errors gracefully', async () => {
      const stripeError = {
        type: 'StripeCardError',
        message: 'Your card was declined',
        code: 'card_declined',
      } as any;

      stripeMockFns.paymentIntentsCreate.mockRejectedValue(stripeError);

      const result = await service.createPaymentIntent({
        orderId: 'order-123',
        orderNumber: 'ORD-001',
        amount: 25.50,
        currency: 'usd',
        customerEmail: 'customer@example.com',
        businessId: 'business-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      stripeMockFns.checkoutSessionsCreate.mockRejectedValue(
        new Error('ECONNREFUSED')
      );

      const result = await service.createCheckoutSession({
        orderId: 'order-123',
        orderNumber: 'ORD-001',
        amount: 25.50,
        currency: 'usd',
        businessId: 'business-123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(result.success).toBe(false);
    });
  });
});
