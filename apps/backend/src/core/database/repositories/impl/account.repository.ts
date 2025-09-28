/**
 * Account Repository Implementation for MoneyWise Application
 * Implements Account-specific data access operations
 */

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Account, AccountType } from '../../../../entities/account.entity';
import { IAccountRepository } from '../interfaces/account.repository.interface';
import { BaseRepository } from './base.repository';

@Injectable()
export class AccountRepository extends BaseRepository<Account> implements IAccountRepository {
  constructor(dataSource: DataSource) {
    super(dataSource, Account);
  }

  async findByUserId(userId: string): Promise<Account[]> {
    try {
      const accounts = await this.repository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      return accounts;
    } catch (error) {
      this.logger.error(`Failed to find accounts by user ID: ${error.message}`, error.stack);
      throw new Error(`Failed to find accounts by user ID: ${error.message}`);
    }
  }

  async findActiveAccountsByUserId(userId: string): Promise<Account[]> {
    try {
      const accounts = await this.repository.find({
        where: { userId, isActive: true },
        order: { createdAt: 'DESC' },
      });
      return accounts;
    } catch (error) {
      this.logger.error(`Failed to find active accounts: ${error.message}`, error.stack);
      throw new Error(`Failed to find active accounts: ${error.message}`);
    }
  }

  async findByType(accountType: AccountType, userId?: string): Promise<Account[]> {
    try {
      const whereCondition: any = { type: accountType };
      if (userId) {
        whereCondition.userId = userId;
      }

      const accounts = await this.repository.find({
        where: whereCondition,
        order: { createdAt: 'DESC' },
      });
      return accounts;
    } catch (error) {
      this.logger.error(`Failed to find accounts by type: ${error.message}`, error.stack);
      throw new Error(`Failed to find accounts by type: ${error.message}`);
    }
  }

  async findByPlaidAccountId(plaidAccountId: string): Promise<Account | null> {
    try {
      const account = await this.repository.findOne({
        where: { plaidAccountId },
      });
      return account || null;
    } catch (error) {
      this.logger.error(`Failed to find account by Plaid ID: ${error.message}`, error.stack);
      throw new Error(`Failed to find account by Plaid ID: ${error.message}`);
    }
  }

  async findByPlaidItemId(plaidItemId: string): Promise<Account[]> {
    try {
      const accounts = await this.repository.find({
        where: { plaidItemId },
        order: { createdAt: 'DESC' },
      });
      return accounts;
    } catch (error) {
      this.logger.error(`Failed to find accounts by Plaid item ID: ${error.message}`, error.stack);
      throw new Error(`Failed to find accounts by Plaid item ID: ${error.message}`);
    }
  }

  async updateBalance(accountId: string, newBalance: number): Promise<boolean> {
    try {
      const result = await this.repository.update(accountId, { balance: newBalance });
      return result.affected && result.affected > 0;
    } catch (error) {
      this.logger.error(`Failed to update account balance: ${error.message}`, error.stack);
      throw new Error(`Failed to update account balance: ${error.message}`);
    }
  }

  async incrementBalance(accountId: string, amount: number): Promise<boolean> {
    try {
      const result = await this.repository
        .createQueryBuilder()
        .update(Account)
        .set({ balance: () => `balance + ${amount}` })
        .where('id = :id', { id: accountId })
        .execute();

      return result.affected && result.affected > 0;
    } catch (error) {
      this.logger.error(`Failed to increment account balance: ${error.message}`, error.stack);
      throw new Error(`Failed to increment account balance: ${error.message}`);
    }
  }

  async decrementBalance(accountId: string, amount: number): Promise<boolean> {
    try {
      const result = await this.repository
        .createQueryBuilder()
        .update(Account)
        .set({ balance: () => `balance - ${amount}` })
        .where('id = :id', { id: accountId })
        .execute();

      return result.affected && result.affected > 0;
    } catch (error) {
      this.logger.error(`Failed to decrement account balance: ${error.message}`, error.stack);
      throw new Error(`Failed to decrement account balance: ${error.message}`);
    }
  }

  async getTotalBalanceForUser(userId: string): Promise<number> {
    try {
      const result = await this.repository
        .createQueryBuilder('account')
        .select('SUM(account.balance)', 'total')
        .where('account.userId = :userId', { userId })
        .andWhere('account.isActive = :isActive', { isActive: true })
        .getRawOne();

      return parseFloat(result?.total || '0');
    } catch (error) {
      this.logger.error(`Failed to get total balance: ${error.message}`, error.stack);
      throw new Error(`Failed to get total balance: ${error.message}`);
    }
  }

