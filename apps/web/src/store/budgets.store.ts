/**
 * Budgets State Management Store
 *
 * Zustand store for managing budget state, CRUD operations, and progress tracking.
 * Provides a single source of truth for all budget-related state in the application.
 *
 * Features:
 * - Budget data management with spent amounts
 * - CRUD operations with optimistic updates
 * - Over-budget tracking and alerts
 * - LocalStorage persistence
 * - Error state management
 *
 * @module store/budgets
 *
 * @example
 * ```typescript
 * // Full state access
 * const { budgets, isLoading, fetchBudgets } = useBudgetsStore();
 *
 * // Just budgets
 * const budgets = useBudgets();
 *
 * // Over-budget items
 * const overBudget = useOverBudgetItems();
 *
 * // Loading state
 * const isLoading = useBudgetsLoading();
 * ```
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  budgetsClient,
  Budget,
  CreateBudgetData,
  UpdateBudgetData,
  BudgetsApiError,
  AuthenticationError,
} from '../services/budgets.client';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Budgets Store State
 *
 * Complete state structure for budget management.
 */
export interface BudgetsState {
  // ========== Budget Data ==========
  /** All budgets for the user's family */
  budgets: Budget[];

  /** Total number of budgets */
  total: number;

  /** Number of over-budget items */
  overBudgetCount: number;

  // ========== Loading States ==========
  /** General loading state (e.g., fetching budgets) */
  isLoading: boolean;

  /** Creating a new budget */
  isCreating: boolean;

  /** Updating a budget (budgetId → updating) */
  isUpdating: Record<string, boolean>;

  /** Deleting a budget (budgetId → deleting) */
  isDeleting: Record<string, boolean>;

  // ========== Error States ==========
  /** General error message */
  error: string | null;

  /** Create operation error */
  createError: string | null;

  /** Update errors (budgetId → error message) */
  updateErrors: Record<string, string>;

  /** Delete errors (budgetId → error message) */
  deleteErrors: Record<string, string>;

  // ========== State Management Actions ==========
  /**
   * Set all budgets
   */
  setBudgets(budgets: Budget[]): void;

  /**
   * Add a single budget
   */
  addBudget(budget: Budget): void;

  /**
   * Update a budget in the store
   */
  updateBudgetInStore(id: string, updates: Partial<Budget>): void;

  /**
   * Remove a budget from the store
   */
  removeBudgetFromStore(id: string): void;

  // ========== API Actions ==========
  /**
   * Fetch all budgets from the API
   */
  fetchBudgets(): Promise<void>;

  /**
   * Create a new budget
   */
  createBudget(data: CreateBudgetData): Promise<Budget>;

  /**
   * Update an existing budget
   */
  updateBudget(id: string, data: UpdateBudgetData): Promise<Budget>;

  /**
   * Delete a budget
   */
  deleteBudget(id: string): Promise<void>;

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
   * Clear error for a specific budget
   */
  clearBudgetError(id: string): void;

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
  budgets: [],
  total: 0,
  overBudgetCount: 0,
  isLoading: false,
  isCreating: false,
  isUpdating: {},
  isDeleting: {},
  error: null,
  createError: null,
  updateErrors: {},
  deleteErrors: {},
};

// =============================================================================
// Store Implementation
// =============================================================================

/**
 * Budgets Store
 *
 * Zustand store with immer middleware for immutable updates and
 * persist middleware for localStorage synchronization.
 */
