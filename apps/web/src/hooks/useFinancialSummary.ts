/**
 * Financial Summary Hook
 *
 * React Query hook for fetching financial summary data including net worth,
 * total assets, and total liabilities from the accounts API.
 *
 * @module hooks/useFinancialSummary
 *
 * @example
 * ```typescript
 * const { data, isLoading, error } = useFinancialSummary();
 * if (data) {
 *   console.log(`Net Worth: ${data.netWorth}`);
 * }
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { accountsClient } from '@/services/accounts.client';
import type { FinancialSummary } from '@/types/account.types';

/**
 * Hook to fetch financial summary with net worth calculation
 *
 * Uses React Query for caching and automatic refetching.
 * Data is cached for 5 minutes (staleTime: 300000ms).
 *
 * @returns React Query result with financial summary data
 */
export function useFinancialSummary() {
  return useQuery<FinancialSummary>({
    queryKey: ['financial-summary'],
    queryFn: () => accountsClient.getFinancialSummary(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: true,
  });
}
