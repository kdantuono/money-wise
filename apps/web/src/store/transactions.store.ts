/**
 * Transactions State Management Store
 *
 * Zustand store for managing transaction state, CRUD operations, and filtering.
 * Provides a single source of truth for all transaction-related state in the application.
 *
 * Features:
 * - Transaction data management with filtering
 * - CRUD operations with optimistic updates
 * - Bulk selection for batch operations
 * - Error state management
 *
 * @module store/transactions
 *
 * @example
 * ```typescript
 * // Full state access
 * const { transactions, isLoading, fetchTransactions } = useTransactionsStore();
 *
 * // Just transactions
 * const transactions = useTransactions();
 *
 * // With filters
 * const { filters, setFilters } = useTransactionsStore();
 * ```
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  transactionsClient,
  Transaction,
  TransactionFilters,
  CreateTransactionData,
  UpdateTransactionData,
  TransactionsApiError,
  AuthenticationError,
} from '../services/transactions.client';
import { useBudgetsStore } from './budgets.store';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Transactions Store State
 *
 * Complete state structure for transaction management.
 */
export interface TransactionsState {
  // ========== Transaction Data ==========
  /** All transactions matching current filters */
  transactions: Transaction[];

  /** Total number of transactions */
  total: number;

  /** Current filter settings */
  filters: TransactionFilters;

  /** Selected transaction IDs for bulk operations */
  selectedIds: Set<string>;

  // ========== Loading States ==========
  /** General loading state (e.g., fetching transactions) */
  isLoading: boolean;

  /** Creating a new transaction */
  isCreating: boolean;

  /** Updating a transaction (transactionId → updating) */
  isUpdating: Record<string, boolean>;

  /** Deleting a transaction (transactionId → deleting) */
  isDeleting: Record<string, boolean>;

  // ========== Error States ==========
  /** General error message */
  error: string | null;

  /** Create operation error */
  createError: string | null;

  /** Update errors (transactionId → error message) */
  updateErrors: Record<string, string>;

  /** Delete errors (transactionId → error message) */
  deleteErrors: Record<string, string>;

  // ========== State Management Actions ==========
  /**
   * Set all transactions
   */
  setTransactions(transactions: Transaction[]): void;

  /**
   * Add a single transaction
   */
  addTransaction(transaction: Transaction): void;

  /**
   * Update a transaction in the store
   */
  updateTransactionInStore(id: string, updates: Partial<Transaction>): void;

  /**
   * Remove a transaction from the store
   */
  removeTransactionFromStore(id: string): void;

  /**
   * Set filters
   */
  setFilters(filters: Partial<TransactionFilters>): void;

  /**
   * Clear all filters
   */
  clearFilters(): void;

  // ========== Selection Actions ==========
  /**
   * Toggle selection of a transaction
   */
  toggleSelection(id: string): void;

  /**
   * Select all transactions
   */
  selectAll(): void;

  /**
   * Deselect all transactions
   */
  deselectAll(): void;

  /**
   * Check if a transaction is selected
   */
  isSelected(id: string): boolean;

  // ========== API Actions ==========
  /**
   * Fetch transactions from the API with current filters
   */
  fetchTransactions(filters?: TransactionFilters): Promise<void>;

  /**
   * Create a new transaction
   */
  createTransaction(data: CreateTransactionData): Promise<Transaction>;

  /**
   * Update an existing transaction
   */
  updateTransaction(id: string, data: UpdateTransactionData): Promise<Transaction>;

  /**
   * Delete a transaction
   */
  deleteTransaction(id: string): Promise<void>;

  /**
   * Delete multiple transactions
   */
  deleteTransactions(ids: string[]): Promise<void>;

  /**
   * Bulk update category for multiple transactions
   */
  bulkUpdateCategory(ids: string[], categoryId: string): Promise<void>;

  // ========== Error Management ==========
  /**
   * Set general error
   */
  setError(error: string | null): void;

  /**
   * Clear all errors
   */
  clearErrors(): void;

  /**
   * Clear error for a specific transaction
   */
  clearTransactionError(id: string): void;

