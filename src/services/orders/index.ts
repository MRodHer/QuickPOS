/**
 * SPEC-POS-001: Phase 2 - Orders Service
 *
 * Order management services including status change handling
 */

export {
  StatusChangeHandler,
  type StatusUpdateOptions,
  type StatusChangeResult,
  type NotificationTriggerCallback,
  isTerminalStatus,
  isValidTransition,
  getNextNormalStatus,
} from './StatusChangeHandler';
