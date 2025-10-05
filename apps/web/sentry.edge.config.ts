/**
 * Sentry Edge Runtime Configuration
 *
 * This file initializes Sentry for the Edge runtime in Next.js.
 * The Edge runtime is used for:
 * - Middleware
 * - Edge API routes
 * - Edge functions
 *
 * The Edge runtime has limitations compared to Node.js:
 * - No profiling support (Edge doesn't support Node.js profiling)
 * - Limited integrations
 * - Reduced bundle size requirements
 *
 * Environment-aware sampling rates:
 * - Development: 100% traces (full debugging)
 * - Staging: 50% traces (balance coverage vs quota)
 * - Production: 10% traces (conserve free tier quota)
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 * @see https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || NODE_ENV;

/**
 * Get environment-specific sampling rates for Edge runtime
 * Note: No profiling support in Edge runtime
 */
const getSamplingRates = () => {
  switch (SENTRY_ENVIRONMENT) {
    case 'production':
      return { traces: 0.1 }; // 10% sampling
    case 'staging':
      return { traces: 0.5 }; // 50% sampling
    case 'development':
    default:
      return { traces: 1.0 }; // 100% sampling
  }
};

const { traces } = getSamplingRates();

// Only initialize if DSN is provided (graceful degradation)
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,

    // Performance Monitoring
    tracesSampleRate: traces,

    // Release tracking
    release: process.env.SENTRY_RELEASE || process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    // Error filtering (reduce noise from expected errors)
    ignoreErrors: [
      // Network errors (common in middleware)
      'ECONNRESET',
      'ETIMEDOUT',

      // Application expected errors
      'NotFoundException',
      'UnauthorizedException',
    ],

    // Minimal integrations for Edge runtime (reduced bundle size)
    integrations: [
      // Basic fetch instrumentation for performance tracking
      Sentry.winterCGFetchIntegration({
        breadcrumbs: true,
        shouldCreateSpanForRequest: (url) => {
          // Only track external API calls, not internal routes
          return !url.startsWith(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
        },
      }),
    ],

    // Enhanced context for Edge errors
    beforeSend(event, hint) {
      // Add Edge runtime specific context
      if (event.contexts) {
        event.contexts.nextjs = {
          runtime: 'edge',
          version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
        };
      }
      return event;
    },

    // Debug mode (only in development)
    debug: process.env.SENTRY_DEBUG === 'true',
  });

  // eslint-disable-next-line no-console
  console.log(
    `[Sentry Edge] Initialized for environment: ${SENTRY_ENVIRONMENT} ` +
    `(traces: ${traces * 100}%)`,
  );
} else {
  // eslint-disable-next-line no-console
  console.warn('[Sentry Edge] DSN not provided - error tracking disabled');
}
