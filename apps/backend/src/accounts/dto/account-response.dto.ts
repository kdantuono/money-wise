import { ApiProperty } from '@nestjs/swagger';
import { AccountType, AccountStatus, AccountSource } from '../../../generated/prisma';
import { AccountSettings } from '../../core/database/types/metadata.types';

export class AccountResponseDto {
  @ApiProperty({ description: 'Account ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  userId: string;

  @ApiProperty({ description: 'Account name', example: 'Chase Checking' })
  name: string;

  @ApiProperty({ description: 'Account type', enum: AccountType })
  type: AccountType;

  @ApiProperty({ description: 'Account status', enum: AccountStatus })
  status: AccountStatus;

  @ApiProperty({ description: 'Account source', enum: AccountSource })
  source: AccountSource;

  @ApiProperty({ description: 'Current balance', example: 1000.00 })
  currentBalance: number;

  @ApiProperty({ description: 'Available balance', example: 950.00, required: false })
  availableBalance?: number;

  @ApiProperty({ description: 'Credit limit', example: 5000.00, required: false })
  creditLimit?: number;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Institution name', example: 'Chase Bank', required: false })
  institutionName?: string;

  @ApiProperty({ description: 'Masked account number', example: '****1234', required: false })
  maskedAccountNumber?: string;

  @ApiProperty({ description: 'Display name', example: 'Chase Bank - Checking' })
  displayName: string;

  @ApiProperty({ description: 'Is Plaid account' })
  isPlaidAccount: boolean;

  @ApiProperty({ description: 'Is manual account' })
  isManualAccount: boolean;

  @ApiProperty({ description: 'Can be synced with banking provider (has valid connection)' })
  isSyncable: boolean;

  @ApiProperty({ description: 'Needs sync' })
  needsSync: boolean;

  @ApiProperty({ description: 'Is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Sync enabled' })
  syncEnabled: boolean;

  @ApiProperty({ description: 'Last sync timestamp', required: false })
  lastSyncAt?: Date;

  @ApiProperty({ description: 'Sync error message', required: false })
  syncError?: string;

  @ApiProperty({ description: 'SaltEdge connection ID for linked accounts', required: false })
  saltEdgeConnectionId?: string;

  @ApiProperty({ description: 'Account settings', required: false })
  settings?: AccountSettings;

  @ApiProperty({ description: 'Account creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Account last update timestamp' })
  updatedAt: Date;
}

export class AccountSummaryDto {
  @ApiProperty({ description: 'Total number of accounts' })
  totalAccounts: number;

  @ApiProperty({ description: 'Total balance across all accounts' })
  totalBalance: number;

  @ApiProperty({ description: 'Number of active accounts' })
  activeAccounts: number;

  @ApiProperty({ description: 'Number of accounts needing sync' })
  accountsNeedingSync: number;

  @ApiProperty({ description: 'Breakdown by account type' })
  byType: {
    [key in AccountType]?: {
      count: number;
      totalBalance: number;
    };
  };
}

/**
 * Normalized account balance for display
 */
export class NormalizedAccountBalanceDto {
  @ApiProperty({ description: 'Account ID' })
  accountId: string;

  @ApiProperty({ description: 'Account name' })
  accountName: string;

  @ApiProperty({ description: 'Account type', enum: ['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'LOAN', 'INVESTMENT', 'MORTGAGE', 'OTHER'] })
  accountType: AccountType;

  @ApiProperty({ description: 'Account nature', enum: ['ASSET', 'LIABILITY'] })
  accountNature: 'ASSET' | 'LIABILITY';

  @ApiProperty({ description: 'Normalized balance (positive for liabilities = amount owed)', example: 2500.00 })
  currentBalance: number;

  @ApiProperty({ description: 'Always positive amount for display', example: 2500.00 })
  displayAmount: number;

  @ApiProperty({ description: 'Human-readable label', enum: ['Available', 'Owed', 'Paid Off', 'Overdrawn', 'Margin Debt'] })
  displayLabel: string;

  @ApiProperty({ description: 'How this account affects net worth', enum: ['positive', 'negative', 'neutral'] })
  affectsNetWorth: 'positive' | 'negative' | 'neutral';

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Institution name', required: false })
  institutionName?: string;
}

/**
 * Financial summary with proper net worth calculation
 *
 * This DTO provides normalized financial totals that correctly handle:
 * - Credit card balances (amount owed as positive, subtracts from net worth)
 * - Loan/mortgage balances (amount owed as positive, subtracts from net worth)
 * - Checking/savings (positive = available, adds to net worth)
 * - Investment accounts (positive = available, adds to net worth)
 * - Overdrafts (negative asset = liability, subtracts from net worth)
 */
export class FinancialSummaryDto {
  @ApiProperty({ description: 'Total assets (checking + savings + investments)', example: 15000.00 })
  totalAssets: number;

  @ApiProperty({ description: 'Total liabilities (credit cards + loans + mortgages)', example: 5000.00 })
  totalLiabilities: number;

  @ApiProperty({ description: 'Net worth (assets - liabilities)', example: 10000.00 })
  netWorth: number;

  @ApiProperty({ description: 'Total available credit across all credit accounts (0 if no credit accounts)', example: 7500.00 })
  totalAvailableCredit: number;

  @ApiProperty({ description: 'Normalized balances for each account', type: [NormalizedAccountBalanceDto] })
  accounts: NormalizedAccountBalanceDto[];

  @ApiProperty({ description: 'Currency code for all amounts', example: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Timestamp when this summary was calculated' })
  calculatedAt: Date;
}
