/**
 * useBudgets Hook
 *
 * Convenience hook for budget management that wraps the Zustand store
 * with additional utilities for common operations.
 *
 * Features:
 * - Auto-fetch budgets on mount
 * - Computed properties for UI
 * - Loading and error state management
 * - CRUD operations with callbacks
 *
 * @module hooks/useBudgets
 *
 * @example
 * ```typescript
 * const {
 *   budgets,
 *   isLoading,
 *   error,
 *   overBudgetItems,
 *   summary,
 *   createBudget,
 *   updateBudget,
 *   deleteBudget,
 *   refresh,
 * } = useBudgets();
 * ```
 */

import { useEffect, useCallback } from 'react';
import {
  useBudgetsStore,
  useBudgets as useBudgetsSelector,
  useBudgetsLoading,
  useBudgetsError,
  useOverBudgetItems,
  useBudgetsSummary,
} from '../store/budgets.store';
import type { CreateBudgetData, UpdateBudgetData, Budget } from '../services/budgets.client';

/**
 * Options for useBudgets hook
 */
export interface UseBudgetsOptions {
  /**
   * Whether to auto-fetch budgets on mount
   * @default true
   */
  autoFetch?: boolean;

  /**
   * Callback when fetch succeeds
   */
  onFetchSuccess?: () => void;

  /**
   * Callback when fetch fails
   */
  onFetchError?: (error: Error) => void;

  /**
   * Callback when create succeeds
   */
  onCreateSuccess?: (budget: Budget) => void;

  /**
   * Callback when create fails
   */
  onCreateError?: (error: Error) => void;

  /**
   * Callback when update succeeds
   */
  onUpdateSuccess?: (budget: Budget) => void;

  /**
   * Callback when update fails
   */
  onUpdateError?: (error: Error) => void;

  /**
   * Callback when delete succeeds
   */
  onDeleteSuccess?: (id: string) => void;

  /**
   * Callback when delete fails
   */
  onDeleteError?: (error: Error) => void;
}

/**
 * useBudgets Hook
 *
 * Main hook for budget management with auto-fetch and callbacks.
 *
 * @param options - Configuration options
 * @returns Budget state and operations
 */
export function useBudgets(options: UseBudgetsOptions = {}) {
  const {
    autoFetch = true,
    onFetchSuccess,
    onFetchError,
    onCreateSuccess,
    onCreateError,
    onUpdateSuccess,
    onUpdateError,
    onDeleteSuccess,
    onDeleteError,
  } = options;

  // Store selectors
  const budgets = useBudgetsSelector();
  const isLoading = useBudgetsLoading();
  const error = useBudgetsError();
  const overBudgetItems = useOverBudgetItems();
  const summary = useBudgetsSummary();

  // Store actions
  const store = useBudgetsStore();

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && budgets.length === 0) {
      store.fetchBudgets()
        .then(() => {
          onFetchSuccess?.();
        })
        .catch((err) => {
          onFetchError?.(err);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch]);

  // Refresh budgets
  const refresh = useCallback(async () => {
    try {
      await store.fetchBudgets();
      onFetchSuccess?.();
    } catch (err) {
      onFetchError?.(err as Error);
      throw err;
    }
  }, [store, onFetchSuccess, onFetchError]);

  // Create budget
  const createBudget = useCallback(async (data: CreateBudgetData) => {
    try {
      const budget = await store.createBudget(data);
      onCreateSuccess?.(budget);
      return budget;
    } catch (err) {
      onCreateError?.(err as Error);
      throw err;
    }
  }, [store, onCreateSuccess, onCreateError]);

  // Update budget
  const updateBudget = useCallback(async (id: string, data: UpdateBudgetData) => {
    try {
      const budget = await store.updateBudget(id, data);
      onUpdateSuccess?.(budget);
      return budget;
    } catch (err) {
      onUpdateError?.(err as Error);
      throw err;
    }
  }, [store, onUpdateSuccess, onUpdateError]);

  // Delete budget
  const deleteBudget = useCallback(async (id: string) => {
    try {
      await store.deleteBudget(id);
      onDeleteSuccess?.(id);
    } catch (err) {
      onDeleteError?.(err as Error);
      throw err;
    }
  }, [store, onDeleteSuccess, onDeleteError]);

  // Clear errors
  const clearErrors = useCallback(() => {
    store.clearErrors();
  }, [store]);

  return {
    // Data
    budgets,
    overBudgetItems,
    summary,

    // Loading states
    isLoading,
    isCreating: store.isCreating,
    isUpdating: store.isUpdating,
    isDeleting: store.isDeleting,

    // Error states
    error,
    createError: store.createError,
    updateErrors: store.updateErrors,
    deleteErrors: store.deleteErrors,

    // Actions
    refresh,
    createBudget,
    updateBudget,
    deleteBudget,
    clearErrors,

    // Helpers
    getBudgetById: (id: string) => budgets.find((b) => b.id === id),
    isBudgetUpdating: (id: string) => store.isUpdating[id] ?? false,
    isBudgetDeleting: (id: string) => store.isDeleting[id] ?? false,
    getBudgetError: (id: string) => store.updateErrors[id] || store.deleteErrors[id],
  };
}

export default useBudgets;