  // ========== Internal Helpers ==========
  /**
   * Reset all state to initial values
   * @internal
   */
  _reset(): void;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState = {
  transactions: [] as Transaction[],
  total: 0,
  filters: {} as TransactionFilters,
  selectedIds: new Set<string>(),
  isLoading: false,
  isCreating: false,
  isUpdating: {} as Record<string, boolean>,
  isDeleting: {} as Record<string, boolean>,
  error: null as string | null,
  createError: null as string | null,
  updateErrors: {} as Record<string, string>,
  deleteErrors: {} as Record<string, string>,
};

// =============================================================================
// Store Implementation
// =============================================================================

/**
 * Transactions Store
 *
 * Zustand store with immer middleware for immutable updates.
 * Note: No localStorage persistence since transactions can be large.
 */
export const useTransactionsStore = create<TransactionsState>()(
  immer((set, get) => ({
    // Initial state
    ...initialState,

    // ========== State Management Actions ==========

    setTransactions: (transactions) => {
      set((state) => {
        state.transactions = transactions;
        state.total = transactions.length;
        // Clear selections when transactions change
        state.selectedIds = new Set();
      });
    },

    addTransaction: (transaction) => {
      set((state) => {
        // Check if transaction already exists
        const existingIndex = state.transactions.findIndex(
          (t) => t.id === transaction.id
        );

        if (existingIndex >= 0) {
          // Update existing transaction
          state.transactions[existingIndex] = transaction;
        } else {
          // Add new transaction at the beginning
          state.transactions.unshift(transaction);
          state.total += 1;
        }
      });
    },

    updateTransactionInStore: (id, updates) => {
      set((state) => {
        const transaction = state.transactions.find((t) => t.id === id);
        if (transaction) {
          Object.assign(transaction, updates);
        }
      });
    },

    removeTransactionFromStore: (id) => {
      set((state) => {
        const index = state.transactions.findIndex((t) => t.id === id);
        if (index >= 0) {
          state.transactions.splice(index, 1);
          state.total = Math.max(0, state.total - 1);
        }
        // Clean up selection and loading/error states
        state.selectedIds.delete(id);
        delete state.isUpdating[id];
        delete state.isDeleting[id];
        delete state.updateErrors[id];
        delete state.deleteErrors[id];
      });
    },

    setFilters: (filters) => {
      set((state) => {
        state.filters = { ...state.filters, ...filters };
      });
    },

    clearFilters: () => {
      set((state) => {
        state.filters = {};
      });
    },

    // ========== Selection Actions ==========

    toggleSelection: (id) => {
      set((state) => {
        if (state.selectedIds.has(id)) {
          state.selectedIds.delete(id);
        } else {
          state.selectedIds.add(id);
        }
      });
    },

    selectAll: () => {
      set((state) => {
        state.selectedIds = new Set(state.transactions.map((t) => t.id));
      });
    },

    deselectAll: () => {
      set((state) => {
        state.selectedIds = new Set();
      });
    },

    isSelected: (id) => {
      return get().selectedIds.has(id);
    },

    // ========== API Actions ==========

    fetchTransactions: async (filters) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
        if (filters) {
          state.filters = filters;
        }
      });

      try {
        const currentFilters = get().filters;
        const transactions = await transactionsClient.getTransactions(
          filters || currentFilters
        );

        set((state) => {
          state.isLoading = false;
          state.transactions = transactions;
          state.total = transactions.length;
          state.selectedIds = new Set();
        });
      } catch (error) {
        const errorMessage =
          error instanceof AuthenticationError
            ? 'Please log in to view your transactions.'
            : error instanceof TransactionsApiError
              ? error.message
              : 'Failed to fetch transactions. Please try again.';

        set((state) => {
          state.isLoading = false;
          state.error = errorMessage;
        });

        throw error;
      }
    },

    createTransaction: async (data) => {
      set((state) => {
        state.isCreating = true;
        state.createError = null;
      });

      try {
        const transaction = await transactionsClient.createTransaction(data);

        set((state) => {
          state.isCreating = false;
          // Add new transaction at the beginning
          state.transactions.unshift(transaction);
          state.total += 1;
        });

        // Refresh budgets if transaction has a category (affects budget "spent" calculation)
        if (data.categoryId) {
          useBudgetsStore.getState().fetchBudgets().catch(console.error);
        }

        return transaction;
      } catch (error) {
        const errorMessage =
          error instanceof TransactionsApiError
            ? error.message
            : 'Failed to create transaction. Please try again.';

        set((state) => {
          state.isCreating = false;
          state.createError = errorMessage;
        });

        throw error;
      }
    },

    updateTransaction: async (id, data) => {
      set((state) => {
        state.isUpdating[id] = true;
        delete state.updateErrors[id];
      });

      try {
        const transaction = await transactionsClient.updateTransaction(id, data);

        set((state) => {
          state.isUpdating[id] = false;
          // Update transaction in array
          const index = state.transactions.findIndex((t) => t.id === id);
          if (index >= 0) {
            state.transactions[index] = transaction;
          }
        });

        // Refresh budgets if category was updated (affects budget "spent" calculation)
        if (data.categoryId !== undefined) {
          useBudgetsStore.getState().fetchBudgets().catch(console.error);
        }

        return transaction;
      } catch (error) {
        const errorMessage =
          error instanceof TransactionsApiError
            ? error.message
            : 'Failed to update transaction. Please try again.';

        set((state) => {
          state.isUpdating[id] = false;
          state.updateErrors[id] = errorMessage;
        });

        throw error;
      }
    },

    deleteTransaction: async (id) => {
      // Get the transaction before deleting to check if it had a category
      const transactionToDelete = get().transactions.find((t) => t.id === id);
      const hadCategory = !!transactionToDelete?.categoryId;

      set((state) => {
        state.isDeleting[id] = true;
        delete state.deleteErrors[id];
      });

      try {
        await transactionsClient.deleteTransaction(id);

        set((state) => {
          state.isDeleting[id] = false;
          // Remove transaction from array
          const index = state.transactions.findIndex((t) => t.id === id);
          if (index >= 0) {
            state.transactions.splice(index, 1);
            state.total = Math.max(0, state.total - 1);
          }
          // Clear from selection
          state.selectedIds.delete(id);
        });

        // Refresh budgets if transaction had a category (affects budget "spent" calculation)
        if (hadCategory) {
          useBudgetsStore.getState().fetchBudgets().catch(console.error);
        }
      } catch (error) {
        const errorMessage =
          error instanceof TransactionsApiError
            ? error.message
            : 'Failed to delete transaction. Please try again.';

        set((state) => {
          state.isDeleting[id] = false;
          state.deleteErrors[id] = errorMessage;
        });

        throw error;
      }
    },

    deleteTransactions: async (ids) => {
      // Mark all as deleting
      set((state) => {
        ids.forEach((id) => {
          state.isDeleting[id] = true;
          delete state.deleteErrors[id];
        });
      });

      const errors: Record<string, string> = {};
      const successfulIds: string[] = [];

      // Delete each transaction
      for (const id of ids) {
        try {
          await transactionsClient.deleteTransaction(id);
          successfulIds.push(id);
        } catch (error) {
          errors[id] =
            error instanceof TransactionsApiError
              ? error.message
              : 'Failed to delete transaction.';
        }
      }

      // Update state with results
      set((state) => {
        // Remove successful deletions
        successfulIds.forEach((id) => {
          const index = state.transactions.findIndex((t) => t.id === id);
          if (index >= 0) {
            state.transactions.splice(index, 1);
            state.total = Math.max(0, state.total - 1);
          }
          state.selectedIds.delete(id);
          delete state.isDeleting[id];
        });

        // Set errors for failed deletions
        Object.entries(errors).forEach(([id, errorMessage]) => {
          state.isDeleting[id] = false;
          state.deleteErrors[id] = errorMessage;
        });
      });

      // Throw if any failed
      if (Object.keys(errors).length > 0) {
        throw new Error(
          `Failed to delete ${Object.keys(errors).length} transaction(s).`
        );
      }
    },

    bulkUpdateCategory: async (ids, categoryId) => {
      // Mark all as updating
      set((state) => {
        ids.forEach((id) => {
          state.isUpdating[id] = true;
          delete state.updateErrors[id];
        });
      });

      const errors: Record<string, string> = {};
      const successfulUpdates: { id: string; transaction: Transaction }[] = [];

      // Update each transaction
      for (const id of ids) {
        try {
          const transaction = await transactionsClient.updateTransaction(id, {
            categoryId,
          });
          successfulUpdates.push({ id, transaction });
        } catch (error) {
          errors[id] =
            error instanceof TransactionsApiError
              ? error.message
              : 'Failed to update transaction.';
        }
      }

      // Update state with results
      set((state) => {
        // Apply successful updates
        successfulUpdates.forEach(({ id, transaction }) => {
          const index = state.transactions.findIndex((t) => t.id === id);
          if (index >= 0) {
            state.transactions[index] = transaction;
          }
          delete state.isUpdating[id];
        });

        // Set errors for failed updates
        Object.entries(errors).forEach(([id, errorMessage]) => {
          state.isUpdating[id] = false;
          state.updateErrors[id] = errorMessage;
        });

        // Clear selection
        state.selectedIds = new Set();
      });

      // Refresh budgets if any transactions were successfully updated
      // (category changes affect budget "spent" calculations)
      if (successfulUpdates.length > 0) {
        useBudgetsStore.getState().fetchBudgets().catch(console.error);
      }

      // Throw if any failed
      if (Object.keys(errors).length > 0) {
        throw new Error(
          `Failed to update ${Object.keys(errors).length} transaction(s).`
        );
      }
    },

    // ========== Error Management ==========

    setError: (error) => {
      set((state) => {
        state.error = error;
      });
    },

    clearErrors: () => {
      set((state) => {
        state.error = null;
        state.createError = null;
        state.updateErrors = {};
        state.deleteErrors = {};
      });
    },

    clearTransactionError: (id) => {
      set((state) => {
        delete state.updateErrors[id];
        delete state.deleteErrors[id];
      });
    },

    // ========== Internal Helpers ==========

    _reset: () => {
      set(initialState);
    },
  }))
);

