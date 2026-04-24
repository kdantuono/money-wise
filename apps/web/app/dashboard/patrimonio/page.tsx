'use client';

import { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { usePatrimonio } from '@/hooks/usePatrimonio';
import { useActiveGoals } from '@/hooks/useActiveGoals';
import { computeNetWorth, type FinancialInstrument } from '@/services/financial-instruments.client';
import { PatrimonioHeader } from '@/components/patrimonio/PatrimonioHeader';
import {
  PatrimonioTabs,
  type PatrimonioTab,
} from '@/components/patrimonio/PatrimonioTabs';
import { InstrumentGroup } from '@/components/patrimonio/InstrumentGroup';
import { EmptyState } from '@/components/patrimonio/EmptyState';

// =============================================================================
// Grouping semantics (design doc §3.4)
// =============================================================================

const GROUP_LABELS: Record<string, string> = {
  CHECKING: 'Banche',
  SAVINGS: 'Banche',
  INVESTMENT: 'Investimenti',
  CASH: 'Contanti',
  OTHER: 'Altri',
  CREDIT_CARD: 'Carte di credito',
  LOAN: 'Finanziamenti',
  MORTGAGE: 'Mutui',
  BNPL: 'BNPL',
};

const GROUP_ORDER = [
  'Banche',
  'Investimenti',
  'Contanti',
  'Altri',
  'Carte di credito',
  'Finanziamenti',
  'Mutui',
  'BNPL',
];

function groupInstruments(items: FinancialInstrument[]): Map<string, FinancialInstrument[]> {
  const groups = new Map<string, FinancialInstrument[]>();
  for (const label of GROUP_ORDER) groups.set(label, []);
  for (const item of items) {
    const label = GROUP_LABELS[item.type.toUpperCase()] ?? 'Altri';
    const existing = groups.get(label) ?? [];
    existing.push(item);
    groups.set(label, existing);
  }
  return groups;
}

// =============================================================================
// Page
// =============================================================================

export default function PatrimonioPage() {
  const [tab, setTab] = useState<PatrimonioTab>('all');

  const { data: instruments, isLoading, error } = usePatrimonio();
  const { data: goals = [] } = useActiveGoals();

  // Memoized derived state
  const allNetWorth = useMemo(
    () => (instruments ? computeNetWorth(instruments) : null),
    [instruments],
  );

  const tabCounts = useMemo(() => {
    const all = instruments ?? [];
    return {
      total: all.length,
      assets: all.filter((i) => i.class === 'ASSET').length,
      liabilities: all.filter((i) => i.class === 'LIABILITY').length,
      byGoal: all.filter((i) => i.goalId !== null).length,
    };
  }, [instruments]);

  const filteredInstruments = useMemo(() => {
    const all = instruments ?? [];
    if (tab === 'assets') return all.filter((i) => i.class === 'ASSET');
    if (tab === 'liabilities') return all.filter((i) => i.class === 'LIABILITY');
    if (tab === 'by-goal') return all.filter((i) => i.goalId !== null);
    return all;
  }, [instruments, tab]);

  const grouped = useMemo(() => groupInstruments(filteredInstruments), [filteredInstruments]);

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Patrimonio</h1>
        <Card className="p-6 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 dark:text-red-100">
                Errore nel caricamento del patrimonio
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {error.message}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="patrimonio-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Patrimonio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vista unificata di tutti i tuoi conti, investimenti e debiti.
        </p>
      </div>

      <PatrimonioHeader
        netWorth={
          allNetWorth ?? {
            assets: 0,
            liabilities: 0,
            netWorth: 0,
            currency: 'EUR',
            count: { asset: 0, liability: 0 },
          }
        }
        isLoading={isLoading}
      />

      {!isLoading && instruments && instruments.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <PatrimonioTabs value={tab} onChange={setTab} counts={tabCounts} />

          {isLoading ? (
            <div className="space-y-2" data-testid="patrimonio-loading-skeleton">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-muted/40 animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from(grouped.entries()).map(([label, items]) => (
                <InstrumentGroup
                  key={label}
                  label={label}
                  instruments={items}
                  goals={goals}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
