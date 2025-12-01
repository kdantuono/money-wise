import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDateString,
  IsUUID,
  IsBoolean,
  IsObject,
  Min,
  MaxLength,
} from 'class-validator';
import { TransactionType, TransactionStatus, TransactionSource } from '../../../generated/prisma';

/**
 * Create Transaction DTO
 *
 * Validates and transforms transaction creation data.
 *
 * Business Rules:
 * - Amount must be positive (architectural decision: store absolute values)
 * - Type (DEBIT/CREDIT) determines flow direction
 * - Date is required for financial reporting
 * - AccountId is required (transactions belong to accounts)
 *
 * @phase STORY-1.5.7 - Transaction REST API Implementation
 */
export class CreateTransactionDto {
  @ApiProperty({
    description: 'Account ID for this transaction',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  @IsNotEmpty()
  accountId: string;

  @ApiPropertyOptional({
    description: 'Category ID for categorization',
    example: '660e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  @IsOptional()
  categoryId?: string;

  @ApiProperty({
    description: 'Transaction amount (positive value, absolute)',
    example: 125.50,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Amount must be greater than 0' })
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'Transaction type (DEBIT = expense, CREDIT = income)',
    enum: TransactionType,
    example: TransactionType.DEBIT,
  })
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @ApiPropertyOptional({
    description: 'Transaction status',
    enum: TransactionStatus,
    default: TransactionStatus.POSTED,
    example: TransactionStatus.POSTED,
  })
  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @ApiProperty({
    description: 'Transaction source',
    enum: TransactionSource,
    example: TransactionSource.MANUAL,
  })
  @IsEnum(TransactionSource)
  @IsNotEmpty()
  source: TransactionSource;

  @ApiProperty({
    description: 'Transaction date (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({
    description: 'Authorized date/time (ISO 8601 for Plaid data)',
    example: '2024-01-15T14:30:00Z',
  })
  @IsDateString()
  @IsOptional()
  authorizedDate?: string;

  @ApiProperty({
    description: 'Transaction description',
    example: 'Groceries at Whole Foods',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Merchant name',
    example: 'Whole Foods Market',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  merchantName?: string;

  @ApiPropertyOptional({
    description: 'Original description (for Plaid transactions)',
    example: 'WHOLEFDS #1234 CITY ST',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  originalDescription?: string;

  @ApiPropertyOptional({
    description: 'Currency code (ISO 4217)',
    example: 'USD',
    default: 'USD',
  })
  @IsString()
  @MaxLength(3)
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Reference number',
    example: 'REF-12345',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional({
    description: 'Check number',
    example: '1001',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  checkNumber?: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Weekly grocery shopping',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Is pending transaction',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPending?: boolean;

  @ApiPropertyOptional({
    description: 'Is recurring transaction',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    description: 'Is hidden from reports',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isHidden?: boolean;

  @ApiPropertyOptional({
    description: 'Include in budget calculations',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  includeInBudget?: boolean;

  @ApiPropertyOptional({
    description: 'Plaid transaction ID',
    example: 'plaid_tx_123456',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  plaidTransactionId?: string;

  @ApiPropertyOptional({
    description: 'Plaid account ID',
    example: 'plaid_acc_123456',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  plaidAccountId?: string;

  @ApiPropertyOptional({
    description: 'Plaid metadata (JSONB)',
    example: { categoryId: '13005000', confidence: 'HIGH' },
  })
  @IsObject()
  @IsOptional()
  plaidMetadata?: Record<string, unknown>;
}
