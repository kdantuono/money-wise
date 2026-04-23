'use client';

import { memo, useMemo } from 'react';
import { Clock, AlertTriangle, ChevronRight, CreditCard } from 'lucide-react';
import type { Liability } from '@/services/liabilities.client';

// =============================================================================
// Types
// =============================================================================

export interface UpcomingPayment {
  id: string;
  liabilityId: string;
  liabilityName: string;
  liabilityType: string;
  amount: number;
  currency: string;
  dueDate: string;
  isOverdue: boolean;
  isDueSoon: boolean;
  type: 'minimum_payment' | 'installment';
  installmentNumber?: number;
  totalInstallments?: number;
}

export interface UpcomingPaymentsProps {
  liabilities: Liability[];
  limit?: number;
  onPaymentClick?: (payment: UpcomingPayment) => void;
  onViewAll?: () => void;
  compact?: boolean;
}

// =============================================================================
// Helpers
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
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate.getTime() === today.getTime()) {
    return 'Oggi';
  }
  if (targetDate.getTime() === tomorrow.getTime()) {
    return 'Domani';
  }

  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function getDaysUntil(dateString: string): number {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function isOverdue(dateString: string): boolean {
  return getDaysUntil(dateString) < 0;
}

function isDueSoon(dateString: string, daysThreshold: number = 7): boolean {
  const days = getDaysUntil(dateString);
  return days >= 0 && days <= daysThreshold;
}

// #047: italianized type labels
function getTypeLabel(type: string): string {
  switch (type) {
    case 'CREDIT_CARD':
      return 'Carta di credito';
    case 'BNPL':
      return 'BNPL';
    case 'LOAN':
      return 'Finanziamento';
    case 'MORTGAGE':
      return 'Mutuo';
    default:
      return 'Altro';
  }
}

function extractUpcomingPayments(liabilities: Liability[]): UpcomingPayment[] {
  const payments: UpcomingPayment[] = [];

  for (const liability of liabilities) {
    if (liability.status !== 'ACTIVE') continue;

    if (liability.nextPaymentDate && liability.minimumPayment) {
      payments.push({
        id: `${liability.id}-min-payment`,
        liabilityId: liability.id,
        liabilityName: liability.name,
        liabilityType: liability.type,
        amount: liability.minimumPayment,
        currency: liability.currency,
        dueDate: liability.nextPaymentDate,
        isOverdue: isOverdue(liability.nextPaymentDate),
        isDueSoon: isDueSoon(liability.nextPaymentDate),
        type: 'minimum_payment',
      });
    }

    if (liability.installmentPlans) {
      for (const plan of liability.installmentPlans) {
        if (plan.isPaidOff) continue;

        for (const installment of plan.installments) {
          if (installment.isPaid) continue;

          payments.push({
            id: installment.id,
            liabilityId: liability.id,
            liabilityName: liability.name,
            liabilityType: liability.type,
            amount: installment.amount,
            currency: plan.currency,
            dueDate: installment.dueDate,
            isOverdue: isOverdue(installment.dueDate),
            isDueSoon: isDueSoon(installment.dueDate),
            type: 'installment',
            installmentNumber: installment.installmentNumber,
            totalInstallments: plan.numberOfInstallments,
          });
        }
      }
    }
  }

  return payments.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

// =============================================================================
// Component
// =============================================================================

export const UpcomingPayments = memo(function UpcomingPayments({
  liabilities,
  limit = 5,
  onPaymentClick,
  onViewAll,
  compact = false,
}: UpcomingPaymentsProps) {
  const upcomingPayments = useMemo(() => {
    const payments = extractUpcomingPayments(liabilities);
    return payments.slice(0, limit);
  }, [liabilities, limit]);

  const totalPayments = useMemo(() => {
    return extractUpcomingPayments(liabilities).length;
  }, [liabilities]);

  const totalAmountDue = useMemo(() => {
    return upcomingPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [upcomingPayments]);

  const overdueCount = useMemo(() => {
    return upcomingPayments.filter((p) => p.isOverdue).length;
  }, [upcomingPayments]);

  const handlePaymentClick = (payment: UpcomingPayment) => {
    if (onPaymentClick) onPaymentClick(payment);
  };

  if (upcomingPayments.length === 0) {
    return (
      <div className="bg-card rounded-2xl border-0 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Prossime rate</h3>
        </div>
        <div className="text-center py-8">
          <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nessuna rata in scadenza</p>
          <p className="text-sm text-muted-foreground mt-1">
            Sei in regola con tutti i pagamenti.
          </p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-card rounded-2xl border-0 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium text-foreground">In scadenza</h3>
          </div>
          {overdueCount > 0 && (
            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs rounded-full border border-rose-500/20">
              {overdueCount} {overdueCount === 1 ? 'scaduta' : 'scadute'}
            </span>
          )}
        </div>

        <div className="space-y-2">
          {upcomingPayments.map((payment) => (
            <button
              key={payment.id}
              type="button"
              onClick={() => handlePaymentClick(payment)}
              className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors
                ${payment.isOverdue
                  ? 'bg-rose-500/10'
                  : payment.isDueSoon
                  ? 'bg-amber-500/10'
                  : 'bg-muted/50'}
                ${onPaymentClick ? 'hover:bg-muted cursor-pointer' : ''}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {payment.isOverdue && (
                  <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                )}
                <span className="text-sm font-medium text-foreground truncate">
                  {payment.liabilityName}
                </span>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    payment.isOverdue ? 'text-rose-700 dark:text-rose-400' : 'text-foreground'
                  }`}
                >
                  {formatCurrency(payment.amount, payment.currency)}
                </span>
              </div>
            </button>
          ))}
        </div>

        {onViewAll && totalPayments > limit && (
          <button
            type="button"
            onClick={onViewAll}
            className="w-full mt-3 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
          >
            Vedi tutte le {totalPayments} rate
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border-0 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Prossime rate</h3>
        </div>
        {overdueCount > 0 && (
          <span className="px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium rounded-full border border-rose-500/20">
            {overdueCount} {overdueCount === 1 ? 'scaduta' : 'scadute'}
          </span>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Totale da pagare</p>
          <p className="text-xl font-bold text-foreground tabular-nums">
            {formatCurrency(totalAmountDue)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Rate</p>
          <p className="text-xl font-bold text-foreground tabular-nums">{upcomingPayments.length}</p>
        </div>
      </div>

      {/* Payments list */}
      <div className="space-y-3">
        {upcomingPayments.map((payment) => (
          <div
            key={payment.id}
            role={onPaymentClick ? 'button' : undefined}
            tabIndex={onPaymentClick ? 0 : undefined}
            onClick={() => handlePaymentClick(payment)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && onPaymentClick) {
                e.preventDefault();
                handlePaymentClick(payment);
              }
            }}
            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all
              ${payment.isOverdue
                ? 'bg-rose-500/10 border-rose-500/20'
                : payment.isDueSoon
                ? 'bg-amber-500/10 border-amber-500/20'
                : 'bg-card border-border'
              }
              ${onPaymentClick ? 'cursor-pointer hover:shadow-md' : ''}`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                ${payment.isOverdue
                  ? 'bg-rose-500 text-white'
                  : payment.isDueSoon
                  ? 'bg-amber-500 text-white'
                  : 'bg-muted text-muted-foreground'
                }`}
            >
              {payment.isOverdue ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-foreground truncate">
                  {payment.liabilityName}
                </h4>
                <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
                  {getTypeLabel(payment.liabilityType)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {payment.type === 'installment'
                  ? `Rata ${payment.installmentNumber} di ${payment.totalInstallments}`
                  : 'Rata minima'}
              </p>
            </div>

            <div className="text-right">
              <p
                className={`font-semibold tabular-nums ${
                  payment.isOverdue ? 'text-rose-700 dark:text-rose-400' : 'text-foreground'
                }`}
              >
                {formatCurrency(payment.amount, payment.currency)}
              </p>
              <p
                className={`text-sm ${
                  payment.isOverdue
                    ? 'text-rose-600 dark:text-rose-400 font-medium'
                    : payment.isDueSoon
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-muted-foreground'
                }`}
              >
                {payment.isOverdue ? 'Scaduta' : `Scade ${formatDate(payment.dueDate)}`}
              </p>
            </div>

            {onPaymentClick && (
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {onViewAll && totalPayments > limit && (
        <button
          type="button"
          onClick={onViewAll}
          className="w-full mt-4 py-2 text-center text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium text-sm"
        >
          Vedi tutte le {totalPayments} rate in scadenza
        </button>
      )}
    </div>
  );
});

export default UpcomingPayments;
