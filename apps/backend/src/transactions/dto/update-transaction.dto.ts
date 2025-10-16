import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
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
 * Update Transaction DTO
 *
 * Partial update support (PATCH semantics).
 * All fields are optional - only provided fields will be updated.
 *
 * Business Rules:
 * - Amount validation only applies if provided
 * - Cannot change accountId (transactions are immutable per account)
 * - Cannot change plaidTransactionId (Plaid reference is immutable)
 *
 * @phase STORY-1.5.7 - Transaction REST API Implementation
 */
export class UpdateTransactionDto {
  @ApiPropertyOptional({
    description: 'Category ID for categorization',
    example: '660e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Transaction amount (positive value, absolute)',
    example: 125.50,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Amount must be greater than 0' })
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Transaction type (DEBIT = expense, CREDIT = income)',
    enum: TransactionType,
    example: TransactionType.DEBIT,
  })
  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @ApiPropertyOptional({
    description: 'Transaction status',
    enum: TransactionStatus,
    example: TransactionStatus.POSTED,
  })
  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @ApiPropertyOptional({
    description: 'Transaction source',
    enum: TransactionSource,
    example: TransactionSource.MANUAL,
  })
  @IsEnum(TransactionSource)
  @IsOptional()
  source?: TransactionSource;

  @ApiPropertyOptional({
    description: 'Transaction date (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({
    description: 'Authorized date/time (ISO 8601)',
    example: '2024-01-15T14:30:00Z',
  })
  @IsDateString()
  @IsOptional()
  authorizedDate?: string;

  @ApiPropertyOptional({
    description: 'Transaction description',
    example: 'Groceries at Whole Foods',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

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
    description: 'Original description',
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
  })
  @IsBoolean()
  @IsOptional()
  isPending?: boolean;

  @ApiPropertyOptional({
    description: 'Is recurring transaction',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    description: 'Is hidden from reports',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isHidden?: boolean;

  @ApiPropertyOptional({
    description: 'Include in budget calculations',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  includeInBudget?: boolean;

  @ApiPropertyOptional({
    description: 'Plaid metadata (JSONB)',
    example: { categoryId: '13005000', confidence: 'HIGH' },
  })
  @IsObject()
  @IsOptional()
  plaidMetadata?: Record<string, any>;
}
