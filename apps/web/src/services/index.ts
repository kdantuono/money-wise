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

// Scheduled transactions exports
export {
  default as scheduledClient,
  type TransactionType as ScheduledTransactionType,
  type FlowType as ScheduledFlowType,
  type ScheduledTransactionStatus,
  type RecurrenceFrequency,
  type RecurrenceRule,
  type ScheduledTransaction,
  type UpcomingScheduled,
  type CalendarEvent,
  type CreateRecurrenceRuleRequest,
  type CreateScheduledTransactionRequest,
  type UpdateScheduledTransactionRequest,
  type ScheduledFilterOptions,
  type PaginatedScheduledResponse,
  ScheduledApiError,
  AuthenticationError as ScheduledAuthenticationError,
  ValidationError as ScheduledValidationError,
  NotFoundError as ScheduledNotFoundError,
} from './scheduled.client';
