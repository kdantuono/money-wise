import {
  IsNotEmpty,
  IsEnum,
  IsUUID,
  IsOptional,
  MaxLength,
  IsNumber,
  IsJSON,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType, AccountStatus, AccountSource } from '../../../../../generated/prisma';

/**
 * CreateAccountDto - Data Transfer Object for Account creation
 *
 * VALIDATION RULES:
 * - name: Required, max 255 characters
 * - source: Required (MANUAL or PLAID)
 * - Ownership: userId XOR familyId (exactly one required, both UUIDs)
 * - type: Optional, defaults to OTHER
 * - status: Optional, defaults to ACTIVE
 * - currentBalance: Optional, defaults to 0.00 (Decimal)
 * - availableBalance: Optional (Decimal)
 * - creditLimit: Optional (Decimal for credit cards)
 * - currency: Optional, defaults to USD
 * - institutionName: Optional, max 255 characters
 * - Plaid fields: Optional (plaidAccountId, plaidItemId, plaidAccessToken, plaidMetadata)
 * - settings: Optional (JSONB)
 *
 * BUSINESS RULES:
 * - Account must be owned by EITHER user OR family (XOR constraint)
 * - Both userId and familyId set = ERROR
 * - Neither userId nor familyId set = ERROR
 * - Ownership is IMMUTABLE after creation
 *
 * MONEY FIELDS:
 * - All Decimal fields accept numbers (Prisma converts to Decimal with precision 15,2)
 * - Negative values allowed (overdrafts, credit card debt)
 * - Max value: 9999999999999.99 (13 integer digits + 2 decimals)
 *
 * PLAID INTEGRATION:
 * - source=PLAID requires plaidAccountId
 * - plaidAccountId must be globally unique
 * - plaidMetadata stores arbitrary JSON from Plaid API
 * - Multiple accounts can share same plaidItemId (e.g., checking + savings)
 *
 * @example
 * ```typescript
 * // User-owned manual account
 * const dto: CreateAccountDto = {
 *   name: 'Personal Checking',
 *   type: 'CHECKING',
 *   source: 'MANUAL',
 *   userId: 'u1234567-89ab-cdef-0123-456789abcdef',
 *   currentBalance: 1000.00
 * };
 *
 * // Family-owned Plaid account
 * const dto: CreateAccountDto = {
 *   name: 'Family Savings',
 *   type: 'SAVINGS',
 *   source: 'PLAID',
 *   familyId: 'f1234567-89ab-cdef-0123-456789abcdef',
 *   plaidAccountId: 'plaid_account_123',
 *   plaidItemId: 'plaid_item_456',
 *   plaidAccessToken: 'access-sandbox-token'
 * };
 * ```
 */
