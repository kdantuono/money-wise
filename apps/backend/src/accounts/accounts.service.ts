import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma/prisma.service';
import { BalanceNormalizerService } from '../core/finance/balance-normalizer.service';
import {
  Account as PrismaAccount,
  AccountSource,
  AccountStatus,
  UserRole,
  Prisma
} from '../../generated/prisma';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import {
  AccountResponseDto,
  AccountSummaryDto,
  FinancialSummaryDto,
  NormalizedAccountBalanceDto,
} from './dto/account-response.dto';
import {
  DeletionEligibilityResponseDto,
  LinkedTransferDto,
} from './dto/deletion-eligibility.dto';
import {
  RestoreEligibilityResponseDto,
  SiblingAccountDto,
} from './dto/restore-eligibility.dto';
import { AccountSettings } from '../core/database/types/metadata.types';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balanceNormalizer: BalanceNormalizerService,
  ) {}

  /**
   * Create a new account with XOR ownership constraint enforcement.
   * Exactly one of userId or familyId must be provided (XOR constraint).
   *
   * @param createAccountDto - Account creation data
   * @param userId - User ID for personal accounts (optional)
   * @param familyId - Family ID for family accounts (optional)
   * @returns Created account
   * @throws BadRequestException if XOR constraint is violated
   */
  async create(
    createAccountDto: CreateAccountDto,
    userId?: string,
    familyId?: string
  ): Promise<AccountResponseDto> {
    /**
     * XOR Constraint Validation (CRITICAL for data integrity)
     *
     * Design Decision: Application-level validation vs Database CHECK constraint
     *
     * WHY APPLICATION-LEVEL:
     * 1. Clear Error Messages: Returns descriptive BadRequestException with context
     *    - Database CHECK: Generic "constraint violation" error
     *    - Application: "Exactly one of userId or familyId must be provided"
     *
     * 2. Framework Integration: Leverages NestJS exception handling
     *    - Automatic HTTP status codes (400 Bad Request)
     *    - Consistent error response format across API
     *    - Exception filters and interceptors work seamlessly
     *
     * 3. Testing Simplicity: Easy to test with mocked Prisma client
     *    - No need for real database connection in unit tests
     *    - Fast feedback loop during development
     *
     * 4. Migration Flexibility: Can adjust logic without schema changes
     *    - Future: Might support organization-level accounts
     *    - Database constraint requires migration + downtime
     *
     * TRADEOFF ACKNOWLEDGED:
     * - Database constraint would prevent invalid data at DB level
     * - But: Prisma migrations already enforce NOT NULL on one field
     * - Integration tests validate constraint enforcement (39 tests passing)
     *
     * VALIDATION STRATEGY:
     * - Application layer: Business rule enforcement (this code)
     * - Database layer: Foreign key constraints (userId/familyId references)
     * - Test layer: Data integrity validation (data-integrity.spec.ts)
     */
    if ((!userId && !familyId) || (userId && familyId)) {
      throw new BadRequestException(
        'Exactly one of userId or familyId must be provided (XOR constraint)'
      );
    }

    const account = await this.prisma.account.create({
      data: {
        name: createAccountDto.name,
        type: createAccountDto.type,
        status: createAccountDto.status || AccountStatus.ACTIVE,
        source: createAccountDto.source,
        currentBalance: createAccountDto.currentBalance || new Prisma.Decimal(0),
        availableBalance: createAccountDto.availableBalance ? new Prisma.Decimal(createAccountDto.availableBalance) : null,
        creditLimit: createAccountDto.creditLimit ? new Prisma.Decimal(createAccountDto.creditLimit) : null,
        currency: createAccountDto.currency || 'USD',
        institutionName: createAccountDto.institutionName,
        accountNumber: createAccountDto.accountNumber,
        routingNumber: createAccountDto.routingNumber,
        plaidAccountId: createAccountDto.plaidAccountId,
        plaidItemId: createAccountDto.plaidItemId,
        plaidAccessToken: createAccountDto.plaidAccessToken,
        plaidMetadata: createAccountDto.plaidMetadata as Prisma.JsonValue,
        syncEnabled: createAccountDto.syncEnabled ?? true,
        settings: createAccountDto.settings as Prisma.JsonValue,
        isActive: true,

        // XOR ownership (exactly one set)
        userId: userId || null,
        familyId: familyId || null,
      },
    });

    return this.toResponseDto(account);
  }

  /**
   * Find all accounts for a user or family.
   * Exactly one of userId or familyId must be provided (XOR constraint).
   *
   * Note: Admin users follow the same rules as regular users on this endpoint.
   * Use specific account endpoints (findOne, update, etc.) for admin operations.
   *
   * @param userId - User ID for personal accounts (optional)
   * @param familyId - Family ID for family accounts (optional)
   * @param includeHidden - Include HIDDEN accounts in results (default: false)
   * @returns List of accounts
   * @throws BadRequestException if XOR constraint is violated
   */
  async findAll(
    userId?: string,
    familyId?: string,
    includeHidden: boolean = false
  ): Promise<AccountResponseDto[]> {
    // Filter out HIDDEN accounts by default
    const statusFilter = includeHidden
      ? {}
      : { status: { not: AccountStatus.HIDDEN } };

    // XOR constraint validation (applies to all users, including admins)
    if ((!userId && !familyId) || (userId && familyId)) {
      throw new BadRequestException(
        'Exactly one of userId or familyId must be provided (XOR constraint)'
      );
    }

    const accounts = await this.prisma.account.findMany({
      where: userId
        ? { userId, ...statusFilter }
        : { familyId, ...statusFilter },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map(account => this.toResponseDto(account));
  }

  /**
   * Find a single account by ID.
   * Checks both personal and family ownership authorization.
   *
   * @param id - Account ID
   * @param userId - User ID (for personal accounts)
   * @param familyId - Family ID (for family accounts)
   * @param userRole - User role (ADMIN can access any account)
   * @returns Account details
   * @throws NotFoundException if account doesn't exist
   * @throws ForbiddenException if access denied
   */
  async findOne(
    id: string,
    userId?: string,
    familyId?: string,
    userRole?: UserRole
  ): Promise<AccountResponseDto> {
    const account = await this.verifyAccountAccess(id, userId, familyId, userRole);
    return this.toResponseDto(account);
  }

  /**
   * Update an account.
   * Checks both personal and family ownership authorization.
   *
   * @param id - Account ID
   * @param updateAccountDto - Account update data
   * @param userId - User ID (for personal accounts)
   * @param familyId - Family ID (for family accounts)
   * @param userRole - User role (ADMIN can update any account)
   * @returns Updated account
   * @throws NotFoundException if account doesn't exist
   * @throws ForbiddenException if access denied
   */
  async update(
    id: string,
    updateAccountDto: UpdateAccountDto,
    userId?: string,
    familyId?: string,
    userRole?: UserRole
  ): Promise<AccountResponseDto> {
    await this.verifyAccountAccess(id, userId, familyId, userRole);

    // Convert number fields to Decimal if provided
    const data: Prisma.AccountUpdateInput = { ...updateAccountDto };
    if (updateAccountDto.currentBalance !== undefined) {
      data.currentBalance = new Prisma.Decimal(updateAccountDto.currentBalance);
    }
    if (updateAccountDto.availableBalance !== undefined) {
      data.availableBalance = new Prisma.Decimal(updateAccountDto.availableBalance);
    }
    if (updateAccountDto.creditLimit !== undefined) {
      data.creditLimit = new Prisma.Decimal(updateAccountDto.creditLimit);
    }
    if (updateAccountDto.settings !== undefined) {
      data.settings = updateAccountDto.settings as Prisma.JsonValue;
    }

    const updatedAccount = await this.prisma.account.update({
      where: { id },
      data,
    });

    return this.toResponseDto(updatedAccount);
  }

  /**
   * Delete an account.
   * Checks both personal and family ownership authorization.
   * Blocks deletion if account has linked transfers to other accounts.
   *
   * @param id - Account ID
   * @param userId - User ID (for personal accounts)
   * @param familyId - Family ID (for family accounts)
   * @param userRole - User role (ADMIN can delete any account)
   * @throws NotFoundException if account doesn't exist
   * @throws ForbiddenException if access denied
   * @throws BadRequestException if account has linked transfers
   */
  async remove(
    id: string,
    userId?: string,
    familyId?: string,
    userRole?: UserRole
  ): Promise<void> {
    await this.verifyAccountAccess(id, userId, familyId, userRole);

    // Check for linked transfers before deletion
    const linkedTransfers = await this.findLinkedTransfers(id);
    if (linkedTransfers.length > 0) {
      throw new BadRequestException({
        message: 'Cannot delete account with linked transfers',
        error: 'LINKED_TRANSFERS_EXIST',
        linkedTransferCount: linkedTransfers.length,
        suggestion: 'Hide the account instead or resolve the transfers first',
      });
    }

    await this.prisma.account.delete({
      where: { id },
    });
  }

  /**
   * Get account balance.
   * Checks both personal and family ownership authorization.
   *
   * @param id - Account ID
   * @param userId - User ID (for personal accounts)
   * @param familyId - Family ID (for family accounts)
   * @param userRole - User role (ADMIN can access any account)
   * @returns Account balance information
   * @throws NotFoundException if account doesn't exist
   * @throws ForbiddenException if access denied
   */
  async getBalance(
    id: string,
    userId?: string,
    familyId?: string,
    userRole?: UserRole
  ): Promise<{ currentBalance: number; availableBalance: number | null; currency: string }> {
    await this.verifyAccountAccess(id, userId, familyId, userRole);

    const account = await this.prisma.account.findUnique({
      where: { id },
      select: {
        currentBalance: true,
        availableBalance: true,
        currency: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return {
      currentBalance: account.currentBalance.toNumber(),
      availableBalance: account.availableBalance?.toNumber() ?? null,
      currency: account.currency,
    };
  }

  /**
   * Get account summary statistics.
   * Exactly one of userId or familyId must be provided (XOR constraint).
   *
   * Note: Admin users follow the same rules as regular users on this endpoint.
   * Use specific account endpoints for admin operations.
   *
   * @param userId - User ID for personal accounts (optional)
   * @param familyId - Family ID for family accounts (optional)
   * @returns Account summary statistics
   * @throws BadRequestException if XOR constraint is violated
   */
  async getSummary(
    userId?: string,
    familyId?: string
  ): Promise<AccountSummaryDto> {
    // XOR constraint validation (applies to all users, including admins)
    if ((!userId && !familyId) || (userId && familyId)) {
      throw new BadRequestException(
        'Exactly one of userId or familyId must be provided (XOR constraint)'
      );
    }

    const accounts = await this.prisma.account.findMany({
      where: userId
        ? { userId, isActive: true, status: { not: AccountStatus.HIDDEN } }
        : { familyId, isActive: true, status: { not: AccountStatus.HIDDEN } },
    });

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance.toNumber(), 0);
    const activeAccounts = accounts.filter(acc => acc.status === AccountStatus.ACTIVE).length;
    const accountsNeedingSync = accounts.filter(acc => this.computeNeedsSync(acc)).length;

    const byType: AccountSummaryDto['byType'] = {};
    accounts.forEach(account => {
      if (!byType[account.type]) {
        byType[account.type] = { count: 0, totalBalance: 0 };
      }
      byType[account.type].count++;
      byType[account.type].totalBalance += account.currentBalance.toNumber();
    });

    return {
      totalAccounts: accounts.length,
      totalBalance,
      activeAccounts,
      accountsNeedingSync,
      byType,
    };
  }

  /**
   * Get financial summary with normalized balances for accurate net worth calculation.
   *
   * This method provides a comprehensive financial overview with:
   * - Total assets (checking + savings + investments, excluding overdrafts)
   * - Total liabilities (credit cards + loans + mortgages + overdrafts)
   * - Net worth (assets - liabilities)
   * - Normalized balances for each account with proper display labels
   * - Available credit across all credit accounts
   *
   * Exactly one of userId or familyId must be provided (XOR constraint).
   *
   * Note: Admin users follow the same rules as regular users on this endpoint.
   * Use specific account endpoints for admin operations.
   *
   * @param userId - User ID for personal accounts (optional)
   * @param familyId - Family ID for family accounts (optional)
   * @returns Financial summary with normalized balances
   * @throws BadRequestException if XOR constraint is violated
   */
  async getFinancialSummary(
    userId?: string,
    familyId?: string
  ): Promise<FinancialSummaryDto> {
    // XOR constraint validation (applies to all users, including admins)
    if ((!userId && !familyId) || (userId && familyId)) {
      throw new BadRequestException(
        'Exactly one of userId or familyId must be provided (XOR constraint)'
      );
    }

    const accounts = await this.prisma.account.findMany({
      where: userId
        ? { userId, isActive: true, status: { not: AccountStatus.HIDDEN } }
        : { familyId, isActive: true, status: { not: AccountStatus.HIDDEN } },
    });

    // Calculate totals using BalanceNormalizerService
    const totals = this.balanceNormalizer.calculateTotals(accounts);

    // Normalize each account balance
    const normalizedAccounts: NormalizedAccountBalanceDto[] = accounts.map(account => {
      const normalized = this.balanceNormalizer.normalizeBalance(account);
      return {
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
        accountNature: normalized.accountNature,
        currentBalance: normalized.currentBalance.toNumber(),
        displayAmount: normalized.displayAmount.toNumber(),
        displayLabel: normalized.displayLabel,
        affectsNetWorth: normalized.affectsNetWorth,
        currency: account.currency,
        institutionName: account.institutionName ?? undefined,
      };
    });

    // Calculate total available credit across all credit accounts
    // Returns 0 when no credit accounts exist (for consistent API response)
    const creditAccounts = accounts.filter(acc => acc.creditLimit !== null);
    const totalAvailableCredit = creditAccounts.reduce((sum, acc) => {
      const availableCredit = this.balanceNormalizer.getAvailableCredit(acc);
      return sum + (availableCredit?.toNumber() ?? 0);
    }, 0);

    // Determine currency (use first account's currency, or default to USD)
    const currency = accounts.length > 0 ? accounts[0].currency : 'USD';

    return {
      totalAssets: totals.totalAssets.toNumber(),
      totalLiabilities: totals.totalLiabilities.toNumber(),
      netWorth: totals.netWorth.toNumber(),
      totalAvailableCredit,
      accounts: normalizedAccounts,
      currency,
      calculatedAt: new Date(),
    };
  }

  /**
   * Sync account with external source (Plaid).
   * Checks both personal and family ownership authorization.
   * Requires account to have PLAID source.
   *
   * @param id - Account ID
   * @param userId - User ID (for personal accounts)
   * @param familyId - Family ID (for family accounts)
   * @param userRole - User role (ADMIN can sync any account)
   * @returns Updated account
   * @throws NotFoundException if account doesn't exist
   * @throws ForbiddenException if access denied or account is not PLAID
   */
  async syncAccount(
    id: string,
    userId?: string,
    familyId?: string,
    userRole?: UserRole
  ): Promise<AccountResponseDto> {
    // Verify access AND require PLAID source
    await this.verifyAccountAccess(id, userId, familyId, userRole, AccountSource.PLAID);

    // TODO: Implement actual Plaid sync logic
    // For now, just update lastSyncAt
    const updatedAccount = await this.prisma.account.update({
      where: { id },
      data: {
        lastSyncAt: new Date(),
        syncError: null,
      },
    });

    return this.toResponseDto(updatedAccount);
  }

  /**
   * Verify account access authorization.
   * Checks both personal (userId) and family (familyId) ownership.
   *
   * @param accountId - Account ID to verify
   * @param userId - User ID (for personal accounts)
   * @param familyId - Family ID (for family accounts)
   * @param userRole - User role (ADMIN can access any account)
   * @param requiredSource - Optional: require specific account source (e.g., PLAID for sync)
   *
   * @returns Account if authorized
   * @throws NotFoundException if account doesn't exist
   * @throws ForbiddenException if access denied
   */
  private async verifyAccountAccess(
    accountId: string,
    userId?: string,
    familyId?: string,
    userRole?: UserRole,
    requiredSource?: AccountSource
  ): Promise<PrismaAccount> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found`);
    }

    // Authorization: Check BOTH personal AND family ownership
    const ownsPersonalAccount = account.userId && account.userId === userId;
    const ownsFamilyAccount = account.familyId && account.familyId === familyId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!ownsPersonalAccount && !ownsFamilyAccount && !isAdmin) {
      throw new ForbiddenException('Access denied to this account');
    }

    // Optional: Validate account source (for syncAccount)
    if (requiredSource && account.source !== requiredSource) {
      throw new ForbiddenException(
        `This operation requires a ${requiredSource} account`
      );
    }

    return account;
  }

  /**
   * Convert Prisma Account model to response DTO.
   * Handles Decimal to number conversion and derived fields.
   *
   * @param account - Prisma account model
   * @returns Account response DTO
   */
  private toResponseDto(account: PrismaAccount): AccountResponseDto {
    const isPlaidAccount = account.source === AccountSource.PLAID;
    const isManualAccount = account.source === AccountSource.MANUAL;
    // Account is syncable if it has a valid banking provider connection
    // This handles orphaned accounts where source is SALTEDGE but connection was deleted
    const isSyncable = this.computeIsSyncable(account);
    const needsSync = this.computeNeedsSync(account);
    const displayName = account.institutionName
      ? `${account.institutionName} - ${account.name}`
      : account.name;
    const maskedAccountNumber = account.accountNumber
      ? `****${account.accountNumber.slice(-4)}`
      : '';

    return {
      id: account.id,
      userId: account.userId,
      name: account.name,
      type: account.type,
      status: account.status,
      source: account.source,
      currentBalance: account.currentBalance.toNumber(),
      availableBalance: account.availableBalance?.toNumber() ?? null,
      creditLimit: account.creditLimit?.toNumber() ?? null,
      currency: account.currency,
      institutionName: account.institutionName,
      maskedAccountNumber,
      displayName,
      isPlaidAccount,
      isManualAccount,
      isSyncable,
      needsSync,
      isActive: account.isActive,
      syncEnabled: account.syncEnabled,
      lastSyncAt: account.lastSyncAt,
      syncError: account.syncError,
      saltEdgeConnectionId: account.saltEdgeConnectionId,
      settings: account.settings as AccountSettings,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  /**
   * Check if an account can be deleted or should be hidden.
   * Returns detailed eligibility information including blocking transfers.
   *
   * @param id - Account ID
   * @param userId - User ID (for personal accounts)
   * @param familyId - Family ID (for family accounts)
   * @param userRole - User role (ADMIN can access any account)
   * @returns Deletion eligibility response with blocker details
   * @throws NotFoundException if account doesn't exist
   * @throws ForbiddenException if access denied
   */
  async checkDeletionEligibility(
    id: string,
    userId?: string,
    familyId?: string,
    userRole?: UserRole
  ): Promise<DeletionEligibilityResponseDto> {
    const account = await this.verifyAccountAccess(id, userId, familyId, userRole);
    const linkedTransfers = await this.findLinkedTransfers(id);

    const canDelete = linkedTransfers.length === 0;
    const canHide = true; // Can always hide, regardless of transfers

    let blockReason: string | undefined;
    if (!canDelete) {
      blockReason = `Account has ${linkedTransfers.length} transfer${linkedTransfers.length > 1 ? 's' : ''} linked to other accounts`;
    }

    return {
      canDelete,
      canHide,
      currentStatus: account.status,
      blockReason,
      blockers: linkedTransfers,
      linkedTransferCount: linkedTransfers.length,
    };
  }

  /**
   * Hide an account (soft delete).
   * Sets status to HIDDEN, preserving all transactions and history.
   * Hidden accounts are excluded from active views but can be restored.
   *
   * @param id - Account ID
   * @param userId - User ID (for personal accounts)
   * @param familyId - Family ID (for family accounts)
   * @param userRole - User role (ADMIN can hide any account)
   * @returns Updated account with HIDDEN status
   * @throws NotFoundException if account doesn't exist
   * @throws ForbiddenException if access denied
   * @throws BadRequestException if account is already hidden
   */
  async hideAccount(
    id: string,
    userId?: string,
    familyId?: string,
    userRole?: UserRole
  ): Promise<AccountResponseDto> {
    const account = await this.verifyAccountAccess(id, userId, familyId, userRole);

    if (account.status === AccountStatus.HIDDEN) {
      throw new BadRequestException('Account is already hidden');
    }

    const updatedAccount = await this.prisma.account.update({
      where: { id },
      data: { status: AccountStatus.HIDDEN },
    });

    return this.toResponseDto(updatedAccount);
  }

  /**
   * Restore a hidden account.
   * Sets status back to ACTIVE, making it visible in account lists again.
   *
   * For banking accounts (SaltEdge/Plaid), this method checks if the connection
   * is still valid. If the connection is revoked/failed, it throws a ConflictException
   * requiring the user to re-link their bank account.
   *
   * @param id - Account ID
   * @param userId - User ID (for personal accounts)
   * @param familyId - Family ID (for family accounts)
   * @param userRole - User role (ADMIN can restore any account)
   * @returns Updated account with ACTIVE status
   * @throws NotFoundException if account doesn't exist
   * @throws ForbiddenException if access denied
   * @throws BadRequestException if account is not hidden
   * @throws ConflictException if banking connection is revoked (re-link required)
   */
  async restoreAccount(
    id: string,
    userId?: string,
    familyId?: string,
    userRole?: UserRole
  ): Promise<AccountResponseDto> {
    const account = await this.verifyAccountAccess(id, userId, familyId, userRole);

    if (account.status !== AccountStatus.HIDDEN) {
      throw new BadRequestException('Only hidden accounts can be restored');
    }

    // Check if this is a banking account that requires connection validation
    const isBankingAccount = !!(
      account.saltEdgeConnectionId ||
      account.source === AccountSource.SALTEDGE ||
      account.source === AccountSource.PLAID
    );

    if (isBankingAccount && account.saltEdgeConnectionId) {
      // Check the banking connection status
      const eligibility = await this.checkRestoreEligibility(id, userId, familyId, userRole);

      if (eligibility.requiresRelink) {
        throw new ConflictException({
          message: `Banking connection is ${eligibility.connectionStatus?.toLowerCase()}. Re-linking required to restore accounts.`,
          error: 'RELINK_REQUIRED',
          siblingAccountCount: eligibility.totalConnectionAccounts,
          providerName: eligibility.providerName,
          suggestion: `Click "Re-link Bank" to reconnect your bank and restore all ${eligibility.totalConnectionAccounts} accounts.`,
        });
      }
    }

    const updatedAccount = await this.prisma.account.update({
      where: { id },
      data: { status: AccountStatus.ACTIVE },
    });

    return this.toResponseDto(updatedAccount);
  }

  /**
   * Check if a hidden account can be restored.
   *
   * For manual accounts: Simple restore (status change only)
   * For banking accounts: Check connection status
   *   - If AUTHORIZED: Can restore normally
   *   - If REVOKED/FAILED: Requires re-linking
   *
   * Also identifies sibling accounts that share the same banking connection.
   *
   * @param id - Account ID
   * @param userId - User ID (for personal accounts)
   * @param familyId - Family ID (for family accounts)
   * @param userRole - User role (ADMIN can check any account)
   * @returns Restore eligibility details
   * @throws NotFoundException if account doesn't exist
   * @throws ForbiddenException if access denied
   * @throws BadRequestException if account is not hidden
   */
  async checkRestoreEligibility(
    id: string,
    userId?: string,
    familyId?: string,
    userRole?: UserRole
  ): Promise<RestoreEligibilityResponseDto> {
    const account = await this.verifyAccountAccess(id, userId, familyId, userRole);

    // Only hidden accounts need restore eligibility check
    if (account.status !== AccountStatus.HIDDEN) {
      throw new BadRequestException('Only hidden accounts can be checked for restore eligibility');
    }

    // Determine if this is a banking account
    const isBankingAccount = !!(
      account.saltEdgeConnectionId ||
      account.source === AccountSource.SALTEDGE ||
      account.source === AccountSource.PLAID
    );

    // For manual accounts, simple restore is always possible
    if (!isBankingAccount || !account.saltEdgeConnectionId) {
      return {
        canRestore: true,
        requiresRelink: false,
        currentStatus: account.status,
        source: account.source,
        isBankingAccount: false,
        totalConnectionAccounts: 1,
      };
    }

    // For banking accounts, check the connection status
    const connection = await this.prisma.bankingConnection.findFirst({
      where: {
        saltEdgeConnectionId: account.saltEdgeConnectionId,
      },
    });

    // Find sibling accounts on the same connection
    const allConnectionAccounts = await this.prisma.account.findMany({
      where: {
        saltEdgeConnectionId: account.saltEdgeConnectionId,
      },
    });

    // Build sibling accounts list (exclude current account)
    const siblingAccounts: SiblingAccountDto[] = allConnectionAccounts
      .filter(acc => acc.id !== id)
      .map(acc => ({
        id: acc.id,
        name: acc.name,
        status: acc.status,
        type: acc.type,
        currentBalance: acc.currentBalance.toNumber(),
        currency: acc.currency,
      }));

    const connectionStatus = connection?.status || 'UNKNOWN';
    const isConnectionActive = connectionStatus === 'AUTHORIZED' || connectionStatus === 'IN_PROGRESS';

    // Determine if re-linking is required
    const requiresRelink = !isConnectionActive;
    const canRestore = isConnectionActive;

    let relinkReason: string | undefined;
    if (requiresRelink) {
      relinkReason = `The banking connection was ${connectionStatus.toLowerCase()}. You need to re-link your bank to restore these accounts.`;
    }

    return {
      canRestore,
      requiresRelink,
      currentStatus: account.status,
      source: account.source,
      isBankingAccount: true,
      connectionStatus,
      relinkReason,
      siblingAccounts: siblingAccounts.length > 0 ? siblingAccounts : undefined,
      totalConnectionAccounts: allConnectionAccounts.length,
      providerName: connection?.providerName ?? account.institutionName ?? undefined,
    };
  }

  /**
   * Find transfers that link this account to other accounts.
   * Used to determine if an account can be safely deleted.
   *
   * A linked transfer is a transaction with:
   * - transferGroupId (not null) - indicates it's part of a transfer pair
   * - A corresponding transaction in another account with same transferGroupId
   *
   * @param accountId - Account ID to check
   * @returns Array of linked transfer details
   */
  private async findLinkedTransfers(accountId: string): Promise<LinkedTransferDto[]> {
    // Find all transactions in this account that are part of transfers
    const transferTransactions = await this.prisma.transaction.findMany({
      where: {
        accountId,
        transferGroupId: { not: null },
      },
      select: {
        id: true,
        transferGroupId: true,
        transferRole: true,
        amount: true,
        date: true,
        description: true,
      },
    });

    if (transferTransactions.length === 0) {
      return [];
    }

    // Get all transfer group IDs
    const transferGroupIds = transferTransactions
      .map(t => t.transferGroupId)
      .filter((id): id is string => id !== null);

    // Find the linked transactions (other side of each transfer)
    const linkedTransactions = await this.prisma.transaction.findMany({
      where: {
        transferGroupId: { in: transferGroupIds },
        accountId: { not: accountId }, // Other accounts only
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Map to LinkedTransferDto
    return transferTransactions
      .filter(t => {
        // Only include if there's a linked transaction in another account
        return linkedTransactions.some(lt => lt.transferGroupId === t.transferGroupId);
      })
      .map(t => {
        const linked = linkedTransactions.find(lt => lt.transferGroupId === t.transferGroupId);
        return {
          transactionId: t.id,
          transferGroupId: t.transferGroupId!,
          linkedAccountId: linked?.account.id ?? '',
          linkedAccountName: linked?.account.name ?? 'Unknown Account',
          amount: Math.abs(t.amount.toNumber()),
          date: t.date,
          description: t.description ?? '',
          transferRole: (t.transferRole as 'SOURCE' | 'DESTINATION') ?? 'SOURCE',
        };
      });
  }

  /**
   * Determines if a Plaid account needs synchronization based on business rules.
   *
   * **Business Rule**: Plaid accounts require sync if data is older than 1 hour
   *
   * Sync Requirements:
   * - Account must be PLAID source (not MANUAL)
   * - syncEnabled must be true
   * - lastSyncAt either null OR > 1 hour old
   *
   * **1-Hour Threshold Rationale**:
   * - Balance freshness: Financial data should be reasonably current
   * - API rate limits: Avoid excessive Plaid API calls
   * - User experience: Show sync indicator when data is stale
   * - Cost optimization: Plaid charges per API call
   *
   * @param account - Prisma Account model with sync metadata
   * @returns true if account needs sync, false otherwise
   *
   * @example
   * // Never synced - needs sync
   * account.lastSyncAt = null → returns true
   *
   * @example
   * // Synced 30 minutes ago - fresh
   * account.lastSyncAt = 30 minutes ago → returns false
   *
   * @example
   * // Synced 2 hours ago - stale
   * account.lastSyncAt = 2 hours ago → returns true
   *
   * @example
   * // Manual account - never needs sync
   * account.source = MANUAL → returns false
   */
  private computeNeedsSync(account: PrismaAccount): boolean {
    if (!account.syncEnabled || account.source !== AccountSource.PLAID) return false;
    if (!account.lastSyncAt) return true;

    const hoursSinceSync = (Date.now() - account.lastSyncAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync >= 1;
  }

  /**
   * Determines if an account can be synced with a banking provider.
   *
   * An account is syncable if:
   * - It has a non-MANUAL source (PLAID, SALTEDGE, TINK, YAPILY)
   * - It has a valid banking provider connection (e.g., saltEdgeConnectionId)
   * - Sync is enabled
   *
   * This handles "orphaned" accounts where the source is still SALTEDGE
   * but the connection has been revoked/deleted, preventing UI from
   * showing Sync buttons for accounts that can't actually sync.
   *
   * @param account - Prisma Account model
   * @returns true if account can be synced, false otherwise
   */
  private computeIsSyncable(account: PrismaAccount): boolean {
    // Manual accounts are never syncable
    if (account.source === AccountSource.MANUAL) {
      return false;
    }

    // Sync must be enabled
    if (!account.syncEnabled) {
      return false;
    }

    // For SaltEdge accounts, must have valid connection ID
    if (account.source === AccountSource.SALTEDGE) {
      return !!account.saltEdgeConnectionId && !!account.bankingProvider;
    }

    // For Plaid accounts, must have valid Plaid credentials
    if (account.source === AccountSource.PLAID) {
      return !!account.plaidAccessToken && !!account.plaidAccountId;
    }

    // For other sources (TINK, YAPILY), check for banking provider
    return !!account.bankingProvider;
  }
}
