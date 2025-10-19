/**
 * Metadata Type Definitions for JSON Fields
 *
 * This file contains strict type definitions for all JSON/JSONB fields
 * used throughout the application to eliminate 'any' type usage.
 *
 * @phase STORY-4.1 - Type System Refactoring (Phase 4)
 * @batch BATCH-5 - Service Layer Type Safety
 */

import { Prisma } from '../../../../generated/prisma';

/**
 * User Preferences
 *
 * Stored in users.preferences (JSONB field)
 * Contains user-specific application settings
 */
export type UserPreferences = {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    categories?: boolean;
    budgets?: boolean;
    transactions?: boolean;
  };
  dashboard?: {
    defaultView?: 'overview' | 'transactions' | 'budgets' | 'analytics';
    showWidgets?: string[];
  };
  [key: string]: unknown;
};

/**
 * Account Settings
 *
 * Stored in accounts.settings (JSONB field)
 * Contains account-specific configuration
 */
export type AccountSettings = {
  autoSync?: boolean;
  syncFrequency?: 'hourly' | 'daily' | 'weekly' | 'manual';
  notifications?: boolean;
  budgetIncluded?: boolean;
  displayOrder?: number;
  color?: string;
  icon?: string;
  [key: string]: unknown;
};

/**
 * Plaid Account Metadata
 *
 * Stored in accounts.plaidMetadata (JSONB field)
 * Contains Plaid-specific account information
 */
export type PlaidAccountMetadata = {
  mask?: string;
  subtype?: string;
  officialName?: string;
  persistentAccountId?: string;
  verificationStatus?: string;
  balances?: {
    available?: number;
    current?: number;
    limit?: number | null;
    isoCurrencyCode?: string;
  };
  [key: string]: unknown;
};

/**
 * Plaid Transaction Metadata
 *
 * Stored in transactions.plaidMetadata (JSONB field)
 * Contains Plaid-specific transaction information
 */
export type PlaidTransactionMetadata = {
  categoryId?: string[];
  categoryConfidenceLevel?: string;
  transactionCode?: string | null;
  transactionType?: string;
  personalFinanceCategory?: {
    primary?: string;
    detailed?: string;
    confidence_level?: string;
  };
  merchantEntityId?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  paymentMeta?: {
    referenceNumber?: string | null;
    ppdId?: string | null;
    payee?: string | null;
    byOrderOf?: string | null;
    payer?: string | null;
    paymentMethod?: string | null;
    paymentProcessor?: string | null;
    reason?: string | null;
  };
  [key: string]: unknown;
};

/**
 * Transaction Location Metadata
 *
 * Stored in transactions.locationMetadata (JSONB field)
 * Contains geographic location information for transactions
 */
export type TransactionLocation = {
  address?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  lat?: number;
  lon?: number;
  storeNumber?: string;
  [key: string]: unknown;
};

/**
 * Payment Channel Metadata
 *
 * Stored in transactions.paymentChannelMetadata (JSONB field)
 * Contains payment method information
 */
export type PaymentChannelMetadata = {
  paymentChannel?: 'online' | 'in store' | 'other';
  cardType?: 'credit' | 'debit' | 'prepaid';
  lastFourDigits?: string;
  [key: string]: unknown;
};

/**
 * Category Rules
 *
 * Stored in categories.rules (JSONB field)
 * Contains auto-categorization rules
 */
export type CategoryRules = {
  keywords?: string[];
  merchantPatterns?: string[];
  autoAssign?: boolean;
  confidence?: number;
  conditions?: Array<{
    field: 'description' | 'merchantName' | 'amount';
    operator: 'contains' | 'equals' | 'greaterThan' | 'lessThan';
    value: string | number;
  }>;
  [key: string]: unknown;
};

/**
 * Category Metadata
 *
 * Stored in categories.metadata (JSONB field)
 * Contains additional category information
 */
export type CategoryMetadata = {
  budgetEnabled?: boolean;
  monthlyLimit?: number;
  taxDeductible?: boolean;
  businessExpense?: boolean;
  tags?: string[];
  notes?: string;
  [key: string]: unknown;
};

/**
 * Budget Settings
 *
 * Stored in budgets.settings (JSONB field)
 * Contains budget-specific configuration
 */
export type BudgetSettings = {
  rollover?: boolean;
  includeSubcategories?: boolean;
  alertThreshold?: number;
  alertEnabled?: boolean;
  carryoverMode?: 'all' | 'none' | 'partial';
  [key: string]: unknown;
};

/**
 * Audit Metadata
 *
 * Used for audit logs and security events
 */
export type AuditMetadata = {
  ipAddress?: string;
  userAgent?: string;
  action?: string;
  resource?: string;
  timestamp?: string;
  [key: string]: unknown;
};

/**
 * Type Guards for Metadata Validation
 */

export function isUserPreferences(value: unknown): value is UserPreferences {
  return typeof value === 'object' && value !== null;
}

export function isAccountSettings(value: unknown): value is AccountSettings {
  return typeof value === 'object' && value !== null;
}

export function isPlaidAccountMetadata(value: unknown): value is PlaidAccountMetadata {
  return typeof value === 'object' && value !== null;
}

export function isPlaidTransactionMetadata(value: unknown): value is PlaidTransactionMetadata {
  return typeof value === 'object' && value !== null;
}

export function isTransactionLocation(value: unknown): value is TransactionLocation {
  return typeof value === 'object' && value !== null;
}

export function isCategoryRules(value: unknown): value is CategoryRules {
  return typeof value === 'object' && value !== null;
}

export function isCategoryMetadata(value: unknown): value is CategoryMetadata {
  return typeof value === 'object' && value !== null;
}

export function isBudgetSettings(value: unknown): value is BudgetSettings {
  return typeof value === 'object' && value !== null;
}

/**
 * Helper type for converting metadata to Prisma.InputJsonValue
 * This is used when passing metadata to Prisma create/update operations
 */
export type MetadataInput<T> = T extends object ? Prisma.InputJsonValue : never;
