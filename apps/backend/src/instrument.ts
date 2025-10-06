/**
 * Sentry Instrumentation
 * MUST be imported FIRST in main.ts before any other imports
 *
 * This file initializes Sentry error tracking and performance monitoring
 * using the minimal SDK approach (not custom decorators/interceptors).
 *
 * NOTE: This file cannot use NestJS ConfigService because it runs before
 * the NestJS application is bootstrapped. It must read from process.env
 * directly, but in a controlled, centralized manner.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nestjs/
 */

import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { config } from 'dotenv';

// Load environment variables FIRST (before accessing process.env)
config();

/**
 * Sentry Configuration extracted from environment
 * This is the ONLY place in the codebase that should access Sentry env vars directly
 */
const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || NODE_ENV;
const SENTRY_RELEASE = process.env.SENTRY_RELEASE;

/**
 * Get environment-specific sampling rates
 * - Production: 10% traces, 10% profiles (conserve free tier quota)
 * - Staging: 50% traces, 20% profiles (balance coverage vs quota)
 * - Development: 100% traces, 0% profiles (full debugging, no overhead)
 */
const getSamplingRates = () => {
  switch (SENTRY_ENVIRONMENT) {
    case 'production':
      return { traces: 0.1, profiles: 0.1 };
    case 'staging':
      return { traces: 0.5, profiles: 0.2 };
    case 'development':
    default:
      return { traces: 1.0, profiles: 0 };
  }
};

const { traces, profiles } = getSamplingRates();

// Only initialize if DSN is provided (graceful degradation)
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,

    // Performance Monitoring (environment-aware sampling)
    tracesSampleRate: traces,

    // Profiling (environment-aware sampling)
    profilesSampleRate: profiles,
    integrations: [
      nodeProfilingIntegration(),
    ],

    // Release tracking (optional - for deploy tracking)
    release: SENTRY_RELEASE,

    // Error filtering (reduce noise from expected errors)
    ignoreErrors: [
      'NotFoundException',      // NestJS 404s - expected behavior
      'UnauthorizedException',  // Auth failures - expected behavior
    ],
  });

  // eslint-disable-next-line no-console
  console.log(
    `[Sentry] Initialized for environment: ${SENTRY_ENVIRONMENT} ` +
    `(traces: ${traces * 100}%, profiles: ${profiles * 100}%)`,
  );
} else {
  console.warn('[Sentry] DSN not provided - error tracking disabled');
}
