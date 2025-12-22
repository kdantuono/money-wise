/**
 * Available to Spend Hook
 *
 * Calculates available spending amount based on active budgets.
 * Formula: sum(budget.amount) - sum(budget.spent) across all active budgets.
 *
 * @module hooks/useAvailableToSpend
 *
 * @example
 * ```typescript
 * const { data, isLoading } = useAvailableToSpend();
 * if (data) {
 *   console.log(`Safe to Spend: ${data.availableToSpend}`);
 * }
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { budgetsClient } from '@/services/budgets.client';
import type { Budget } from '@/services/budgets.client';

/**
 * Available to spend calculation result
 */
export interface AvailableToSpendData {
  /** Total amount available to spend (limit - spent) */
  availableToSpend: number;
  /** Total budget limit across all active budgets */
  totalBudget: number;
  /** Total spent across all active budgets */
  totalSpent: number;
  /** Percentage of budget remaining (0-100) */
  percentRemaining: number;
  /** Number of active budgets */
  budgetCount: number;
}

/**
 * Hook to fetch and calculate available to spend amount
 *
 * Uses budgets API to fetch all budgets and calculates:
 * - Total budget limit
 * - Total spent
 * - Available to spend (limit - spent)
 * - Percentage remaining
 *
 * Data is cached for 2 minutes (staleTime: 120000ms).
 *
 * @returns React Query result with available to spend data
 */
export function useAvailableToSpend() {
  return useQuery<AvailableToSpendData>({
    queryKey: ['available-to-spend'],
    queryFn: async () => {
      const response = await budgetsClient.getAll();

      // Filter only active budgets
      const activeBudgets = response.budgets.filter(
        (budget: Budget) => budget.status === 'ACTIVE'
      );

      // Calculate totals
      const totalBudget = activeBudgets.reduce(
        (sum: number, budget: Budget) => sum + budget.amount,
        0
      );

      const totalSpent = activeBudgets.reduce(
        (sum: number, budget: Budget) => sum + budget.spent,
        0
      );

      const availableToSpend = totalBudget - totalSpent;
      const percentRemaining = totalBudget > 0
        ? ((availableToSpend / totalBudget) * 100)
        : 0;

      return {
        availableToSpend,
        totalBudget,
        totalSpent,
        percentRemaining: Math.max(0, percentRemaining), // Ensure non-negative
        budgetCount: activeBudgets.length,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    refetchOnWindowFocus: true,
  });
}
