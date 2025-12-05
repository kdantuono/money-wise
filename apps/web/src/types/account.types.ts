/**
 * Account Types for Frontend
 *
 * Type definitions for account and financial data consumed from the backend
 * /accounts/financial-summary endpoint.
 *
 * These types mirror the backend DTOs and provide type safety for:
 * - Account normalization (balance display)
 * - Financial summary (net worth calculation)
 * - Type guards for runtime validation
 *
 * @phase Phase 0 - Schema Foundation
 */

// ============================================================================
// ENUMS - Account Classification
// ============================================================================

/**
 * Account types supported by the system
 * Matches backend AccountType enum from Prisma
 */
export enum AccountType {
  CHECKING = 'CHECKING',
  SAVINGS = 'SAVINGS',
  CREDIT_CARD = 'CREDIT_CARD',
  LOAN = 'LOAN',
  INVESTMENT = 'INVESTMENT',
  MORTGAGE = 'MORTGAGE',
  OTHER = 'OTHER',
}

/**
 * Account status values
 * Matches backend AccountStatus enum from Prisma
 */
export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  HIDDEN = 'HIDDEN', // Soft-deleted, preserved for history
  CLOSED = 'CLOSED',
  PENDING = 'PENDING',
  ERROR = 'ERROR',
}

/**
 * Account data source
 * Matches backend AccountSource enum from Prisma
 */
export enum AccountSource {
  MANUAL = 'MANUAL',
  PLAID = 'PLAID',
  SALTEDGE = 'SALTEDGE',
}

/**
 * Account nature classification
 * ASSET: Accounts that add to net worth (checking, savings, investment)
 * LIABILITY: Accounts that subtract from net worth (credit cards, loans)
 */
export enum AccountNature {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
}

/**
 * How an account affects net worth calculation
 */
export enum NetWorthEffect {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
}

/**
 * Display labels for account balances
 * Used for UI presentation of normalized balances
 */
export enum BalanceDisplayLabel {
  AVAILABLE = 'Available',
  OWED = 'Owed',
  PAID_OFF = 'Paid Off',
  OVERDRAWN = 'Overdrawn',
  MARGIN_DEBT = 'Margin Debt',
}

// ============================================================================
// INTERFACES - Data Structures
// ============================================================================

/**
 * Normalized account balance for display
 * Provides consistent balance representation regardless of account type
 *
 * @example Credit Card: { currentBalance: 2500, displayLabel: 'Owed', affectsNetWorth: 'negative' }
 * @example Checking: { currentBalance: 1500, displayLabel: 'Available', affectsNetWorth: 'positive' }
 */
export interface NormalizedAccountBalance {
  /** Unique account identifier (UUID) */
  accountId: string;

  /** Human-readable account name */
  accountName: string;

  /** Account type classification */
  accountType: AccountType;

  /** Whether account is an asset or liability */
  accountNature: AccountNature;

  /** Normalized balance (positive for liabilities = amount owed) */
  currentBalance: number;

  /** Always positive amount for display purposes */
  displayAmount: number;

  /** Human-readable label describing the balance */
  displayLabel: BalanceDisplayLabel;

  /** How this account contributes to net worth */
  affectsNetWorth: NetWorthEffect;

  /** Currency code (ISO 4217) */
  currency: string;

  /** Optional financial institution name */
  institutionName?: string;
}

/**
 * Financial summary with proper net worth calculation
 *
 * Provides normalized financial totals that correctly handle:
 * - Credit card balances (amount owed as positive, subtracts from net worth)
 * - Loan/mortgage balances (amount owed as positive, subtracts from net worth)
 * - Checking/savings (positive = available, adds to net worth)
 * - Investment accounts (positive = available, adds to net worth)
 * - Overdrafts (negative asset = liability, subtracts from net worth)
 */
export interface FinancialSummary {
  /** Total assets (checking + savings + investments) */
  totalAssets: number;

  /** Total liabilities (credit cards + loans + mortgages) */
  totalLiabilities: number;

  /** Net worth (assets - liabilities) */
  netWorth: number;

  /** Total available credit across all credit accounts (0 if no credit accounts) */
  totalAvailableCredit: number;

  /** Normalized balances for each account */
  accounts: NormalizedAccountBalance[];

  /** Currency code for all amounts (ISO 4217) */
  currency: string;

  /** Timestamp when this summary was calculated (ISO 8601) */
  calculatedAt: string;
}

// ============================================================================
// TYPE GUARDS - Runtime Validation
// ============================================================================

/**
 * Validates if a value is a valid NormalizedAccountBalance object
 */
export function isNormalizedAccountBalance(value: unknown): value is NormalizedAccountBalance {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.accountId === 'string' &&
    typeof obj.accountName === 'string' &&
    typeof obj.accountType === 'string' &&
    typeof obj.accountNature === 'string' &&
    typeof obj.currentBalance === 'number' &&
    typeof obj.displayAmount === 'number' &&
    typeof obj.displayLabel === 'string' &&
    typeof obj.affectsNetWorth === 'string' &&
    typeof obj.currency === 'string'
  );
}

/**
 * Validates if a value is a valid FinancialSummary object
 */
