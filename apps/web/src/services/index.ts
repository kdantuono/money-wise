/**
 * Services Module
 *
 * Barrel export for all service modules.
 */

export * from './banking.client';
export { default as bankingClient } from './banking.client';

// Analytics exports (prefixed to avoid conflicts with banking.client)
export {
  default as analyticsClient,
  AnalyticsApiError,
  AuthenticationError as AnalyticsAuthenticationError,
  ServerError as AnalyticsServerError,
} from './analytics.client';
