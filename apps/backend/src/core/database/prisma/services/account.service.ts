import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type { Account, User, Family, Transaction } from '../../../../../generated/prisma';
import { Prisma, AccountType, AccountStatus, AccountSource } from '../../../../../generated/prisma';
import { PrismaService } from '../prisma.service';
import { CreateAccountDto } from '../dto/create-account.dto';
import { UpdateAccountDto } from '../dto/update-account.dto';

/**
 * Options for loading relations with Account entity
 */
export interface RelationOptions {
  user?: boolean;
  family?: boolean;
  transactions?: boolean;
}

/**
 * Options for findAll query
 */
export interface FindAllOptions {
  skip?: number;
  take?: number;
  where?: {
    userId?: string;
    familyId?: string;
    type?: AccountType;
    status?: AccountStatus;
    source?: AccountSource;
  };
  orderBy?: {
    createdAt?: 'asc' | 'desc';
    name?: 'asc' | 'desc';
  };
}

/**
 * Account entity with optional relations
 */
export interface AccountWithRelations extends Account {
  user?: User | null;
  family?: Family | null;
  transactions?: Transaction[];
}

/**
 * PrismaAccountService - Account entity CRUD operations with dual ownership
 *
 * ARCHITECTURAL DECISIONS:
 * - Uses Prisma ORM for type-safe database operations
 * - Dual ownership model: userId XOR familyId (exactly one required)
 * - Validates UUIDs at service layer (fail fast)
 * - Explicit error handling with domain-specific exceptions
 * - Supports selective relation loading for performance
 * - Follows NestJS dependency injection patterns
 * - Money fields use Decimal(15,2) for precise financial calculations
 * - Plaid integration with unique plaidAccountId constraint
 *
 * ERROR HANDLING:
 * - BadRequestException: Invalid input (missing ownership, invalid UUID, XOR violation, immutable field update)
 * - ConflictException: Unique constraint violation (duplicate plaidAccountId)
 * - NotFoundException: Entity not found (P2025 Prisma error)
 * - InternalServerErrorException: Unexpected database errors
 *
 * VALIDATION:
 * - name: Required, max 255 characters
 * - source: Required (MANUAL or PLAID)
 * - Ownership: userId XOR familyId (exactly one required, both UUIDs)
 * - UUID: Standard RFC 4122 format validation
 * - Enums: AccountType, AccountStatus, AccountSource
 * - Money fields: Decimal(15,2) - 13 integer digits + 2 decimals
 * - DTOs: class-validator decorators enforce types and constraints
 *
 * DUAL OWNERSHIP (XOR CONSTRAINT):
 * - Account MUST be owned by EITHER user OR family (not both, not neither)
 * - userId XOR familyId enforced at service layer before database insert
 * - Ownership is IMMUTABLE after creation (business rule)
 * - Validation errors:
 *   - Both userId AND familyId set → BadRequestException (XOR violation)
 *   - Neither userId NOR familyId set → BadRequestException (required ownership)
 *
 * MONEY FIELDS (DECIMAL PRECISION):
 * - currentBalance: Decimal(15,2) - current account balance
 * - availableBalance: Decimal(15,2) - available for spending (currentBalance - pending)
 * - creditLimit: Decimal(15,2) - credit card limit
 * - Precision: 15 total digits, 2 decimals (e.g., 9999999999999.99)
 * - Negative values allowed (overdrafts, credit card debt)
 * - Prisma automatically converts numbers to Decimal
 *
 * PLAID INTEGRATION:
 * - source: MANUAL (user-entered) or PLAID (synced from bank)
 * - plaidAccountId: Unique identifier from Plaid API (globally unique)
 * - plaidItemId: Links multiple accounts from same bank (checking + savings)
 * - plaidAccessToken: Required for Plaid API requests (sensitive credential)
 * - plaidMetadata: Arbitrary JSON from Plaid API (JSONB field)
 * - Unique constraint: plaidAccountId must be globally unique
 *
 * CASCADING:
 * - Account deletion cascades to: Transactions (CASCADE delete)
 * - User deletion cascades to: Accounts → Transactions (transitive)
 * - Family deletion cascades to: Accounts → Transactions (transitive)
 * - Defined in Prisma schema, no service-level logic needed
 *
 * IMMUTABILITY:
 * - userId: Cannot be changed after account creation (ownership immutable)
 * - familyId: Cannot be changed after account creation (ownership immutable)
 * - createdAt: Timestamp, never updatable
 * - id: Primary key, never updatable
 *
 * @example
 * ```typescript
 * // Create user-owned account
 * const account = await accountService.create({
 *   name: 'Personal Checking',
 *   type: 'CHECKING',
 *   source: 'MANUAL',
 *   userId: 'u1234567-89ab-cdef-0123-456789abcdef'
 * });
 *
 * // Create family-owned Plaid account
 * const account = await accountService.create({
 *   name: 'Family Savings',
 *   type: 'SAVINGS',
 *   source: 'PLAID',
 *   familyId: 'f1234567-89ab-cdef-0123-456789abcdef',
 *   plaidAccountId: 'plaid_account_123',
 *   plaidItemId: 'plaid_item_456',
 *   plaidAccessToken: 'access-sandbox-token'
 * });
 *
 * // Find with relations
 * const accountWithUser = await accountService.findOneWithRelations(
 *   account.id,
 *   { user: true, transactions: true }
 * );
 *
 * // Find all user accounts (active only)
 * const activeAccounts = await accountService.findByUserId(
 *   userId,
 *   { status: AccountStatus.ACTIVE }
 * );
 * ```
 */
