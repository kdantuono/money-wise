/**
 * Domain Type Definitions
 *
 * Structured types to replace `any` throughout the application.
 * These types provide type safety for JSON fields and metadata.
 *
 * ARCHITECTURAL DECISION:
 * - Centralized location for domain types used across multiple modules
 * - All fields optional to support partial updates and backward compatibility
 * - Use `unknown` for truly dynamic/extensible fields rather than `any`
 * - Validation should be done at runtime (class-validator) in addition to TypeScript
 */

// ============================================================================
// CATEGORY TYPES
// ============================================================================

/**
 * Category Rule Configuration
 * Defines matching rules for automatic transaction categorization
 */
export interface CategoryRule {
  /** Keywords to match in transaction description */
  keywords?: string[];

  /** Merchant name patterns (case-insensitive) */
  merchantPatterns?: string[];

  /** Amount range filters for categorization */
  amountRanges?: Array<{
    min?: number;
    max?: number;
  }>;

  /** Automatically assign this category if matched */
  autoAssign?: boolean;

  /** Base confidence for this rule (0-100) */
  confidence?: number;
}

/**
 * Category Metadata
 * User-defined category settings and budget information
 */
export interface CategoryMetadata {
  /** Enable budget tracking for this category */
  budgetEnabled?: boolean;

  /** Monthly spending limit */
  monthlyLimit?: number;

  /** Quarterly spending limit */
  quarterlyLimit?: number;

  /** Annual spending limit */
  yearlyLimit?: number;

  /** Alert threshold percentage (0-100) */
  alertThreshold?: number;

  /** Enable notifications when approaching limit */
  notificationsEnabled?: boolean;

  /** Custom display color (hex code) */
  displayColor?: string;

  /** Category notes/description */
  notes?: string;

  /** Last budget review date */
  lastReviewedAt?: string; // ISO date string

  /** Extensible field for additional metadata */
  [key: string]: unknown;
}

// ============================================================================
// ACCOUNT TYPES
// ============================================================================

/**
 * Plaid Account Metadata
 * Data from Plaid API stored with each account
 */
export interface PlaidMetadata {
  /** Account number mask (e.g., "1234") */
  mask?: string;

  /** Plaid account subtype (e.g., "checking", "savings") */
  subtype?: string;

  /** Official account name from institution */
  officialName?: string;

  /** Account verification status */
  verificationStatus?: 'pending_automatic_verification' | 'pending_manual_verification' | 'manually_verified' | 'verification_expired' | 'verification_failed';

  /** APR (Annual Percentage Rate) for credit accounts */
  apr?: number;

  /** Interest rate for savings/investment accounts */
  interestRate?: number;

  /** Account opening date */
  openedAt?: string; // ISO date string

  /** Last sync timestamp from Plaid */
  lastSyncedAt?: string; // ISO date string

  /** Plaid-specific error codes if any */
  errorCode?: string;

  /** Extensible field for additional Plaid data */
  [key: string]: unknown;
}

/**
 * Account Settings
 * User preferences and configuration for an account
 */
export interface AccountSettings {
  /** Automatically sync transactions from Plaid */
  autoSync?: boolean;

  /** Sync frequency ('realtime' | 'hourly' | 'daily' | 'weekly') */
  syncFrequency?: 'realtime' | 'hourly' | 'daily' | 'weekly';

  /** Include account in budget calculations */
  budgetIncluded?: boolean;

  /** Include account in net worth calculations */
  netWorthIncluded?: boolean;

  /** Show account on dashboard */
  showOnDashboard?: boolean;

  /** Display order (lower = higher priority) */
  displayOrder?: number;

  /** Custom account nickname */
  nickname?: string;

  /** Account-specific notes */
  notes?: string;

  /** Alert thresholds */
  alerts?: {
    /** Alert when balance falls below this amount */
    lowBalanceThreshold?: number;

    /** Alert for large transactions above this amount */
    largeTransactionThreshold?: number;

    /** Enable overdraft alerts */
    overdraftAlertEnabled?: boolean;
  };

  /** Banking-specific settings (for linked accounts) */
  banking?: {
    /** Bank country code (ISO 3166-1 alpha-2) */
    bankCountry?: string;

    /** Account holder name */
    accountHolderName?: string;

    /** Account type from banking provider */
    accountType?: string;

    /** Banking provider name */
    provider?: string;
  };

  /** Extensible field for additional settings */
  [key: string]: unknown;
}

// ============================================================================
// BANKING TYPES
// ============================================================================

/**
 * Banking Connection Metadata
 * Provider-agnostic metadata for banking connections
 */
export interface BankingMetadata {
  /** Connection expiration date */
  expiresAt?: string; // ISO date string

  /** Last successful sync timestamp */
  lastSyncedAt?: string; // ISO date string

  /** Number of accounts linked via this connection */
  accountCount?: number;

  /** Institution ID from provider */
  institutionId?: string;

  /** Institution name */
  institutionName?: string;

  /** Provider-specific consent ID */
  consentId?: string;

  /** Consent expiration date */
  consentExpiresAt?: string; // ISO date string

  /** Available account types */
  availableAccountTypes?: string[];

  /** Error information if connection failed */
  error?: {
    code?: string;
    message?: string;
    timestamp?: string;
  };

  /** Extensible field for provider-specific data */
  [key: string]: unknown;
}

/**
 * SaltEdge-Specific Metadata
 * Extended metadata for SaltEdge banking integration
 */
export interface SaltEdgeMetadata extends BankingMetadata {
  /** SaltEdge customer ID */
  customerId?: string;

  /** SaltEdge connection secret */
  connectionSecret?: string;

  /** Connection mode ('web' | 'app' | 'api') */
  connectionMode?: 'web' | 'app' | 'api';

