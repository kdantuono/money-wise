/**
 * Sentry Server-Side Configuration (Node.js Runtime)
 *
 * This file initializes Sentry for the Node.js server runtime in Next.js.
 * It captures errors and performance data from:
 * - Server-side rendering (SSR)
 * - API routes
 * - Server Components
 * - Server Actions
 *
 * Environment-aware sampling rates:
 * - Development: 100% traces, 0% profiles (full debugging, no overhead)
 * - Staging: 50% traces, 20% profiles (balance coverage vs quota)
 * - Production: 10% traces, 10% profiles (conserve free tier quota)
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from '@sentry/nextjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || NODE_ENV;

/**
 * Get environment-specific sampling rates
 * Matches backend API sampling strategy for consistency
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
    release: process.env.SENTRY_RELEASE || process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    // Error filtering (reduce noise from expected errors)
    ignoreErrors: [
      // Next.js expected errors
      'ENOENT',  // File not found (static assets)
      'ECONNRESET',  // Client disconnected

      // Application expected errors (align with backend)
      'NotFoundException',
      'UnauthorizedException',
    ],

    // Breadcrumbs configuration
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy HTTP breadcrumbs in production
      if (SENTRY_ENVIRONMENT === 'production' && breadcrumb.category === 'http') {
        // Only keep failed requests
        if (breadcrumb.data?.status_code && breadcrumb.data.status_code < 400) {
          return null;
        }
      }
      return breadcrumb;
    },

    // Enhanced context for errors
    beforeSend(event, hint) {
      // Add Next.js specific context
      if (event.contexts) {
        event.contexts.nextjs = {
          runtime: 'nodejs',
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
    `[Sentry Server] Initialized for environment: ${SENTRY_ENVIRONMENT} ` +
    `(traces: ${traces * 100}%, profiles: ${profiles * 100}%)`,
  );
} else {
  // eslint-disable-next-line no-console
  console.warn('[Sentry Server] DSN not provided - error tracking disabled');
}
