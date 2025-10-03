import { ApiProperty } from '@nestjs/swagger';
import { AccountType, AccountStatus, AccountSource } from '../../core/database/entities/account.entity';

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

  @ApiProperty({ description: 'Account settings', required: false })
  settings?: {
    autoSync?: boolean;
    syncFrequency?: 'daily' | 'hourly' | 'manual';
    notifications?: boolean;
    budgetIncluded?: boolean;
  };

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
