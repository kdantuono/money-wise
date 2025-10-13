import { IsEnum, IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountType, AccountSource, AccountStatus } from '../../../generated/prisma';

export class CreateAccountDto {
  @ApiProperty({ description: 'Account name', example: 'Chase Checking' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Account type', enum: AccountType })
  @IsEnum(AccountType)
  type: AccountType;

  @ApiProperty({ description: 'Account status', enum: AccountStatus, required: false })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @ApiProperty({ description: 'Account source', enum: AccountSource })
  @IsEnum(AccountSource)
  source: AccountSource;

  @ApiProperty({ description: 'Initial balance', example: 1000.00 })
  @IsNumber()
  @Min(0)
  currentBalance: number;

  @ApiProperty({ description: 'Available balance', example: 950.00, required: false })
  @IsOptional()
  @IsNumber()
  availableBalance?: number;

  @ApiProperty({ description: 'Credit limit', example: 5000.00, required: false })
  @IsOptional()
  @IsNumber()
  creditLimit?: number;

  @ApiProperty({ description: 'Currency code', example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Institution name', example: 'Chase Bank', required: false })
  @IsOptional()
  @IsString()
  institutionName?: string;

  @ApiProperty({ description: 'Account number (last 4 digits)', example: '1234', required: false })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({ description: 'Routing number', required: false })
  @IsOptional()
  @IsString()
  routingNumber?: string;

  @ApiProperty({ description: 'Plaid account ID', required: false })
  @IsOptional()
  @IsString()
  plaidAccountId?: string;

  @ApiProperty({ description: 'Plaid item ID', required: false })
  @IsOptional()
  @IsString()
  plaidItemId?: string;

  @ApiProperty({ description: 'Plaid access token', required: false })
  @IsOptional()
  @IsString()
  plaidAccessToken?: string;

  @ApiProperty({ description: 'Plaid metadata', required: false })
  @IsOptional()
  plaidMetadata?: any;

  @ApiProperty({ description: 'Enable automatic sync', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  syncEnabled?: boolean;

  @ApiProperty({ description: 'Account settings', required: false })
  @IsOptional()
  settings?: {
    autoSync?: boolean;
    syncFrequency?: 'daily' | 'hourly' | 'manual';
    notifications?: boolean;
    budgetIncluded?: boolean;
  };
}
