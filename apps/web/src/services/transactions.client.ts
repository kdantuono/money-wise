/**
 * Transactions Client — Supabase
 *
 * Direct Supabase queries replacing BFF fetch calls.
 * RLS policies handle account/family isolation automatically.
 *
 * @module services/transactions.client
 *
 * @example
 * ```typescript
 * // Get all transactions
 * const transactions = await transactionsClient.getTransactions();
 *
 * // Get transactions with filters
 * const filtered = await transactionsClient.getTransactions({
 *   accountId: 'account-uuid',
 *   startDate: '2024-01-01',
 *   endDate: '2024-01-31',
 * });
 *
 * // Get a single transaction
 * const transaction = await transactionsClient.getTransaction('tx-uuid');
 * ```
 */

import { createClient } from '@/utils/supabase/client'
import type { Database } from '@/utils/supabase/database.types'

type TransactionRow = Database['public']['Tables']['transactions']['Row']
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type CategoryRow = Database['public']['Tables']['categories']['Row']

type TransactionWithCategory = TransactionRow & {
  categories: CategoryRow | null
}

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Transaction type (DEBIT = expense, CREDIT = income)
 */
export type TransactionType = 'DEBIT' | 'CREDIT';

/**
 * Transaction status
 */
export type TransactionStatus = 'PENDING' | 'POSTED' | 'CANCELLED';

/**
 * Transaction source
 */
export type TransactionSource = 'MANUAL' | 'PLAID' | 'SALTEDGE' | 'IMPORT';

/**
 * Flow type for transactions
 */
export type FlowType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'LIABILITY_PAYMENT' | 'REFUND';

/**
 * Transfer role for linked transactions
 */
export type TransferRole = 'SOURCE' | 'DESTINATION';

/**
 * Transaction data from API
 */
export interface Transaction {
  id: string;
  accountId: string;
  categoryId?: string | null;
  amount: number;
  displayAmount: number;
  type: TransactionType;
  status: TransactionStatus;
  source: TransactionSource;
  date: string;
  authorizedDate?: string | null;
  description: string;
  merchantName?: string | null;
  originalDescription?: string | null;
  currency: string;
  reference?: string | null;
  checkNumber?: string | null;
  notes?: string | null;
  isPending: boolean;
  isRecurring: boolean;
  isHidden: boolean;
  includeInBudget: boolean;
  plaidTransactionId?: string | null;
  plaidAccountId?: string | null;
  saltedgeTransactionId?: string | null;
  createdAt: string;
  updatedAt: string;
  isDebit: boolean;
  isCredit: boolean;
  isPlaidTransaction: boolean;
  isManualTransaction: boolean;
  // Transfer-related fields
  flowType?: FlowType | null;
  transferGroupId?: string | null;
  transferRole?: TransferRole | null;
}

/**
 * Transaction filter options
 */
export interface TransactionFilters {
  accountId?: string;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  search?: string;
}

/**
 * Create transaction request data
 * Required fields: accountId, amount, type, source, date, description
 */
export interface CreateTransactionData {
  accountId: string;
  categoryId?: string;
  amount: number;
  type: TransactionType;
  status?: TransactionStatus;
  source: TransactionSource;
  date: string;
  authorizedDate?: string;
  description: string;
  merchantName?: string;
  originalDescription?: string;
  currency?: string;
  reference?: string;
  checkNumber?: string;
  notes?: string;
  isPending?: boolean;
  isRecurring?: boolean;
  isHidden?: boolean;
  includeInBudget?: boolean;
}

/**
 * Update transaction request data
 * All fields are optional (PATCH semantics)
 * Note: accountId and plaidTransactionId cannot be changed
 */
export interface UpdateTransactionData {
  categoryId?: string;
  amount?: number;
  type?: TransactionType;
  status?: TransactionStatus;
  source?: TransactionSource;
  date?: string;
  authorizedDate?: string;
  description?: string;
  merchantName?: string;
  originalDescription?: string;
  currency?: string;
  reference?: string;
  checkNumber?: string;
  notes?: string;
  isPending?: boolean;
  isRecurring?: boolean;
  isHidden?: boolean;
  includeInBudget?: boolean;
}

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Base error class for transactions API errors
 */