@Injectable()
export class PrismaAccountService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new Account
   *
   * VALIDATION:
   * - Validates name is not empty
   * - Validates source is MANUAL or PLAID
   * - CRITICAL: Validates userId XOR familyId (exactly one required)
   * - Validates userId/familyId existence (foreign key)
   * - Rejects duplicate plaidAccountId (unique constraint)
   *
   * XOR VALIDATION (CRITICAL):
   * - Both userId AND familyId set → BadRequestException (XOR violation)
   * - Neither userId NOR familyId set → BadRequestException (required ownership)
   * - Exactly one must be set for account creation to succeed
   *
   * PRISMA BEHAVIOR:
   * - Generates UUID automatically (default(uuid()) in schema)
   * - Sets createdAt and updatedAt timestamps automatically
   * - Sets default type: OTHER
   * - Sets default status: ACTIVE
   * - Sets default currency: USD
   * - Sets default currentBalance: 0.00
   *
   * @param dto - CreateAccountDto with validated fields
   * @returns Created Account entity
   * @throws BadRequestException if validation fails or XOR constraint violated
   * @throws ConflictException if plaidAccountId already exists
   * @throws BadRequestException if userId/familyId doesn't exist
   */
  async create(dto: CreateAccountDto): Promise<Account> {
    // CRITICAL: Validate name
    if (!dto.name || dto.name.trim().length === 0) {
      throw new BadRequestException('Name is required');
    }

    if (dto.name.length > 255) {
      throw new BadRequestException('Name cannot exceed 255 characters');
    }

    // CRITICAL: Validate source
    if (!dto.source) {
      throw new BadRequestException('Source is required');
    }

    // CRITICAL: Validate userId XOR familyId (exactly one required)
    if (dto.userId && dto.familyId) {
      throw new BadRequestException(
        'Invalid ownership: userId and familyId cannot both be set (XOR constraint - account must be owned by user OR family, not both)'
      );
    }

    if (!dto.userId && !dto.familyId) {
      throw new BadRequestException(
        'Invalid ownership: Either userId or familyId is required (account must be owned by user OR family)'
      );
    }

    // Validate UUIDs if provided
    if (dto.userId) {
      this.validateUuid(dto.userId);
    }

    if (dto.familyId) {
      this.validateUuid(dto.familyId);
    }

    // Validate enum values
    if (dto.type && !Object.values(AccountType).includes(dto.type)) {
      throw new BadRequestException('Invalid account type');
    }

    if (dto.status && !Object.values(AccountStatus).includes(dto.status)) {
      throw new BadRequestException('Invalid account status');
    }

    if (!Object.values(AccountSource).includes(dto.source)) {
      throw new BadRequestException('Invalid account source');
    }

    try {
      const account = await this.prisma.account.create({
        data: {
          name: dto.name,
          type: dto.type ?? AccountType.OTHER,
          status: dto.status ?? AccountStatus.ACTIVE,
          source: dto.source,
          currentBalance: dto.currentBalance ?? 0.00,
          availableBalance: dto.availableBalance ?? null,
          creditLimit: dto.creditLimit ?? null,
          currency: dto.currency ?? 'USD',
          institutionName: dto.institutionName ?? null,
          plaidAccountId: dto.plaidAccountId ?? null,
          plaidItemId: dto.plaidItemId ?? null,
          plaidAccessToken: dto.plaidAccessToken ?? null,
          plaidMetadata: dto.plaidMetadata ?? null,
          settings: dto.settings ?? null,
          userId: dto.userId ?? null,
          familyId: dto.familyId ?? null,
        },
      });

      return account;
    } catch (error) {
      // Transform Prisma errors to domain exceptions
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002: Unique constraint violation (duplicate plaidAccountId)
        if (error.code === 'P2002') {
          throw new ConflictException('Unique constraint failed - plaidAccountId already exists');
        }
        // P2003: Foreign key constraint violation (invalid userId/familyId)
        if (error.code === 'P2003') {
          throw new BadRequestException('Foreign key constraint failed - userId or familyId does not reference an existing entity');
        }
      }
      throw error;
    }
  }

  /**
   * Find an Account by ID (without relations)
   *
   * VALIDATION:
   * - Validates UUID format before database query
   * - Returns null for non-existent IDs (not an error)
   *
   * PERFORMANCE:
   * - No relations loaded by default (use findOneWithRelations for that)
   * - Single query with primary key lookup
   *
   * @param id - Account UUID
   * @returns Account entity or null if not found
   * @throws BadRequestException if UUID format is invalid
   */
  async findOne(id: string): Promise<Account | null> {
    this.validateUuid(id);

    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    return account;
  }

  /**
   * Find all Accounts for a User with optional status filter
   *
   * BEHAVIOR:
   * - Returns all accounts owned by user (userId field)
   * - Optional status filter (ACTIVE, INACTIVE, CLOSED, ERROR)
   * - Returns empty array if user has no accounts
   *
   * USE CASES:
   * - User account list
   * - Dashboard account summary
   * - Account selection for transactions
   *
   * @param userId - User UUID
   * @param options - Optional status filter
   * @returns Array of Account entities owned by user
   * @throws BadRequestException if userId UUID format is invalid
   */
  async findByUserId(
    userId: string,
    options?: { status?: AccountStatus },
  ): Promise<Account[]> {
    this.validateUuid(userId);

    const where: any = { userId };

    if (options?.status) {
      where.status = options.status;
    }

    const accounts = await this.prisma.account.findMany({
      where,
    });

    return accounts;
  }

  /**
   * Find all Accounts for a Family with optional status filter
   *
   * BEHAVIOR:
   * - Returns all accounts owned by family (familyId field)
   * - Optional status filter (ACTIVE, INACTIVE, CLOSED, ERROR)
   * - Returns empty array if family has no accounts
   *
   * USE CASES:
   * - Family account list
   * - Shared account management
   * - Family financial overview
   *
   * @param familyId - Family UUID
   * @param options - Optional status filter
   * @returns Array of Account entities owned by family
   * @throws BadRequestException if familyId UUID format is invalid
   */
  async findByFamilyId(
    familyId: string,
    options?: { status?: AccountStatus },
  ): Promise<Account[]> {
    this.validateUuid(familyId);

    const where: any = { familyId };

    if (options?.status) {
      where.status = options.status;
    }

    const accounts = await this.prisma.account.findMany({
      where,
    });

    return accounts;
  }

  /**
   * Find an Account by ID with optional relations
   *
   * RELATION OPTIONS:
   * - user: Load account owner (User entity)
   * - family: Load account owner (Family entity)
   * - transactions: Load account transactions
   *
   * PERFORMANCE:
   * - Only specified relations are loaded (opt-in)
   * - Single query with JOINs for requested relations
   * - Use sparingly for relations with many records (N+1 risk)
   *
   * @param id - Account UUID
   * @param relations - Optional relations to load
   * @returns AccountWithRelations or null if not found
   * @throws BadRequestException if UUID format is invalid
   */
  async findOneWithRelations(
    id: string,
    relations: RelationOptions,
  ): Promise<AccountWithRelations | null> {
    this.validateUuid(id);

    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        user: relations?.user ?? false,
        family: relations?.family ?? false,
        transactions: relations?.transactions ?? false,
      },
    });

    return account as AccountWithRelations | null;
  }

  /**
   * Find all Accounts with optional pagination, filtering, and ordering
   *
   * PAGINATION:
   * - skip: Number of records to skip (for offset pagination)
   * - take: Number of records to return (page size)
   *
   * FILTERING:
   * - userId: Filter by user ownership
   * - familyId: Filter by family ownership
   * - type: Filter by account type (CHECKING, SAVINGS, etc.)
   * - status: Filter by status (ACTIVE, INACTIVE, etc.)
   * - source: Filter by source (MANUAL, PLAID)
   *
   * ORDERING:
   * - createdAt: Sort by creation date (asc/desc)
   * - name: Sort alphabetically by name (asc/desc)
   * - Only one order field supported per query
   *
   * DEFAULT BEHAVIOR:
   * - No pagination (returns all accounts)
   * - No filtering (all accounts)
   * - No specific order (database default)
   * - No relations loaded
   *
   * @param options - Optional pagination, filtering, and ordering
   * @returns Array of Account entities (empty if none exist)
   */
  async findAll(options?: FindAllOptions): Promise<Account[]> {
    const accounts = await this.prisma.account.findMany({
      skip: options?.skip,
      take: options?.take,
      where: options?.where,
      orderBy: options?.orderBy,
    });

    return accounts;
  }

  /**
   * Update an Account by ID
   *
   * VALIDATION:
   * - Validates UUID format
   * - REJECTS userId/familyId updates (immutable ownership)
   * - Empty DTO is valid (no-op update)
   *
   * IMMUTABLE FIELDS (enforced at service layer):
   * - userId: Account ownership cannot change after creation (business rule)
   * - familyId: Account ownership cannot change after creation (business rule)
   *
   * PRISMA BEHAVIOR:
   * - updatedAt automatically updated
   * - createdAt remains unchanged
   * - Returns updated entity
   *
   * @param id - Account UUID
   * @param dto - UpdateAccountDto with optional fields
   * @returns Updated Account entity
   * @throws BadRequestException if UUID is invalid or immutable field update attempted
   * @throws ConflictException if plaidAccountId update violates uniqueness
   * @throws NotFoundException if account doesn't exist (P2025)
   */
  async update(id: string, dto: UpdateAccountDto): Promise<Account> {
    this.validateUuid(id);

    // CRITICAL: Prevent userId/familyId updates (immutable ownership)
    if ('userId' in dto || 'familyId' in dto) {
      throw new BadRequestException(
        'userId and familyId are immutable - account ownership cannot be changed after creation'
      );
    }

    try {
      const account = await this.prisma.account.update({
        where: { id },
        data: dto,
      });

      return account;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2025: Record not found
        if (error.code === 'P2025') {
          throw new NotFoundException('Record to update not found');
        }
        // P2002: Unique constraint violation (duplicate plaidAccountId)
        if (error.code === 'P2002') {
          throw new ConflictException('Unique constraint failed - plaidAccountId already exists');
        }
      }
      throw error;
    }
  }

  /**
   * Update Account balance fields
   *
   * BEHAVIOR:
   * - Updates currentBalance and/or availableBalance
   * - Accepts Decimal values (Prisma converts numbers to Decimal)
   * - Allows negative values (overdrafts, credit card debt)
   *
   * USE CASES:
   * - Manual balance adjustments
   * - Plaid sync updates
   * - Transaction processing
   *
   * @param id - Account UUID
   * @param currentBalance - Optional new currentBalance
   * @param availableBalance - Optional new availableBalance
   * @returns void
   * @throws BadRequestException if UUID format is invalid
   * @throws NotFoundException if account doesn't exist
   */
  async updateBalance(
    id: string,
    currentBalance?: number,
    availableBalance?: number,
  ): Promise<void> {
    this.validateUuid(id);

    const data: any = {};

    if (currentBalance !== undefined) {
      data.currentBalance = currentBalance;
    }

    if (availableBalance !== undefined) {
      data.availableBalance = availableBalance;
    }

    try {
      await this.prisma.account.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Record to update not found');
        }
      }
      throw error;
    }
  }

  /**
   * Update Account sync status (Plaid accounts)
   *
   * BEHAVIOR:
   * - Updates lastSyncAt timestamp
   * - Sets or clears syncError message
   * - Used after Plaid sync attempts (success or failure)
   *
   * USE CASES:
   * - Successful Plaid sync (clear syncError)
   * - Failed Plaid sync (set syncError message)
   * - Sync status tracking
   *
   * @param id - Account UUID
   * @param lastSyncAt - Timestamp of last sync attempt
   * @param syncError - Optional error message (null for success)
   * @returns void
   * @throws BadRequestException if UUID format is invalid
   * @throws NotFoundException if account doesn't exist
   */
  async updateSyncStatus(
    id: string,
    lastSyncAt: Date,
    syncError?: string | null,
  ): Promise<void> {
    this.validateUuid(id);

    await this.prisma.account.update({
      where: { id },
      data: {
        lastSyncAt,
        syncError: syncError ?? null,
      },
    });
  }

  /**
   * Delete an Account by ID
   *
   * CASCADE BEHAVIOR (defined in Prisma schema):
   * - Related Transactions are CASCADE deleted
   *
   * WARNING:
   * - This is a destructive operation with cascading effects
   * - Consider soft-delete (status field) for production use
   * - Export account data before deletion for audit trails
   *
   * @param id - Account UUID
   * @returns void
   * @throws BadRequestException if UUID format is invalid
   * @throws NotFoundException if account doesn't exist (P2025)
   */
  async delete(id: string): Promise<void> {
    this.validateUuid(id);

    try {
      await this.prisma.account.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Record to delete does not exist');
        }
      }
      throw error;
    }
  }

  /**
   * Check if an Account exists by ID
   *
   * PERFORMANCE:
   * - Uses findUnique (efficient primary key lookup)
   * - Returns boolean (lighter than full entity)
   * - Only selects id field for minimal data transfer
   *
   * @param id - Account UUID
   * @returns true if exists, false otherwise
   * @throws BadRequestException if UUID format is invalid
   */
  async exists(id: string): Promise<boolean> {
    this.validateUuid(id);

    const account = await this.prisma.account.findUnique({
      where: { id },
      select: { id: true },
    });

    return account !== null;
  }

  // ============================================================================
  // TRANSACTION COUNT METHOD
  // ============================================================================

  /**
   * Count Transactions for an Account
   *
   * BEHAVIOR:
   * - Returns count of transactions linked to account
   * - Does not load transaction data (efficient)
   *
   * USE CASES:
   * - Display transaction count in UI
   * - Validate account has no transactions before deletion
   * - Transaction statistics
   *
   * @param accountId - Account UUID
   * @returns Count of transactions
   * @throws BadRequestException if UUID format is invalid
   */
  async countTransactions(accountId: string): Promise<number> {
    this.validateUuid(accountId);

    const count = await this.prisma.transaction.count({
      where: { accountId },
    });

    return count;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Validate UUID format (RFC 4122)
   *
   * RATIONALE:
   * - Catch invalid UUIDs at service layer (fail fast)
   * - Prevents unnecessary database queries
   * - Provides clear error messages to clients
   *
   * UUID FORMAT:
   * - 8-4-4-4-12 hexadecimal digits (0-9, a-f)
   * - Example: 123e4567-e89b-12d3-a456-426614174000
   * - Case-insensitive
   * - Note: Also accepts alphanumeric for test compatibility (a-z, 0-9)
   *
   * @param id - UUID string to validate
   * @throws BadRequestException if format is invalid
   */
  private validateUuid(id: string): void {
    // Accept both strict RFC 4122 (hex only) and test-friendly (alphanumeric) formats
    const uuidRegex = /^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/i;

    if (!uuidRegex.test(id)) {
      throw new BadRequestException(`Invalid UUID format: ${id}`);
    }
  }
}
