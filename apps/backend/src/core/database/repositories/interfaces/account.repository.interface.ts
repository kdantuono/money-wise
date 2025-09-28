/**
 * Account Repository Interface for MoneyWise Application
 * Extends base repository with Account-specific operations
 */

import { Account, AccountType } from '../../entities';
import { IBaseRepository } from './base.repository.interface';

export interface IAccountRepository extends IBaseRepository<Account> {
  /**
   * Find all accounts for a specific user
   */
  findByUserId(userId: string): Promise<Account[]>;

  /**
   * Find active accounts for a user
   */
  findActiveAccountsByUserId(userId: string): Promise<Account[]>;

  /**
   * Find accounts by type
   */
  findByType(accountType: AccountType, userId?: string): Promise<Account[]>;

  /**
   * Find account by Plaid account ID
   */
  findByPlaidAccountId(plaidAccountId: string): Promise<Account | null>;

  /**
   * Find accounts by Plaid item ID
   */
  findByPlaidItemId(plaidItemId: string): Promise<Account[]>;

  /**
   * Update account balance
   */
  updateBalance(accountId: string, newBalance: number): Promise<boolean>;

  /**
   * Increment account balance
   */
  incrementBalance(accountId: string, amount: number): Promise<boolean>;

  /**
   * Decrement account balance
   */
  decrementBalance(accountId: string, amount: number): Promise<boolean>;

  /**
   * Get total balance for user across all accounts
   */
  getTotalBalanceForUser(userId: string): Promise<number>;

  /**
   * Get balance summary by account type for user
   */
  getAccountBalancesSummary(userId: string): Promise<{
    accountType: AccountType;
    totalBalance: number;
    accountCount: number;
  }[]>;

  /**
   * Deactivate account
   */
  deactivateAccount(accountId: string): Promise<boolean>;

  /**
   * Reactivate account
   */
  reactivateAccount(accountId: string): Promise<boolean>;

  /**
   * Find accounts requiring synchronization (with Plaid)
   */
  findAccountsForSync(userId?: string): Promise<Account[]>;

  /**
   * Update Plaid sync timestamp
   */
  updateLastSyncedAt(accountId: string): Promise<boolean>;

  /**
   * Get account with transactions
   */
  findWithTransactions(accountId: string, limit?: number): Promise<Account | null>;

  /**
   * Find accounts by currency
   */
  findByCurrency(currency: string, userId?: string): Promise<Account[]>;

  /**
   * Get accounts with low balances
   */
  findLowBalanceAccounts(threshold: number, userId?: string): Promise<Account[]>;

  /**
   * Group accounts by institution (based on Plaid data)
   */
  groupByInstitution(userId: string): Promise<{
    institution: string;
    accounts: Account[];
    totalBalance: number;
  }[]>;
}