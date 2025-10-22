import {
  IsOptional,
  IsEnum,
  MaxLength,
  IsNumber,
  IsBoolean,
  IsJSON,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType, AccountStatus } from '../../../../../generated/prisma';

/**
 * UpdateAccountDto - Data Transfer Object for Account updates
 *
 * IMMUTABLE FIELDS (NOT in this DTO):
 * - userId: IMMUTABLE - account ownership cannot change after creation
 * - familyId: IMMUTABLE - account ownership cannot change after creation
 * - id: Primary key, never updatable
 * - createdAt: Timestamp, never updatable
 * - updatedAt: Auto-updated by Prisma
 *
 * UPDATABLE FIELDS:
 * - name: Can be changed (user-defined label)
 * - type: Can be changed (recategorization)
 * - status: Can be changed (account lifecycle)
 * - currentBalance: Can be changed (manual updates or syncs)
 * - availableBalance: Can be changed (pending transaction updates)
 * - creditLimit: Can be changed (credit limit changes)
 * - currency: Can be changed (currency conversions)
 * - institutionName: Can be changed (bank name updates)
 * - Plaid fields: Can be changed (re-linking, token refresh)
 * - Sync fields: Can be changed (sync status updates)
 * - settings: Can be changed (user preferences)
 *
 * BUSINESS RULES:
 * - userId/familyId updates are REJECTED (immutable ownership)
 * - Empty DTO is valid (no-op update)
 * - All fields are optional (partial updates supported)
 *
 * VALIDATION:
 * - All fields are optional
 * - Same validation rules as CreateAccountDto where applicable
 * - Ownership fields (userId/familyId) are explicitly excluded
 *
 * @example
 * ```typescript
 * // Update name and balance
 * const dto: UpdateAccountDto = {
 *   name: 'Updated Checking',
 *   currentBalance: 1500.00
 * };
 *
 * // Update status to closed
 * const dto: UpdateAccountDto = {
 *   status: 'CLOSED'
 * };
 *
 * // Update sync settings
 * const dto: UpdateAccountDto = {
 *   syncEnabled: false,
 *   lastSyncAt: new Date(),
 *   syncError: 'Plaid item login required'
 * };
 * ```
 */
export class UpdateAccountDto {
  /**
   * Account name
   * - OPTIONAL (partial update)
   * - Max 255 characters
   * - User-defined label (e.g., "Personal Checking", "Emergency Fund")
   */
  @ApiPropertyOptional({
    description: 'Account name',
    example: 'Updated Checking',
    maxLength: 255,
  })
  @IsOptional()
  @MaxLength(255, { message: 'Name cannot exceed 255 characters' })
  name?: string;

  /**
   * Account type
   * - OPTIONAL (partial update)
   * - CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT, LOAN, CASH, OTHER
   * - Used for categorization and reporting
   */
  @ApiPropertyOptional({
    description: 'Account type',
    enum: AccountType,
  })
  @IsOptional()
  @IsEnum(AccountType, { message: 'Invalid account type' })
  type?: AccountType;

  /**
   * Account status
   * - OPTIONAL (partial update)
   * - ACTIVE: Normal operation
   * - INACTIVE: Temporarily disabled
   * - CLOSED: Permanently closed
   * - ERROR: Sync error (Plaid accounts)
   */
  @ApiPropertyOptional({
    description: 'Account status',
    enum: AccountStatus,
  })
  @IsOptional()
  @IsEnum(AccountStatus, { message: 'Invalid account status' })
  status?: AccountStatus;

  /**
   * Current balance (Decimal 15,2)
   * - OPTIONAL (partial update)
   * - Precision: 15 total digits, 2 decimals
   * - Negative values allowed (overdrafts, credit card debt)
   * - Range: -9999999999999.99 to 9999999999999.99
   */
  @ApiPropertyOptional({
    description: 'Current balance',
    example: 1500.00,
  })
  @IsOptional()
  @IsNumber({}, { message: 'currentBalance must be a number' })
  currentBalance?: number;

  /**
   * Available balance (Decimal 15,2)
   * - OPTIONAL (partial update)
   * - Different from currentBalance for accounts with pending transactions
   */
  @ApiPropertyOptional({
    description: 'Available balance',
    example: 1400.00,
  })
  @IsOptional()
  @IsNumber({}, { message: 'availableBalance must be a number' })
  availableBalance?: number;

