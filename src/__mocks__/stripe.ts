/**
 * Mock Stripe module for testing
 */

export default function Stripe(apiKey: string, config?: any) {
  return {
    paymentIntents: {
      create: async (params: any) => ({
        id: 'pi_test_' + Math.random().toString(36).substr(2, 9),
        amount: params.amount || 1000,
        currency: params.currency || 'usd',
        status: 'requires_payment_method',
        client_secret: 'pi_test_secret_' + Math.random().toString(36).substr(2, 20),
        customer: params.customer || 'cus_test_123',
        metadata: params.metadata || {},
      }),
      retrieve: async (id: string) => ({
        id,
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        customer: 'cus_test_123',
        latest_charge: 'ch_test_123',
        metadata: {},
      }),
      update: async (id: string, params: any) => ({
        id,
        amount: params.amount || 1000,
        currency: 'usd',
        status: 'succeeded',
        customer: 'cus_test_123',
      }),
    },
    checkout: {
      sessions: {
        create: async (params: any) => ({
          id: 'cs_test_' + Math.random().toString(36).substr(2, 9),
          url: 'https://checkout.stripe.com/pay/test',
          payment_status: 'unpaid',
          payment_intent: null,
          customer: params.customer || 'cus_test_123',
          metadata: params.metadata || {},
        }),
        retrieve: async (id: string) => ({
          id,
          url: 'https://checkout.stripe.com/pay/test',
          payment_status: 'paid',
          payment_intent: 'pi_test_123',
          customer: 'cus_test_123',
          metadata: { orderId: 'order-123' },
        }),
      },
    },
    refunds: {
      create: async (params: any) => ({
        id: 're_test_' + Math.random().toString(36).substr(2, 9),
        amount: params.amount || 1000,
        status: 'succeeded',
        payment_intent: params.payment_intent || 'pi_test_123',
      }),
    },
    customers: {
      create: async (params: any) => ({
        id: 'cus_test_' + Math.random().toString(36).substr(2, 9),
        email: params.email || 'test@example.com',
        name: params.name || 'Test Customer',
      }),
      retrieve: async (id: string) => ({
        id,
        email: 'test@example.com',
        name: 'Test Customer',
      }),
      list: async (params: any) => ({
        data: [],
        object: 'list',
        has_more: false,
        url: '/v1/customers',
      }),
    },
    webhooks: {
      constructEvent: (payload: string, signature: string, secret: string) => {
        try {
          return JSON.parse(payload);
        } catch {
          throw new Error('Invalid payload');
        }
      },
    },
  };
}
