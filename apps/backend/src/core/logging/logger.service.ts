import { Injectable, LoggerService as NestLoggerService, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';

/**
 * Structured Logging Service
 *
 * Provides consistent, structured logging across the application with:
 * - Environment-aware log levels
 * - Structured log format (JSON in production)
 * - Sentry integration for errors
 * - Performance tracking
 * - Request context tracking
 *
 * @example
 * ```typescript
 * constructor(private readonly logger: LoggerService) {}
 *
 * someMethod() {
 *   this.logger.log('Processing payment', { userId: '123', amount: 100 });
 *   this.logger.error('Payment failed', error, { userId: '123' });
 *   this.logger.warn('Rate limit approaching', { userId: '123', remaining: 5 });
 * }
 * ```
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private context?: string;
  private readonly isProduction: boolean;
  private readonly logLevel: LogLevel;

  constructor(private readonly configService: ConfigService) {
    const env = this.configService.get<string>('app.NODE_ENV', 'development');
    this.isProduction = env === 'production';

    // Set log level based on environment
    this.logLevel = this.getLogLevel(env);
  }

  /**
   * Set context for this logger instance
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Get log level based on environment
   */
  private getLogLevel(env: string): LogLevel {
    switch (env) {
      case 'production':
        return 'error'; // Only errors in production (reduce noise)
      case 'staging':
        return 'warn'; // Warnings and errors in staging
      case 'test':
        return 'fatal'; // Only fatal errors in tests (reduce noise)
      default:
        return 'log'; // All logs in development
    }
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const requestedLevelIndex = levels.indexOf(level);

    return requestedLevelIndex >= currentLevelIndex;
  }

  /**
   * Format log message with structured data
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
  ): string | Record<string, unknown> {
    const timestamp = new Date().toISOString();
    const context = this.context || 'Application';

    const logEntry = {
      timestamp,
      level,
      context,
      message,
      ...meta,
    };

    // Pretty print in development, JSON in production
    if (this.isProduction) {
      return JSON.stringify(logEntry);
    }

    return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}${
      meta ? ` ${JSON.stringify(meta, null, 2)}` : ''
    }`;
  }

  /**
   * Log general informational messages
   */
  log(message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog('log')) return;

    const formatted = this.formatMessage('log', message, meta);
    // eslint-disable-next-line no-console
    console.log(formatted);

    // Track in Sentry as breadcrumb
    Sentry.addBreadcrumb({
      category: 'log',
      message,
      level: 'info',
      data: meta,
    });
  }

  /**
   * Log error messages and send to Sentry
   */
  error(message: string, trace?: string | Error, meta?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) return;

    const error = trace instanceof Error ? trace : new Error(trace || message);
    const formatted = this.formatMessage('error', message, {
      ...meta,
      stack: error.stack,
    });

    // eslint-disable-next-line no-console
    console.error(formatted);

    // Send to Sentry with context
    Sentry.captureException(error, {
      tags: {
        context: this.context || 'Application',
      },
      extra: meta,
      level: 'error',
    });
  }

  /**
   * Log warning messages
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;

    const formatted = this.formatMessage('warn', message, meta);
    // eslint-disable-next-line no-console
    console.warn(formatted);

    // Track in Sentry as breadcrumb
    Sentry.addBreadcrumb({
      category: 'warning',
      message,
      level: 'warning',
      data: meta,
    });
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;

    const formatted = this.formatMessage('debug', message, meta);
    // eslint-disable-next-line no-console
    console.debug(formatted);
  }

  /**
   * Log verbose messages (only in development)
   */
  verbose(message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog('verbose')) return;

    const formatted = this.formatMessage('verbose', message, meta);
    // eslint-disable-next-line no-console
    console.log(formatted);
  }

  /**
   * Log fatal errors (always logged, sent to Sentry)
   */
  fatal(message: string, trace?: string | Error, meta?: Record<string, unknown>): void {
    const error = trace instanceof Error ? trace : new Error(trace || message);
    const formatted = this.formatMessage('fatal', message, {
      ...meta,
      stack: error.stack,
    });

    // eslint-disable-next-line no-console
    console.error(formatted);

    // Send to Sentry with high priority
    Sentry.captureException(error, {
      tags: {
        context: this.context || 'Application',
        severity: 'fatal',
      },
      extra: meta,
      level: 'fatal',
    });
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, meta?: Record<string, unknown>): void {
    if (!this.shouldLog('log')) return;

    this.log(`Performance: ${operation} completed in ${duration}ms`, {
      ...meta,
      operation,
      duration,
      type: 'performance',
    });

    // Track in Sentry as measurement
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${operation} completed`,
      level: 'info',
      data: {
        ...meta,
        duration,
      },
    });
  }

  /**
   * Create a child logger with specific context
   */
  child(context: string): LoggerService {
    const childLogger = new LoggerService(this.configService);
    childLogger.setContext(context);
    return childLogger;
  }

  /**
   * Log HTTP request/response
   */
  http(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    meta?: Record<string, unknown>,
  ): void {
    if (!this.shouldLog('log')) return;

    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';

    this.log(`HTTP ${method} ${url} ${statusCode} (${duration}ms)`, {
      ...meta,
      method,
      url,
      statusCode,
      duration,
      type: 'http',
    });

    // Track in Sentry
    Sentry.addBreadcrumb({
      category: 'http',
      type: 'http',
      data: {
        method,
        url,
        status_code: statusCode,
        ...meta,
      },
      level: level === 'error' ? 'error' : level === 'warn' ? 'warning' : 'info',
    });
  }

  /**
   * Log database query performance
   */
  query(query: string, duration: number, meta?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;

    this.debug(`Query executed in ${duration}ms`, {
      ...meta,
      query: query.substring(0, 100), // Limit query length
      duration,
      type: 'database',
    });

    // Track slow queries in Sentry (>1000ms)
    if (duration > 1000) {
      Sentry.addBreadcrumb({
        category: 'query',
        message: 'Slow query detected',
        level: 'warning',
        data: {
          query: query.substring(0, 100),
          duration,
          ...meta,
        },
      });
    }
  }
}