// =============================================================================
// Convenience Hooks
// =============================================================================

/**
 * Use full transactions state
 *
 * @returns Complete transactions state and actions
 *
 * @example
 * ```typescript
 * const { transactions, isLoading, fetchTransactions } = useTransactionsStore();
 * ```
 */
export const useTransactionsState = () => useTransactionsStore();

/**
 * Use only transactions array
 *
 * @returns Array of transactions
 *
 * @example
 * ```typescript
 * const transactions = useTransactions();
 * ```
 */
export const useTransactions = () =>
  useTransactionsStore((state) => state.transactions);

/**
 * Use transactions loading state
 *
 * @returns True if transactions are being fetched
 *
 * @example
 * ```typescript
 * const isLoading = useTransactionsLoading();
 * ```
 */
export const useTransactionsLoading = () =>
  useTransactionsStore((state) => state.isLoading);

/**
 * Use transactions error state
 *
 * @returns Current error message or null
 *
 * @example
 * ```typescript
 * const error = useTransactionsError();
 * if (error) {
 *   toast.error(error);
 * }
 * ```
 */
export const useTransactionsError = () =>
  useTransactionsStore((state) => state.error);

/**
 * Use transaction update status
 *
 * @param id - Transaction ID to check
 * @returns True if transaction is being updated
 *
 * @example
 * ```typescript
 * const isUpdating = useTransactionUpdating(transactionId);
 * ```
 */
