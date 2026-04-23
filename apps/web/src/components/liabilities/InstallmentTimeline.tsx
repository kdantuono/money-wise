'use client';

import { memo, useMemo } from 'react';
import { Check, Clock, AlertCircle } from 'lucide-react';
import type { InstallmentPlan, Installment } from '@/services/liabilities.client';

// =============================================================================
// Type Definitions
// =============================================================================

export interface InstallmentTimelineProps {
  /** The installment plan to display */
  plan: InstallmentPlan;
  /** Callback when an installment is clicked */
  onInstallmentClick?: (installment: Installment) => void;
  /** Whether to show in compact mode */
  compact?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

// #047: EUR default + it-IT locale
function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function isOverdue(dateString: string, isPaid: boolean): boolean {
  if (isPaid) return false;
  const dueDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function isDueSoon(dateString: string, isPaid: boolean, daysThreshold: number = 7): boolean {
  if (isPaid) return false;
  const dueDate = new Date(dateString);
  const today = new Date();
  const thresholdDate = new Date(today);
  thresholdDate.setDate(today.getDate() + daysThreshold);
  return dueDate >= today && dueDate <= thresholdDate;
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * InstallmentTimeline Component
 *
 * Visual timeline showing paid and upcoming installments for a payment plan.
 */
export const InstallmentTimeline = memo(function InstallmentTimeline({
  plan,
  onInstallmentClick,
  compact = false,
}: InstallmentTimelineProps) {
  // Sort installments by number
  const sortedInstallments = useMemo(() => {
    return [...plan.installments].sort(
      (a, b) => a.installmentNumber - b.installmentNumber
    );
  }, [plan.installments]);

  // Calculate progress
  const progress = useMemo(() => {
    const paid = plan.numberOfInstallments - plan.remainingInstallments;
    return (paid / plan.numberOfInstallments) * 100;
  }, [plan.numberOfInstallments, plan.remainingInstallments]);

  const handleClick = (installment: Installment) => {
    if (onInstallmentClick) {
      onInstallmentClick(installment);
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground tabular-nums">
            {plan.numberOfInstallments - plan.remainingInstallments} di{' '}
            {plan.numberOfInstallments} pagate
          </span>
        </div>

        {/* Compact installment dots */}
        <div className="flex gap-1 flex-wrap">
          {sortedInstallments.map((inst) => (
            <button
              key={inst.id}
              type="button"
              onClick={() => handleClick(inst)}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                ${
                  inst.isPaid
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : isOverdue(inst.dueDate, inst.isPaid)
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : isDueSoon(inst.dueDate, inst.isPaid)
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    : 'bg-muted text-muted-foreground'
                }
                ${onInstallmentClick ? 'cursor-pointer hover:ring-2 hover:ring-blue-300' : ''}`}
              title={`Rata ${inst.installmentNumber}: ${formatCurrency(inst.amount, plan.currency)} — ${inst.isPaid ? 'Pagata' : formatDate(inst.dueDate)}`}
            >
              {inst.installmentNumber}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Piano di pagamento</h3>
        <span className="text-sm text-muted-foreground tabular-nums">
          {plan.numberOfInstallments - plan.remainingInstallments} di{' '}
          {plan.numberOfInstallments} rate pagate
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {sortedInstallments.map((inst, index) => {
          const overdue = isOverdue(inst.dueDate, inst.isPaid);
          const dueSoon = isDueSoon(inst.dueDate, inst.isPaid);

          return (
            <div
              key={inst.id}
              role={onInstallmentClick ? 'button' : undefined}
              tabIndex={onInstallmentClick ? 0 : undefined}
              onClick={() => handleClick(inst)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && onInstallmentClick) {
                  e.preventDefault();
                  handleClick(inst);
                }
              }}
              className={`flex items-center gap-4 p-3 rounded-2xl border transition-all
                ${
                  inst.isPaid
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : overdue
                    ? 'bg-rose-500/10 border-rose-500/20'
                    : dueSoon
                    ? 'bg-amber-500/10 border-amber-500/20'
                    : 'bg-card border-border'
                }
                ${onInstallmentClick ? 'cursor-pointer hover:shadow-md' : ''}`}
            >
              {/* Status icon */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                  ${
                    inst.isPaid
                      ? 'bg-emerald-500 text-white'
                      : overdue
                      ? 'bg-rose-500 text-white'
                      : dueSoon
                      ? 'bg-amber-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
              >
                {inst.isPaid ? (
                  <Check className="h-4 w-4" />
                ) : overdue ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    Rata {inst.installmentNumber}
                  </span>
                  {inst.isPaid && (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs rounded-full border border-emerald-500/20">
                      Pagata
                    </span>
                  )}
                  {overdue && (
                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs rounded-full border border-rose-500/20">
                      Scaduta
                    </span>
                  )}
                  {dueSoon && !overdue && (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs rounded-full border border-amber-500/20">
                      In scadenza
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {inst.isPaid && inst.paidAt
                    ? `Pagata il ${formatDate(inst.paidAt)}`
                    : `Scade il ${formatDate(inst.dueDate)}`}
                </p>
              </div>

              {/* Amount */}
              <div className="text-right">
                <p
                  className={`font-semibold tabular-nums ${
                    inst.isPaid
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : overdue
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-foreground'
                  }`}
                >
                  {formatCurrency(inst.amount, plan.currency)}
                </p>
              </div>

              {/* Connector line (except last item) */}
              {index < sortedInstallments.length - 1 && (
                <div
                  className="absolute left-7 top-12 w-0.5 h-6 bg-muted"
                  style={{ marginLeft: '1px' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="flex justify-between pt-4 border-t border-border">
        <span className="text-muted-foreground">Importo totale</span>
        <span className="font-semibold text-foreground tabular-nums">
          {formatCurrency(plan.totalAmount, plan.currency)}
        </span>
      </div>

      {plan.isPaidOff && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
          <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
            Piano di pagamento completato!
          </span>
        </div>
      )}
    </div>
  );
});

export default InstallmentTimeline;
