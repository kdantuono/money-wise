import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { LoggerService } from '../logging/logger.service';

/**
 * Metrics Collection Service
 *
 * Provides centralized metrics collection and reporting for:
 * - Business metrics (user registrations, transactions, etc.)
 * - System metrics (memory, CPU, connections)
 * - Custom application metrics
 *
 * Metrics are sent to:
 * - Sentry (for visualization and alerting)
 * - Application logs (for debugging)
 *
 * @example
 * ```typescript
 * constructor(private readonly metrics: MetricsService) {}
 *
 * async createUser(data: CreateUserDto) {
 *   const user = await this.repository.save(data);
 *   this.metrics.incrementCounter('users.created', { plan: user.plan });
 *   return user;
 * }
 * ```
 */
@Injectable()
export class MetricsService {
  private readonly logger: LoggerService;
  private readonly metricsEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.child('MetricsService');
    this.metricsEnabled = this.configService.get<boolean>('METRICS_ENABLED', true);
  }

  /**
   * Increment a counter metric
   *
   * @example
   * this.metrics.incrementCounter('api.requests', { endpoint: '/users', method: 'GET' });
   */
  incrementCounter(
    name: string,
    tags?: Record<string, string>,
    value: number = 1,
  ): void {
    if (!this.metricsEnabled) return;

    this.logger.debug(`Counter incremented: ${name}`, { value, tags });

    // Track as breadcrumb in Sentry
    Sentry.addBreadcrumb({
      category: 'metrics',
      message: `Counter: ${name}`,
      level: 'info',
      data: { value, ...tags },
    });
  }

  /**
   * Record a distribution metric (for values that vary, like durations or sizes)
   *
   * @example
   * this.metrics.recordDistribution('database.query.duration', durationMs, { table: 'users' });
   */
  recordDistribution(
    name: string,
    value: number,
    tags?: Record<string, string>,
    unit?: string,
  ): void {
    if (!this.metricsEnabled) return;

    this.logger.debug(`Distribution recorded: ${name}`, { value, tags, unit });

    // Track as breadcrumb in Sentry
    Sentry.addBreadcrumb({
      category: 'metrics',
      message: `Distribution: ${name}`,
      level: 'info',
      data: { value, unit: unit || 'none', ...tags },
    });
  }

  /**
   * Set a gauge metric (for values that can go up or down, like active connections)
   *
   * @example
   * this.metrics.setGauge('database.connections.active', activeCount);
   */
  setGauge(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.metricsEnabled) return;

    this.logger.debug(`Gauge set: ${name}`, { value, tags });

    // Track as breadcrumb in Sentry
    Sentry.addBreadcrumb({
      category: 'metrics',
      message: `Gauge: ${name}`,
      level: 'info',
      data: { value, ...tags },
    });
  }

  /**
   * Record a timing metric (convenience method for durations in milliseconds)
   *
   * @example
   * const start = Date.now();
   * await operation();
   * this.metrics.recordTiming('operation.duration', Date.now() - start);
   */
  recordTiming(
    name: string,
    durationMs: number,
    tags?: Record<string, string>,
  ): void {
    this.recordDistribution(name, durationMs, tags, 'millisecond');
  }

  /**
   * Track business metric
   *
   * @example
   * this.metrics.trackBusinessMetric('user.registration', { plan: 'premium' });
   */
  trackBusinessMetric(event: string, tags?: Record<string, string>): void {
    this.incrementCounter(`business.${event}`, tags);
  }

  /**
   * Track system resource usage
   */
  trackSystemMetrics(): void {
    if (!this.metricsEnabled) return;

    const memoryUsage = process.memoryUsage();

    // Memory metrics
    this.setGauge('system.memory.heap_used', Math.round(memoryUsage.heapUsed / 1024 / 1024), {
      unit: 'megabytes',
    });

    this.setGauge('system.memory.heap_total', Math.round(memoryUsage.heapTotal / 1024 / 1024), {
      unit: 'megabytes',
    });

    this.setGauge('system.memory.rss', Math.round(memoryUsage.rss / 1024 / 1024), {
      unit: 'megabytes',
    });

    // Process uptime
    this.setGauge('system.uptime', Math.round(process.uptime()), {
      unit: 'seconds',
    });

    // CPU usage
    const cpuUsage = process.cpuUsage();
    this.setGauge('system.cpu.user', cpuUsage.user);
    this.setGauge('system.cpu.system', cpuUsage.system);

    this.logger.debug('System metrics tracked', {
      memoryUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      uptime: Math.round(process.uptime()),
    });
  }

  /**
   * Start periodic system metrics collection
   */
  startPeriodicCollection(intervalMs: number = 60000): ReturnType<typeof setInterval> {
    this.logger.log(`Starting periodic metrics collection (interval: ${intervalMs}ms)`);

    return setInterval(() => {
      this.trackSystemMetrics();
    }, intervalMs);
  }
}
