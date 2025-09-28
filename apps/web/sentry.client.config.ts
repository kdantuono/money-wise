import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

const config: Sentry.BrowserOptions = {
  dsn: SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Debug mode for development
  debug: process.env.NODE_ENV === 'development',

  // Release tracking
  release: process.env.SENTRY_RELEASE,

  // Error filtering
  beforeSend: (event) => {
    // Filter out development errors
    if (process.env.NODE_ENV === 'development') {
      // Skip hydration errors in development
      if (event.message && event.message.includes('Hydration')) {
        return null;
      }
    }

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
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'ChunkLoadError',
      'Loading chunk',
      'Network Error',
    ];

    if (event.message && ignoredErrors.some(error => event.message!.includes(error))) {
      return null;
    }

    return event;
  },

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text content and inputs for privacy
      maskAllText: process.env.NODE_ENV === 'production',
      blockAllMedia: process.env.NODE_ENV === 'production',
    }),
    Sentry.feedbackIntegration({
      // Automatically inject user feedback dialog
      autoInject: false,
    }),
  ],

  // Tags for better organization
  initialScope: {
    tags: {
      component: 'web-frontend',
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