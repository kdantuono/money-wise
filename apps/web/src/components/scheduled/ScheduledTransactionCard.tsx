'use client';

import { memo, useMemo } from 'react';
import {
  Calendar,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  Repeat,
  CheckCircle,
  PauseCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import type {
  ScheduledTransaction,
  ScheduledTransactionStatus,
  TransactionType,
} from '@/services/scheduled.client';

// =============================================================================
// Type Definitions
// =============================================================================

export interface ScheduledTransactionCardProps {
  scheduled: ScheduledTransaction;
  onClick?: (scheduled: ScheduledTransaction) => void;
  onSkip?: (scheduled: ScheduledTransaction) => void;
  onComplete?: (scheduled: ScheduledTransaction) => void;
  compact?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getStatusColors(status: ScheduledTransactionStatus): { bg: string; text: string } {
  switch (status) {
    case 'ACTIVE':
      return { bg: 'bg-green-50', text: 'text-green-700' };
    case 'PAUSED':
      return { bg: 'bg-yellow-50', text: 'text-yellow-700' };
    case 'COMPLETED':
      return { bg: 'bg-blue-50', text: 'text-blue-700' };
    case 'CANCELLED':
      return { bg: 'bg-gray-50', text: 'text-gray-700' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700' };
  }
}

function getStatusIcon(status: ScheduledTransactionStatus) {
  switch (status) {
    case 'ACTIVE':
      return <CheckCircle className="h-4 w-4" />;
    case 'PAUSED':
      return <PauseCircle className="h-4 w-4" />;
    case 'COMPLETED':
      return <CheckCircle className="h-4 w-4" />;
    case 'CANCELLED':
      return <XCircle className="h-4 w-4" />;
    default:
      return null;
  }
}

function getTypeIcon(type: TransactionType, className?: string) {
  if (type === 'DEBIT') {
    return <ArrowUpCircle className={className} />;
  }
  return <ArrowDownCircle className={className} />;
}

function getTypeColors(type: TransactionType): { bg: string; icon: string } {
  if (type === 'DEBIT') {
    return { bg: 'bg-red-50', icon: 'text-red-500' };
  }
  return { bg: 'bg-green-50', icon: 'text-green-500' };
}

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

function getDaysUntilText(days: number): { text: string; color: string } {
  if (days < 0) {
    return {
      text: `${Math.abs(days)} days overdue`,
      color: 'text-red-600',
    };
  }
  if (days === 0) {
    return { text: 'Due today', color: 'text-orange-600' };
  }
  if (days === 1) {
    return { text: 'Due tomorrow', color: 'text-yellow-600' };
  }
  if (days <= 7) {
    return { text: `Due in ${days} days`, color: 'text-blue-600' };
  }
  return { text: `Due in ${days} days`, color: 'text-gray-600' };
}

// =============================================================================
// Component Implementation
// =============================================================================

export const ScheduledTransactionCard = memo(function ScheduledTransactionCard({
  scheduled,
  onClick,
  onSkip,
  onComplete,
  compact = false,
}: ScheduledTransactionCardProps) {
  const typeColors = getTypeColors(scheduled.type);
  const statusColors = getStatusColors(scheduled.status);
  const daysInfo = useMemo(
    () => getDaysUntilText(scheduled.daysUntilDue),
    [scheduled.daysUntilDue]
  );

  const handleClick = () => {
    if (onClick) {
      onClick(scheduled);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSkip) {
      onSkip(scheduled);
    }
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onComplete) {
      onComplete(scheduled);
    }
  };

  if (compact) {
    return (
      <div
        role="button"
        tabIndex={onClick ? 0 : undefined}
        onClick={handleClick}
        onKeyDown={onClick ? handleKeyDown : undefined}
        className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white
          ${onClick ? 'cursor-pointer hover:border-gray-300 hover:shadow-sm' : ''}`}
      >
        <div className={`p-2 rounded-lg ${typeColors.bg}`}>
          {getTypeIcon(scheduled.type, `h-4 w-4 ${typeColors.icon}`)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{scheduled.description}</p>
          <p className={`text-sm ${daysInfo.color}`}>{daysInfo.text}</p>
        </div>
        <div className="text-right">
          <p
            className={`font-semibold ${
              scheduled.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {scheduled.type === 'DEBIT' ? '-' : '+'}
            {formatCurrency(scheduled.amount, scheduled.currency)}
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
      className={`rounded-xl border border-gray-200 bg-white p-5 transition-all
        ${onClick ? 'cursor-pointer hover:border-gray-300 hover:shadow-md' : ''}
        focus:outline-none focus:ring-2 focus:ring-blue-500`}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${typeColors.bg}`}>
          {getTypeIcon(scheduled.type, `h-6 w-6 ${typeColors.icon}`)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{scheduled.description}</h3>
          <div className="flex items-center gap-2 mt-1">
            {scheduled.merchantName && (
              <span className="text-sm text-gray-500">{scheduled.merchantName}</span>
            )}
            {scheduled.recurrenceRule && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Repeat className="h-3 w-3" />
                {scheduled.recurrenceDescription}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p
            className={`text-2xl font-bold ${
              scheduled.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {scheduled.type === 'DEBIT' ? '-' : '+'}
            {formatCurrency(scheduled.amount, scheduled.currency)}
          </p>
          <p className="text-sm text-gray-500">
            {scheduled.type === 'DEBIT' ? 'Expense' : 'Income'}
          </p>
        </div>
      </div>

      {/* Due Date and Status */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Next Due</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(scheduled.nextDueDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <p className={`text-sm font-medium ${daysInfo.color}`}>{daysInfo.text}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
          >
            {getStatusIcon(scheduled.status)}
            {scheduled.status}
          </span>
        </div>
      </div>

      {/* Overdue Warning */}
      {scheduled.isOverdue && scheduled.status === 'ACTIVE' && (
        <div className="mt-3 p-2 bg-red-50 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <p className="text-sm text-red-700">This transaction is overdue</p>
        </div>
      )}

      {/* Action Buttons */}
      {scheduled.status === 'ACTIVE' && (onSkip || onComplete) && (
        <div className="flex gap-2 mt-4">
          {onComplete && (
            <button
              type="button"
              onClick={handleComplete}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Mark Completed
            </button>
          )}
          {onSkip && scheduled.recurrenceRule && (
            <button
              type="button"
              onClick={handleSkip}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Skip This Time
            </button>
          )}
        </div>
      )}
    </article>
  );
});

export default ScheduledTransactionCard;
