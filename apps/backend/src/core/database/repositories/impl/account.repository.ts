import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Account, AccountType, AccountStatus, AccountSource } from '../../entities';
import { IAccountRepository } from '../interfaces/account-repository.interface';
import { BaseRepository } from './base.repository';

/**
 * Account repository implementation extending base repository with account-specific operations
 */
@Injectable()
export class AccountRepository extends BaseRepository<Account> implements IAccountRepository {
  constructor(dataSource: DataSource) {
    super(dataSource, Account, 'AccountRepository');
  }

  async findByUserId(userId: string, includeInactive = false): Promise<Account[]> {
    try {
      this.logger.debug(`Finding accounts for user: ${userId} (includeInactive: ${includeInactive})`);

      const queryBuilder = this.createQueryBuilder('account')
        .where('account.userId = :userId', { userId })
        .orderBy('account.name', 'ASC');

      if (!includeInactive) {
        queryBuilder.andWhere('account.status != :closedStatus', { closedStatus: AccountStatus.CLOSED });
      }

      const accounts = await queryBuilder.getMany();

      this.logger.debug(`Found ${accounts.length} accounts for user ${userId}`);
      return accounts;
    } catch (error) {
      this.logger.error(`Error finding accounts for user ${userId}:`, error);
      throw new Error(`Failed to find accounts for user: ${error.message}`);
    }
  }

  async findByPlaidAccountId(plaidAccountId: string): Promise<Account | null> {
    try {
      this.logger.debug(`Finding account by Plaid account ID: ${plaidAccountId}`);

      const account = await this.repository.findOne({
        where: { plaidAccountId },
      });

      this.logger.debug(`Found account by Plaid ID ${plaidAccountId}: ${account ? 'success' : 'not found'}`);
      return account;
    } catch (error) {
      this.logger.error(`Error finding account by Plaid ID ${plaidAccountId}:`, error);
      throw new Error(`Failed to find account by Plaid ID: ${error.message}`);
    }
  }

  async findByType(type: AccountType, userId?: string): Promise<Account[]> {
    try {
      this.logger.debug(`Finding accounts by type: ${type} (user: ${userId})`);

      const queryBuilder = this.createQueryBuilder('account')
        .where('account.type = :type', { type })
        .orderBy('account.name', 'ASC');

      if (userId) {
        queryBuilder.andWhere('account.userId = :userId', { userId });
      }

      const accounts = await queryBuilder.getMany();

      this.logger.debug(`Found ${accounts.length} accounts with type ${type}`);
      return accounts;
    } catch (error) {
      this.logger.error(`Error finding accounts by type ${type}:`, error);
      throw new Error(`Failed to find accounts by type: ${error.message}`);
    }
  }

  async findByStatus(status: AccountStatus, userId?: string): Promise<Account[]> {
    try {
      this.logger.debug(`Finding accounts by status: ${status} (user: ${userId})`);

      const queryBuilder = this.createQueryBuilder('account')
        .where('account.status = :status', { status })
        .orderBy('account.name', 'ASC');

      if (userId) {
        queryBuilder.andWhere('account.userId = :userId', { userId });
      }

      const accounts = await queryBuilder.getMany();

      this.logger.debug(`Found ${accounts.length} accounts with status ${status}`);
      return accounts;
    } catch (error) {
      this.logger.error(`Error finding accounts by status ${status}:`, error);
      throw new Error(`Failed to find accounts by status: ${error.message}`);
    }
  }

  async findBySource(source: AccountSource, userId?: string): Promise<Account[]> {
    try {
      this.logger.debug(`Finding accounts by source: ${source} (user: ${userId})`);

      const queryBuilder = this.createQueryBuilder('account')
        .where('account.source = :source', { source })
        .orderBy('account.name', 'ASC');

      if (userId) {
        queryBuilder.andWhere('account.userId = :userId', { userId });
      }

      const accounts = await queryBuilder.getMany();

      this.logger.debug(`Found ${accounts.length} accounts with source ${source}`);
      return accounts;
    } catch (error) {
      this.logger.error(`Error finding accounts by source ${source}:`, error);
      throw new Error(`Failed to find accounts by source: ${error.message}`);
    }
  }