export class CreateAccountDto {
  /**
   * Account name
   * - REQUIRED field
   * - Max 255 characters
   * - User-defined label (e.g., "Personal Checking", "Emergency Fund")
   */
  @ApiProperty({
    description: 'Account name',
    example: 'Personal Checking',
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(255, { message: 'Name cannot exceed 255 characters' })
  name!: string;

  /**
   * Account source (MANUAL or PLAID)
   * - REQUIRED field
   * - MANUAL: User-entered data
   * - PLAID: Synced from bank via Plaid API
   */
  @ApiProperty({
    description: 'Account source (MANUAL or PLAID)',
    enum: AccountSource,
  })
  @IsNotEmpty({ message: 'Source is required' })
  @IsEnum(AccountSource, { message: 'Invalid account source' })
  source!: AccountSource;

  /**
   * User ID (UUID) - XOR with familyId
   * - OPTIONAL field (but userId XOR familyId REQUIRED)
   * - Must reference existing User entity
   * - IMMUTABLE after creation (ownership cannot change)
   * - Set userId for personal accounts
   * - Leave null for family accounts
   */
  @ApiPropertyOptional({
    description: 'User ID (UUID) - for personal accounts',
    example: 'u1234567-89ab-cdef-0123-456789abcdef',
  })
  @IsOptional()
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  userId?: string;

  /**
   * Family ID (UUID) - XOR with userId
   * - OPTIONAL field (but userId XOR familyId REQUIRED)
   * - Must reference existing Family entity
   * - IMMUTABLE after creation (ownership cannot change)
   * - Set familyId for shared family accounts
   * - Leave null for personal accounts
   */
  @ApiPropertyOptional({
    description: 'Family ID (UUID) - for family accounts',
    example: 'f1234567-89ab-cdef-0123-456789abcdef',
  })
  @IsOptional()
  @IsUUID('4', { message: 'familyId must be a valid UUID' })
  familyId?: string;

  /**
   * Account type
   * - OPTIONAL field (defaults to OTHER)
   * - CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT, LOAN, CASH, OTHER
   * - Used for categorization and reporting
   */
  @ApiPropertyOptional({
    description: 'Account type',
    enum: AccountType,
    default: AccountType.OTHER,
  })
  @IsOptional()
  @IsEnum(AccountType, { message: 'Invalid account type' })
  type?: AccountType;

  /**
   * Account status
   * - OPTIONAL field (defaults to ACTIVE)
   * - ACTIVE: Normal operation
   * - INACTIVE: Temporarily disabled
   * - CLOSED: Permanently closed
   * - ERROR: Sync error (Plaid accounts)
   */
  @ApiPropertyOptional({
    description: 'Account status',
    enum: AccountStatus,
    default: AccountStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(AccountStatus, { message: 'Invalid account status' })
  status?: AccountStatus;

  /**
   * Current balance (Decimal 15,2)
   * - OPTIONAL field (defaults to 0.00)
   * - Precision: 15 total digits, 2 decimals
   * - Negative values allowed (overdrafts, credit card debt)
   * - Range: -9999999999999.99 to 9999999999999.99
   */
  @ApiPropertyOptional({
    description: 'Current balance',
    example: 1000.00,
    default: 0.00,
  })
  @IsOptional()
  @IsNumber({}, { message: 'currentBalance must be a number' })
  currentBalance?: number;

  /**
   * Available balance (Decimal 15,2)
   * - OPTIONAL field
   * - Different from currentBalance for accounts with pending transactions
   * - For checking: currentBalance - pending debits
   * - For credit cards: creditLimit - currentBalance
   */
  @ApiPropertyOptional({
    description: 'Available balance',
    example: 950.00,
  })
  @IsOptional()
  @IsNumber({}, { message: 'availableBalance must be a number' })
  availableBalance?: number;

  /**
   * Credit limit (Decimal 15,2)
   * - OPTIONAL field
   * - Only relevant for credit card accounts
   * - Max credit available to user
   */
  @ApiPropertyOptional({
    description: 'Credit limit (for credit cards)',
    example: 5000.00,
  })
  @IsOptional()
  @IsNumber({}, { message: 'creditLimit must be a number' })
  creditLimit?: number;

  /**
   * Currency code
   * - OPTIONAL field (defaults to USD)
   * - ISO 4217 currency code (e.g., USD, EUR, GBP)
   * - Max 3 characters
   */
  @ApiPropertyOptional({
    description: 'Currency code (ISO 4217)',
    example: 'USD',
    default: 'USD',
    maxLength: 3,
  })
  @IsOptional()
  @MaxLength(3, { message: 'Currency code cannot exceed 3 characters' })
  currency?: string;

  /**
   * Institution name (bank name)
   * - OPTIONAL field
   * - Max 255 characters
   * - Displayed in UI (e.g., "Chase Bank", "Wells Fargo")
   */
  @ApiPropertyOptional({
    description: 'Institution name',
    example: 'Chase Bank',
    maxLength: 255,
  })
  @IsOptional()
  @MaxLength(255, { message: 'Institution name cannot exceed 255 characters' })
  institutionName?: string;

  /**
   * Plaid Account ID
   * - OPTIONAL field
   * - REQUIRED when source=PLAID
   * - Globally unique identifier from Plaid API
   * - Unique constraint enforced at database level
   */
  @ApiPropertyOptional({
    description: 'Plaid Account ID',
    example: 'plaid_account_123',
  })
  @IsOptional()
  plaidAccountId?: string;

  /**
   * Plaid Item ID
   * - OPTIONAL field
   * - Links multiple accounts from same bank (e.g., checking + savings)
   * - Multiple accounts can share same plaidItemId
   */
  @ApiPropertyOptional({
    description: 'Plaid Item ID',
    example: 'plaid_item_456',
  })
  @IsOptional()
  plaidItemId?: string;

  /**
   * Plaid Access Token
   * - OPTIONAL field
   * - Required for Plaid API requests
   * - Sensitive credential (encrypted at rest)
   * - Never exposed in API responses
   */
  @ApiPropertyOptional({
    description: 'Plaid Access Token (encrypted)',
    example: 'access-sandbox-token',
  })
  @IsOptional()
  plaidAccessToken?: string;

  /**
   * Plaid metadata (JSONB)
   * - OPTIONAL field
   * - Stores arbitrary JSON from Plaid API
   * - Example: { mask: "1234", subtype: "checking", officialName: "Chase Checking" }
   */
  @ApiPropertyOptional({
    description: 'Plaid metadata (JSONB)',
    example: { mask: '1234', subtype: 'checking' },
  })
  @IsOptional()
  @IsJSON({ message: 'plaidMetadata must be valid JSON' })
  plaidMetadata?: any;

  /**
   * Account settings (JSONB)
   * - OPTIONAL field
   * - User-defined settings
   * - Example: { autoSync: true, syncFrequency: "daily", budgetIncluded: true }
   */
  @ApiPropertyOptional({
    description: 'Account settings (JSONB)',
    example: { autoSync: true, syncFrequency: 'daily' },
  })
  @IsOptional()
  @IsJSON({ message: 'settings must be valid JSON' })
  settings?: any;
}
