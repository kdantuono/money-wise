/**
 * Sentry Instrumentation
 * MUST be imported FIRST in main.ts before any other imports
 *
 * This file initializes Sentry error tracking and performance monitoring
 * using the minimal SDK approach (not custom decorators/interceptors).
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nestjs/
 */

import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Only initialize if DSN is provided (graceful degradation)
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || NODE_ENV,

    // Performance Monitoring (adaptive sampling based on environment)
    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profiling (MVP free tier: limit production samples, full dev sampling)
    profilesSampleRate: NODE_ENV === 'production' ? 0.1 : 0,
    integrations: [
      nodeProfilingIntegration(),
    ],

    // Release tracking (optional - for deploy tracking)
    release: process.env.SENTRY_RELEASE,

    // Error filtering (reduce noise from expected errors)
    ignoreErrors: [
      'NotFoundException',      // NestJS 404s - expected behavior
      'UnauthorizedException',  // Auth failures - expected behavior
    ],
  });

  // eslint-disable-next-line no-console
  console.log(`[Sentry] Initialized for environment: ${NODE_ENV}`);
} else {
  console.warn('[Sentry] DSN not provided - error tracking disabled');
}
