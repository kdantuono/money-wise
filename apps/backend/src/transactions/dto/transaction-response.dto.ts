import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType, TransactionStatus, TransactionSource } from '../../../generated/prisma';

/**
 * Transaction Response DTO
 *
 * API response format for transaction data.
 * Includes computed fields and formatted data.
 *
 * @phase STORY-1.5.7 - Transaction REST API Implementation
 */
export class TransactionResponseDto {
  @ApiProperty({
    description: 'Transaction ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Account ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  accountId: string;

  @ApiPropertyOptional({
    description: 'Category ID',
    example: '660e8400-e29b-41d4-a716-446655440000',
  })
  categoryId?: string | null;

  @ApiProperty({
    description: 'Transaction amount (positive, absolute value)',
    example: 125.50,
  })
  amount: number;

  @ApiProperty({
    description: 'Display amount (negative for debits/expenses)',
    example: -125.50,
  })
  displayAmount: number;

  @ApiProperty({
    description: 'Transaction type',
    enum: TransactionType,
    example: TransactionType.DEBIT,
  })
  type: TransactionType;

  @ApiProperty({
    description: 'Transaction status',
    enum: TransactionStatus,
    example: TransactionStatus.POSTED,
  })
  status: TransactionStatus;

  @ApiProperty({
    description: 'Transaction source',
    enum: TransactionSource,
    example: TransactionSource.MANUAL,
  })
  source: TransactionSource;

  @ApiProperty({
    description: 'Transaction date',
    example: '2024-01-15',
  })
  date: Date;

  @ApiPropertyOptional({
    description: 'Authorized date/time',
    example: '2024-01-15T14:30:00Z',
  })
  authorizedDate?: Date | null;

  @ApiProperty({
    description: 'Transaction description',
    example: 'Groceries at Whole Foods',
  })
  description: string;

  @ApiPropertyOptional({
    description: 'Merchant name',
    example: 'Whole Foods Market',
  })
  merchantName?: string | null;

  @ApiPropertyOptional({
    description: 'Original description',
    example: 'WHOLEFDS #1234 CITY ST',
  })
  originalDescription?: string | null;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
  })
  currency: string;

  @ApiPropertyOptional({
    description: 'Reference number',
    example: 'REF-12345',
  })
  reference?: string | null;

  @ApiPropertyOptional({
    description: 'Check number',
    example: '1001',
  })
  checkNumber?: string | null;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Weekly grocery shopping',
  })
  notes?: string | null;

  @ApiProperty({
    description: 'Is pending transaction',
    example: false,
  })
  isPending: boolean;

  @ApiProperty({
    description: 'Is recurring transaction',
    example: false,
  })
  isRecurring: boolean;

  @ApiProperty({
    description: 'Is hidden from reports',
    example: false,
  })
  isHidden: boolean;

  @ApiProperty({
    description: 'Include in budget calculations',
    example: true,
  })
  includeInBudget: boolean;

  @ApiPropertyOptional({
    description: 'Plaid transaction ID',
    example: 'plaid_tx_123456',
  })
  plaidTransactionId?: string | null;

  @ApiPropertyOptional({
    description: 'Plaid account ID',
    example: 'plaid_acc_123456',
  })
  plaidAccountId?: string | null;

  @ApiPropertyOptional({
    description: 'Plaid metadata',
    example: { categoryId: '13005000' },
  })
  plaidMetadata?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: 'Location metadata',
    example: { address: '123 Main St' },
  })
  locationMetadata?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: 'Payment channel metadata',
    example: { channel: 'online' },
  })
  paymentChannelMetadata?: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:00:00Z',
  })
  updatedAt: Date;

  // Computed fields
  @ApiProperty({
    description: 'Is debit/expense transaction',
    example: true,
  })
  isDebit: boolean;

  @ApiProperty({
    description: 'Is credit/income transaction',
    example: false,
  })
  isCredit: boolean;

  @ApiProperty({
    description: 'Is from Plaid sync',
    example: false,
  })
  isPlaidTransaction: boolean;

  @ApiProperty({
    description: 'Is manual entry',
    example: true,
  })
  isManualTransaction: boolean;
}