export const useBudgetsStore = create<BudgetsState>()(
  persist(
    immer((set) => ({
      // Initial state
      ...initialState,

      // ========== State Management Actions ==========

      setBudgets: (budgets) => {
        set((state) => {
          state.budgets = budgets;
          state.total = budgets.length;
          state.overBudgetCount = budgets.filter((b) => b.isOverBudget).length;
        });
      },

      addBudget: (budget) => {
        set((state) => {
          // Check if budget already exists
          const existingIndex = state.budgets.findIndex((b) => b.id === budget.id);

          if (existingIndex >= 0) {
            // Update existing budget
            state.budgets[existingIndex] = budget;
          } else {
            // Add new budget at the beginning
            state.budgets.unshift(budget);
            state.total += 1;
          }

          // Recalculate over-budget count
          state.overBudgetCount = state.budgets.filter((b) => b.isOverBudget).length;
        });
      },

      updateBudgetInStore: (id, updates) => {
        set((state) => {
          const budget = state.budgets.find((b) => b.id === id);
          if (budget) {
            Object.assign(budget, updates);
            // Recalculate over-budget count
            state.overBudgetCount = state.budgets.filter((b) => b.isOverBudget).length;
          }
        });
      },

      removeBudgetFromStore: (id) => {
        set((state) => {
          const index = state.budgets.findIndex((b) => b.id === id);
          if (index >= 0) {
            state.budgets.splice(index, 1);
            state.total = Math.max(0, state.total - 1);
            state.overBudgetCount = state.budgets.filter((b) => b.isOverBudget).length;
          }
          // Clean up loading/error states
          delete state.isUpdating[id];
          delete state.isDeleting[id];
          delete state.updateErrors[id];
          delete state.deleteErrors[id];
        });
      },

      // ========== API Actions ==========

      fetchBudgets: async () => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const response = await budgetsClient.getAll();

          set((state) => {
            state.isLoading = false;
            state.budgets = response.budgets;
            state.total = response.total;
            state.overBudgetCount = response.overBudgetCount;
          });
        } catch (error) {
          const errorMessage =
            error instanceof AuthenticationError
              ? 'Please log in to view your budgets.'
              : error instanceof BudgetsApiError
                ? error.message
                : 'Failed to fetch budgets. Please try again.';

          set((state) => {
            state.isLoading = false;
            state.error = errorMessage;
          });

          throw error;
        }
      },

      createBudget: async (data) => {
        set((state) => {
          state.isCreating = true;
          state.createError = null;
        });

        try {
          const budget = await budgetsClient.create(data);

          set((state) => {
            state.isCreating = false;
            // Add new budget at the beginning
            state.budgets.unshift(budget);
            state.total += 1;
            if (budget.isOverBudget) {
              state.overBudgetCount += 1;
            }
          });

          return budget;
        } catch (error) {
          const errorMessage =
            error instanceof BudgetsApiError
              ? error.message
              : 'Failed to create budget. Please try again.';

          set((state) => {
            state.isCreating = false;
            state.createError = errorMessage;
          });

          throw error;
        }
      },

      updateBudget: async (id, data) => {
        set((state) => {
          state.isUpdating[id] = true;
          delete state.updateErrors[id];
        });

        try {
          const budget = await budgetsClient.update(id, data);

          set((state) => {
            state.isUpdating[id] = false;
            // Update budget in array
            const index = state.budgets.findIndex((b) => b.id === id);
            if (index >= 0) {
              state.budgets[index] = budget;
            }
            // Recalculate over-budget count
            state.overBudgetCount = state.budgets.filter((b) => b.isOverBudget).length;
          });

          return budget;
        } catch (error) {
          const errorMessage =
            error instanceof BudgetsApiError
              ? error.message
              : 'Failed to update budget. Please try again.';

          set((state) => {
            state.isUpdating[id] = false;
            state.updateErrors[id] = errorMessage;
          });

          throw error;
        }
      },

      deleteBudget: async (id) => {
        set((state) => {
          state.isDeleting[id] = true;
          delete state.deleteErrors[id];
        });

        try {
          await budgetsClient.delete(id);

          set((state) => {
            state.isDeleting[id] = false;
            // Remove budget from array
            const index = state.budgets.findIndex((b) => b.id === id);
            if (index >= 0) {
              state.budgets.splice(index, 1);
              state.total = Math.max(0, state.total - 1);
            }
            // Recalculate over-budget count
            state.overBudgetCount = state.budgets.filter((b) => b.isOverBudget).length;
          });
        } catch (error) {
          const errorMessage =
            error instanceof BudgetsApiError
              ? error.message
              : 'Failed to delete budget. Please try again.';

          set((state) => {
            state.isDeleting[id] = false;
            state.deleteErrors[id] = errorMessage;
          });

          throw error;
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

      clearBudgetError: (id) => {
        set((state) => {
          delete state.updateErrors[id];
          delete state.deleteErrors[id];
        });
      },

      // ========== Internal Helpers ==========

      _reset: () => {
        set(initialState);
      },
    })),
    {
      name: 'budgets-storage', // LocalStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist certain fields
      partialize: (state) => ({
        budgets: state.budgets,
        total: state.total,
        overBudgetCount: state.overBudgetCount,
      }),
    }
  )
);

