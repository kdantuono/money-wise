import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Request DTO for completing banking link
 *
 * Called after user completes OAuth authorization to fetch and store linked accounts.
 *
 * @example
 * {
 *   "connectionId": "550e8400-e29b-41d4-a716-446655440000"
 * }
 */
export class CompleteLinkRequestDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Connection ID from initiate-link response',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID()
  connectionId: string;
}

/**
 * Banking Account from provider
 *
 * Represents a single account linked from a banking provider.
 */
export class BankingAccountDto {
  /**
   * Provider-specific account ID
   *
   * Unique identifier from the banking provider API.
   */
  id: string;

  /**
   * Account display name
   *
   * E.g., "Conto Corrente", "Savings Account"
   */
  name: string;

  /**
   * International Bank Account Number
   *
   * Standard IBAN format, e.g., "IT60X0542811101000000123456"
   */
  iban?: string;

  /**
   * Current account balance
   */
  balance: number;

  /**
   * Currency code
   *
   * ISO 4217 code, e.g., "EUR", "USD"
   */
  currency: string;

  /**
   * Bank/Institution name
   *
   * E.g., "Intesa Sanpaolo", "UniCredit"
   */
  bankName?: string;

  /**
   * Country code of the bank
   *
   * ISO 3166-1 alpha-2 code, e.g., "IT", "DE"
   */
  bankCountry?: string;

  /**
   * Account holder name
   *
   * Name registered with the bank for this account.
   */
  accountHolderName?: string;

  /**
   * Account type/nature
   *
   * E.g., "CHECKING", "SAVINGS", "CREDIT", "INVESTMENT"
   */
  type?: string;

  /**
   * Account status
   *
   * E.g., "active", "inactive", "closed"
   */
  status?: string;

  /**
   * Additional metadata from provider
   */
  metadata?: Record<string, any>;
}

/**
 * Response DTO for completing banking link
 *
 * Contains the list of accounts retrieved from the banking provider.
 * These accounts are automatically stored in the database.
 *
 * @example
 * {
 *   "accounts": [
 *     {
 *       "id": "acc-123",
 *       "name": "Conto Corrente",
 *       "iban": "IT60X0542811101000000123456",
 *       "balance": 5000.50,
 *       "currency": "EUR",
 *       "bankName": "Intesa Sanpaolo",
 *       "bankCountry": "IT",
 *       "accountHolderName": "Mario Rossi",
 *       "type": "CHECKING",
 *       "status": "active"
 *     }
 *   ]
 * }
 */
export class CompleteLinkResponseDto {
  /**
   * Array of linked accounts
   *
   * These accounts have been stored in the MoneyWise database and
   * are now ready for syncing and transaction retrieval.
   */
  accounts: BankingAccountDto[];
}