  /** Categorization support */
  categorizationSupported?: boolean;

  /** Country code where bank operates */
  countryCode?: string;

  /** Provider-specific codes */
  providerCodes?: {
    bic?: string;
    swift?: string;
    iban?: string;
  };
}

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

/**
 * Transaction Metadata
 * Additional transaction data from banking providers and enrichment
 */
export interface TransactionMetadata {
  /** SaltEdge transaction ID */
  saltedgeId?: string;

  /** Transaction category from provider */
  category?: string;

  /** Subcategory from provider */
  subcategory?: string;

  /** Enrichment data */
  enrichment?: {
    /** Merchant name */
    merchant_name?: string;

    /** Merchant category code (MCC) */
    merchant_category_code?: string;

    /** Merchant logo URL */
    merchant_logo?: string;

    /** Transaction location */
    location?: {
      address?: string;
      city?: string;
      region?: string;
      country?: string;
      postalCode?: string;
      lat?: number;
      lon?: number;
    };
  };

  /** Pending transaction indicator */
  pending?: boolean;

  /** Payment channel ('online' | 'in_store' | 'other') */
  paymentChannel?: string;

  /** Check number (if applicable) */
  checkNumber?: string;

  /** Reference number from bank */
  referenceNumber?: string;

  /** Additional provider-specific data */
  extra?: {
    [key: string]: unknown;
  };

  /** Extensible field for additional metadata */
  [key: string]: unknown;
}

/**
 * Categorization Metadata
 * Information about how a transaction was categorized
 */
export interface CategorizationMetadata {
  /** Category ID assigned */
  categoryId?: string;

  /** Confidence score (0-100) */
  confidence?: number;

  /** How the category was assigned */
  matchedBy?: 'manual' | 'enrichment' | 'merchant_exact' | 'merchant_partial' | 'keyword' | 'fallback';

  /** Timestamp of categorization */
  categorizedAt?: string; // ISO date string

  /** User ID who manually categorized (if manual) */
  categorizedBy?: string;

  /** Suggested alternative categories */
  suggestedCategories?: Array<{
    categoryId: string;
    confidence: number;
  }>;
}

// ============================================================================
// SYNC LOG TYPES
// ============================================================================

/**
 * Banking Sync Log Metadata
 * Additional information about sync operations
 */
export interface SyncLogMetadata {
  /** Sync job ID from provider */
  jobId?: string;

  /** Sync duration in milliseconds */
  duration?: number;

  /** Number of new transactions fetched */
  newTransactions?: number;

  /** Number of updated transactions */
  updatedTransactions?: number;

  /** Number of deleted transactions */
  deletedTransactions?: number;

  /** Balance changes detected */
  balanceChanges?: Array<{
    accountId: string;
    previousBalance: number;
    newBalance: number;
    difference: number;
  }>;

  /** Warnings encountered during sync */
  warnings?: string[];

  /** Provider-specific sync metadata */
  [key: string]: unknown;
}

// ============================================================================
// USER TYPES
// ============================================================================

/**
 * User Preferences
 * User-specific settings and preferences
 */
export interface UserPreferences {
  /** Preferred currency */
  currency?: string;

  /** Preferred date format */
  dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';

  /** Preferred number format */
  numberFormat?: {
    locale?: string;
    decimals?: number;
    thousandsSeparator?: string;
    decimalSeparator?: string;
  };

  /** Theme preference */
  theme?: 'light' | 'dark' | 'auto';

  /** Notification preferences */
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    inApp?: boolean;
  };

  /** Dashboard customization */
  dashboard?: {
    widgets?: string[];
    layout?: string;
  };

  /** Privacy settings */
  privacy?: {
    shareDataWithFamily?: boolean;
    showNetWorth?: boolean;
    showAccountNumbers?: boolean;
  };

  /** Extensible field for additional preferences */
  [key: string]: unknown;
}

/**
 * Family Settings
 * Family-wide configuration and preferences
 */
export interface FamilySettings {
  /** Shared budget settings */
  sharedBudget?: {
    enabled?: boolean;
    monthlyLimit?: number;
    alertThreshold?: number;
  };

  /** Permission settings */
  permissions?: {
    membersCanCreateCategories?: boolean;
    membersCanLinkAccounts?: boolean;
    membersCanViewAllTransactions?: boolean;
    requireApprovalForLargeTransactions?: boolean;
    largeTransactionThreshold?: number;
  };

  /** Notification preferences */
  notifications?: {
    budgetAlerts?: boolean;
    syncErrors?: boolean;
    largeTransactions?: boolean;
    monthlySummary?: boolean;
  };

  /** Extensible field for additional settings */
  [key: string]: unknown;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Type guard to check if value is a valid CategoryRule
 */
export function isCategoryRule(value: unknown): value is CategoryRule {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  // Must have at least one rule property
  return (
    (obj.keywords !== undefined && Array.isArray(obj.keywords)) ||
    (obj.merchantPatterns !== undefined && Array.isArray(obj.merchantPatterns)) ||
    (obj.amountRanges !== undefined && Array.isArray(obj.amountRanges)) ||
    (obj.autoAssign !== undefined && typeof obj.autoAssign === 'boolean') ||
    (obj.confidence !== undefined && typeof obj.confidence === 'number')
  );
}

/**
 * Type guard to check if value is a valid AccountSettings
 */
export function isAccountSettings(value: unknown): value is AccountSettings {
  if (typeof value !== 'object' || value === null) return false;
  // Account settings can be any object, so we just validate structure exists
  return true;
}

/**
 * Type guard to check if value is a valid PlaidMetadata
 */
export function isPlaidMetadata(value: unknown): value is PlaidMetadata {
  if (typeof value !== 'object' || value === null) return false;
  // Plaid metadata can be any object, so we just validate structure exists
  return true;
}
