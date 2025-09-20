import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsDateString,
  IsNumber,
} from 'class-validator';

export class CreateLinkTokenDto {
  @ApiProperty({ description: 'User ID for link token creation' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Client name for link initialization',
    required: false,
  })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiProperty({ description: 'Language for link interface', required: false })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({
    description: 'Country codes for institutions',
    required: false,
  })
  @IsOptional()
  @IsArray()
  countryCodes?: string[];

  @ApiProperty({ description: 'Products to enable', required: false })
  @IsOptional()
  @IsArray()
  products?: string[];
}

export class ExchangeTokenDto {
  @ApiProperty({ description: 'Public token from Plaid Link' })
  @IsString()
  @IsNotEmpty()
  publicToken: string;

  @ApiProperty({ description: 'Metadata from Plaid Link' })
  @IsOptional()
  metadata?: any;
}

export class SyncTransactionsDto {
  @ApiProperty({ description: 'Plaid account ID to sync transactions for' })
  @IsString()
  @IsNotEmpty()
  plaidAccountId: string;

  @ApiProperty({
    description: 'Start date for transaction sync',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for transaction sync',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Number of transactions to fetch',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  count?: number;
}

export class PlaidWebhookDto {
  @ApiProperty({ description: 'Webhook type' })
  @IsString()
  @IsNotEmpty()
  webhookType: string;

  @ApiProperty({ description: 'Webhook code' })
  @IsString()
  @IsNotEmpty()
  webhookCode: string;

  @ApiProperty({ description: 'Item ID from webhook' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ description: 'Error information if present', required: false })
  @IsOptional()
  error?: any;

  @ApiProperty({ description: 'New transactions count', required: false })
  @IsOptional()
  @IsNumber()
  newTransactions?: number;

  @ApiProperty({ description: 'Removed transactions', required: false })
  @IsOptional()
  @IsArray()
  removedTransactions?: string[];
}

export class PlaidAccountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  plaidAccountId: string;

  @ApiProperty()
  institutionName: string;

  @ApiProperty()
  accountName: string;

  @ApiProperty()
  accountType: string;

  @ApiProperty()
  accountSubtype: string;

  @ApiProperty()
  currentBalance: number;

  @ApiProperty()
  availableBalance: number;

  @ApiProperty()
  currencyCode: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  lastSyncAt: Date;

  @ApiProperty()
  createdAt: Date;
}

export class PlaidTransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  plaidTransactionId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  description: string;

  @ApiProperty()
  merchantName: string;

  @ApiProperty()
  category: string[];

  @ApiProperty()
  transactionType: string;

  @ApiProperty()
  isPending: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class PlaidLinkResponseDto {
  @ApiProperty()
  linkToken: string;

  @ApiProperty()
  expiration: Date;

  @ApiProperty()
  requestId: string;
}