  /**
   * Credit limit (Decimal 15,2)
   * - OPTIONAL (partial update)
   * - Only relevant for credit card accounts
   */
  @ApiPropertyOptional({
    description: 'Credit limit',
    example: 5000.00,
  })
  @IsOptional()
  @IsNumber({}, { message: 'creditLimit must be a number' })
  creditLimit?: number;

  /**
   * Currency code
   * - OPTIONAL (partial update)
   * - ISO 4217 currency code (e.g., USD, EUR, GBP)
   * - Max 3 characters
   */
  @ApiPropertyOptional({
    description: 'Currency code (ISO 4217)',
    example: 'USD',
  })
  @IsOptional()
  @MaxLength(3, { message: 'Currency code cannot exceed 3 characters' })
  currency?: string;

  /**
   * Institution name (bank name)
   * - OPTIONAL (partial update)
   * - Max 255 characters
   */
  @ApiPropertyOptional({
    description: 'Institution name',
    example: 'Chase Bank',
  })
  @IsOptional()
  @MaxLength(255, { message: 'Institution name cannot exceed 255 characters' })
  institutionName?: string;

  /**
   * Plaid Account ID
   * - OPTIONAL (partial update)
   * - Globally unique identifier from Plaid API
   */
  @ApiPropertyOptional({
    description: 'Plaid Account ID',
    example: 'plaid_account_123',
  })
  @IsOptional()
  plaidAccountId?: string;

  /**
   * Plaid Item ID
   * - OPTIONAL (partial update)
   * - Links multiple accounts from same bank
   */
  @ApiPropertyOptional({
    description: 'Plaid Item ID',
    example: 'plaid_item_456',
  })
  @IsOptional()
  plaidItemId?: string;

  /**
   * Plaid Access Token
   * - OPTIONAL (partial update)
   * - Required for Plaid API requests
   * - Sensitive credential (encrypted at rest)
   */
  @ApiPropertyOptional({
    description: 'Plaid Access Token (encrypted)',
    example: 'access-sandbox-token',
  })
  @IsOptional()
  plaidAccessToken?: string;

  /**
   * Plaid metadata (JSONB)
   * - OPTIONAL (partial update)
   * - Stores arbitrary JSON from Plaid API
   */
  @ApiPropertyOptional({
    description: 'Plaid metadata (JSONB)',
    example: { mask: '1234', subtype: 'checking' },
  })
  @IsOptional()
  @IsJSON({ message: 'plaidMetadata must be valid JSON' })
  plaidMetadata?: any;

  /**
   * Account active flag
   * - OPTIONAL (partial update)
   * - Quick enable/disable without changing status
   */
  @ApiPropertyOptional({
    description: 'Account active flag',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;

  /**
   * Sync enabled flag
   * - OPTIONAL (partial update)
   * - Enable/disable automatic syncing for Plaid accounts
   */
  @ApiPropertyOptional({
    description: 'Enable/disable automatic syncing',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'syncEnabled must be a boolean' })
  syncEnabled?: boolean;

  /**
   * Last sync timestamp
   * - OPTIONAL (partial update)
   * - Updated after successful Plaid sync
   */
  @ApiPropertyOptional({
    description: 'Last sync timestamp',
    example: '2024-01-15T10:00:00Z',
  })
  @IsOptional()
  @IsDate({ message: 'lastSyncAt must be a valid date' })
  @Type(() => Date)
  lastSyncAt?: Date;

  /**
   * Sync error message
   * - OPTIONAL (partial update)
   * - Set when Plaid sync fails (e.g., "Item login required")
   * - Cleared on successful sync (set to null)
   */
  @ApiPropertyOptional({
    description: 'Sync error message',
    example: 'Item login required',
  })
  @IsOptional()
  syncError?: string | null;

  /**
   * Account settings (JSONB)
   * - OPTIONAL (partial update)
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

  /**
   * Account number
   * - OPTIONAL (partial update)
   * - Last 4 digits or masked number (e.g., "****1234")
   * - Sensitive field (encrypted at rest)
   */
  @ApiPropertyOptional({
    description: 'Account number (masked)',
    example: '****1234',
  })
  @IsOptional()
  accountNumber?: string | null;

  /**
   * Routing number
   * - OPTIONAL (partial update)
   * - Bank routing number (US only)
   * - Sensitive field (encrypted at rest)
   */
  @ApiPropertyOptional({
    description: 'Routing number',
    example: '021000021',
  })
  @IsOptional()
  routingNumber?: string | null;
}
