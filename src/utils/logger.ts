/**
 * Production-safe centralized logging utility
 *
 * Features:
 * - Environment-aware log levels
 * - Structured logging with component context
 * - Automatic filtering in production builds
 * - Type-safe log methods
 * - Performance-conscious (no-op in production for debug logs)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  component: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Centralized logger with environment-aware filtering
 */
class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';
  private isTest = process.env.NODE_ENV === 'test';

  /**
   * Debug level - Only shown in development
   * Use for detailed diagnostic information
   */
  debug(component: string, message: string, data?: unknown): void {
    if (!this.isDevelopment || this.isTest) return;

    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] [${component}] ${message}`, data ?? '');
  }

  /**
   * Info level - Shown in all environments
   * Use for general informational messages
   */
  info(component: string, message: string, data?: unknown): void {
    if (this.isTest) return;

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${component}] ${message}`, data ?? '');
  }

  /**
   * Warning level - Shown in all environments
   * Use for potentially problematic situations
   */
  warn(component: string, message: string, data?: unknown): void {
    if (this.isTest) return;

    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [${component}] ${message}`, data ?? '');
  }

  /**
   * Error level - Always shown
   * Use for error conditions that need attention
   */
  error(component: string, message: string, error?: unknown): void {
    const timestamp = new Date().toISOString();

    if (error instanceof Error) {
      console.error(
        `[${timestamp}] [${component}] ${message}`,
        '\n  Error:', error.message,
        '\n  Stack:', error.stack
      );
    } else {
      console.error(`[${timestamp}] [${component}] ${message}`, error ?? '');
    }
  }

  /**
   * Structured logging with context
   * Useful for complex operations with multiple data points
   */
  log(level: LogLevel, context: LogContext, message: string, data?: unknown): void {
    const { component, operation, metadata } = context;
    const fullMessage = operation ? `${operation}: ${message}` : message;

    const logData = {
      ...metadata,
      ...(data && typeof data === 'object' ? data : { data }),
    };

    switch (level) {
      case 'debug':
        this.debug(component, fullMessage, logData);
        break;
      case 'info':
        this.info(component, fullMessage, logData);
        break;
      case 'warn':
        this.warn(component, fullMessage, logData);
        break;
      case 'error':
        this.error(component, fullMessage, logData);
        break;
    }
  }

  /**
   * Performance timing utility
   * Returns a function to call when operation completes
   */
  time(component: string, operation: string): () => void {
    if (!this.isDevelopment || this.isTest) {
      return () => {}; // No-op in production
    }

    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      this.debug(component, `${operation} completed in ${duration.toFixed(2)}ms`);
    };
  }

  /**
   * Group related log messages
   * Useful for complex operations with multiple steps
   */
  group(component: string, label: string, collapsed = false): void {
    if (!this.isDevelopment || this.isTest) return;

    if (collapsed) {
      console.groupCollapsed(`[${component}] ${label}`);
    } else {
      console.group(`[${component}] ${label}`);
    }
  }

  /**
   * End a log group
   */
  groupEnd(): void {
    if (!this.isDevelopment || this.isTest) return;
    console.groupEnd();
  }

  /**
   * Trace execution path (dev only)
   */
  trace(component: string, message: string): void {
    if (!this.isDevelopment || this.isTest) return;
    console.trace(`[${component}] ${message}`);
  }

  /**
   * Assert condition and log error if false
   */
  assert(condition: boolean, component: string, message: string): void {
    if (!condition) {
      this.error(component, `Assertion failed: ${message}`);
    }
  }

  /**
   * Create a scoped logger for a specific component
   * Eliminates need to pass component name repeatedly
   */
  createScoped(component: string) {
    return {
      debug: (message: string, data?: unknown) => this.debug(component, message, data),
      info: (message: string, data?: unknown) => this.info(component, message, data),
      warn: (message: string, data?: unknown) => this.warn(component, message, data),
      error: (message: string, error?: unknown) => this.error(component, message, error),
      time: (operation: string) => this.time(component, operation),
      group: (label: string, collapsed?: boolean) => this.group(component, label, collapsed),
      groupEnd: () => this.groupEnd(),
      trace: (message: string) => this.trace(component, message),
      assert: (condition: boolean, message: string) => this.assert(condition, component, message),
    };
  }
}

// Export singleton instance
export const logger = new Logger();