export const useTransactionUpdating = (id: string) =>
  useTransactionsStore((state) => state.isUpdating[id] ?? false);

/**
 * Use transaction delete status
 *
 * @param id - Transaction ID to check
 * @returns True if transaction is being deleted
 *
 * @example
 * ```typescript
 * const isDeleting = useTransactionDeleting(transactionId);
 * ```
 */
export const useTransactionDeleting = (id: string) =>
  useTransactionsStore((state) => state.isDeleting[id] ?? false);

/**
 * Use transaction by ID
 *
 * @param id - Transaction ID to find
 * @returns Transaction or undefined
 *
 * @example
 * ```typescript
 * const transaction = useTransactionById(transactionId);
 * ```
 */
export const useTransactionById = (id: string) =>
  useTransactionsStore((state) => state.transactions.find((t) => t.id === id));

/**
 * Use selected transaction IDs
 *
 * @returns Set of selected transaction IDs
 *
 * @example
 * ```typescript
 * const selectedIds = useSelectedTransactionIds();
 * console.log(`${selectedIds.size} transactions selected`);
 * ```
 */
export const useSelectedTransactionIds = () =>
  useTransactionsStore((state) => state.selectedIds);

/**
 * Use selected transactions count
 *
 * @returns Number of selected transactions
 *
 * @example
 * ```typescript
 * const count = useSelectedCount();
 * ```
 */
export const useSelectedCount = () =>
  useTransactionsStore((state) => state.selectedIds.size);

/**
 * Use transactions filters
 *
 * @returns Current filter settings
 *
 * @example
 * ```typescript
 * const filters = useTransactionFilters();
 * ```
 */
export const useTransactionFilters = () =>
  useTransactionsStore((state) => state.filters);

/**
 * Use transactions summary statistics
 *
 * @returns Object with total and selection counts
 *
 * @example
 * ```typescript
 * const { total, selectedCount, totalDebit, totalCredit } = useTransactionsSummary();
 * ```
 */
export const useTransactionsSummary = () =>
  useTransactionsStore((state) => ({
    total: state.total,
    selectedCount: state.selectedIds.size,
    totalDebit: state.transactions
      .filter((t) => t.type === 'DEBIT')
      .reduce((sum, t) => sum + t.amount, 0),
    totalCredit: state.transactions
      .filter((t) => t.type === 'CREDIT')
      .reduce((sum, t) => sum + t.amount, 0),
  }));

// =============================================================================
// Exports
// =============================================================================

export default useTransactionsStore;
