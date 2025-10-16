import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SentryInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url } = request;

    // Extract user information for Sentry context
    const user = this.extractUser(request);
    
    // Set Sentry context
    Sentry.setContext('http', {
      method,
      url,
      user_agent: request.headers['user-agent'],
      ip: request.ip,
    });

    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
      });
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        
        // Add successful request breadcrumb
        Sentry.addBreadcrumb({
          message: `${method} ${url}`,
          level: 'info',
          data: {
            method,
            url,
            status_code: response.statusCode,
            duration,
          },
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        
        // Set additional context for error
        Sentry.setContext('request_details', {
          method,
          url,
          duration,
          body: request.body,
          params: request.params,
          query: request.query,
        });

        // Capture the error
        Sentry.captureException(error);

        this.logger.error(`Sentry captured error for ${method} ${url}`, error.stack);
        
        throw error;
      }),
    );
  }

  private extractUser(request: Request): { id: string; email?: string } | null {
    const user = (request as Request & { user?: { id?: string; sub?: string; email?: string } }).user;
    
    if (!user) return null;

    return {
      id: user.id || user.sub || 'unknown',
      email: user.email,
    };
  }
}