// =============================================================================
// Convenience Hooks
// =============================================================================

/**
 * Use full budgets state
 *
 * @returns Complete budgets state and actions
 *
 * @example
 * ```typescript
 * const { budgets, isLoading, fetchBudgets } = useBudgetsStore();
 * ```
 */
export const useBudgetsState = () => useBudgetsStore();

/**
 * Use only budgets array
 *
 * @returns Array of budgets
 *
 * @example
 * ```typescript
 * const budgets = useBudgets();
 * ```
 */
export const useBudgets = () => useBudgetsStore((state) => state.budgets);

/**
 * Use over-budget items only
 *
 * @returns Array of budgets that are over their limit
 *
 * @example
 * ```typescript
 * const overBudget = useOverBudgetItems();
 * if (overBudget.length > 0) {
 *   showAlert('You have exceeded some budgets!');
 * }
 * ```
 */
export const useOverBudgetItems = () =>
  useBudgetsStore((state) => state.budgets.filter((b) => b.isOverBudget));

/**
 * Use budgets loading state
 *
 * @returns True if budgets are being fetched
 *
 * @example
 * ```typescript
 * const isLoading = useBudgetsLoading();
 * ```
 */
export const useBudgetsLoading = () => useBudgetsStore((state) => state.isLoading);

/**
 * Use budgets error state
 *
 * @returns Current error message or null
 *
 * @example
 * ```typescript
 * const error = useBudgetsError();
 * if (error) {
 *   toast.error(error);
 * }
 * ```
 */
export const useBudgetsError = () => useBudgetsStore((state) => state.error);

/**
 * Use budget update status
 *
 * @param id - Budget ID to check
 * @returns True if budget is being updated
 *
 * @example
 * ```typescript
 * const isUpdating = useBudgetUpdating(budgetId);
 * ```
 */
export const useBudgetUpdating = (id: string) =>
  useBudgetsStore((state) => state.isUpdating[id] ?? false);

/**
 * Use budget delete status
 *
 * @param id - Budget ID to check
 * @returns True if budget is being deleted
 *
 * @example
 * ```typescript
 * const isDeleting = useBudgetDeleting(budgetId);
 * ```
 */
export const useBudgetDeleting = (id: string) =>
  useBudgetsStore((state) => state.isDeleting[id] ?? false);

/**
 * Use budget by ID
 *
 * @param id - Budget ID to find
 * @returns Budget or undefined
 *
 * @example
 * ```typescript
 * const budget = useBudgetById(budgetId);
 * ```
 */
export const useBudgetById = (id: string) =>
  useBudgetsStore((state) => state.budgets.find((b) => b.id === id));

/**
 * Use budgets summary statistics
 *
 * @returns Object with total, overBudgetCount, and total amounts
 *
 * @example
 * ```typescript
 * const { total, overBudgetCount, totalBudgeted, totalSpent } = useBudgetsSummary();
 * ```
 */
export const useBudgetsSummary = () =>
  useBudgetsStore((state) => ({
    total: state.total,
    overBudgetCount: state.overBudgetCount,
    totalBudgeted: state.budgets.reduce((sum, b) => sum + b.amount, 0),
    totalSpent: state.budgets.reduce((sum, b) => sum + b.spent, 0),
  }));

// =============================================================================
// Exports
// =============================================================================

export default useBudgetsStore;
