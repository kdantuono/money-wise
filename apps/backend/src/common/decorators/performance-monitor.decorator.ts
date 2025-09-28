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
      description: options.description,
    },
    async (span) => {
      try {
        // Set tags if provided
        if (options.tags) {
          Object.entries(options.tags).forEach(([key, value]) => {
            span.setTag(key, value);
          });
        }

        const result = await operation();

        const duration = Date.now() - startTime;

        // Set performance metrics
        span.setMeasurement('duration', duration, 'millisecond');

        if (startMemory && options.measureMemory) {
          const endMemory = process.memoryUsage();
          const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
          span.setMeasurement('memory_delta', memoryDelta, 'byte');
        }

        // Check performance thresholds
        if (options.warningThreshold && duration > options.warningThreshold) {
          span.setTag('performance_warning', 'true');

          if (options.errorThreshold && duration > options.errorThreshold) {
            span.setTag('performance_error', 'true');
            Sentry.captureMessage(
              `Performance threshold exceeded: ${name} took ${duration}ms`,
              'warning'
            );
          }
        }

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

    // Record measurement with Sentry
    Sentry.metrics.gauge('custom.duration', duration, {
      unit: 'millisecond',
      tags: {
        measurement_key: key,
        ...tags,
      },
    });

    return duration;
  }

  static recordGauge(name: string, value: number, tags?: Record<string, string>): void {
    Sentry.metrics.gauge(name, value, { tags });
  }

  static recordCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    Sentry.metrics.increment(name, value, { tags });
  }

  static recordSet(name: string, value: string, tags?: Record<string, string>): void {
    Sentry.metrics.set(name, value, { tags });
  }

  static recordDistribution(name: string, value: number, tags?: Record<string, string>): void {
    Sentry.metrics.distribution(name, value, { tags });
  }
}