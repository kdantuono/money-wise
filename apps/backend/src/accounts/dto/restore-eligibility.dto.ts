import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus, AccountSource } from '../../../generated/prisma';

/**
 * Represents a sibling account that shares the same banking connection.
 * Used when restoring requires all sibling accounts to be affected.
 */
export class SiblingAccountDto {
  @ApiProperty({
    description: 'ID of the sibling account',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the sibling account',
    example: 'Savings Account',
  })
  name: string;

  @ApiProperty({
    description: 'Current status of the sibling account',
    enum: AccountStatus,
    example: 'HIDDEN',
  })
  status: AccountStatus;

  @ApiProperty({
    description: 'Account type',
    example: 'SAVINGS',
  })
  type: string;

  @ApiProperty({
    description: 'Current balance',
    example: 1500.0,
  })
  currentBalance: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'EUR',
  })
  currency: string;
}

/**
 * Response for account restore eligibility check.
 * Determines if an account can be simply restored or requires re-linking.
 */
export class RestoreEligibilityResponseDto {
  @ApiProperty({
    description: 'Whether the account can be restored with a simple status change',
    example: true,
  })
  canRestore: boolean;

  @ApiProperty({
    description: 'Whether the account requires re-linking to restore banking access',
    example: false,
  })
  requiresRelink: boolean;

  @ApiProperty({
    description: 'Current status of the account',
    enum: AccountStatus,
    example: 'HIDDEN',
  })
  currentStatus: AccountStatus;

  @ApiProperty({
    description: 'Source of the account (MANUAL or SALTEDGE)',
    enum: AccountSource,
    example: 'SALTEDGE',
  })
  source: AccountSource;

  @ApiProperty({
    description: 'Whether this is a banking account (connected to provider)',
    example: true,
  })
  isBankingAccount: boolean;

  @ApiProperty({
    description: 'Banking connection status (if banking account)',
    example: 'REVOKED',
    required: false,
    enum: ['PENDING', 'IN_PROGRESS', 'AUTHORIZED', 'FAILED', 'REVOKED', 'EXPIRED'],
  })
  connectionStatus?: string;

  @ApiProperty({
    description: 'Human-readable reason why re-linking is required',
    example: 'The banking connection was revoked. You need to re-link your bank to restore these accounts.',
    required: false,
  })
  relinkReason?: string;

  @ApiProperty({
    description: 'List of sibling accounts that share the same banking connection',
    type: [SiblingAccountDto],
    required: false,
  })
  siblingAccounts?: SiblingAccountDto[];

  @ApiProperty({
    description: 'Total count of accounts on this connection (including this one)',
    example: 5,
  })
  totalConnectionAccounts: number;

  @ApiProperty({
    description: 'Banking provider name (if banking account)',
    example: 'Fake Bank Simple',
    required: false,
  })
  providerName?: string;
}

/**
 * Error response when restore requires re-linking.
 */
export class RestoreRequiresRelinkErrorDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 409,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Banking connection is revoked. Re-linking required to restore accounts.',
  })
  message: string;

  @ApiProperty({
    description: 'Error code',
    example: 'RELINK_REQUIRED',
  })
  error: string;

  @ApiProperty({
    description: 'Number of sibling accounts that will be restored',
    example: 5,
  })
  siblingAccountCount: number;

  @ApiProperty({
    description: 'Suggested action',
    example: 'Click "Re-link Bank" to reconnect your bank and restore all 5 accounts.',
  })
  suggestion: string;
}
