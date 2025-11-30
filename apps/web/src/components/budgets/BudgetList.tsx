'use client';

/**
 * BudgetList Component
 *
 * Displays a list of budgets with progress bars and action buttons.
 * Supports empty state, loading skeleton, and CRUD operations.
 *
 * @module components/budgets/BudgetList
 */

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BudgetProgressBar } from './BudgetProgressBar';
import type { Budget } from '@/services/budgets.client';

export interface BudgetListProps {
  /** Array of budgets to display */
  budgets: Budget[];
  /** Whether budgets are loading */
  isLoading?: boolean;
  /** Called when edit is clicked */
  onEdit?: (budget: Budget) => void;
  /** Called when delete is clicked */
  onDelete?: (budget: Budget) => void;
  /** Budget IDs currently being updated */
  updatingIds?: string[];
  /** Budget IDs currently being deleted */
  deletingIds?: string[];
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Loading skeleton for budget items
 */
function BudgetSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between">
            <div className="h-4 w-1/3 bg-gray-200 rounded" />
            <div className="h-4 w-12 bg-gray-200 rounded" />
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full" />
          <div className="flex justify-between">
            <div className="h-3 w-20 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-200 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Empty state when no budgets exist
 */
function EmptyState() {
  return (
    <div
      className="text-center py-12"
      data-testid="budgets-empty-state"
    >
      <div className="mx-auto h-12 w-12 text-gray-400">
        <svg
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-medium text-gray-900">
        No budgets yet
      </h3>
      <p className="mt-2 text-sm text-gray-500">
        Create your first budget to start tracking your spending.
      </p>
    </div>
  );
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * BudgetList Component
 *
 * @param props - Component props
 * @returns Budget list or empty state
 *
 * @example
 * ```tsx
 * <BudgetList
 *   budgets={budgets}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 * />
 * ```
 */
export function BudgetList({
  budgets,
  isLoading = false,
  onEdit,
  onDelete,
  updatingIds = [],
  deletingIds = [],
  className,
  'data-testid': testId,
}: BudgetListProps) {
  // Show loading skeletons
  if (isLoading) {
    return (
      <div
        className={cn('space-y-4', className)}
        data-testid={testId || 'budgets-list-loading'}
      >
        {[1, 2, 3].map((i) => (
          <BudgetSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Show empty state
  if (budgets.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      className={cn('space-y-4', className)}
      data-testid={testId || 'budgets-list'}
    >
      {budgets.map((budget) => {
        const isUpdating = updatingIds.includes(budget.id);
        const isDeleting = deletingIds.includes(budget.id);
        const isDisabled = isUpdating || isDeleting;

        return (
          <Card
            key={budget.id}
            className={cn(
              'transition-opacity',
              isDeleting && 'opacity-50'
            )}
            data-testid={`budget-item-${budget.id}`}
          >
            <CardContent className="p-4">
              {/* Progress bar section */}
              <BudgetProgressBar
                budget={budget}
                showLabel
                showAmount
              />

              {/* Date range and actions */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {formatDate(budget.startDate)} - {formatDate(budget.endDate)}
                  <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {budget.period}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(budget)}
                      disabled={isDisabled}
                      data-testid={`budget-edit-${budget.id}`}
                    >
                      {isUpdating ? (
                        <span className="flex items-center gap-1">
                          <svg
                            className="animate-spin h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Saving...
                        </span>
                      ) : (
                        'Edit'
                      )}
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(budget)}
                      disabled={isDisabled}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid={`budget-delete-${budget.id}`}
                    >
                      {isDeleting ? (
                        <span className="flex items-center gap-1">
                          <svg
                            className="animate-spin h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Deleting...
                        </span>
                      ) : (
                        'Delete'
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Notes if present */}
              {budget.notes && (
                <p className="mt-2 text-xs text-gray-500 italic">
                  {budget.notes}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default BudgetList;
