/**
 * SPEC-POS-001: Online Orders System - Type Tests
 *
 * RED Phase: Write tests for type utilities and validators
 */

import { describe, it, expect } from 'vitest';
import type {
  OnlineOrderStatus,
  PaymentMethod,
  NotificationChannel,
  MenuCategoryType,
  FitnessGoal,
  DietaryPreference,
  Allergen,
  OnlineOrder,
  CartItem,
  MenuItem,
  OnlineOrderItem,
  NutritionDisplay,
  GuestCheckoutData,
} from './online-orders';

// Type guards and validators to test
const isOnlineOrderStatus = (value: string): value is OnlineOrderStatus => {
  return ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'cancelled'].includes(value);
};

const isPaymentMethod = (value: string): value is PaymentMethod => {
  return ['stripe', 'cash', 'card_terminal', 'on_arrival'].includes(value);
};

const isMenuCategoryType = (value: string): value is MenuCategoryType => {
  return ['pre_workout', 'post_workout', 'balanced', 'snacks', 'drinks'].includes(value);
};

describe('online-orders types', () => {
  describe('OnlineOrderStatus', () => {
    it('should accept valid status values', () => {
      const validStatuses: OnlineOrderStatus[] = [
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'picked_up',
        'cancelled',
      ];

      validStatuses.forEach((status) => {
        expect(isOnlineOrderStatus(status)).toBe(true);
      });
    });

    it('should reject invalid status values', () => {
      expect(isOnlineOrderStatus('invalid')).toBe(false);
      expect(isOnlineOrderStatus('')).toBe(false);
      expect(isOnlineOrderStatus('PENDING')).toBe(false);
    });
  });

  describe('PaymentMethod', () => {
    it('should accept valid payment methods', () => {
      const validMethods: PaymentMethod[] = [
        'stripe',
        'cash',
        'card_terminal',
        'on_arrival',
      ];

      validMethods.forEach((method) => {
        expect(isPaymentMethod(method)).toBe(true);
      });
    });

    it('should reject invalid payment methods', () => {
      expect(isPaymentMethod('paypal')).toBe(false);
      expect(isPaymentMethod('')).toBe(false);
    });
  });

  describe('MenuCategoryType', () => {
    it('should accept valid category types', () => {
      const validTypes: MenuCategoryType[] = [
        'pre_workout',
        'post_workout',
        'balanced',
        'snacks',
        'drinks',
      ];

      validTypes.forEach((type) => {
        expect(isMenuCategoryType(type)).toBe(true);
      });
    });
  });

  describe('OnlineOrder type structure', () => {
    it('should have required fields', () => {
      const order: OnlineOrder = {
        id: '123',
        business_id: '456',
        order_number: 'KA-000001',
        user_id: null,
        customer_id: null,
        guest_name: 'John Doe',
        guest_email: 'john@example.com',
        guest_phone: '+1234567890',
        items: [],
        subtotal: 0,
        tax: 0,
        tip: 0,
        total: 0,
        pickup_time: '2024-01-01T12:00:00Z',
        estimated_prep_time: 30,
        requested_time: null,
        status: 'pending',
        cancellation_reason: null,
        payment_method: 'on_arrival',
        payment_status: 'pending',
        stripe_payment_intent_id: null,
        stripe_customer_id: null,
        notification_method: 'email',
        notification_sent: false,
        reminder_sent: false,
        customer_notes: null,
        staff_notes: null,
        internal_notes: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        confirmed_at: null,
        started_preparing_at: null,
        ready_at: null,
        picked_up_at: null,
        cancelled_at: null,
        metadata: {},
      };

      expect(order.id).toBe('123');
      expect(order.status).toBe('pending');
    });
  });

  describe('CartItem type structure', () => {
    it('should have required fields with optional fields', () => {
      const cartItem: CartItem = {
        productId: '123',
        name: 'Protein Bowl',
        price: 15.99,
        quantity: 2,
        nutritionInfo: {
          calories: 450,
          protein: 35,
          carbs: 40,
          fat: 15,
        },
      };

      expect(cartItem.productId).toBe('123');
      expect(cartItem.nutritionInfo?.calories).toBe(450);
    });
  });

  describe('NutritionDisplay type structure', () => {
    it('should contain basic macros', () => {
      const nutrition: NutritionDisplay = {
        calories: 450,
        protein: 35,
        carbs: 40,
        fat: 15,
        fiber: 8,
      };

      expect(nutrition.calories).toBe(450);
      expect(nutrition.protein).toBe(35);
      expect(nutrition.carbs).toBe(40);
      expect(nutrition.fat).toBe(15);
      expect(nutrition.fiber).toBe(8);
    });
  });

  describe('GuestCheckoutData type structure', () => {
    it('should accept minimal required fields', () => {
      const checkoutData: GuestCheckoutData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1234567890',
        pickupTime: '2024-01-01T14:30:00Z',
        paymentMethod: 'on_arrival',
      };

      expect(checkoutData.name).toBe('Jane Doe');
      expect(checkoutData.paymentMethod).toBe('on_arrival');
    });

    it('should accept optional customer notes', () => {
      const checkoutData: GuestCheckoutData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1234567890',
        pickupTime: '2024-01-01T14:30:00Z',
        paymentMethod: 'stripe',
        customerNotes: 'Extra napkins please',
      };

      expect(checkoutData.customerNotes).toBe('Extra napkins please');
    });
  });

  describe('OnlineOrderItem type structure', () => {
    it('should match CartItem structure with additional fields', () => {
      const orderItem: OnlineOrderItem = {
        product_id: '123',
        name: 'Protein Bowl',
        quantity: 2,
        unit_price: 15.99,
        notes: 'No onions',
        nutrition_info: {
          calories: 450,
          protein: 35,
          carbs: 40,
          fat: 15,
        },
      };

      expect(orderItem.product_id).toBe('123');
      expect(orderItem.unit_price).toBe(15.99);
      expect(orderItem.notes).toBe('No onions');
    });
  });
});
