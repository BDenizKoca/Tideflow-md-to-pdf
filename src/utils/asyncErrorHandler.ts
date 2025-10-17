/**
 * Async Error Handler Utility
 * Provides consistent error handling patterns across the application
 */

import { handleError } from './errorHandler';
import type { Toast } from '../types';

interface ErrorContext {
  operation: string;
  component: string;
}

interface ErrorHandlerOptions {
  showToast?: boolean;
  addToast?: (toast: Omit<Toast, 'id'>) => void;
  logLevel?: 'error' | 'warning' | 'info';
  rethrow?: boolean;
}

/**
 * Wraps an async operation with consistent error handling
 * @param operation - The async function to execute
 * @param context - Context information for error reporting
 * @param options - Additional options for error handling
 * @returns Promise that resolves to the operation result or undefined on error
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  options: ErrorHandlerOptions = {}
): Promise<T | undefined> {
  const {
    showToast = true,
    addToast,
    logLevel = 'error',
    rethrow = false
  } = options;

  try {
    return await operation();
  } catch (err) {
    // Log the error
    handleError(err, context, logLevel);

    // Show toast notification if requested
    if (showToast && addToast) {
      addToast({
        type: 'error',
        message: `Failed to ${context.operation}`
      });
    }

    // Optionally rethrow for caller handling
    if (rethrow) {
      throw err;
    }

    return undefined;
  }
}

/**
 * Creates a wrapped version of an async function with error handling
 * @param fn - The async function to wrap
 * @param context - Context information for error reporting
 * @param options - Additional options for error handling
 * @returns Wrapped function with error handling
 */
export function createErrorHandler<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  context: ErrorContext,
  options: ErrorHandlerOptions = {}
): (...args: TArgs) => Promise<TReturn | undefined> {
  return async (...args: TArgs) => {
    return withErrorHandling(() => fn(...args), context, options);
  };
}
