'use client';

import { memo } from 'react';
import { Calendar, ArrowRight, AlertCircle, Clock } from 'lucide-react';
import type { UpcomingScheduled as UpcomingScheduledType } from '@/services/scheduled.client';

// =============================================================================
// Type Definitions
// =============================================================================

export interface UpcomingScheduledProps {
  items: UpcomingScheduledType[];
  loading?: boolean;
  onViewAll?: () => void;
  onItemClick?: (item: UpcomingScheduledType) => void;
  maxItems?: number;
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
  }).format(date);
}

function getDueDateLabel(daysUntilDue: number): { text: string; color: string } {
  if (daysUntilDue < 0) {
    return { text: 'Overdue', color: 'text-red-600 bg-red-50' };
  }
  if (daysUntilDue === 0) {
    return { text: 'Today', color: 'text-orange-600 bg-orange-50' };
  }
  if (daysUntilDue === 1) {
    return { text: 'Tomorrow', color: 'text-yellow-600 bg-yellow-50' };
  }
  if (daysUntilDue <= 7) {
    return { text: `${daysUntilDue} days`, color: 'text-blue-600 bg-blue-50' };
  }
  return { text: `${daysUntilDue} days`, color: 'text-gray-600 bg-gray-50' };
}

// =============================================================================
// Component Implementation
// =============================================================================

export const UpcomingScheduled = memo(function UpcomingScheduled({
  items,
  loading = false,
  onViewAll,
  onItemClick,
  maxItems = 5,
}: UpcomingScheduledProps) {
  const displayItems = items.slice(0, maxItems);
  const hasMore = items.length > maxItems;
  const overdueCount = items.filter((item) => item.isOverdue).length;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Upcoming Scheduled</h3>
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
              <AlertCircle className="h-3 w-3" />
              {overdueCount} overdue
            </span>
          )}
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content */}
      {displayItems.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No upcoming transactions</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayItems.map((item) => {
            const dueDateLabel = getDueDateLabel(item.daysUntilDue);
            return (
              <div
                key={`${item.scheduledTransactionId}-${item.dueDate}`}
                role={onItemClick ? 'button' : undefined}
                tabIndex={onItemClick ? 0 : undefined}
                onClick={() => onItemClick?.(item)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && onItemClick) {
                    e.preventDefault();
                    onItemClick(item);
                  }
                }}
                className={`flex items-center justify-between p-3 rounded-lg border border-gray-100
                  ${item.isOverdue ? 'bg-red-50 border-red-100' : 'bg-gray-50'}
                  ${onItemClick ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">
                      {formatDate(item.dueDate)}
                    </span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${dueDateLabel.color}`}
                    >
                      {dueDateLabel.text}
                    </span>
                  </div>
                </div>
                <div className="text-right ml-3">
                  <p
                    className={`font-semibold ${
                      item.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {item.type === 'DEBIT' ? '-' : '+'}
                    {formatCurrency(item.amount, item.currency)}
                  </p>
                </div>
              </div>
            );
          })}

          {hasMore && onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 text-center"
            >
              +{items.length - maxItems} more transactions
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default UpcomingScheduled;
