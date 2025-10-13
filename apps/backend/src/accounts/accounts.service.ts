import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma/prisma.service';
import {
  Account as PrismaAccount,
  AccountSource,
  AccountStatus,
  AccountType,
  UserRole,
  Prisma
} from '../../generated/prisma';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountResponseDto, AccountSummaryDto } from './dto/account-response.dto';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
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
    // XOR constraint validation (CRITICAL for data integrity)
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
   * @param userId - User ID for personal accounts (optional)
   * @param familyId - Family ID for family accounts (optional)
   * @returns List of accounts
   * @throws BadRequestException if XOR constraint is violated
   */
  async findAll(
    userId?: string,
    familyId?: string
  ): Promise<AccountResponseDto[]> {
    // XOR constraint validation
    if ((!userId && !familyId) || (userId && familyId)) {
      throw new BadRequestException(
        'Exactly one of userId or familyId must be provided (XOR constraint)'
      );
    }

    const accounts = await this.prisma.account.findMany({
      where: userId ? { userId } : { familyId },
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
    const data: any = { ...updateAccountDto };
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
   *
   * @param id - Account ID
   * @param userId - User ID (for personal accounts)
   * @param familyId - Family ID (for family accounts)
   * @param userRole - User role (ADMIN can delete any account)
   * @throws NotFoundException if account doesn't exist
   * @throws ForbiddenException if access denied
   */
  async remove(
    id: string,
    userId?: string,
    familyId?: string,
    userRole?: UserRole
  ): Promise<void> {
    await this.verifyAccountAccess(id, userId, familyId, userRole);

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

    return {
      currentBalance: account!.currentBalance.toNumber(),
      availableBalance: account!.availableBalance?.toNumber() ?? null,
      currency: account!.currency,
    };
  }

  /**
   * Get account summary statistics.
   * Exactly one of userId or familyId must be provided (XOR constraint).
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
    // XOR constraint validation
    if ((!userId && !familyId) || (userId && familyId)) {
      throw new BadRequestException(
        'Exactly one of userId or familyId must be provided (XOR constraint)'
      );
    }

    const accounts = await this.prisma.account.findMany({
      where: userId ? { userId, isActive: true } : { familyId, isActive: true },
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
      needsSync,
      isActive: account.isActive,
      syncEnabled: account.syncEnabled,
      lastSyncAt: account.lastSyncAt,
      syncError: account.syncError,
      settings: account.settings,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  private computeNeedsSync(account: PrismaAccount): boolean {
    if (!account.syncEnabled || account.source !== AccountSource.PLAID) return false;
    if (!account.lastSyncAt) return true;

    const hoursSinceSync = (Date.now() - account.lastSyncAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync >= 1;
  }
}
