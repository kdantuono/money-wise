import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../core/database/entities/account.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountResponseDto, AccountSummaryDto } from './dto/account-response.dto';
import { UserRole } from '../core/database/entities/user.entity';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) {}

  async create(userId: string, createAccountDto: CreateAccountDto): Promise<AccountResponseDto> {
    const account = this.accountRepository.create({
      ...createAccountDto,
      userId,
      currency: createAccountDto.currency || 'USD',
      syncEnabled: createAccountDto.syncEnabled ?? true,
      isActive: true,
    });

    const savedAccount = await this.accountRepository.save(account);
    return this.toResponseDto(savedAccount);
  }

  async findAll(userId: string): Promise<AccountResponseDto[]> {
    const accounts = await this.accountRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return accounts.map(account => this.toResponseDto(account));
  }

  async findOne(id: string, userId: string, userRole: UserRole): Promise<AccountResponseDto> {
    const account = await this.accountRepository.findOne({
      where: { id },
      relations: ['transactions'],
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    // Authorization: users can only access their own accounts, admins can access any
    if (account.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only access your own accounts');
    }

    return this.toResponseDto(account);
  }

  async update(id: string, userId: string, userRole: UserRole, updateAccountDto: UpdateAccountDto): Promise<AccountResponseDto> {
    const account = await this.accountRepository.findOne({ where: { id } });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    // Authorization: users can only update their own accounts, admins can update any
    if (account.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own accounts');
    }

    Object.assign(account, updateAccountDto);
    const updatedAccount = await this.accountRepository.save(account);

    return this.toResponseDto(updatedAccount);
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const account = await this.accountRepository.findOne({ where: { id } });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    // Authorization: users can only delete their own accounts, admins can delete any
    if (account.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own accounts');
    }

    await this.accountRepository.remove(account);
  }

  async getBalance(id: string, userId: string, userRole: UserRole): Promise<{ currentBalance: number; availableBalance: number | null; currency: string }> {
    const account = await this.accountRepository.findOne({ where: { id } });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    // Authorization check
    if (account.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only access your own account balances');
    }

    return {
      currentBalance: account.currentBalance,
      availableBalance: account.availableBalance ?? null,
      currency: account.currency,
    };
  }

  async getSummary(userId: string): Promise<AccountSummaryDto> {
    const accounts = await this.accountRepository.find({
      where: { userId, isActive: true },
    });

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
    const activeAccounts = accounts.filter(acc => acc.status === 'active').length;
    const accountsNeedingSync = accounts.filter(acc => acc.needsSync).length;

    const byType: AccountSummaryDto['byType'] = {};
    accounts.forEach(account => {
      if (!byType[account.type]) {
        byType[account.type] = { count: 0, totalBalance: 0 };
      }
      byType[account.type].count++;
      byType[account.type].totalBalance += account.currentBalance;
    });

    return {
      totalAccounts: accounts.length,
      totalBalance,
      activeAccounts,
      accountsNeedingSync,
      byType,
    };
  }

  async syncAccount(id: string, userId: string, userRole: UserRole): Promise<AccountResponseDto> {
    const account = await this.accountRepository.findOne({ where: { id } });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    // Authorization check
    if (account.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only sync your own accounts');
    }

    if (!account.isPlaidAccount) {
      throw new ForbiddenException('Only Plaid accounts can be synced');
    }

    // TODO: Implement actual Plaid sync logic
    // For now, just update lastSyncAt
    account.lastSyncAt = new Date();
    account.syncError = null;

    const updatedAccount = await this.accountRepository.save(account);
    return this.toResponseDto(updatedAccount);
  }

  private toResponseDto(account: Account): AccountResponseDto {
    return {
      id: account.id,
      userId: account.userId,
      name: account.name,
      type: account.type,
      status: account.status,
      source: account.source,
      currentBalance: account.currentBalance,
      availableBalance: account.availableBalance,
      creditLimit: account.creditLimit,
      currency: account.currency,
      institutionName: account.institutionName,
      maskedAccountNumber: account.maskedAccountNumber,
      displayName: account.displayName,
      isPlaidAccount: account.isPlaidAccount,
      isManualAccount: account.isManualAccount,
      needsSync: account.needsSync,
      isActive: account.isActive,
      syncEnabled: account.syncEnabled,
      lastSyncAt: account.lastSyncAt,
      syncError: account.syncError,
      settings: account.settings,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}