export function isFinancialSummary(value: unknown): value is FinancialSummary {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.totalAssets === 'number' &&
    typeof obj.totalLiabilities === 'number' &&
    typeof obj.netWorth === 'number' &&
    typeof obj.totalAvailableCredit === 'number' &&
    Array.isArray(obj.accounts) &&
    typeof obj.currency === 'string' &&
    typeof obj.calculatedAt === 'string'
  );
}

/**
 * Validates if a string is a valid AccountType
 */
export function isValidAccountType(value: unknown): value is AccountType {
  if (typeof value !== 'string') {
    return false;
  }
  return Object.values(AccountType).includes(value as AccountType);
}

/**
 * Validates if a string is a valid AccountNature
 */
export function isValidAccountNature(value: unknown): value is AccountNature {
  if (typeof value !== 'string') {
    return false;
  }
  return Object.values(AccountNature).includes(value as AccountNature);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Determines the nature (ASSET/LIABILITY) of an account based on its type
 *
 * @param accountType - The type of account
 * @returns AccountNature.ASSET for checking, savings, investment, other
 *          AccountNature.LIABILITY for credit_card, loan, mortgage
 */
export function getAccountNature(accountType: AccountType): AccountNature {
  switch (accountType) {
    case AccountType.CREDIT_CARD:
    case AccountType.LOAN:
    case AccountType.MORTGAGE:
      return AccountNature.LIABILITY;
    case AccountType.CHECKING:
    case AccountType.SAVINGS:
    case AccountType.INVESTMENT:
    case AccountType.OTHER:
    default:
      return AccountNature.ASSET;
  }
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Account type values as union type for stricter typing
 */
export type AccountTypeValue = `${AccountType}`;

/**
 * Account nature values as union type
 */
export type AccountNatureValue = `${AccountNature}`;

/**
 * Net worth effect values as union type
 */
export type NetWorthEffectValue = `${NetWorthEffect}`;

/**
 * Balance display label values as union type
 */
export type BalanceDisplayLabelValue = `${BalanceDisplayLabel}`;

// ============================================================================
// DELETION ELIGIBILITY TYPES
// ============================================================================

/**
 * Transfer role in a linked transfer pair
 */
export type TransferRole = 'SOURCE' | 'DESTINATION';

/**
 * A linked transfer that would block account deletion
 * Represents a transfer transaction connecting this account to another
 */
export interface LinkedTransfer {
  /** ID of the transaction in this account */
  transactionId: string;

  /** Transfer group ID linking both sides */
  transferGroupId: string;

  /** ID of the linked account */
  linkedAccountId: string;

  /** Name of the linked account */
  linkedAccountName: string;

  /** Transfer amount (absolute value) */
  amount: number;

  /** Date of the transfer */
  date: string;

  /** Transfer description */
  description: string;

  /** Role of this account in the transfer */
  transferRole: TransferRole;
}

/**
 * Response from deletion eligibility check
 * Determines if an account can be deleted or should be hidden
 */
export interface DeletionEligibilityResponse {
  /** Whether the account can be permanently deleted */
  canDelete: boolean;

  /** Whether the account can be hidden (always true) */
  canHide: boolean;

  /** Current status of the account */
  currentStatus: AccountStatus;

  /** Human-readable reason if deletion is blocked */
  blockReason?: string;

  /** List of transfers blocking deletion */
  blockers: LinkedTransfer[];

  /** Total count of linked transfers */
  linkedTransferCount: number;
}

// ============================================================================
// RESTORE ELIGIBILITY TYPES
// ============================================================================

/**
 * Sibling account that shares the same banking connection
 */
export interface SiblingAccount {
  /** Account ID */
  id: string;

  /** Account name */
  name: string;

  /** Current status */
  status: AccountStatus;

  /** Account type */
  type: string;

  /** Current balance */
  currentBalance: number;

  /** Currency code */
  currency: string;
}

/**
 * Response from restore eligibility check
 * Determines if a hidden account can be restored or requires re-linking
 */
export interface RestoreEligibilityResponse {
  /** Whether the account can be restored with a simple status change */
  canRestore: boolean;

  /** Whether the account requires re-linking to restore banking access */
  requiresRelink: boolean;

  /** Current status of the account */
  currentStatus: AccountStatus;

  /** Account source (MANUAL or SALTEDGE) */
  source: AccountSource;

  /** Whether this is a banking account (connected to provider) */
  isBankingAccount: boolean;

  /** Banking connection status (if banking account) */
  connectionStatus?: string;

  /** Human-readable reason why re-linking is required */
  relinkReason?: string;

  /** List of sibling accounts on the same banking connection */
  siblingAccounts?: SiblingAccount[];

  /** Total count of accounts on this connection */
  totalConnectionAccounts: number;

  /** Banking provider name */
  providerName?: string;
}

/**
 * Error response when restore requires re-linking
 */
export interface RelinkRequiredError {
  /** HTTP status code (409) */
  statusCode: number;

  /** Error message */
  message: string;

  /** Error code */
  error: 'RELINK_REQUIRED';

  /** Number of sibling accounts that will need re-linking */
  siblingAccountCount: number;

  /** Suggested action */
  suggestion: string;

  /** Banking provider name */
  providerName?: string;
}
