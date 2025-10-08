/**
 * Performance monitoring utilities for tracking operation durations
 * 
 * Provides tools to measure and analyze performance of key operations
 * in development mode. Measurements are automatically disabled in production.
 */

import { logger } from './logger';
import { PERFORMANCE } from '../constants/timing';

const perfLogger = logger.createScoped('Performance');

interface PerformanceStats {
  avg: number;
  min: number;
  max: number;
  count: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Performance monitoring singleton
 * 
 * Tracks operation durations and provides statistical analysis.
 * Only active in development mode to avoid production overhead.
 * 
 * @example
 * ```typescript
 * perfMonitor.measure('pdf-render', () => {
 *   renderPdf(content);
 * });
 * 
 * // Async operations
 * await perfMonitor.measureAsync('api-call', async () => {
 *   await fetchData();
 * });
 * 
 * // Get statistics
 * const stats = perfMonitor.getStats('pdf-render');
 * console.log(`Average: ${stats.avg}ms`);
 * ```
 */
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  private enabled = process.env.NODE_ENV !== 'production';
  private maxSamples = PERFORMANCE.MAX_PERFORMANCE_SAMPLES;
  
  /**
   * Measure synchronous operation duration
   */
  measure<T>(label: string, fn: () => T): T {
    if (!this.enabled) {
      return fn();
    }
    
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    this.recordMetric(label, duration);
    
    return result;
  }
  
  /**
   * Measure async operation duration
   */
  async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) {
      return fn();
    }
    
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    this.recordMetric(label, duration);
    
    return result;
  }
  
  /**
   * Start a manual timing measurement
   * 
   * @returns Function to call when operation completes
   * 
   * @example
   * ```typescript
   * const end = perfMonitor.start('complex-operation');
   * // ... do work
   * end();
   * ```
   */
  start(label: string): () => void {
    if (!this.enabled) {
      return () => {}; // No-op in production
    }
    
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(label, duration);
    };
  }
  
  /**
   * Record a metric value manually
   */
  private recordMetric(label: string, duration: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    
    const values = this.metrics.get(label)!;
    values.push(duration);
    
    // Keep only last N samples to prevent memory growth
    if (values.length > this.maxSamples) {
      values.shift();
    }
    
    // Log slow operations
    if (duration > PERFORMANCE.SLOW_OPERATION_THRESHOLD_MS) {
      perfLogger.warn(`Slow operation detected: ${label}`, { 
        duration: `${duration.toFixed(2)}ms`,
        threshold: `${PERFORMANCE.SLOW_OPERATION_THRESHOLD_MS}ms`
      });
    } else {
      perfLogger.debug(`${label}: ${duration.toFixed(2)}ms`);
    }
  }
  
  /**
   * Get statistical summary for a metric
   */
  getStats(label: string): PerformanceStats | null {
    const values = this.metrics.get(label);
    if (!values || values.length === 0) {
      return null;
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    
    return {
      avg: sum / sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      count: sorted.length,
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };
  }
  
  /**
   * Calculate percentile value
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }
  
  /**
   * Get all tracked metrics
   */
  getAllMetrics(): string[] {
    return Array.from(this.metrics.keys());
  }
  
  /**
   * Clear metrics for a specific label or all metrics
   */
  clear(label?: string): void {
    if (label) {
      this.metrics.delete(label);
    } else {
      this.metrics.clear();
    }
  }
  
  /**
   * Generate a performance report
   */
  report(): void {
    if (!this.enabled) {
      perfLogger.info('Performance monitoring disabled in production');
      return;
    }
    
    const labels = this.getAllMetrics();
    
    if (labels.length === 0) {
      perfLogger.info('No performance metrics recorded');
      return;
    }
    
    perfLogger.group('Performance Report');
    
    labels.forEach(label => {
      const stats = this.getStats(label);
      if (stats) {
        perfLogger.info(label, {
          avg: `${stats.avg.toFixed(2)}ms`,
          min: `${stats.min.toFixed(2)}ms`,
          max: `${stats.max.toFixed(2)}ms`,
          p95: `${stats.p95.toFixed(2)}ms`,
          count: stats.count,
        });
      }
    });
    
    perfLogger.groupEnd();
  }
}

// Export singleton instance
export const perfMonitor = new PerformanceMonitor();

// Expose to window for debugging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as any).perfMonitor = perfMonitor;
}