  async findAccountsNeedingSync(hoursThreshold = 1): Promise<Account[]> {
    try {
      this.logger.debug(`Finding accounts needing sync (threshold: ${hoursThreshold} hours)`);

      const cutoffTime = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

      const accounts = await this.createQueryBuilder('account')
        .where('account.source = :plaidSource', { plaidSource: AccountSource.PLAID })
        .andWhere('account.syncEnabled = true')
        .andWhere('account.status = :activeStatus', { activeStatus: AccountStatus.ACTIVE })
        .andWhere(
          '(account.lastSyncAt IS NULL OR account.lastSyncAt <= :cutoffTime)',
          { cutoffTime }
        )
        .orderBy('account.lastSyncAt', 'ASC')
        .getMany();

      this.logger.debug(`Found ${accounts.length} accounts needing sync`);
      return accounts;
    } catch (error) {
      this.logger.error(`Error finding accounts needing sync:`, error);
      throw new Error(`Failed to find accounts needing sync: ${error.message}`);
    }
  }

  async updateBalance(accountId: string, currentBalance: number, availableBalance?: number): Promise<Account | null> {
    try {
      this.logger.debug(`Updating balance for account ${accountId}: current=${currentBalance}, available=${availableBalance}`);

      const updateData: Partial<Account> = { currentBalance };
      if (availableBalance !== undefined) {
        updateData.availableBalance = availableBalance;
      }

      await this.repository.update(accountId, updateData);
      const account = await this.findById(accountId);

      this.logger.debug(`Updated balance for account ${accountId}: ${account ? 'success' : 'not found'}`);
      return account;
    } catch (error) {
      this.logger.error(`Error updating balance for account ${accountId}:`, error);
      throw new Error(`Failed to update account balance: ${error.message}`);
    }
  }

  async updateSyncStatus(accountId: string, lastSyncAt: Date, syncError?: string): Promise<Account | null> {
    try {
      this.logger.debug(`Updating sync status for account ${accountId}: ${syncError ? 'with error' : 'success'}`);

      await this.repository.update(accountId, {
        lastSyncAt,
        syncError: syncError || null,
      });

      const account = await this.findById(accountId);

      this.logger.debug(`Updated sync status for account ${accountId}: ${account ? 'success' : 'not found'}`);
      return account;
    } catch (error) {
      this.logger.error(`Error updating sync status for account ${accountId}:`, error);
      throw new Error(`Failed to update sync status: ${error.message}`);
    }
  }

  async updateStatus(accountId: string, status: AccountStatus): Promise<Account | null> {
    try {
      this.logger.debug(`Updating status for account ${accountId} to: ${status}`);

      await this.repository.update(accountId, { status });
      const account = await this.findById(accountId);

      this.logger.debug(`Updated status for account ${accountId}: ${account ? 'success' : 'not found'}`);
      return account;
    } catch (error) {
      this.logger.error(`Error updating status for account ${accountId}:`, error);
      throw new Error(`Failed to update account status: ${error.message}`);
    }
  }

  async getAccountBalancesSummary(userId: string): Promise<{
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    byType: Record<AccountType, { balance: number; count: number }>;
  }> {
    try {
      this.logger.debug(`Getting account balances summary for user: ${userId}`);

      const accounts = await this.createQueryBuilder('account')
        .where('account.userId = :userId', { userId })
        .andWhere('account.status = :activeStatus', { activeStatus: AccountStatus.ACTIVE })
        .getMany();

      let totalAssets = 0;
      let totalLiabilities = 0;
      const byType: Record<AccountType, { balance: number; count: number }> = {} as any;

      // Initialize all account types
      Object.values(AccountType).forEach(type => {
        byType[type] = { balance: 0, count: 0 };
      });

      accounts.forEach(account => {
        const balance = account.currentBalance;
        byType[account.type].balance += balance;
        byType[account.type].count += 1;

        // Categorize as asset or liability
        if ([AccountType.CHECKING, AccountType.SAVINGS, AccountType.INVESTMENT].includes(account.type)) {
          totalAssets += balance;
        } else if ([AccountType.CREDIT_CARD, AccountType.LOAN, AccountType.MORTGAGE].includes(account.type)) {
          totalLiabilities += Math.abs(balance); // Ensure positive for liabilities
        }
      });

      const summary = {
        totalAssets,
        totalLiabilities,
        netWorth: totalAssets - totalLiabilities,
        byType,
      };

      this.logger.debug(`Generated balance summary for user ${userId}:`, summary);
      return summary;
    } catch (error) {
      this.logger.error(`Error getting account balances summary for user ${userId}:`, error);
      throw new Error(`Failed to get account balances summary: ${error.message}`);
    }
  }

