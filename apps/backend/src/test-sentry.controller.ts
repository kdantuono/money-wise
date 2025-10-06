/**
 * Sentry Test Controller
 *
 * Temporary controller for testing Sentry error capture
 * DELETE THIS FILE after verifying Sentry integration works
 */
import { Controller, Get, Post, HttpException, HttpStatus, SetMetadata } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

// Decorator to bypass JWT authentication for testing
const Public = () => SetMetadata('isPublic', true);

@Controller('test-sentry')
@Public()
export class TestSentryController {
  /**
   * Test endpoint for basic error capture
   * Triggers a 500 error that should appear in Sentry
   */
  @Get('error')
  testError() {
    throw new Error('🧪 TEST: Sentry backend error capture working!');
  }

  /**
   * Test endpoint for HTTP exception
   * Triggers a 400 error (should be ignored by Sentry config)
   */
  @Get('http-error')
  testHttpError() {
    throw new HttpException('Bad Request - This should NOT appear in Sentry', HttpStatus.BAD_REQUEST);
  }

  /**
   * Test endpoint for performance monitoring
   * Creates a transaction with custom spans
   */
  @Get('performance')
  async testPerformance() {
    return await Sentry.startSpan(
      {
        op: 'test.performance',
        name: 'Performance Test Transaction',
      },
      async () => {
        // Simulate database query
        await Sentry.startSpan({ op: 'db.query', name: 'Simulated DB Query' }, async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });

        // Simulate external API call
        await Sentry.startSpan({ op: 'http.client', name: 'Simulated API Call' }, async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
        });

        return {
          message: '✅ Performance test complete - check Sentry Performance tab',
          timestamp: new Date().toISOString(),
        };
      },
    );
  }

  /**
   * Test endpoint for custom context
   * Adds user context and custom tags
   */
  @Post('context')
  testContext() {
    Sentry.setUser({ id: 'test-user-123', email: 'test@moneywise.app' });
    Sentry.setTag('test_type', 'context_test');
    Sentry.setContext('test_metadata', {
      feature: 'sentry-integration',
      environment: process.env.NODE_ENV,
    });

    throw new Error('🧪 TEST: Error with custom context and user data');
  }

  /**
   * Info endpoint
   */
  @Get()
  info() {
    return {
      message: 'Sentry Test Endpoints',
      endpoints: {
        'GET /api/test-sentry/error': 'Trigger basic error (should appear in Sentry)',
        'GET /api/test-sentry/http-error': 'Trigger HTTP error (should NOT appear)',
        'GET /api/test-sentry/performance': 'Test performance monitoring',
        'POST /api/test-sentry/context': 'Test error with context',
      },
      sentryDsn: process.env.SENTRY_DSN ? '✅ Configured' : '❌ Not configured',
      environment: process.env.SENTRY_ENVIRONMENT || 'unknown',
    };
  }
}
