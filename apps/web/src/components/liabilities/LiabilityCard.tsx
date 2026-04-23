'use client';

import { memo, useMemo } from 'react';
import {
  CreditCard,
  ShoppingBag,
  Landmark,
  Home,
  CircleDot,
  Calendar,
  Percent,
  Euro,
} from 'lucide-react';
import type { Liability, LiabilityType } from '@/services/liabilities.client';

// =============================================================================
// Type Definitions
// =============================================================================

export interface LiabilityCardProps {
  liability: Liability;
  onClick?: (liability: Liability) => void;
  compact?: boolean;
  /** Sprint 1.6 Fase 2B: name of linked goal, rendered as badge */
  goalName?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function TypeIcon({ type, className }: { type: LiabilityType; className?: string }) {
  switch (type) {
    case 'CREDIT_CARD':
      return <CreditCard className={className} />;
    case 'BNPL':
      return <ShoppingBag className={className} />;
    case 'LOAN':
      return <Landmark className={className} />;
    case 'MORTGAGE':
      return <Home className={className} />;
    default:
      return <CircleDot className={className} />;
  }
}

function getTypeColors(type: LiabilityType): { bg: string; text: string; icon: string } {
  switch (type) {
    case 'CREDIT_CARD':
      return { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', icon: 'text-purple-500' };
    case 'BNPL':
      return { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', icon: 'text-orange-500' };
    case 'LOAN':
      return { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', icon: 'text-blue-500' };
    case 'MORTGAGE':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', icon: 'text-emerald-500' };
    default:
      return { bg: 'bg-muted', text: 'text-muted-foreground', icon: 'text-muted-foreground' };
  }
}

// #047: italianized type labels
function getTypeLabel(type: LiabilityType): string {
  switch (type) {
    case 'CREDIT_CARD':
      return 'Carta di credito';
    case 'BNPL':
      return 'Buy Now Pay Later';
    case 'LOAN':
      return 'Finanziamento';
    case 'MORTGAGE':
      return 'Mutuo';
    default:
      return 'Altro';
  }
}

// #047: EUR default + it-IT locale per formatting numerico italiano
function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'N/D';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function getUtilizationColor(percent: number): string {
  if (percent >= 90) return 'bg-rose-500';
  if (percent >= 70) return 'bg-orange-500';
  if (percent >= 50) return 'bg-amber-500';
  return 'bg-emerald-500';
}

// =============================================================================
// Component
// =============================================================================

export const LiabilityCard = memo(function LiabilityCard({
  liability,
  onClick,
  compact = false,
  goalName,
}: LiabilityCardProps) {
  const colors = getTypeColors(liability.type);
  const typeLabel = getTypeLabel(liability.type);

  const utilizationPercent = useMemo(() => {
    if (liability.creditLimit && liability.creditLimit > 0) {
      return Math.min(100, (liability.currentBalance / liability.creditLimit) * 100);
    }
    return null;
  }, [liability.currentBalance, liability.creditLimit]);

  const handleClick = () => {
    if (onClick) onClick(liability);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  if (compact) {
    return (
      <div
        role="button"
        tabIndex={onClick ? 0 : undefined}
        onClick={handleClick}
        onKeyDown={onClick ? handleKeyDown : undefined}
        className={`flex items-center gap-3 p-3 rounded-xl border border-border bg-card transition-colors
          ${onClick ? 'cursor-pointer hover:border-border hover:shadow-sm' : ''}`}
      >
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <TypeIcon type={liability.type} className={`h-4 w-4 ${colors.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{liability.name}</p>
          <p className="text-sm text-muted-foreground">{typeLabel}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-foreground tabular-nums">
            {formatCurrency(liability.currentBalance, liability.currency)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <article
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      className={`rounded-2xl border-0 bg-card p-5 shadow-sm transition-all
        ${onClick ? 'cursor-pointer hover:shadow-md' : ''}
        focus:outline-none focus:ring-2 focus:ring-blue-500`}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-2xl ${colors.bg}`}>
          <TypeIcon type={liability.type} className={`h-6 w-6 ${colors.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{liability.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${colors.bg} ${colors.text}`}
            >
              {typeLabel}
            </span>
            {liability.provider && (
              <span className="text-xs text-muted-foreground">{liability.provider}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {formatCurrency(liability.currentBalance, liability.currency)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Saldo attuale</p>
        </div>
      </div>

      {/* Credit utilization bar (solo per carte di credito) */}
      {utilizationPercent !== null && liability.creditLimit && (
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">Utilizzo credito</span>
            <span className="font-medium text-foreground tabular-nums">
              {utilizationPercent.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getUtilizationColor(utilizationPercent)}`}
              style={{ width: `${utilizationPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1.5 tabular-nums">
            <span>Usato: {formatCurrency(liability.currentBalance, liability.currency)}</span>
            <span>Limite: {formatCurrency(liability.creditLimit, liability.currency)}</span>
          </div>
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
        {liability.interestRate !== undefined && liability.interestRate > 0 && (
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">TAEG</p>
              <p className="text-sm font-medium text-foreground tabular-nums">
                {liability.interestRate.toFixed(2)}%
              </p>
            </div>
          </div>
        )}

        {liability.minimumPayment !== undefined && liability.minimumPayment > 0 && (
          <div className="flex items-center gap-2">
            <Euro className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Rata minima</p>
              <p className="text-sm font-medium text-foreground tabular-nums">
                {formatCurrency(liability.minimumPayment, liability.currency)}
              </p>
            </div>
          </div>
        )}

        {liability.nextPaymentDate && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Prossima rata</p>
              <p className="text-sm font-medium text-foreground">
                {formatDate(liability.nextPaymentDate)}
              </p>
            </div>
          </div>
        )}

        {liability.availableCredit !== undefined && (
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Disponibile</p>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatCurrency(liability.availableCredit, liability.currency)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status badge (non-ACTIVE) */}
      {liability.status !== 'ACTIVE' && (
        <div className="mt-4">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${liability.status === 'PAID_OFF'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-muted text-muted-foreground'
              }`}
          >
            {liability.status === 'PAID_OFF' ? 'Estinto' : 'Chiuso'}
          </span>
        </div>
      )}

      {/* Sprint 1.6 Fase 2B: goal link badge */}
      {liability.goalId && goalName && (
        <div className="mt-4">
          <span
            data-testid="liability-goal-badge"
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-600 dark:text-emerald-400 max-w-full"
            title={`Payoff verso ${goalName}`}
          >
            <span aria-hidden="true">🎯</span>
            <span className="truncate">{goalName}</span>
          </span>
        </div>
      )}
    </article>
  );
});

export default LiabilityCard;
