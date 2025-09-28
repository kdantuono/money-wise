import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import * as Sentry from '@sentry/nestjs';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SentryInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Set Sentry context
    Sentry.setContext('request', {
      url: request.url,
      method: request.method,
      headers: this.sanitizeHeaders(request.headers),
      query: request.query,
      ip: request.ip,
      userAgent: request.get('User-Agent'),
    });

    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
      });
    }

    // Set additional tags
    Sentry.setTags({
      endpoint: `${request.method} ${request.route?.path || request.url}`,
      controller: context.getClass().name,
      handler: context.getHandler().name,
    });

    return next.handle().pipe(
      tap(() => {
        // Log successful requests in development
        if (process.env.NODE_ENV === 'development') {
          this.logger.debug(`${request.method} ${request.url} - Success`);
        }
      }),
      catchError((error) => {
        // Add error context
        Sentry.setContext('error_details', {
          message: error.message,
          stack: error.stack,
          status: error.status,
          response: error.response,
        });

        // Capture the error with Sentry
        Sentry.captureException(error);

        this.logger.error(
          `Error in ${context.getClass().name}.${context.getHandler().name}`,
          error.stack,
        );

        return throwError(() => error);
      }),
    );
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };

    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'set-cookie',
      'x-api-key',
      'x-auth-token',
    ];

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}