import * as Sentry from '@sentry/nextjs';

/**
 * Performance monitoring utilities for the web application
 */

export interface PerformanceMetrics {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  tags?: Record<string, string>;
}

/**
 * Class to manage performance measurements
 */
export class PerformanceMonitor {
  private static measurements = new Map<string, number>();

  /**
   * Start a performance measurement
   * @param key Unique key for the measurement
   */
  static start(key: string): void {
    this.measurements.set(key, performance.now());
  }

  /**
   * End a performance measurement and report to Sentry
   * @param key Measurement key
   * @param tags Additional tags for the measurement
   * @returns Duration in milliseconds
   */
  static end(key: string, tags?: Record<string, string>): number {
    const startTime = this.measurements.get(key);
    if (!startTime) {
      console.warn(`No start time found for measurement key: ${key}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    this.measurements.delete(key);

    // Report to Sentry
    Sentry.metrics.gauge('web.performance.duration', duration, {
      unit: 'millisecond',
      tags: {
        measurement_key: key,
        ...tags,
      },
    });

    return duration;
  }

  /**
   * Measure the performance of an async operation
   * @param name Operation name
   * @param operation Function to measure
   * @param tags Additional tags
   * @returns Promise with the operation result
   */
  static async measure<T>(
    name: string,
    operation: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    return await Sentry.startSpan(
      {
        name,
        op: 'function',
      },
      async (span) => {
        const startTime = performance.now();

        try {
          if (tags) {
            Object.entries(tags).forEach(([key, value]) => {
              span.setTag(key, value);
            });
          }

          const result = await operation();
          const duration = performance.now() - startTime;

          span.setMeasurement('duration', duration, 'millisecond');
          span.setStatus('ok');

          return result;
        } catch (error) {
          span.setStatus('internal_error');
          span.recordException(error as Error);
          throw error;
        }
      }
    );
  }

  /**
   * Measure the performance of a synchronous operation
   * @param name Operation name
   * @param operation Function to measure
   * @param tags Additional tags
   * @returns Operation result
   */
  static measureSync<T>(
    name: string,
    operation: () => T,
    tags?: Record<string, string>
  ): T {
    return Sentry.startSpan(
      {
        name,
        op: 'function',
      },
      (span) => {
        const startTime = performance.now();

        try {
          if (tags) {
            Object.entries(tags).forEach(([key, value]) => {
              span.setTag(key, value);
            });
          }

          const result = operation();
          const duration = performance.now() - startTime;

          span.setMeasurement('duration', duration, 'millisecond');
          span.setStatus('ok');

          return result;
        } catch (error) {
          span.setStatus('internal_error');
          span.recordException(error as Error);
          throw error;
        }
      }
    );
  }
}

/**
 * Hook to measure React component render performance
 */
export function usePerformanceMonitor(componentName: string) {
  const startRender = () => {
    PerformanceMonitor.start(`render.${componentName}`);
  };

  const endRender = () => {
    PerformanceMonitor.end(`render.${componentName}`, {
      component: componentName,
      type: 'render',
    });
  };

  return { startRender, endRender };
}

/**
 * Web Vitals monitoring
 */
export function initWebVitals() {
  // Measure Core Web Vitals
  if (typeof window !== 'undefined' && 'performance' in window) {
    // First Contentful Paint (FCP)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          Sentry.metrics.gauge('web.vitals.fcp', entry.startTime, {
            unit: 'millisecond',
          });
        }
      }
    }).observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      Sentry.metrics.gauge('web.vitals.lcp', lastEntry.startTime, {
        unit: 'millisecond',
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      Sentry.metrics.gauge('web.vitals.cls', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });

    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        Sentry.metrics.gauge('web.vitals.fid', (entry as any).processingStart - entry.startTime, {
          unit: 'millisecond',
        });
      }
    }).observe({ entryTypes: ['first-input'] });
  }
}

/**
 * API call performance monitoring
 */
export function monitorApiCall(url: string, method: string = 'GET') {
  const key = `api.${method}.${url}`;
  PerformanceMonitor.start(key);

  return {
    end: (status?: number, error?: Error) => {
      const duration = PerformanceMonitor.end(key, {
        url,
        method,
        status: status?.toString(),
        error: error ? 'true' : 'false',
      });

      // Report API metrics
      Sentry.metrics.gauge('api.request.duration', duration, {
        unit: 'millisecond',
        tags: {
          url,
          method,
          status: status?.toString(),
        },
      });

      if (error) {
        Sentry.metrics.increment('api.request.error', 1, {
          tags: {
            url,
            method,
            status: status?.toString(),
          },
        });
      }
    },
  };
}