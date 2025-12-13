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

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
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
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-gray-600">
            {plan.numberOfInstallments - plan.remainingInstallments} of{' '}
            {plan.numberOfInstallments} paid
          </span>
        </div>

        {/* Compact installment dots */}
        <div className="flex gap-1">
          {sortedInstallments.map((inst) => (
            <button
              key={inst.id}
              type="button"
              onClick={() => handleClick(inst)}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                ${
                  inst.isPaid
                    ? 'bg-green-100 text-green-700'
                    : isOverdue(inst.dueDate, inst.isPaid)
                    ? 'bg-red-100 text-red-700'
                    : isDueSoon(inst.dueDate, inst.isPaid)
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-600'
                }
                ${onInstallmentClick ? 'cursor-pointer hover:ring-2 hover:ring-blue-300' : ''}`}
              title={`Payment ${inst.installmentNumber}: ${formatCurrency(inst.amount, plan.currency)} - ${inst.isPaid ? 'Paid' : formatDate(inst.dueDate)}`}
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
        <h3 className="font-medium text-gray-900">Payment Schedule</h3>
        <span className="text-sm text-gray-500">
          {plan.numberOfInstallments - plan.remainingInstallments} of{' '}
          {plan.numberOfInstallments} payments complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
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
              className={`flex items-center gap-4 p-3 rounded-lg border transition-all
                ${
                  inst.isPaid
                    ? 'bg-green-50 border-green-200'
                    : overdue
                    ? 'bg-red-50 border-red-200'
                    : dueSoon
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-white border-gray-200'
                }
                ${onInstallmentClick ? 'cursor-pointer hover:shadow-md' : ''}`}
            >
              {/* Status Icon */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                  ${
                    inst.isPaid
                      ? 'bg-green-500 text-white'
                      : overdue
                      ? 'bg-red-500 text-white'
                      : dueSoon
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-200 text-gray-500'
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
                  <span className="font-medium text-gray-900">
                    Payment {inst.installmentNumber}
                  </span>
                  {inst.isPaid && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                      Paid
                    </span>
                  )}
                  {overdue && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                      Overdue
                    </span>
                  )}
                  {dueSoon && !overdue && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                      Due Soon
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {inst.isPaid && inst.paidAt
                    ? `Paid on ${formatDate(inst.paidAt)}`
                    : `Due ${formatDate(inst.dueDate)}`}
                </p>
              </div>

              {/* Amount */}
              <div className="text-right">
                <p
                  className={`font-semibold ${
                    inst.isPaid
                      ? 'text-green-700'
                      : overdue
                      ? 'text-red-700'
                      : 'text-gray-900'
                  }`}
                >
                  {formatCurrency(inst.amount, plan.currency)}
                </p>
              </div>

              {/* Connector line (except last item) */}
              {index < sortedInstallments.length - 1 && (
                <div
                  className="absolute left-7 top-12 w-0.5 h-6 bg-gray-200"
                  style={{ marginLeft: '1px' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <span className="text-gray-600">Total Amount</span>
        <span className="font-semibold text-gray-900">
          {formatCurrency(plan.totalAmount, plan.currency)}
        </span>
      </div>

      {plan.isPaidOff && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Check className="h-5 w-5 text-green-600" />
          <span className="text-green-700 font-medium">
            This payment plan is complete!
          </span>
        </div>
      )}
    </div>
  );
});

export default InstallmentTimeline;
