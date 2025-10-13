/**
 * Centralized error handling utilities for consistent user feedback
 */

import { logger } from './logger';
import type { Toast } from '../types';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorContext {
  operation: string;
  component?: string;
  details?: string;
}

// Store reference for toast system (will be set by App on mount)
let addToastFn: ((toast: Omit<Toast, 'id'>) => void) | null = null;

/**
 * Initialize error handler with toast system
 * Should be called once by App component on mount
 */
export function initErrorHandler(addToast: (toast: Omit<Toast, 'id'>) => void): void {
  addToastFn = addToast;
}

/**
 * Handle errors consistently across the application
 * Now uses toast notifications instead of alerts
 */
export function handleError(
  error: unknown,
  context: ErrorContext,
  severity: ErrorSeverity = 'error'
): void {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const component = context.component || 'App';

  // Log to console for debugging (using centralized logger)
  const logPrefix = context.operation;

  switch (severity) {
    case 'critical':
      logger.error(component, `CRITICAL: ${logPrefix} failed: ${errorMsg}`);
      break;
    case 'error':
      logger.error(component, `${logPrefix} failed: ${errorMsg}`);
      break;
    case 'warning':
      logger.warn(component, `${logPrefix}: ${errorMsg}`);
      break;
    case 'info':
      logger.info(component, `${logPrefix}: ${errorMsg}`);
      break;
  }

  if (context.details) {
    logger.debug(component, 'Additional details', context.details);
  }

  // Show user feedback via toast system (fallback to alert if not initialized)
  const shouldShowToast = severity === 'warning' || severity === 'error' || severity === 'critical';

  if (shouldShowToast) {
    const toastMessage = severity === 'critical'
      ? `Critical: ${context.operation} failed. ${errorMsg}`
      : severity === 'error'
      ? `${context.operation} failed. ${errorMsg}`
      : `${context.operation}: ${errorMsg}`;

    if (addToastFn) {
      addToastFn({
        type: severity === 'critical' ? 'error' : severity,
        message: toastMessage,
        duration: severity === 'critical' ? undefined : 5000,
      });
    } else {
      // Fallback to alert only for critical errors if toast system not initialized
      if (severity === 'critical') {
        alert(toastMessage);
      }
    }
  }
}

/**
 * Show success message for user operations
 */
export function showSuccess(message: string): void {
  logger.info('UI', message);
  // Could be enhanced with toast notifications in the future
}

/**
 * Wrap async operations with consistent error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  severity: ErrorSeverity = 'error'
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    handleError(error, context, severity);
    return null;
  }
}