export class TransactionsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'TransactionsApiError';
    Object.setPrototypeOf(this, TransactionsApiError.prototype);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends TransactionsApiError {
  constructor(message: string = 'Authentication failed. Please log in again.') {
    super(message, 401, 'AuthenticationError');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends TransactionsApiError {
  constructor(message: string = 'Transaction not found.') {
    super(message, 404, 'NotFoundError');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends TransactionsApiError {
  constructor(
    message: string = 'You do not have permission to perform this action.'
  ) {
    super(message, 403, 'AuthorizationError');
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends TransactionsApiError {
  constructor(message: string = 'Invalid request data.', details?: unknown) {
    super(message, 400, 'ValidationError', details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

// =============================================================================
// Row → Client Type Mapper
// =============================================================================

function rowToTransaction(row: TransactionWithCategory): Transaction {
  const type = row.type as TransactionType
  const source = row.source as TransactionSource

  return {
    id: row.id,
    accountId: row.account_id,
    categoryId: row.category_id,
    amount: Number(row.amount),
    displayAmount: Math.abs(Number(row.amount)),
    type,
    status: row.status as TransactionStatus,
    source,
    date: row.date,
    authorizedDate: row.authorized_date,
    description: row.description,
    merchantName: row.merchant_name,
    originalDescription: row.original_description,
    currency: row.currency,
    reference: row.reference,
    checkNumber: row.check_number,
    notes: row.notes,
    isPending: row.is_pending,
    isRecurring: row.is_recurring,
    isHidden: row.is_hidden,
    includeInBudget: row.include_in_budget,
    plaidTransactionId: row.plaid_transaction_id,
    plaidAccountId: row.plaid_account_id,
    saltedgeTransactionId: row.saltedge_transaction_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDebit: type === 'DEBIT',
    isCredit: type === 'CREDIT',
    isPlaidTransaction: source === 'PLAID',
    isManualTransaction: source === 'MANUAL',
    flowType: row.flow_type as FlowType | null,
    transferGroupId: row.transfer_group_id,
    transferRole: row.transfer_role as TransferRole | null,
  }
}

// =============================================================================
// Transactions Client
// =============================================================================

/**
 * Transactions API Client
 *
 * Provides methods for fetching and managing transactions via Supabase.
 */
export const transactionsClient = {
  /**
   * Get all transactions for the current user
   *
   * @param filters - Optional filters for transactions
   * @returns Array of transactions
   *
   * @example
   * ```typescript
   * const allTransactions = await transactionsClient.getTransactions();
   *
   * const filtered = await transactionsClient.getTransactions({
   *   accountId: 'account-uuid',
   *   type: 'DEBIT',
   *   startDate: '2024-01-01',
   * });
   * ```
   */
  async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    const supabase = createClient()
    let query = supabase
      .from('transactions')
      .select('*, categories(*)')
      .order('date', { ascending: false })

    if (filters?.accountId && filters.accountId !== 'all') {
      query = query.eq('account_id', filters.accountId)
    }
    if (filters?.type) {
      query = query.eq('type', filters.type)
    }
    if (filters?.startDate) {
      query = query.gte('date', filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte('date', filters.endDate)
    }
    if (filters?.search) {
      const term = `%${filters.search}%`
      query = query.or(`description.ilike.${term},merchant_name.ilike.${term}`)
    }

    const { data, error } = await query
    if (error) throw new TransactionsApiError(error.message, 500)
    return (data ?? []).map((row) => rowToTransaction(row as unknown as TransactionWithCategory))
  },

  /**
   * Get a single transaction by ID
   *
   * @param id - Transaction ID (UUID)
   * @returns Transaction data
   * @throws NotFoundError if transaction doesn't exist
   *
   * @example
   * ```typescript
   * const transaction = await transactionsClient.getTransaction('tx-uuid');
   * ```
   */
  async getTransaction(id: string): Promise<Transaction> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('transactions')
      .select('*, categories(*)')
      .eq('id', id)
      .single()

    if (error) throw new NotFoundError()
    return rowToTransaction(data as unknown as TransactionWithCategory)
  },

  /**
   * Create a new transaction
   *
   * @param data - Transaction data
   * @returns Created transaction
   * @throws AuthenticationError if not authenticated
   * @throws ValidationError if data is invalid
   *
   * @example
   * ```typescript
   * const transaction = await transactionsClient.createTransaction({
   *   accountId: 'account-uuid',
   *   amount: 125.50,
   *   type: 'DEBIT',
   *   source: 'MANUAL',
   *   date: '2024-01-15',
   *   description: 'Groceries at Whole Foods',
   * });
   * ```
   */
  async createTransaction(input: CreateTransactionData): Promise<Transaction> {
    const supabase = createClient()

    const insert: TransactionInsert = {
      account_id: input.accountId,
      amount: input.amount,
      type: input.type as Database['public']['Enums']['transaction_type'],
      source: input.source as Database['public']['Enums']['transaction_source'],
      date: input.date,
      description: input.description,
      category_id: input.categoryId,
      status: (input.status ?? 'POSTED') as Database['public']['Enums']['transaction_status'],
      authorized_date: input.authorizedDate,
      merchant_name: input.merchantName,
      original_description: input.originalDescription,
      currency: input.currency ?? 'EUR',
      reference: input.reference,
      check_number: input.checkNumber,
      notes: input.notes,
      is_pending: input.isPending ?? false,
      is_recurring: input.isRecurring ?? false,
      is_hidden: input.isHidden ?? false,
      include_in_budget: input.includeInBudget ?? true,
    }

    // Type-safe insert with explicit casting to avoid Next.js build type inference issues
    const { data, error } = await (supabase
      .from('transactions')
      .insert as any)(insert)
      .select('*, categories(*)')
      .single()

    if (error) throw new TransactionsApiError(error.message, 400)
    return rowToTransaction(data as unknown as TransactionWithCategory)
  },

  /**
   * Update an existing transaction
   *
   * @param id - Transaction ID (UUID)
   * @param input - Partial transaction data to update
   * @returns Updated transaction
   * @throws AuthenticationError if not authenticated
   * @throws AuthorizationError if transaction belongs to different family
   * @throws NotFoundError if transaction doesn't exist
   * @throws ValidationError if data is invalid
   *
   * @example
   * ```typescript
   * const updated = await transactionsClient.updateTransaction('tx-uuid', {
   *   categoryId: 'new-category-uuid',
   *   notes: 'Updated notes',
   * });
   * ```
   */
  async updateTransaction(
    id: string,
    input: UpdateTransactionData
  ): Promise<Transaction> {
    const supabase = createClient()
    const update: Database['public']['Tables']['transactions']['Update'] = {}

    if (input.categoryId !== undefined) update.category_id = input.categoryId
    if (input.amount !== undefined) update.amount = input.amount
    if (input.type !== undefined) update.type = input.type as Database['public']['Enums']['transaction_type']
    if (input.status !== undefined) update.status = input.status as Database['public']['Enums']['transaction_status']
    if (input.source !== undefined) update.source = input.source as Database['public']['Enums']['transaction_source']
    if (input.date !== undefined) update.date = input.date
    if (input.authorizedDate !== undefined) update.authorized_date = input.authorizedDate
    if (input.description !== undefined) update.description = input.description
    if (input.merchantName !== undefined) update.merchant_name = input.merchantName
    if (input.originalDescription !== undefined) update.original_description = input.originalDescription
    if (input.currency !== undefined) update.currency = input.currency
    if (input.reference !== undefined) update.reference = input.reference
    if (input.checkNumber !== undefined) update.check_number = input.checkNumber
    if (input.notes !== undefined) update.notes = input.notes
    if (input.isPending !== undefined) update.is_pending = input.isPending
    if (input.isRecurring !== undefined) update.is_recurring = input.isRecurring
    if (input.isHidden !== undefined) update.is_hidden = input.isHidden
    if (input.includeInBudget !== undefined) update.include_in_budget = input.includeInBudget

    // Type-safe update with explicit casting to avoid Next.js build type inference issues
    const { data, error } = await (supabase
      .from('transactions')
      .update as any)(update)
      .eq('id', id)
      .select('*, categories(*)')
      .single()

    if (error) throw new TransactionsApiError(error.message, 400)
    return rowToTransaction(data as unknown as TransactionWithCategory)
  },

  /**
   * Delete a transaction
   *
   * @param id - Transaction ID (UUID)
   * @throws AuthenticationError if not authenticated
   * @throws AuthorizationError if transaction belongs to different family
   * @throws NotFoundError if transaction doesn't exist
   *
   * @example
   * ```typescript
   * await transactionsClient.deleteTransaction('tx-uuid');
   * ```
   */
  async deleteTransaction(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) throw new TransactionsApiError(error.message, 400)
  },
}

export default transactionsClient
