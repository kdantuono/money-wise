'use client';

import { memo, useMemo } from 'react';
import { Clock, AlertTriangle, ChevronRight, CreditCard } from 'lucide-react';
import type { Liability } from '@/services/liabilities.client';

// =============================================================================
// Type Definitions
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
  /** Liabilities with upcoming payments */
  liabilities: Liability[];
  /** Maximum number of payments to show */
  limit?: number;
  /** Callback when a payment is clicked */
  onPaymentClick?: (payment: UpcomingPayment) => void;
  /** Callback to view all payments */
  onViewAll?: () => void;
  /** Whether to show in compact mode */
  compact?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
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

  // Reset time for comparison
  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate.getTime() === today.getTime()) {
    return 'Today';
  }
  if (targetDate.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
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

function getTypeLabel(type: string): string {
  switch (type) {
    case 'CREDIT_CARD':
      return 'Credit Card';
    case 'BNPL':
      return 'BNPL';
    case 'LOAN':
      return 'Loan';
    case 'MORTGAGE':
      return 'Mortgage';
    default:
      return 'Other';
  }
}

function extractUpcomingPayments(liabilities: Liability[]): UpcomingPayment[] {
  const payments: UpcomingPayment[] = [];

  for (const liability of liabilities) {
    if (liability.status !== 'ACTIVE') continue;

    // Add minimum payment if applicable (credit cards, loans with payment due dates)
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

    // Add upcoming installments from BNPL plans
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

  // Sort by due date (earliest first, overdue at top)
  return payments.sort((a, b) => {
    // Overdue items come first
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;

    // Then sort by date
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * UpcomingPayments Component
 *
 * Dashboard widget showing upcoming payment obligations.
 * Displays next due payments from credit cards, loans, and BNPL installments.
 */
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
    if (onPaymentClick) {
      onPaymentClick(payment);
    }
  };

  if (upcomingPayments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Upcoming Payments</h3>
        </div>
        <div className="text-center py-8">
          <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No upcoming payments</p>
          <p className="text-sm text-gray-400 mt-1">
            All caught up! No payments due.
          </p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <h3 className="font-medium text-gray-900">Upcoming</h3>
          </div>
          {overdueCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
              {overdueCount} overdue
            </span>
          )}
        </div>

        <div className="space-y-2">
          {upcomingPayments.map((payment) => (
            <button
              key={payment.id}
              type="button"
              onClick={() => handlePaymentClick(payment)}
              className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors
                ${payment.isOverdue ? 'bg-red-50' : payment.isDueSoon ? 'bg-yellow-50' : 'bg-gray-50'}
                ${onPaymentClick ? 'hover:bg-gray-100 cursor-pointer' : ''}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {payment.isOverdue && (
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                )}
                <span className="text-sm font-medium text-gray-900 truncate">
                  {payment.liabilityName}
                </span>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <span className={`text-sm font-semibold ${payment.isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
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
            className="w-full mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all {totalPayments} payments
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Upcoming Payments</h3>
        </div>
        {overdueCount > 0 && (
          <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            {overdueCount} overdue
          </span>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
        <div>
          <p className="text-sm text-gray-500">Total Due</p>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(totalAmountDue)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Payments</p>
          <p className="text-xl font-bold text-gray-900">{upcomingPayments.length}</p>
        </div>
      </div>

      {/* Payment List */}
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
            className={`flex items-center gap-4 p-4 rounded-lg border transition-all
              ${payment.isOverdue
                ? 'bg-red-50 border-red-200'
                : payment.isDueSoon
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-white border-gray-200'
              }
              ${onPaymentClick ? 'cursor-pointer hover:shadow-md' : ''}`}
          >
            {/* Status Icon */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                ${payment.isOverdue
                  ? 'bg-red-500 text-white'
                  : payment.isDueSoon
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-200 text-gray-500'
                }`}
            >
              {payment.isOverdue ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
            </div>

            {/* Payment Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900 truncate">
                  {payment.liabilityName}
                </h4>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                  {getTypeLabel(payment.liabilityType)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {payment.type === 'installment'
                  ? `Payment ${payment.installmentNumber} of ${payment.totalInstallments}`
                  : 'Minimum payment'}
              </p>
            </div>

            {/* Amount & Date */}
            <div className="text-right">
              <p
                className={`font-semibold ${
                  payment.isOverdue ? 'text-red-700' : 'text-gray-900'
                }`}
              >
                {formatCurrency(payment.amount, payment.currency)}
              </p>
              <p
                className={`text-sm ${
                  payment.isOverdue
                    ? 'text-red-600 font-medium'
                    : payment.isDueSoon
                    ? 'text-yellow-700'
                    : 'text-gray-500'
                }`}
              >
                {payment.isOverdue ? 'Overdue' : `Due ${formatDate(payment.dueDate)}`}
              </p>
            </div>

            {/* Chevron */}
            {onPaymentClick && (
              <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* View All Link */}
      {onViewAll && totalPayments > limit && (
        <button
          type="button"
          onClick={onViewAll}
          className="w-full mt-4 py-2 text-center text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          View all {totalPayments} upcoming payments
        </button>
      )}
    </div>
  );
});

export default UpcomingPayments;