  async findAccountsWithErrors(userId?: string): Promise<Account[]> {
    try {
      this.logger.debug(`Finding accounts with errors (user: ${userId})`);

      const queryBuilder = this.createQueryBuilder('account')
        .where('account.syncError IS NOT NULL')
        .orderBy('account.lastSyncAt', 'DESC');

      if (userId) {
        queryBuilder.andWhere('account.userId = :userId', { userId });
      }

      const accounts = await queryBuilder.getMany();

      this.logger.debug(`Found ${accounts.length} accounts with errors`);
      return accounts;
    } catch (error) {
      this.logger.error(`Error finding accounts with errors:`, error);
      throw new Error(`Failed to find accounts with errors: ${error.message}`);
    }
  }

  async findByInstitution(institutionName: string, userId?: string): Promise<Account[]> {
    try {
      this.logger.debug(`Finding accounts by institution: ${institutionName} (user: ${userId})`);

      const queryBuilder = this.createQueryBuilder('account')
        .where('LOWER(account.institutionName) = LOWER(:institutionName)', { institutionName })
        .orderBy('account.name', 'ASC');

      if (userId) {
        queryBuilder.andWhere('account.userId = :userId', { userId });
      }

      const accounts = await queryBuilder.getMany();

      this.logger.debug(`Found ${accounts.length} accounts for institution ${institutionName}`);
      return accounts;
    } catch (error) {
      this.logger.error(`Error finding accounts by institution ${institutionName}:`, error);
      throw new Error(`Failed to find accounts by institution: ${error.message}`);
    }
  }

  async archiveAccount(accountId: string): Promise<boolean> {
    try {
      this.logger.debug(`Archiving account: ${accountId}`);

      const result = await this.repository.update(accountId, {
        status: AccountStatus.CLOSED,
        isActive: false,
        syncEnabled: false,
      });

      const success = result.affected > 0;
      this.logger.debug(`Archived account ${accountId}: ${success ? 'success' : 'not found'}`);
      return success;
    } catch (error) {
      this.logger.error(`Error archiving account ${accountId}:`, error);
      throw new Error(`Failed to archive account: ${error.message}`);
    }
  }

  async restoreAccount(accountId: string): Promise<boolean> {
    try {
      this.logger.debug(`Restoring account: ${accountId}`);

      const result = await this.repository.update(accountId, {
        status: AccountStatus.ACTIVE,
        isActive: true,
      });

      const success = result.affected > 0;
      this.logger.debug(`Restored account ${accountId}: ${success ? 'success' : 'not found'}`);
      return success;
    } catch (error) {
      this.logger.error(`Error restoring account ${accountId}:`, error);
      throw new Error(`Failed to restore account: ${error.message}`);
    }
  }

  async updateSettings(accountId: string, settings: Account['settings']): Promise<Account | null> {
    try {
      this.logger.debug(`Updating settings for account: ${accountId}`);

      await this.repository.update(accountId, { settings });
      const account = await this.findById(accountId);

      this.logger.debug(`Updated settings for account ${accountId}: ${account ? 'success' : 'not found'}`);
      return account;
    } catch (error) {
      this.logger.error(`Error updating settings for account ${accountId}:`, error);
      throw new Error(`Failed to update account settings: ${error.message}`);
    }
  }

  async bulkUpdateBalances(updates: Array<{
    accountId: string;
    currentBalance: number;
    availableBalance?: number;
  }>): Promise<number> {
    try {
      this.logger.debug(`Bulk updating balances for ${updates.length} accounts`);

      let updatedCount = 0;

      // Use transaction for bulk updates
      await this.manager.transaction(async (transactionalEntityManager) => {
        for (const update of updates) {
          const updateData: Partial<Account> = {
            currentBalance: update.currentBalance,
          };

          if (update.availableBalance !== undefined) {
            updateData.availableBalance = update.availableBalance;
          }

          const result = await transactionalEntityManager.update(Account, update.accountId, updateData);
          if (result.affected > 0) {
            updatedCount++;
          }
        }
      });

      this.logger.debug(`Bulk updated balances: ${updatedCount} accounts`);
      return updatedCount;
    } catch (error) {
      this.logger.error(`Error bulk updating balances:`, error);
      throw new Error(`Failed to bulk update balances: ${error.message}`);
    }
  }
}