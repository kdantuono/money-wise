import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

// Sentry configuration options
export interface SentryConfig {
  dsn: string;
  environment: string;
  debug: boolean;
  tracesSampleRate: number;
  profilesSampleRate: number;
  release?: string;
}

// Create Sentry configuration based on environment
export const createSentryConfig = (): SentryConfig => {
  const environment = __DEV__ ? 'development' : 'production';

  return {
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
    environment,
    debug: __DEV__,
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    profilesSampleRate: __DEV__ ? 1.0 : 0.1,
    release: process.env.EXPO_PUBLIC_SENTRY_RELEASE,
  };
};

// Initialize Sentry
export const initializeSentry = (): void => {
  const config = createSentryConfig();

  if (!config.dsn) {
    console.warn('Sentry DSN not provided. Error tracking will be disabled.');
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    debug: config.debug,
    tracesSampleRate: config.tracesSampleRate,
    profilesSampleRate: config.profilesSampleRate,
    release: config.release,

    // Integrations
    integrations: [
      Sentry.mobileReplayIntegration({
        maskAllText: !__DEV__,
        maskAllImages: !__DEV__,
        maskAllVectors: !__DEV__,
      }),
      Sentry.screenshotIntegration({
        screenshotQuality: 'low',
        attachScreenshot: true,
      }),
      Sentry.viewHierarchyIntegration(),
      Sentry.reactNativeTracingIntegration({
        // Routing instrumentation for React Navigation
        routingInstrumentation: Sentry.routingInstrumentation,
        enableNativeFramesTracking: !__DEV__,
        enableStallTracking: true,
        enableAppStartTracking: true,
        enableUserInteractionTracing: true,
      }),
    ],

    // Error filtering and processing
    beforeSend: (event) => {
      // Filter out sensitive data
      if (event.extra) {
        delete event.extra.password;
        delete event.extra.token;
        delete event.extra.apiKey;
      }

      // Filter out common non-critical errors in development
      if (__DEV__) {
        const ignoredMessages = [
          'Network request failed',
          'Possible Unhandled Promise Rejection',
          'Non-Error promise rejection captured',
        ];

        if (event.message && ignoredMessages.some(msg => event.message!.includes(msg))) {
          return null;
        }
      }

      return event;
    },

    // Initial scope configuration
    initialScope: {
      tags: {
        component: 'mobile-app',
        platform: Platform.OS,
        version: Platform.Version.toString(),
      },
      user: {
        id: 'anonymous',
      },
    },

    // Performance monitoring
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,

    // Native crash handling
    enableNativeCrashHandling: true,
    enableNdkScopeSync: Platform.OS === 'android',

    // Network breadcrumbs
    maxBreadcrumbs: 100,

    // Attach stack trace to messages
    attachStacktrace: true,
  });

  // Set initial context
  Sentry.setContext('device', {
    platform: Platform.OS,
    version: Platform.Version,
  });

  console.log('Sentry initialized successfully');
};

// Utility functions for error tracking
export const captureError = (error: Error, context?: Record<string, any>) => {
  if (context) {
    Sentry.setContext('error_context', context);
  }
  Sentry.captureException(error);
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

export const setUserContext = (user: { id: string; email?: string; username?: string }) => {
  Sentry.setUser(user);
};

export const addBreadcrumb = (
  message: string,
  category: string = 'custom',
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
};