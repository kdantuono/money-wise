import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MonitoringService } from './monitoring.service';

@Injectable()
export class MonitoringInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MonitoringInterceptor.name);

  constructor(private readonly monitoringService: MonitoringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    const { method, url } = request;

    // Extract user ID from request if available
    const userId = this.extractUserId(request);

    // Clean up endpoint for metrics (remove query params and IDs)
    const endpoint = this.normalizeEndpoint(url);

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - startTime;
          this.trackRequest(
            endpoint,
            method,
            response.statusCode,
            responseTime,
            userId,
          );
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.trackRequest(
            endpoint,
            method,
            statusCode,
            responseTime,
            userId,
          );

          // Log error details for monitoring
          this.logger.error(
            `API Error: ${method} ${endpoint} - ${statusCode} (${responseTime}ms)`,
            error.stack,
          );
        },
      }),
    );
  }

  private async trackRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
  ): Promise<void> {
    try {
      await this.monitoringService.trackApiRequest(
        endpoint,
        method,
        statusCode,
        responseTime,
        userId,
      );
    } catch (error) {
      this.logger.error('Failed to track API request metrics', error.stack);
    }
  }

  private extractUserId(request: Request): string | undefined {
    // Extract user ID from JWT token or session
    const user = (request as Request & { user?: { id?: string; sub?: string } }).user;
    return user?.id || user?.sub;
  }

  private normalizeEndpoint(url: string): string {
    // Remove query parameters
    const [path] = url.split('?');

    // Replace numeric IDs with placeholder for grouping
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, '/:uuid')
      .toLowerCase();
  }
}