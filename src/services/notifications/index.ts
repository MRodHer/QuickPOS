/**
 * Notification Service - Public API
 *
 * Export notification service functionality for use across the application
 */

export {
  NotificationService,
  notificationService,
  sendOrderReadyNotification,
  sendOrderCreatedNotification,
  sendOrderCancelledNotification,
  getNotificationHistory,
} from './NotificationService';

export type {
  EmailOptions,
  SMSOptions,
  TelegramOptions,
  OrderReadyOptions,
  OrderCreatedOptions,
  OrderCancelledOptions,
  NotificationResult,
  BatchSendResult,
  BatchSendOptions,
  BatchNotificationItem,
  NotificationServiceConfig,
  NotificationType,
  NotificationPriority,
} from './NotificationService';
