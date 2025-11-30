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

import { useEffect, useCallback, useRef } from 'react';
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
 * Auto-refresh configuration
 * Uses hybrid strategy: baseline polling + smart triggers
 */
const AUTO_REFRESH_CONFIG = {
  /** Baseline refresh interval (10 minutes) */
  BASELINE_INTERVAL: 10 * 60 * 1000,
  /** Minimum time between refreshes (prevent spam) */
  MIN_REFRESH_INTERVAL: 30 * 1000, // 30 seconds
  /** Enable visibility-based refresh (tab focus) */
  REFRESH_ON_FOCUS: true,
  /** Enable periodic baseline refresh */
  ENABLE_BASELINE: true,
} as const;

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
   * Enable automatic refresh with hybrid strategy:
   * - Baseline: every 10 minutes
   * - On tab focus (if enabled)
   * @default false
   */
  enableAutoRefresh?: boolean;

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
    enableAutoRefresh = false,
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

  // Track last refresh time to prevent spam
  const lastRefreshRef = useRef<number>(0);

  // Memoize callbacks to prevent unnecessary re-renders
  const handleFetchSuccess = useCallback(() => {
    lastRefreshRef.current = Date.now();
    onFetchSuccess?.();
  }, [onFetchSuccess]);

  const handleFetchError = useCallback((err: Error) => {
    onFetchError?.(err);
  }, [onFetchError]);

  // Smart refresh function with rate limiting
  const performRefresh = useCallback(async (_source: 'mount' | 'interval' | 'focus') => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshRef.current;

    // Rate limiting: prevent refresh if too soon
    if (timeSinceLastRefresh < AUTO_REFRESH_CONFIG.MIN_REFRESH_INTERVAL) {
      return;
    }

    try {
      await store.fetchBudgets();
      handleFetchSuccess();
    } catch (err) {
      handleFetchError(err as Error);
    }
  }, [store, handleFetchSuccess, handleFetchError]);

  // Initial fetch on mount
  useEffect(() => {
    if (autoFetch && budgets.length === 0) {
      performRefresh('mount');
    }
  }, [autoFetch, budgets.length, performRefresh]);

  // Baseline polling (every 10 minutes)
  useEffect(() => {
    if (!enableAutoRefresh || !AUTO_REFRESH_CONFIG.ENABLE_BASELINE) {
      return;
    }

    const intervalId = setInterval(() => {
      performRefresh('interval');
    }, AUTO_REFRESH_CONFIG.BASELINE_INTERVAL);

    return () => clearInterval(intervalId);
  }, [enableAutoRefresh, performRefresh]);

  // Visibility API: refresh on tab focus
  useEffect(() => {
    if (!enableAutoRefresh || !AUTO_REFRESH_CONFIG.REFRESH_ON_FOCUS) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performRefresh('focus');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enableAutoRefresh, performRefresh]);

  // Refresh budgets (manual trigger)
  const refresh = useCallback(async () => {
    try {
      await store.fetchBudgets();
      handleFetchSuccess();
    } catch (err) {
      handleFetchError(err as Error);
      throw err;
    }
  }, [store, handleFetchSuccess, handleFetchError]);

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
