'use client';

import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import type { NetWorthResult } from '@/services/financial-instruments.client';

interface PatrimonioHeaderProps {
  netWorth: NetWorthResult;
  isLoading: boolean;
}

/**
 * Header card con net worth display + conteggi asset/debiti.
 * Fase 2.1: no trend (Q2 lock ADR-005).
 */
export function PatrimonioHeader({ netWorth, isLoading }: PatrimonioHeaderProps) {
  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200/50 dark:border-blue-800/50">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-blue-200/50 dark:bg-blue-800/30 rounded w-32" />
          <div className="h-10 bg-blue-200/50 dark:bg-blue-800/30 rounded w-48" />
          <div className="h-3 bg-blue-200/50 dark:bg-blue-800/30 rounded w-64" />
        </div>
      </Card>
    );
  }

  const positive = netWorth.netWorth >= 0;

  return (
    <Card
      data-testid="patrimonio-header"
      className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200/50 dark:border-blue-800/50"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground font-medium mb-1">
            Patrimonio Netto
          </p>
          <p
            data-testid="net-worth-value"
            className={`text-3xl font-bold tracking-tight ${
              positive
                ? 'text-blue-900 dark:text-blue-100'
                : 'text-red-700 dark:text-red-300'
            }`}
          >
            &euro;{netWorth.netWorth.toLocaleString('it-IT', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
            <span>
              Asset{' '}
              <span
                data-testid="total-assets"
                className="font-semibold text-emerald-700 dark:text-emerald-400"
              >
                &euro;{netWorth.assets.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
            </span>
            <span>&middot;</span>
            <span>
              Debiti{' '}
              <span
                data-testid="total-liabilities"
                className="font-semibold text-red-700 dark:text-red-400"
              >
                &euro;{netWorth.liabilities.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
            </span>
            <span>&middot;</span>
            <span className="text-xs">
              <span data-testid="asset-count">{netWorth.count.asset}</span> +{' '}
              <span data-testid="liability-count">{netWorth.count.liability}</span> strumenti
            </span>
          </div>
        </div>
        <div className="shrink-0 p-3 rounded-xl bg-blue-100 dark:bg-blue-900/50">
          <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    </Card>
  );
}
