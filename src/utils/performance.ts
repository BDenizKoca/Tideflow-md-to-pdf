/**
 * Performance monitoring utilities
 * Provides performance metrics collection and analysis
 */

import { logger } from './logger';

const perfLogger = logger.createScoped('Performance');

export interface PerformanceMetrics {
  cls: number;
  fcp: number;
  lcp: number;
  ttfb: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  /**
   * Initialize performance monitoring
   */
  async init(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const { onCLS, onFCP, onLCP, onTTFB } = await import('web-vitals');
      
      const metrics: Partial<PerformanceMetrics> = {
        timestamp: Date.now(),
      };

      onCLS((metric) => {
        metrics.cls = metric.value;
        perfLogger.debug('CLS (Cumulative Layout Shift)', metric.value);
      });

      // FID is deprecated in web-vitals v3+, using INP instead
      // onFID is not available in newer versions

      onFCP((metric) => {
        metrics.fcp = metric.value;
        perfLogger.debug('FCP (First Contentful Paint)', metric.value);
      });

      onLCP((metric) => {
        metrics.lcp = metric.value;
        perfLogger.debug('LCP (Largest Contentful Paint)', metric.value);
      });

      onTTFB((metric) => {
        metrics.ttfb = metric.value;
        perfLogger.debug('TTFB (Time to First Byte)', metric.value);
      });

      // Store metrics after a delay to allow all metrics to be collected
      setTimeout(() => {
        if (Object.keys(metrics).length > 1) { // More than just timestamp
          this.metrics.push(metrics as PerformanceMetrics);
          this.logPerformanceSummary(metrics as PerformanceMetrics);
        }
      }, 5000);

    } catch (error) {
      perfLogger.warn('Failed to initialize performance monitoring', error);
    }
  }

  /**
   * Log performance summary
   */
  private logPerformanceSummary(metrics: PerformanceMetrics): void {
    const summary = {
      'Cumulative Layout Shift': metrics.cls?.toFixed(3) || 'N/A',
      'First Contentful Paint': metrics.fcp ? `${metrics.fcp.toFixed(2)}ms` : 'N/A',
      'Largest Contentful Paint': metrics.lcp ? `${metrics.lcp.toFixed(2)}ms` : 'N/A',
      'Time to First Byte': metrics.ttfb ? `${metrics.ttfb.toFixed(2)}ms` : 'N/A',
    };

    perfLogger.info('Performance Metrics Summary', summary);
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get average metrics
   */
  getAverageMetrics(): Partial<PerformanceMetrics> {
    if (this.metrics.length === 0) return {};

    const totals = this.metrics.reduce(
      (acc, metric) => ({
        cls: (acc.cls || 0) + (metric.cls || 0),
        fcp: (acc.fcp || 0) + (metric.fcp || 0),
        lcp: (acc.lcp || 0) + (metric.lcp || 0),
        ttfb: (acc.ttfb || 0) + (metric.ttfb || 0),
      }),
      {} as Partial<PerformanceMetrics>
    );

    const count = this.metrics.length;
    return {
      cls: totals.cls ? totals.cls / count : undefined,
      fcp: totals.fcp ? totals.fcp / count : undefined,
      lcp: totals.lcp ? totals.lcp / count : undefined,
      ttfb: totals.ttfb ? totals.ttfb / count : undefined,
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Initialize performance monitoring
 * Call this in main.tsx or App.tsx
 */
export function initPerformanceMonitoring(): void {
  performanceMonitor.init();
}