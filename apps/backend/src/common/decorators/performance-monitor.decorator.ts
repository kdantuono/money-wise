import { applyDecorators, SetMetadata } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

export const PERFORMANCE_MONITOR_KEY = 'performance_monitor';

export interface PerformanceMonitorOptions {
  name?: string;
  op?: string;
  description?: string;
  tags?: Record<string, string>;
  measureMemory?: boolean;
  warningThreshold?: number; // milliseconds
  errorThreshold?: number; // milliseconds
}

/**
 * Decorator to monitor method performance with Sentry
 * @param options Performance monitoring configuration
 */
export function PerformanceMonitor(options: PerformanceMonitorOptions = {}) {
  return applyDecorators(
    SetMetadata(PERFORMANCE_MONITOR_KEY, options),
  );
}

/**
 * Utility function to measure performance of async operations
 * @param name Operation name
 * @param operation Async operation to measure
 * @param options Additional monitoring options
 */
export async function measurePerformance<T>(
  name: string,
  operation: () => Promise<T>,
  options: PerformanceMonitorOptions = {}
): Promise<T> {
  const startTime = Date.now();
  const startMemory = options.measureMemory ? process.memoryUsage() : null;

  return await Sentry.startSpan(
    {
      name: options.name || name,
      op: options.op || 'function',
    },
    async (span) => {
      try {
        // Set tags if provided
        if (options.tags) {
          Object.entries(options.tags).forEach(([key, value]) => {
            span.setAttributes({ [key]: value });
          });
        }

        const result = await operation();

        const duration = Date.now() - startTime;

        // Set performance metrics as attributes
        span.setAttributes({
          'performance.duration': duration,
          'performance.duration_ms': duration
        });

        if (startMemory && options.measureMemory) {
          const endMemory = process.memoryUsage();
          const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
          span.setAttributes({ 'performance.memory_delta': memoryDelta });
        }

        // Check performance thresholds
        if (options.warningThreshold && duration > options.warningThreshold) {
          span.setAttributes({ 'performance.warning': true });

          if (options.errorThreshold && duration > options.errorThreshold) {
            span.setAttributes({ 'performance.error': true });
            Sentry.captureMessage(
              `Performance threshold exceeded: ${name} took ${duration}ms`,
              'warning'
            );
          }
        }

        span.setStatus({ code: 1 }); // OK status
        return result;
      } catch (error) {
        span.setStatus({ code: 2 }); // ERROR status
        span.recordException(error as Error);
        throw error;
      }
    }
  );
}

/**
 * Utility class for custom performance metrics
 */
export class PerformanceMetrics {
  private static measurements = new Map<string, number>();

  static startMeasurement(key: string): void {
    this.measurements.set(key, Date.now());
  }

  static endMeasurement(key: string, tags?: Record<string, string>): number {
    const startTime = this.measurements.get(key);
    if (!startTime) {
      console.warn(`No start time found for measurement key: ${key}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.measurements.delete(key);

    // Record measurement as breadcrumb for now
    Sentry.addBreadcrumb({
      message: `Performance measurement: ${key}`,
      level: 'info',
      data: {
        duration,
        measurement_key: key,
        ...tags,
      },
    });

    return duration;
  }

  static recordGauge(name: string, value: number, tags?: Record<string, string>): void {
    Sentry.addBreadcrumb({
      message: `Gauge metric: ${name}`,
      level: 'info',
      data: { value, ...tags },
    });
  }

  static recordCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    Sentry.addBreadcrumb({
      message: `Counter metric: ${name}`,
      level: 'info',
      data: { value, ...tags },
    });
  }

  static recordSet(name: string, value: string, tags?: Record<string, string>): void {
    Sentry.addBreadcrumb({
      message: `Set metric: ${name}`,
      level: 'info',
      data: { value, ...tags },
    });
  }

  static recordDistribution(name: string, value: number, tags?: Record<string, string>): void {
    Sentry.addBreadcrumb({
      message: `Distribution metric: ${name}`,
      level: 'info',
      data: { value, ...tags },
    });
  }
}