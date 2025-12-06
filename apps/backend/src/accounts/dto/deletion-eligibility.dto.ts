import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from '../../../generated/prisma';

/**
 * Represents a transfer transaction that links to another account.
 * Used to identify blocking transfers when checking deletion eligibility.
 */
export class LinkedTransferDto {
  @ApiProperty({
    description: 'ID of the transaction in this account',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  transactionId: string;

  @ApiProperty({
    description: 'Transfer group ID linking both sides of the transfer',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  transferGroupId: string;

  @ApiProperty({
    description: 'ID of the linked account on the other side of the transfer',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  linkedAccountId: string;

  @ApiProperty({
    description: 'Name of the linked account',
    example: 'Savings Account',
  })
  linkedAccountName: string;

  @ApiProperty({
    description: 'Transfer amount (absolute value)',
    example: 500.0,
  })
  amount: number;

  @ApiProperty({
    description: 'Date of the transfer',
    example: '2025-11-15T00:00:00Z',
  })
  date: Date;

  @ApiProperty({
    description: 'Transfer description',
    example: 'Monthly savings transfer',
  })
  description: string;

  @ApiProperty({
    description: 'Role of this account in the transfer',
    enum: ['SOURCE', 'DESTINATION'],
    example: 'SOURCE',
  })
  transferRole: 'SOURCE' | 'DESTINATION';
}

/**
 * Response for account deletion eligibility check.
 * Determines if an account can be deleted or hidden.
 */
export class DeletionEligibilityResponseDto {
  @ApiProperty({
    description: 'Whether the account can be permanently deleted',
    example: false,
  })
  canDelete: boolean;

  @ApiProperty({
    description: 'Whether the account can be hidden (soft deleted)',
    example: true,
  })
  canHide: boolean;

  @ApiProperty({
    description: 'Current status of the account',
    enum: AccountStatus,
    example: 'ACTIVE',
  })
  currentStatus: AccountStatus;

  @ApiProperty({
    description: 'Human-readable reason if deletion is blocked',
    example: 'Account has 3 transfers linked to other accounts',
    required: false,
  })
  blockReason?: string;

  @ApiProperty({
    description: 'List of transfers blocking deletion',
    type: [LinkedTransferDto],
    required: false,
  })
  blockers: LinkedTransferDto[];

  @ApiProperty({
    description: 'Total count of linked transfers',
    example: 3,
  })
  linkedTransferCount: number;
}

/**
 * Error response when deletion is blocked due to linked transfers.
 */
export class DeletionBlockedErrorDto {
  @ApiProperty({
    description: 'Error message',
    example: 'Cannot delete account with linked transfers',
  })
  message: string;

  @ApiProperty({
    description: 'Error code',
    example: 'LINKED_TRANSFERS_EXIST',
  })
  error: string;

  @ApiProperty({
    description: 'Number of linked transfers blocking deletion',
    example: 3,
  })
  linkedTransferCount: number;

  @ApiProperty({
    description: 'Suggested action',
    example: 'Hide the account instead or resolve the transfers first',
  })
  suggestion: string;
}
