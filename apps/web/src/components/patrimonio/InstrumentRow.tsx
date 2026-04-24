'use client';

import {
  Wallet,
  PiggyBank,
  CreditCard,
  Banknote,
  TrendingUp,
  Home,
  ShoppingBag,
  Target,
} from 'lucide-react';
import type { FinancialInstrument } from '@/services/financial-instruments.client';
import type { Goal } from '@/services/goals.client';

interface InstrumentRowProps {
  instrument: FinancialInstrument;
  goals?: Goal[];
}

/**
 * Render icona per type+class. Ritorna JSX direttamente invece della component
 * reference per evitare `react-hooks/static-components` lint warning.
 */
function renderInstrumentIcon(
  type: string,
  cls: 'ASSET' | 'LIABILITY',
  className: string,
) {
  const t = type.toUpperCase();
  if (cls === 'LIABILITY') {
    if (t === 'MORTGAGE') return <Home className={className} />;
    if (t === 'BNPL') return <ShoppingBag className={className} />;
    return <CreditCard className={className} />;
  }
  if (t === 'SAVINGS') return <PiggyBank className={className} />;
  if (t === 'INVESTMENT') return <TrendingUp className={className} />;
  if (t === 'CASH') return <Banknote className={className} />;
  return <Wallet className={className} />;
}

function getTypeLabel(type: string, cls: 'ASSET' | 'LIABILITY'): string {
  const t = type.toUpperCase();
  if (cls === 'LIABILITY') {
    if (t === 'CREDIT_CARD') return 'Carta di credito';
    if (t === 'MORTGAGE') return 'Mutuo';
    if (t === 'LOAN') return 'Finanziamento';
    if (t === 'BNPL') return 'BNPL';
    return t;
  }
  if (t === 'CHECKING') return 'Conto corrente';
  if (t === 'SAVINGS') return 'Risparmio';
  if (t === 'INVESTMENT') return 'Investimento';
  if (t === 'CASH') return 'Contante';
  return t;
}

/**
 * Row unified asset/liability. Layout identico, colore differenzia classe.
 */
export function InstrumentRow({ instrument, goals = [] }: InstrumentRowProps) {
  const isLiability = instrument.class === 'LIABILITY';
  const linkedGoal = instrument.goalId
    ? goals.find((g) => g.id === instrument.goalId)
    : null;

  return (
    <div
      data-testid={`instrument-row-${instrument.id}`}
      data-class={instrument.class}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/40"
    >
      <div
        className={`shrink-0 p-2.5 rounded-xl ${
          isLiability
            ? 'bg-red-100 dark:bg-red-950/40'
            : 'bg-emerald-100 dark:bg-emerald-950/40'
        }`}
      >
        {renderInstrumentIcon(
          instrument.type,
          instrument.class,
          `w-5 h-5 ${
            isLiability
              ? 'text-red-700 dark:text-red-400'
              : 'text-emerald-700 dark:text-emerald-400'
          }`,
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-foreground truncate">{instrument.name}</p>
          {linkedGoal && (
            <span
              data-testid={`instrument-goal-badge-${instrument.id}`}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
              title={`Linkato a goal: ${linkedGoal.name}`}
            >
              <Target className="w-3 h-3" />
              {linkedGoal.name}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {getTypeLabel(instrument.type, instrument.class)}
          {instrument.institutionName && ` · ${instrument.institutionName}`}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          data-testid={`instrument-balance-${instrument.id}`}
          className={`font-semibold ${
            isLiability
              ? 'text-red-700 dark:text-red-400'
              : 'text-foreground'
          }`}
        >
          &euro;{instrument.currentBalance.toLocaleString('it-IT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
        {isLiability && (
          <p className="text-xs text-muted-foreground">debito</p>
        )}
      </div>
    </div>
  );
}
