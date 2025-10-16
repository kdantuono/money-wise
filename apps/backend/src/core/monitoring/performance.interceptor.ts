import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as Sentry from '@sentry/node';
import { LoggerService } from '../logging/logger.service';

/**
 * Performance Monitoring Interceptor
 *
 * Automatically tracks HTTP request performance and sends metrics to:
 * - Application logs (via LoggerService)
 * - Sentry (as performance spans)
 *
 * Metrics tracked:
 * - Request duration (ms)
 * - HTTP method and URL
 * - Response status code
 * - User ID (if authenticated)
 * - Slow request detection (>1000ms)
 *
 * @example
 * // Apply globally in main.ts
 * app.useGlobalInterceptors(new PerformanceInterceptor(logger));
 *
 * // Or per-controller
 * @UseInterceptors(PerformanceInterceptor)
 * @Controller('users')
 * export class UsersController {}
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger: LoggerService;

  constructor(loggerService: LoggerService) {
    this.logger = loggerService.child('PerformanceInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    const { method, url, user } = request;
    const startTime = Date.now();

    // Start Sentry transaction for this request
    return Sentry.startSpan(
      {
        op: 'http.server',
        name: `${method} ${url}`,
        attributes: {
          'http.method': method,
          'http.url': url,
          'http.user_id': user?.id,
        },
      },
      () => {
        return next.handle().pipe(
          tap({
            next: () => {
              const duration = Date.now() - startTime;
              const statusCode = response.statusCode;

              // Log HTTP request
              this.logger.http(method, url, statusCode, duration, {
                userId: user?.id,
                ip: request.ip,
              });

              // Track slow requests (>1000ms)
              if (duration > 1000) {
                this.logger.warn('Slow request detected', {
                  method,
                  url,
                  duration,
                  statusCode,
                  userId: user?.id,
                });
              }

              // Track in Sentry as breadcrumb
              Sentry.addBreadcrumb({
                category: 'http.request',
                type: 'http',
                level: 'info',
                data: {
                  method,
                  url: url.split('?')[0],
                  status_code: statusCode,
                  duration,
                },
              });
            },
            error: (error) => {
              const duration = Date.now() - startTime;
              const statusCode = error.status || 500;

              // Log error
              this.logger.error('Request failed', error, {
                method,
                url,
                duration,
                statusCode,
                userId: user?.id,
              });

              // Track failed request in Sentry
              Sentry.addBreadcrumb({
                category: 'http.request',
                type: 'http',
                level: 'error',
                data: {
                  method,
                  url: url.split('?')[0],
                  status_code: statusCode,
                  duration,
                  error: true,
                },
              });
            },
          }),
        );
      },
    );
  }
}
