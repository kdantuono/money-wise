import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

const config: Sentry.EdgeRuntimeOptions = {
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

    return event;
  },

  // Tags for better organization
  initialScope: {
    tags: {
      component: 'web-edge',
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