/**
 * DTO Metadata Type Definitions
 *
 * Strongly-typed metadata interfaces for Data Transfer Objects (DTOs).
 * These types replace `any` with proper discriminated unions and type-safe structures.
 *
 * @module dto-metadata.types
 */

/**
 * Transaction metadata with discriminated union for different metadata types
 */
export type TransactionMetadata =
  | {
      type: 'recurring';
      frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
      nextDueDate?: string;
      endDate?: string;
    }
  | {
      type: 'split';
      splitTransactions: Array<{
        accountId: string;
        amount: number;
        description?: string;
      }>;
    }
  | {
      type: 'scheduled';
      scheduledDate: string;
      autoProcess: boolean;
    }
  | {
      type: 'custom';
      [key: string]: unknown;
    }
  | undefined;

/**
 * Transaction tags - array of string identifiers
 */
export type TransactionTags = string[] | undefined;

/**
 * Transaction custom fields - flexible key-value pairs
 */
export type TransactionCustomFields = Record<string, unknown> | undefined;

/**
 * Account metadata with discriminated union for different account types
 */
export type AccountMetadata =
  | {
      type: 'institution';
      institutionName: string;
      accountNumber?: string;
      routingNumber?: string;
      lastSyncDate?: string;
    }
  | {
      type: 'investment';
      broker?: string;
      accountType?: 'ira' | '401k' | 'taxable' | 'roth';
      riskLevel?: 'conservative' | 'moderate' | 'aggressive';
    }
  | {
      type: 'credit';
      creditLimit?: number;
      interestRate?: number;
      paymentDueDay?: number;
    }
  | {
      type: 'custom';
      [key: string]: unknown;
    }
  | undefined;

/**
 * Account balance metadata
 */
export interface AccountBalanceMetadata {
  availableBalance?: number;
  pendingBalance?: number;
  lastUpdated?: string;
  currency?: string;
}

/**
 * Generic flexible metadata for cases where structure is truly dynamic
 * Use this sparingly - prefer discriminated unions when possible
 */
export type FlexibleMetadata = Record<string, unknown> | undefined;

/**
 * Prisma-specific metadata for database operations
 */
export interface PrismaMetadata {
  createdBy?: string;
  updatedBy?: string;
  source?: 'api' | 'import' | 'migration' | 'system';
  version?: number;
  [key: string]: unknown;
}

/**
 * Type guard to check if metadata is of a specific type
 */
export function isTransactionMetadataType<T extends TransactionMetadata['type']>(
  metadata: TransactionMetadata,
  type: T,
): metadata is Extract<TransactionMetadata, { type: T }> {
  return metadata !== undefined && 'type' in metadata && metadata.type === type;
}

/**
 * Type guard to check if metadata is of a specific account type
 */
export function isAccountMetadataType<T extends AccountMetadata['type']>(
  metadata: AccountMetadata,
  type: T,
): metadata is Extract<AccountMetadata, { type: T }> {
  return metadata !== undefined && 'type' in metadata && metadata.type === type;
}
