
// Console statements are intentionally used for development-time performance debugging
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
  static end(key: string, _tags?: Record<string, string>): number {
    const startTime = this.measurements.get(key);
    if (!startTime) {
      console.warn(`No start time found for measurement key: ${key}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    this.measurements.delete(key);

    // Log performance measurement
    console.debug(`Performance: ${key} took ${duration}ms`);

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
          // Tags will be logged for debugging purposes
          if (tags) {
            console.debug(`Performance tags for ${name}:`, tags);
          }

          const result = await operation();
          const duration = performance.now() - startTime;

          console.debug(`Performance: ${name} took ${duration}ms`);
          span.setStatus({ code: 1 }); // OK status

          return result;
        } catch (error) {
          span.setStatus({ code: 2 }); // Internal Error status
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
          // Tags will be logged for debugging purposes
          if (tags) {
            console.debug(`Performance tags for ${name}:`, tags);
          }

          const result = operation();
          const duration = performance.now() - startTime;

          console.debug(`Performance: ${name} took ${duration}ms`);
          span.setStatus({ code: 1 }); // OK status

          return result;
        } catch (error) {
          span.setStatus({ code: 2 }); // Internal Error status
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
          console.debug(`Web Vitals FCP: ${entry.startTime}ms`);
        }
      }
    }).observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.debug(`Web Vitals LCP: ${lastEntry.startTime}ms`);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // Cumulative Layout Shift (CLS)
    interface LayoutShiftEntry extends PerformanceEntry {
      hadRecentInput: boolean;
      value: number;
    }
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as LayoutShiftEntry;
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
        }
      }
      console.debug(`Web Vitals CLS: ${clsValue}`);
    }).observe({ entryTypes: ['layout-shift'] });

    // First Input Delay (FID)
    interface FirstInputEntry extends PerformanceEntry {
      processingStart: number;
    }
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as FirstInputEntry;
        console.debug(`Web Vitals FID: ${fidEntry.processingStart - entry.startTime}ms`);
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
      console.debug(`API Performance: ${method} ${url} took ${duration}ms`);

      if (error) {
        Sentry.setContext('api', { error: 'true', method, url });
        Sentry.captureMessage(`API Error: ${method} ${url}`, 'error');
      }
    },
  };
}