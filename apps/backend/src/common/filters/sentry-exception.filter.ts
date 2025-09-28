import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.getHttpStatus(exception);
    const message = this.getErrorMessage(exception);

    // Set additional context for Sentry
    Sentry.setContext('exception_filter', {
      url: request.url,
      method: request.method,
      statusCode: status,
      timestamp: new Date().toISOString(),
      userAgent: request.get('User-Agent'),
      referer: request.get('Referer'),
    });

    // Add fingerprinting for better error grouping
    Sentry.setFingerprint([
      exception.constructor.name,
      request.method,
      request.route?.path || request.url,
    ]);

    // Set severity level based on status code
    const level = this.getSentryLevel(status);
    Sentry.setLevel(level);

    // Capture exception with Sentry
    if (status >= 500) {
      // Server errors - capture as exceptions
      Sentry.captureException(exception);
    } else if (status >= 400) {
      // Client errors - capture as messages
      Sentry.captureMessage(`HTTP ${status}: ${message}`, 'warning');
    }

    // Log the error
    this.logger.error(
      `HTTP ${status} Error: ${message}`,
      exception.stack,
      'SentryExceptionFilter',
    );

    // Send response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception.stack,
      }),
    };

    response.status(status).json(errorResponse);
  }

  private getHttpStatus(exception: any): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    // Map common error types to HTTP status codes
    if (exception.name === 'ValidationError') {
      return HttpStatus.BAD_REQUEST;
    }

    if (exception.name === 'UnauthorizedError') {
      return HttpStatus.UNAUTHORIZED;
    }

    if (exception.name === 'ForbiddenError') {
      return HttpStatus.FORBIDDEN;
    }

    if (exception.name === 'NotFoundError') {
      return HttpStatus.NOT_FOUND;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getErrorMessage(exception: any): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      return typeof response === 'string' ? response : (response as any).message;
    }

    return exception.message || 'Internal server error';
  }

  private getSentryLevel(statusCode: number): Sentry.SeverityLevel {
    if (statusCode >= 500) {
      return 'error';
    }

    if (statusCode >= 400) {
      return 'warning';
    }

    return 'info';
  }
}