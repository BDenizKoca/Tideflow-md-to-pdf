/**
 * Generic debounce hook for delayed function execution
 * 
 * Delays the execution of a callback until after a specified delay period
 * has elapsed since the last time it was invoked. Useful for rate-limiting
 * expensive operations like API calls, renders, or search queries.
 * 
 * @template T - Function type to be debounced
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds before executing the callback
 * @returns Debounced version of the callback function
 * 
 * @example
 * ```typescript
 * const debouncedRender = useDebounce(handleRender, 400);
 * 
 * // In your component
 * useEffect(() => {
 *   debouncedRender(content);
 * }, [content, debouncedRender]);
 * ```
 */

import { type MutableRefObject, useCallback, useEffect, useRef } from 'react';

export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  
  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
  
  return debouncedCallback;
}

/**
 * Debounce hook with cancel and flush capabilities
 * 
 * Extended version of useDebounce that provides manual control over the
 * debounced function execution.
 * 
 * @template T - Function type to be debounced
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Object with debounced function, cancel, and flush methods
 * 
 * @example
 * ```typescript
 * const { debounced, cancel, flush } = useDebouncedCallback(
 *   handleSave,
 *   500
 * );
 * 
 * // Cancel pending execution
 * cancel();
 * 
 * // Execute immediately
 * flush();
 * ```
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): {
  debounced: (...args: Parameters<T>) => void;
  cancel: () => void;
  flush: () => void;
} {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  const argsRef = useRef<Parameters<T> | null>(null);
  
  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    argsRef.current = null;
  }, []);
  
  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (argsRef.current) {
      callbackRef.current(...argsRef.current);
      argsRef.current = null;
    }
  }, []);
  
  const debounced = useCallback(
    (...args: Parameters<T>) => {
      argsRef.current = args;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        argsRef.current = null;
      }, delay);
    },
    [delay]
  );
  
  return { debounced, cancel, flush };
}
