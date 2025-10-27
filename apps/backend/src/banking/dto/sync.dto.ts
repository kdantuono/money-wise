import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for account sync
 *
 * Contains the result of a banking account synchronization operation.
 *
 * @example
 * {
 *   "syncLogId": "sync-456",
 *   "status": "SYNCED",
 *   "transactionsSynced": 42,
 *   "balanceUpdated": true,
 *   "error": null
 * }
 */
export class SyncResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Sync log ID for tracking',
    example: 'sync-456',
  })
  syncLogId: string;

  @ApiProperty({
    enum: ['PENDING', 'SYNCING', 'SYNCED', 'ERROR'],
    description: 'Current sync status',
    example: 'SYNCED',
  })
  status: string;

  @ApiProperty({
    description: 'Number of transactions synced',
    example: 42,
  })
  transactionsSynced: number;

  @ApiProperty({
    description: 'Whether account balance was updated',
    example: true,
  })
  balanceUpdated: boolean;

  @ApiProperty({
    description: 'Error message if sync failed',
    example: null,
    nullable: true,
  })
  error?: string | null;
}

/**
 * Linked account information
 *
 * Represents a banking account linked to the user.
 */
export class LinkedAccountDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Account ID',
  })
  id: string;

  @ApiProperty({
    description: 'Account name',
    example: 'Conto Corrente',
  })
  name: string;

  @ApiProperty({
    description: 'Bank/Institution name',
    example: 'Intesa Sanpaolo',
  })
  bankName?: string;

  @ApiProperty({
    description: 'Current balance',
    example: 5000.50,
  })
  balance: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'EUR',
  })
  currency: string;

  @ApiProperty({
    enum: ['PENDING', 'SYNCING', 'SYNCED', 'ERROR', 'DISCONNECTED'],
    description: 'Account sync status',
    example: 'SYNCED',
  })
  syncStatus: string;

  @ApiProperty({
    format: 'date-time',
    description: 'Last sync timestamp',
    example: '2025-10-25T12:30:00Z',
    nullable: true,
  })
  lastSynced?: string | null;

  @ApiProperty({
    format: 'date-time',
    description: 'When account was linked',
    example: '2025-10-24T10:15:00Z',
  })
  linkedAt: string;

  @ApiProperty({
    description: 'Account number (usually IBAN)',
    example: 'IT60X0542811101000000123456',
    nullable: true,
  })
  accountNumber?: string | null;

  @ApiProperty({
    description: 'Account type',
    example: 'CHECKING',
    nullable: true,
  })
  accountType?: string | null;

  @ApiProperty({
    description: 'Bank country code',
    example: 'IT',
    nullable: true,
  })
  bankCountry?: string | null;

  @ApiProperty({
    description: 'Account holder name',
    example: 'Mario Rossi',
    nullable: true,
  })
  accountHolderName?: string | null;
}

/**
 * Response DTO for getting linked accounts
 *
 * List of all banking accounts linked by the user.
 */
export class GetLinkedAccountsResponseDto {
  @ApiProperty({
    type: [LinkedAccountDto],
    description: 'Array of linked accounts',
  })
  accounts: LinkedAccountDto[];
}

/**
 * Available banking provider
 */
export class AvailableProviderDto {
  @ApiProperty({
    enum: ['SALTEDGE', 'TINK', 'YAPILY'],
    description: 'Provider identifier',
  })
  provider: string;

  @ApiProperty({
    description: 'Whether provider is currently enabled',
  })
  enabled: boolean;
}

/**
 * Response DTO for getting available providers
 */
export class GetProvidersResponseDto {
  @ApiProperty({
    type: [String],
    enum: ['SALTEDGE', 'TINK', 'YAPILY'],
    description: 'List of available providers',
  })
  providers: string[];

  @ApiProperty({
    description: 'Whether banking integration is enabled',
  })
  enabled: boolean;
}
