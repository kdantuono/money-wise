import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

const config: Sentry.NodeOptions = {
  dsn: SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Debug mode for development
  debug: process.env.NODE_ENV === 'development',

  // Release tracking
  release: process.env.SENTRY_RELEASE,

  // Error filtering
  beforeSend: (event) => {
    // Filter out sensitive data
    if (event.request?.data) {
      if (typeof event.request.data === 'object') {
        delete event.request.data.password;
        delete event.request.data.confirmPassword;
        delete event.request.data.token;
      }
    }

    // Filter out common non-critical errors
    const ignoredErrors = [
      'ECONNRESET',
      'EPIPE',
      'ENOTFOUND',
    ];

    if (event.exception?.values?.[0]?.value) {
      const errorMessage = event.exception.values[0].value;
      if (ignoredErrors.some(error => errorMessage.includes(error))) {
        return null;
      }
    }

    return event;
  },

  // Integrations
  integrations: [
    Sentry.httpIntegration({
      tracing: {
        ignoreIncomingRequestHook: (request) => {
          // Ignore health checks and static assets
          const ignoredPaths = [
            '/_next',
            '/favicon.ico',
            '/health',
            '/metrics',
            '/api/health',
          ];
          return ignoredPaths.some(path => request.url?.includes(path));
        },
      },
    }),
  ],

  // Tags for better organization
  initialScope: {
    tags: {
      component: 'web-server',
      version: process.env.npm_package_version,
    },
  },
};

// Initialize Sentry only if DSN is provided
if (SENTRY_DSN) {
  Sentry.init(config);
} else {
  console.warn('Sentry DSN not provided. Error tracking will be disabled.');
}