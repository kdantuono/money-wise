/**
 * Test controller for Sentry error capture validation
 * This controller is only active in non-production environments
 *
 * @dev Use this to verify Sentry error tracking is working correctly
 */

import { Controller, Get, HttpException, HttpStatus, InternalServerErrorException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('test/sentry')
@Public() // Make all test endpoints public for testing
export class TestSentryController {
  constructor() {
    // Only enable in non-production environments
    if (process.env.NODE_ENV === 'production') {
      throw new Error('TestSentryController should not be loaded in production');
    }
  }

  @Get('test-error')
  testBasicError() {
    throw new Error('Test error: This is a basic unhandled error for Sentry testing');
  }

  @Get('test-500')
  test500Error() {
    throw new InternalServerErrorException('Test 500: Internal server error for Sentry testing');
  }

  @Get('test-400')
  test400Error() {
    throw new BadRequestException('Test 400: Bad request error for Sentry testing');
  }

  @Get('test-401')
  test401Error() {
    // This should be ignored by Sentry per instrument.ts configuration
    throw new UnauthorizedException('Test 401: Unauthorized error (should be ignored by Sentry)');
  }

  @Get('test-custom')
  testCustomError() {
    const error = new HttpException(
      {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        error: 'Custom test error with metadata',
        details: {
          timestamp: new Date().toISOString(),
          testType: 'sentry-validation',
          environment: process.env.NODE_ENV,
        },
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
    throw error;
  }

  @Get('test-capture')
  testManualCapture() {
    // Manually capture an exception with context
    try {
      // Simulate some business logic that fails
      const result = this.performRiskyOperation();
      return { result };
    } catch (error) {
      // Add context before capturing
      Sentry.withScope((scope) => {
        scope.setTag('test_type', 'manual_capture');
        scope.setLevel('error');
        scope.setContext('test_context', {
          endpoint: '/test/sentry/test-capture',
          timestamp: new Date().toISOString(),
          testRun: true,
        });
        Sentry.captureException(error);
      });

      throw new InternalServerErrorException('Operation failed - error captured to Sentry');
    }
  }

  @Get('test-message')
  testCaptureMessage() {
    // Test capturing a message (non-error event)
    Sentry.captureMessage('Test message: Sentry message capture validation', 'info');

    return {
      success: true,
      message: 'Test message sent to Sentry',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('test-breadcrumbs')
  testBreadcrumbs() {
    // Add breadcrumbs for context
    Sentry.addBreadcrumb({
      message: 'User initiated test',
      level: 'info',
      category: 'test',
      data: { endpoint: '/test/sentry/test-breadcrumbs' },
    });

    Sentry.addBreadcrumb({
      message: 'Processing test request',
      level: 'debug',
      category: 'test',
    });

    // Now throw an error - breadcrumbs will be attached
    throw new Error('Test error with breadcrumbs for debugging context');
  }

  @Get('verify')
  verifyConfiguration() {
    // Return current Sentry configuration status
    const client = Sentry.getClient();
    const options = client?.getOptions();

    return {
      sentryEnabled: !!options?.dsn,
      environment: options?.environment || 'not-set',
      tracesSampleRate: options?.tracesSampleRate,
      release: options?.release || 'not-set',
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      sentryDsn: process.env.SENTRY_DSN ? 'configured' : 'not-configured',
    };
  }

  private performRiskyOperation(): number {
    // Simulate a risky operation that throws
    const random = Math.random();
    if (random > 0.0) { // Always fails for testing
      throw new Error('Risky operation failed: Division by zero attempted');
    }
    return 42;
  }
}