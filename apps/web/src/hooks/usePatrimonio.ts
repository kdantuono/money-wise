/**
 * usePatrimonio — TanStack Query hook per ADR-005 Fase 2.1 unified view.
 *
 * QueryKey: ['patrimonio', filter] — filtro discriminato (class/goalId/status).
 * Cache invalidation: triggered da mutazioni accounts/liabilities clients.
 * StaleTime: 30s — sufficient per UX dashboard, evita refetch eccessivo.
 */

import { useQuery } from '@tanstack/react-query';
import {
  financialInstrumentsClient,
  computeNetWorth,
  type FinancialInstrument,
  type InstrumentFilter,
  type NetWorthResult,
} from '@/services/financial-instruments.client';

/**
 * Load financial instruments con filter opzionale.
 */
export function usePatrimonio(filter?: InstrumentFilter) {
  return useQuery<FinancialInstrument[]>({
    queryKey: ['patrimonio', filter],
    queryFn: () => financialInstrumentsClient.list(filter),
    staleTime: 30_000,
  });
}

/**
 * Net worth aggregato dal patrimonio corrente (client-side compute).
 * Deriva da usePatrimonio() senza doppia query.
 */
export function usePatrimonioNetWorth(filter?: InstrumentFilter): {
  data: NetWorthResult | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const patrimonioQuery = usePatrimonio(filter);
  const data = patrimonioQuery.data ? computeNetWorth(patrimonioQuery.data) : undefined;
  return {
    data,
    isLoading: patrimonioQuery.isLoading,
    error: patrimonioQuery.error as Error | null,
  };
}
