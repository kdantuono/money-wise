/**
 * Shared Sentry configuration for MoneyWise applications
 * This package provides common Sentry configuration across all apps
 */

export interface BaseSentryConfig {
  dsn: string;
  environment: string;
  debug: boolean;
  tracesSampleRate: number;
  profilesSampleRate: number;
  release?: string;
}

export interface SentryEnvironmentConfig {
  development: Partial<BaseSentryConfig>;
  staging: Partial<BaseSentryConfig>;
  production: Partial<BaseSentryConfig>;
}

// Default Sentry configuration based on environment
export const defaultSentryConfig: SentryEnvironmentConfig = {
  development: {
    debug: true,
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  },
  staging: {
    debug: false,
    tracesSampleRate: 0.5,
    profilesSampleRate: 0.5,
  },
  production: {
    debug: false,
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
  },
};

// Common error filtering logic
export const commonErrorFilters = {
  // Errors that should be ignored in all environments
  ignoredErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'ChunkLoadError',
    'Loading chunk',
    'Network Error',
    'NetworkError',
    'Failed to fetch',
    'ERR_INTERNET_DISCONNECTED',
    'ERR_NETWORK_CHANGED',
  ],

  // Development-specific errors to ignore
  developmentIgnoredErrors: [
    'Hydration',
    'HMR',
    'Hot reload',
    'Warning:',
  ],
};

// Common sensitive data fields to filter
export const sensitiveDataFields = [
  'password',
  'confirmPassword',
  'currentPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
  'sessionId',
];

// Common tags for better error organization
export const commonTags = {
  getApplicationTags: (appName: 'backend' | 'web' | 'mobile') => ({
    application: appName,
    service: 'moneywise',
    component: appName === 'backend' ? 'server' : 'client',
  }),
};

// Performance monitoring configuration
export const performanceConfig = {
  // Transaction names for better grouping
  transactionCategories: {
    api: 'api.request',
    database: 'db.query',
    auth: 'auth.operation',
    payment: 'payment.operation',
    notification: 'notification.send',
    upload: 'file.upload',
    export: 'data.export',
  },

  // Custom instrumentation tags
  instrumentationTags: {
    endpoint: (method: string, path: string) => `${method} ${path}`,
    database: (operation: string, table: string) => `${operation}:${table}`,
    cache: (operation: string, key: string) => `cache.${operation}:${key}`,
  },
};

// Utility function to create environment-specific config
export function createSentryConfig(
  environment: keyof SentryEnvironmentConfig,
  overrides: Partial<BaseSentryConfig> = {}
): BaseSentryConfig {
  const baseConfig = defaultSentryConfig[environment];

  return {
    dsn: '',
    environment,
    debug: false,
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    ...baseConfig,
    ...overrides,
  };
}

// Utility function to filter sensitive data
export function filterSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const filtered = { ...data };

  sensitiveDataFields.forEach(field => {
    if (filtered[field]) {
      filtered[field] = '[REDACTED]';
    }
  });

  return filtered;
}

// Utility function to check if error should be ignored
export function shouldIgnoreError(error: Error, environment: string): boolean {
  const message = error.message;

  // Check common ignored errors
  if (commonErrorFilters.ignoredErrors.some(ignoredError =>
    message.includes(ignoredError)
  )) {
    return true;
  }

  // Check development-specific ignored errors
  if (environment === 'development' &&
      commonErrorFilters.developmentIgnoredErrors.some(ignoredError =>
        message.includes(ignoredError)
      )) {
    return true;
  }

  return false;
}