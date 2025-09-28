import { Transaction, TransactionType, TransactionStatus, TransactionSource } from '../../entities';
import { IBaseRepository } from './base-repository.interface';

/**
 * Transaction repository interface extending base repository with transaction-specific operations
 */
export interface ITransactionRepository extends IBaseRepository<Transaction> {
  /**
   * Find transactions by account ID
   * @param accountId - Account ID
   * @param options - Query options (pagination, date range, etc.)
   * @returns Promise<Transaction[]>
   */
  findByAccountId(
    accountId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
      includeHidden?: boolean;
    },
  ): Promise<Transaction[]>;

  /**
   * Find transactions by category ID
   * @param categoryId - Category ID
   * @param options - Query options
   * @returns Promise<Transaction[]>
   */
  findByCategoryId(
    categoryId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<Transaction[]>;

  /**
   * Find transactions by user ID
   * @param userId - User ID
   * @param options - Query options
   * @returns Promise<Transaction[]>
   */
  findByUserId(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      accountIds?: string[];
      categoryIds?: string[];
      types?: TransactionType[];
      limit?: number;
      offset?: number;
    },
  ): Promise<Transaction[]>;

  /**
   * Find transaction by Plaid transaction ID
   * @param plaidTransactionId - Plaid transaction ID
   * @returns Promise<Transaction | null>
   */
  findByPlaidTransactionId(plaidTransactionId: string): Promise<Transaction | null>;

  /**
   * Find transactions by type
   * @param type - Transaction type
   * @param options - Query options
   * @returns Promise<Transaction[]>
   */
  findByType(
    type: TransactionType,
    options?: {
      accountId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<Transaction[]>;

  /**
   * Find transactions by status
   * @param status - Transaction status
   * @param options - Query options
   * @returns Promise<Transaction[]>
   */
  findByStatus(
    status: TransactionStatus,
    options?: {
      accountId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<Transaction[]>;

  /**
   * Find transactions by source
   * @param source - Transaction source
   * @param options - Query options
   * @returns Promise<Transaction[]>
   */
  findBySource(
    source: TransactionSource,
    options?: {
      accountId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<Transaction[]>;

  /**
   * Find uncategorized transactions
   * @param userId - User ID
   * @param options - Query options
   * @returns Promise<Transaction[]>
   */
  findUncategorized(
    userId: string,
    options?: {
      accountIds?: string[];
      limit?: number;
      minAmount?: number;
    },
  ): Promise<Transaction[]>;

  /**
   * Find duplicate transactions
   * @param accountId - Account ID
   * @param options - Duplicate detection options
   * @returns Promise<Transaction[][]> - Array of duplicate groups
   */
  findDuplicates(
    accountId: string,
    options?: {
      amountTolerance?: number;
      daysTolerance?: number;
      includeDescription?: boolean;
    },
  ): Promise<Transaction[][]>;

  /**
   * Find recent transactions
   * @param userId - User ID
   * @param days - Number of days to look back
   * @param limit - Maximum number of transactions
   * @returns Promise<Transaction[]>
   */
  findRecent(userId: string, days?: number, limit?: number): Promise<Transaction[]>;

  /**
   * Search transactions
   * @param userId - User ID
   * @param searchTerm - Search term (description, merchant name, etc.)
   * @param options - Search options
   * @returns Promise<Transaction[]>
   */
  searchTransactions(
    userId: string,
    searchTerm: string,
    options?: {
      accountIds?: string[];
      categoryIds?: string[];
      startDate?: Date;
      endDate?: Date;
      minAmount?: number;
      maxAmount?: number;
      limit?: number;
    },
  ): Promise<Transaction[]>;

  /**
   * Get transaction statistics for a user
   * @param userId - User ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Promise with transaction statistics
   */
  getTransactionStats(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    transactionCount: number;
    averageTransaction: number;
    byCategory: Array<{
      categoryId: string;
      categoryName: string;
      amount: number;
      count: number;
      percentage: number;
    }>;
    byAccount: Array<{
      accountId: string;
      accountName: string;
      amount: number;
      count: number;
    }>;
    byDay: Array<{
      date: string;
      income: number;
      expenses: number;
      net: number;
    }>;
  }>;

  /**
   * Get monthly spending by category
   * @param userId - User ID
   * @param year - Year
   * @param month - Month (1-12)
   * @returns Promise with spending breakdown
   */
  getMonthlySpendingByCategory(
    userId: string,
    year: number,
    month: number,
  ): Promise<Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    count: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  }>>;

  /**
   * Update transaction category
   * @param transactionId - Transaction ID
   * @param categoryId - New category ID
   * @returns Promise<Transaction | null>
   */
  updateCategory(transactionId: string, categoryId: string | null): Promise<Transaction | null>;

  /**
   * Update transaction description
   * @param transactionId - Transaction ID
   * @param description - New description
   * @returns Promise<Transaction | null>
   */
  updateDescription(transactionId: string, description: string): Promise<Transaction | null>;

  /**
   * Toggle transaction hidden status
   * @param transactionId - Transaction ID
   * @returns Promise<Transaction | null>
   */
  toggleHidden(transactionId: string): Promise<Transaction | null>;

  /**
   * Add note to transaction
   * @param transactionId - Transaction ID
   * @param notes - Transaction notes
   * @returns Promise<Transaction | null>
   */
  addNotes(transactionId: string, notes: string): Promise<Transaction | null>;

  /**
   * Add tags to transaction
   * @param transactionId - Transaction ID
   * @param tags - Array of tags
   * @returns Promise<Transaction | null>
   */
  addTags(transactionId: string, tags: string[]): Promise<Transaction | null>;

  /**
   * Create split transaction
   * @param transactionId - Parent transaction ID
   * @param splits - Array of split details
   * @returns Promise<Transaction | null>
   */
  createSplit(
    transactionId: string,
    splits: Array<{
      amount: number;
      categoryId?: string;
      description?: string;
    }>,
  ): Promise<Transaction | null>;

  /**
   * Bulk categorize transactions
   * @param updates - Array of transaction updates
   * @returns Promise<number> - Number of updated transactions
   */
  bulkCategorize(updates: Array<{
    transactionId: string;
    categoryId: string;
  }>): Promise<number>;

  /**
   * Find transactions needing categorization review
   * @param userId - User ID
   * @param confidenceThreshold - Minimum confidence threshold for auto-categorization
   * @returns Promise<Transaction[]>
   */
  findNeedingCategorization(userId: string, confidenceThreshold?: number): Promise<Transaction[]>;

  /**
   * Get cash flow data
   * @param userId - User ID
   * @param startDate - Start date
   * @param endDate - End date
   * @param groupBy - Group by period ('day', 'week', 'month')
   * @returns Promise with cash flow data
   */
  getCashFlow(
    userId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month',
  ): Promise<Array<{
    period: string;
    income: number;
    expenses: number;
    net: number;
    cumulativeNet: number;
  }>>;
}