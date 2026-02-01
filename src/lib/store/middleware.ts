/**
 * SPEC-SAAS-001: Store Context Middleware
 *
 * Middleware utilities for injecting store context into requests
 */

import type { Store } from '../../types/store';

/**
 * Store context for current request
 */
interface StoreContext {
  storeId: string;
  storeSlug: string;
  isImpersonating: boolean;
  impersonatingStoreId?: string;
}

/**
 * Current store context (set by StoreProvider)
 */
let currentStoreContext: StoreContext | null = null;

/**
 * Set the current store context
 * Called by StoreProvider when store is loaded
 */
export function setStoreContext(context: StoreContext): void {
  currentStoreContext = context;
}

/**
 * Get the current store context
 */
export function getStoreContext(): StoreContext | null {
  return currentStoreContext;
}

/**
 * Clear the current store context
 */
export function clearStoreContext(): void {
  currentStoreContext = null;
}

/**
 * Inject store context into request headers
 * Used for API calls that need store identification
 */
export function injectStoreHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const context = getStoreContext();

  if (!context) {
    console.warn('No store context available');
    return headers;
  }

  return {
    ...headers,
    'X-Store-ID': context.storeId,
    'X-Store-Slug': context.storeSlug,
    ...(context.isImpersonating && context.impersonatingStoreId ? {
      'X-Impersonating-Store-ID': context.impersonatingStoreId,
    } : {}),
  };
}

/**
 * Create store-aware fetch wrapper
 * Automatically injects store headers into fetch requests
 */
export function createStoreFetch(fetchFn: typeof fetch = fetch): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = injectStoreHeaders(
      (init?.headers as Record<string, string>) || {}
    );

    return fetchFn(input, {
      ...init,
      headers,
    });
  };
}

/**
 * Validate store context before performing an operation
 * Throws error if store context is missing
 */
export function requireStoreContext(): StoreContext {
  const context = getStoreContext();

  if (!context) {
    throw new Error('Store context required. Operation must be performed within a store context.');
  }

  return context;
}

/**
 * Validate that user has access to the specified store
 * This is a client-side validation; server-side RLS provides the real security
 */
export function validateStoreAccess(storeId: string): boolean {
  const context = getStoreContext();

  if (!context) {
    return false;
  }

  // Super admin can access any store when impersonating
  if (context.isImpersonating) {
    return true;
  }

  // Normal users can only access their own store
  return context.storeId === storeId;
}

/**
 * Extract store ID from various sources
 * Priority: headers > URL params > localStorage > context
 */
export function extractStoreId(source: {
  headers?: Record<string, string>;
  urlParams?: URLSearchParams;
  localStorage?: typeof localStorage;
  context?: boolean;
}): string | null {
  // 1. Check headers (for server-side or API calls)
  if (source.headers) {
    const headerStore = source.headers['X-Store-ID'] || source.headers['x-store-id'];
    if (headerStore) {
      return headerStore;
    }
  }

  // 2. Check URL parameters
  if (source.urlParams) {
    const paramStore = source.urlParams.get('store');
    if (paramStore) {
      return paramStore;
    }
  }

  // 3. Check localStorage (for client-side)
  if (source.localStorage) {
    const storedStore = source.localStorage.getItem('current_store_id');
    if (storedStore) {
      return storedStore;
    }
  }

  // 4. Check current context
  if (source.context !== false) {
    const context = getStoreContext();
    if (context) {
      return context.storeId;
    }
  }

  return null;
}

/**
 * Store-aware error handler
 * Wraps errors with store context information
 */
export function wrapStoreError(error: Error, operation: string): Error {
  const context = getStoreContext();

  const message = `[Store: ${context?.storeId || 'unknown'}] ${operation}: ${error.message}`;

  const wrappedError = new Error(message);
  wrappedError.stack = error.stack;
  (wrappedError as any).originalError = error;
  (wrappedError as any).storeContext = context;

  return wrappedError;
}

/**
 * Execute operation with store context validation
 */
export async function withStoreContext<T>(
  operation: () => Promise<T>,
  operationName: string = 'operation'
): Promise<T> {
  try {
    requireStoreContext();
    return await operation();
  } catch (error) {
    throw wrapStoreError(error as Error, operationName);
  }
}

/**
 * Audit log for store operations
 * Records store-scoped operations for compliance and debugging
 */
export interface StoreOperationLog {
  storeId: string;
  operation: string;
  resource: string;
  resourceId?: string;
  success: boolean;
  error?: string;
  timestamp: string;
  userId?: string;
}

/**
 * Log a store operation (client-side logging)
 * Server-side should use database audit tables
 */
export function logStoreOperation(operation: StoreOperationLog): void {
  console.log('[Store Operation]', operation);

  // In production, this would send to a logging service
  // or be stored in a database audit table
}

/**
 * Create a store-aware operation wrapper with logging
 */
export function createStoreOperation<T extends (...args: any[]) => Promise<any>>(
  operation: T,
  resourceName: string
): T {
  return (async (...args: any[]) => {
    const context = requireStoreContext();
    const startTime = Date.now();

    try {
      const result = await operation(...args);

      logStoreOperation({
        storeId: context.storeId,
        operation: operation.name || 'anonymous',
        resource: resourceName,
        success: true,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      logStoreOperation({
        storeId: context.storeId,
        operation: operation.name || 'anonymous',
        resource: resourceName,
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });

      throw error;
    } finally {
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`[Store: ${context.storeId}] Slow operation (${duration}ms):`, operation.name);
      }
    }
  }) as T;
}
