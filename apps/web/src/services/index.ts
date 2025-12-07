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

// Liabilities exports (prefixed error classes to avoid conflicts with banking.client)
export {
  default as liabilitiesClient,
  type LiabilityType,
  type LiabilityStatus,
  type Installment,
  type InstallmentPlan,
  type Liability,
  type UpcomingPayment,
  type BNPLDetectionResult,
  type LiabilitiesSummary,
  type CreateLiabilityRequest,
  type UpdateLiabilityRequest,
  type CreateInstallmentPlanRequest,
  LiabilitiesApiError,
  AuthenticationError as LiabilitiesAuthenticationError,
  ValidationError as LiabilitiesValidationError,
  NotFoundError as LiabilitiesNotFoundError,
} from './liabilities.client';
