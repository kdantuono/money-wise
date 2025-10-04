import { Account, AccountType, AccountStatus, AccountSource } from '../../entities';
import { IBaseRepository } from './base-repository.interface';

/**
 * Account repository interface extending base repository with account-specific operations
 */
export interface IAccountRepository extends IBaseRepository<Account> {
  /**
   * Find accounts by user ID
   * @param userId - User ID
   * @param includeInactive - Whether to include inactive accounts
   * @returns Promise<Account[]>
   */
  findByUserId(userId: string, includeInactive?: boolean): Promise<Account[]>;

  /**
   * Find account by Plaid account ID
   * @param plaidAccountId - Plaid account ID
   * @returns Promise<Account | null>
   */
  findByPlaidAccountId(plaidAccountId: string): Promise<Account | null>;

  /**
   * Find accounts by type
   * @param type - Account type
   * @param userId - Optional user ID filter
   * @returns Promise<Account[]>
   */
  findByType(type: AccountType, userId?: string): Promise<Account[]>;

  /**
   * Find accounts by status
   * @param status - Account status
   * @param userId - Optional user ID filter
   * @returns Promise<Account[]>
   */
  findByStatus(status: AccountStatus, userId?: string): Promise<Account[]>;

  /**
   * Find accounts by source
   * @param source - Account source
   * @param userId - Optional user ID filter
   * @returns Promise<Account[]>
   */
  findBySource(source: AccountSource, userId?: string): Promise<Account[]>;

  /**
   * Find accounts that need synchronization
   * @param hoursThreshold - Hours since last sync (default: 1)
   * @returns Promise<Account[]>
   */
  findAccountsNeedingSync(hoursThreshold?: number): Promise<Account[]>;

  /**
   * Update account balance
   * @param accountId - Account ID
   * @param currentBalance - New current balance
   * @param availableBalance - New available balance (optional)
   * @returns Promise<Account | null>
   */
  updateBalance(
    accountId: string,
    currentBalance: number,
    availableBalance?: number,
  ): Promise<Account | null>;

  /**
   * Update account sync status
   * @param accountId - Account ID
   * @param lastSyncAt - Last sync timestamp
   * @param syncError - Sync error message (optional)
   * @returns Promise<Account | null>
   */
  updateSyncStatus(
    accountId: string,
    lastSyncAt: Date,
    syncError?: string,
  ): Promise<Account | null>;

  /**
   * Update account status
   * @param accountId - Account ID
   * @param status - New status
   * @returns Promise<Account | null>
   */
  updateStatus(accountId: string, status: AccountStatus): Promise<Account | null>;

  /**
   * Get user's account balances summary
   * @param userId - User ID
   * @returns Promise with balance summary by account type
   */
  getAccountBalancesSummary(userId: string): Promise<{
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    byType: Record<AccountType, { balance: number; count: number }>;
  }>;

  /**
   * Find accounts with errors
   * @param userId - Optional user ID filter
   * @returns Promise<Account[]>
   */
  findAccountsWithErrors(userId?: string): Promise<Account[]>;

  /**
   * Find accounts by institution
   * @param institutionName - Institution name
   * @param userId - Optional user ID filter
   * @returns Promise<Account[]>
   */
  findByInstitution(institutionName: string, userId?: string): Promise<Account[]>;

  /**
   * Archive account (soft delete with special status)
   * @param accountId - Account ID
   * @returns Promise<boolean>
   */
  archiveAccount(accountId: string): Promise<boolean>;

  /**
   * Restore archived account
   * @param accountId - Account ID
   * @returns Promise<boolean>
   */
  restoreAccount(accountId: string): Promise<boolean>;

  /**
   * Update account settings
   * @param accountId - Account ID
   * @param settings - Account settings object
   * @returns Promise<Account | null>
   */
  updateSettings(accountId: string, settings: Account['settings']): Promise<Account | null>;

  /**
   * Bulk update account balances
   * @param updates - Array of balance updates
   * @returns Promise<number> - Number of updated accounts
   */
  bulkUpdateBalances(updates: Array<{
    accountId: string;
    currentBalance: number;
    availableBalance?: number;
  }>): Promise<number>;
}