  async getAccountBalancesSummary(userId: string): Promise<{
    accountType: AccountType;
    totalBalance: number;
    accountCount: number;
  }[]> {
    try {
      const results = await this.repository
        .createQueryBuilder('account')
        .select('account.type', 'accountType')
        .addSelect('SUM(account.balance)', 'totalBalance')
        .addSelect('COUNT(account.id)', 'accountCount')
        .where('account.userId = :userId', { userId })
        .andWhere('account.isActive = :isActive', { isActive: true })
        .groupBy('account.type')
        .getRawMany();

      return results.map((result) => ({
        accountType: result.accountType,
        totalBalance: parseFloat(result.totalBalance || '0'),
        accountCount: parseInt(result.accountCount || '0'),
      }));
    } catch (error) {
      this.logger.error(`Failed to get account balances summary: ${error.message}`, error.stack);
      throw new Error(`Failed to get account balances summary: ${error.message}`);
    }
  }

  async deactivateAccount(accountId: string): Promise<boolean> {
    try {
      const result = await this.repository.update(accountId, { isActive: false });
      return result.affected && result.affected > 0;
    } catch (error) {
      this.logger.error(`Failed to deactivate account: ${error.message}`, error.stack);
      throw new Error(`Failed to deactivate account: ${error.message}`);
    }
  }

  async reactivateAccount(accountId: string): Promise<boolean> {
    try {
      const result = await this.repository.update(accountId, { isActive: true });
      return result.affected && result.affected > 0;
    } catch (error) {
      this.logger.error(`Failed to reactivate account: ${error.message}`, error.stack);
      throw new Error(`Failed to reactivate account: ${error.message}`);
    }
  }

  async findAccountsForSync(userId?: string): Promise<Account[]> {
    try {
      const queryBuilder = this.repository
        .createQueryBuilder('account')
        .where('account.plaidAccountId IS NOT NULL')
        .andWhere('account.isActive = :isActive', { isActive: true });

      if (userId) {
        queryBuilder.andWhere('account.userId = :userId', { userId });
      }

      const accounts = await queryBuilder.getMany();
      return accounts;
    } catch (error) {
      this.logger.error(`Failed to find accounts for sync: ${error.message}`, error.stack);
      throw new Error(`Failed to find accounts for sync: ${error.message}`);
    }
  }

  async updateLastSyncedAt(accountId: string): Promise<boolean> {
    try {
      const result = await this.repository.update(accountId, { updatedAt: new Date() });
      return result.affected && result.affected > 0;
    } catch (error) {
      this.logger.error(`Failed to update sync timestamp: ${error.message}`, error.stack);
      throw new Error(`Failed to update sync timestamp: ${error.message}`);
    }
  }

  async findWithTransactions(accountId: string, limit = 50): Promise<Account | null> {
    try {
      const account = await this.repository.findOne({
        where: { id: accountId },
        relations: ['transactions'],
        order: { transactions: { createdAt: 'DESC' } },
      });

      if (account && account.transactions && limit > 0) {
        account.transactions = account.transactions.slice(0, limit);
      }

      return account || null;
    } catch (error) {
      this.logger.error(`Failed to find account with transactions: ${error.message}`, error.stack);
      throw new Error(`Failed to find account with transactions: ${error.message}`);
    }
  }

  async findByCurrency(currency: string, userId?: string): Promise<Account[]> {
    try {
      const whereCondition: any = { currency };
      if (userId) {
        whereCondition.userId = userId;
      }

      const accounts = await this.repository.find({
        where: whereCondition,
        order: { createdAt: 'DESC' },
      });
      return accounts;
    } catch (error) {
      this.logger.error(`Failed to find accounts by currency: ${error.message}`, error.stack);
      throw new Error(`Failed to find accounts by currency: ${error.message}`);
    }
  }

  async findLowBalanceAccounts(threshold: number, userId?: string): Promise<Account[]> {
    try {
      const queryBuilder = this.repository
        .createQueryBuilder('account')
        .where('account.balance < :threshold', { threshold })
        .andWhere('account.isActive = :isActive', { isActive: true });

      if (userId) {
        queryBuilder.andWhere('account.userId = :userId', { userId });
      }

      const accounts = await queryBuilder.orderBy('account.balance', 'ASC').getMany();
      return accounts;
    } catch (error) {
      this.logger.error(`Failed to find low balance accounts: ${error.message}`, error.stack);
      throw new Error(`Failed to find low balance accounts: ${error.message}`);
    }
  }

  async groupByInstitution(userId: string): Promise<{
    institution: string;
    accounts: Account[];
    totalBalance: number;
  }[]> {
    try {
      const accounts = await this.repository.find({
        where: { userId, isActive: true },
        order: { createdAt: 'DESC' },
      });

      // Group by plaidItemId (represents institution)
      const grouped = accounts.reduce((acc, account) => {
        const institution = account.plaidItemId || 'Manual Accounts';
        if (!acc[institution]) {
          acc[institution] = {
            institution,
            accounts: [],
            totalBalance: 0,
          };
        }
        acc[institution].accounts.push(account);
        acc[institution].totalBalance += parseFloat(account.balance.toString());
        return acc;
      }, {} as Record<string, { institution: string; accounts: Account[]; totalBalance: number }>);

      return Object.values(grouped);
    } catch (error) {
      this.logger.error(`Failed to group accounts by institution: ${error.message}`, error.stack);
      throw new Error(`Failed to group accounts by institution: ${error.message}`);
    }
  }
}