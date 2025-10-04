/**
 * Transaction Repository Interface for MoneyWise Application
 * Extends base repository with Transaction-specific operations
 */

import { Transaction, TransactionStatus } from '../../entities';
import { IBaseRepository } from './base.repository.interface';

export interface ITransactionRepository extends IBaseRepository<Transaction> {
  /**
   * Find transactions by account ID
   */
  findByAccountId(accountId: string): Promise<Transaction[]>;

  /**
   * Find transactions by user ID (across all accounts)
   */
  findByUserId(userId: string): Promise<Transaction[]>;

  /**
   * Find transactions by category ID
   */
  findByCategoryId(categoryId: string): Promise<Transaction[]>;

  /**
   * Find transactions by date range
   */
  findByDateRange(startDate: Date, endDate: Date, userId?: string): Promise<Transaction[]>;

  /**
   * Find transactions by amount range
   */
  findByAmountRange(minAmount: number, maxAmount: number, userId?: string): Promise<Transaction[]>;

  /**
   * Find transactions by status
   */
  findByStatus(status: TransactionStatus, userId?: string): Promise<Transaction[]>;

  /**
   * Search transactions by description or merchant
   */
  searchTransactions(query: string, userId: string, limit?: number): Promise<Transaction[]>;

  /**
   * Get recent transactions for user
   */
  findRecent(userId: string, days: number, limit?: number): Promise<Transaction[]>;

  /**
   * Find pending transactions
   */
  findPending(userId?: string): Promise<Transaction[]>;

  /**
   * Get transaction statistics for user
   */
  getTransactionStats(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalTransactions: number;
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    avgTransactionAmount: number;
  }>;

  /**
   * Get monthly spending breakdown
   */
  getMonthlySpendingByCategory(
    userId: string,
    year: number,
    month: number
  ): Promise<{
    categoryId: string;
    categoryName: string;
    totalAmount: number;
    transactionCount: number;
  }[]>;

  /**
   * Find duplicate transactions
   */
  findDuplicates(
    accountId: string,
    amount: number,
    date: Date,
    description?: string
  ): Promise<Transaction[]>;

  /**
   * Get spending trends for user
   */
  getSpendingTrends(
    userId: string,
    months: number
  ): Promise<{
    month: string;
    totalSpent: number;
    totalIncome: number;
    netAmount: number;
    transactionCount: number;
  }[]>;

  /**
   * Find transactions by Plaid transaction ID
   */
  findByPlaidTransactionId(plaidTransactionId: string): Promise<Transaction | null>;

  /**
   * Get largest transactions for user
   */
  findLargestTransactions(userId: string, limit?: number): Promise<Transaction[]>;

  /**
   * Get cash flow analysis
   */
  getCashFlowAnalysis(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    date: string;
    income: number;
    expenses: number;
    net: number;
  }[]>;

  /**
   * Find recurring transactions
   */
  findRecurringTransactions(userId: string): Promise<{
    pattern: string;
    transactions: Transaction[];
    frequency: number;
  }[]>;

  /**
   * Update transaction category
   */
  updateCategory(transactionId: string, categoryId: string): Promise<boolean>;

  /**
   * Update transaction status
   */
  updateStatus(transactionId: string, status: TransactionStatus): Promise<boolean>;

  /**
   * Bulk update transactions
   */
  bulkUpdateCategory(transactionIds: string[], categoryId: string): Promise<number>;

  /**
   * Get uncategorized transactions
   */
  findUncategorized(userId: string, limit?: number): Promise<Transaction[]>;

  /**
   * Find transactions for reconciliation
   */
  findForReconciliation(accountId: string, startDate: Date, endDate: Date): Promise<Transaction[]>;

  /**
   * Get expense breakdown by merchant
   */
  getExpensesByMerchant(
    userId: string,
    startDate: Date,
    endDate: Date,
    limit?: number
  ): Promise<{
    merchant: string;
    totalAmount: number;
    transactionCount: number;
  }[]>;
}