/**
 * Factory Metadata Types
 * Type-safe metadata definitions for Prisma test factories
 *
 * @phase P.4.1
 * @description Eliminates any-casts by providing proper Prisma.InputJsonValue types
 */

import { Prisma } from '../../../generated/prisma';

/**
 * User Preferences
 * Used for User.preferences field (Prisma.InputJsonValue)
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    categories: boolean;
    budgets: boolean;
  };
  [key: string]: Prisma.JsonValue;
}

/**
 * Account Settings
 * Used for Account.settings field (Prisma.InputJsonValue)
 */
export interface AccountSettings {
  autoSync: boolean;
  syncFrequency: 'daily' | 'weekly' | 'manual';
  notifications: boolean;
  budgetIncluded: boolean;
  [key: string]: Prisma.JsonValue;
}

/**
 * Plaid Metadata for Account
 * Used for Account.plaidMetadata field (Prisma.InputJsonValue)
 */
export interface PlaidAccountMetadata {
  mask?: string;
  subtype?: string;
  officialName?: string;
  persistentAccountId?: string;
  [key: string]: Prisma.JsonValue;
}

/**
 * Category Rules
 * Used for Category.rules field (Prisma.InputJsonValue)
 */
export interface CategoryRules {
  keywords: string[];
  merchantPatterns: string[];
  autoAssign: boolean;
  confidence: number;
  [key: string]: Prisma.JsonValue;
}

/**
 * Category Metadata
 * Used for Category.metadata field (Prisma.InputJsonValue)
 */
export interface CategoryMetadata {
  budgetEnabled: boolean;
  monthlyLimit: number;
  taxDeductible: boolean;
  businessExpense: boolean;
  [key: string]: Prisma.JsonValue;
}

/**
 * Transaction Location
 * Used for Transaction.location field (Prisma.InputJsonValue)
 */
export interface TransactionLocation {
  address: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  lat: number;
  lon: number;
  [key: string]: Prisma.JsonValue;
}

/**
 * Plaid Metadata for Transaction
 * Used for Transaction.plaidMetadata field (Prisma.InputJsonValue)
 */
export interface PlaidTransactionMetadata {
  categoryId: string[];
  categoryConfidenceLevel: 'high' | 'medium' | 'low';
  transactionCode: string;
  transactionType: string;
  personalFinanceCategory: {
    primary: string;
    detailed: string;
    confidence_level: 'high' | 'medium' | 'low';
  };
  [key: string]: Prisma.JsonValue;
}

/**
 * Budget Settings
 * Used for Budget.settings field (Prisma.InputJsonValue)
 */
export interface BudgetSettings {
  rollover: boolean;
  includeSubcategories: boolean;
  [key: string]: Prisma.JsonValue;
}

/**
 * Type conversion utilities for Prisma.InputJsonValue
 * Ensures type safety when passing to Prisma
 */
export const toPrismaJson = <T>(value: T): Prisma.InputJsonValue => {
  return value as unknown as Prisma.InputJsonValue;
};
