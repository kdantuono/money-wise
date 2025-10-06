/**
 * Sentry Client-Side Instrumentation (Browser Runtime)
 *
 * This file initializes Sentry for the browser/client-side runtime.
 * It runs in the user's browser and captures client-side errors, performance data,
 * and user interactions.
 *
 * NOTE: This is the Next.js 15+ recommended pattern. The old sentry.client.config.ts
 * file is deprecated when using Turbopack and will be removed in future versions.
 *
 * Environment-aware sampling rates:
 * - Development: 100% traces (full debugging)
 * - Staging: 50% traces (balance coverage vs quota)
 * - Production: 10% traces (conserve free tier quota)
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';

/**
 * Get environment-specific sampling rates for client-side
 * Matches backend sampling strategy for consistency
 */
const getSamplingRates = () => {
  // Check for explicit override from environment variable
  const explicitRate = process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE;
  if (explicitRate) {
    return { traces: parseFloat(explicitRate) };
  }

  // Environment-based defaults
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

    // Session Replay (optional - captures user sessions for debugging)
    // Disabled by default to conserve quota
    // replaysSessionSampleRate: 0.1,  // 10% of sessions
    // replaysOnErrorSampleRate: 1.0,  // 100% of sessions with errors

    // Release tracking
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    // Integrations
    integrations: [
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration({
        // Track navigation and resource loading
        traceFetch: true,
        traceXHR: true,
      }),

      // Replay integration (optional - uncomment to enable)
      // Sentry.replayIntegration({
      //   maskAllText: true,
      //   blockAllMedia: true,
      // }),
    ],

    // Error filtering (reduce noise from expected errors)
    ignoreErrors: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,

      // Network errors (user connectivity issues)
      'NetworkError',
      'Failed to fetch',
      'Load failed',

      // Common user-caused errors
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],

    // Breadcrumbs configuration (context for errors)
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy console logs in production
      if (SENTRY_ENVIRONMENT === 'production' && breadcrumb.category === 'console') {
        return null;
      }
      return breadcrumb;
    },

    // Debug mode (only in development)
    debug: process.env.NEXT_PUBLIC_SENTRY_DEBUG === 'true',
  });

  // eslint-disable-next-line no-console
  console.log(
    `[Sentry Client] Initialized for environment: ${SENTRY_ENVIRONMENT} ` +
    `(traces: ${traces * 100}%)`,
  );
} else {
  // eslint-disable-next-line no-console
  console.warn('[Sentry Client] DSN not provided - error tracking disabled');
}

/**
 * Hook for capturing router transitions
 * Required by Sentry for Next.js App Router navigation tracking
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#navigation-tracking
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
