'use client';

/**
 * OverBudgetAlert Component
 *
 * Displays an alert banner when budgets have been exceeded.
 * Shows a list of over-budget items with amounts.
 *
 * @module components/budgets/OverBudgetAlert
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Budget } from '@/services/budgets.client';

export interface OverBudgetAlertProps {
  /** Array of budgets (will filter to over-budget items) */
  budgets: Budget[];
  /** Additional CSS classes */
  className?: string;
  /** Whether the alert can be dismissed */
  dismissible?: boolean;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * OverBudgetAlert Component
 *
 * @param props - Component props
 * @returns Alert banner or null if no over-budget items
 *
 * @example
 * ```tsx
 * <OverBudgetAlert budgets={budgets} dismissible />
 * ```
 */
export function OverBudgetAlert({
  budgets,
  className,
  dismissible = true,
  'data-testid': testId,
}: OverBudgetAlertProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Filter to only over-budget items
  const overBudgetItems = budgets.filter((b) => b.isOverBudget);

  // Don't render if no over-budget items or dismissed
  if (overBudgetItems.length === 0 || isDismissed) {
    return null;
  }

  // Calculate total over-budget amount
  const totalOverAmount = overBudgetItems.reduce(
    (sum, b) => sum + Math.abs(b.remaining),
    0
  );

  return (
    <div
      className={cn(
        'rounded-lg border border-red-200 bg-red-50 p-4',
        className
      )}
      role="alert"
      data-testid={testId || 'over-budget-alert'}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {/* Warning icon */}
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-500"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">
              {overBudgetItems.length === 1
                ? 'Budget Exceeded'
                : `${overBudgetItems.length} Budgets Exceeded`}
            </h3>

            <div className="mt-2 text-sm text-red-700">
              <p className="mb-2">
                You have exceeded your budget by{' '}
                <span className="font-semibold">
                  {formatCurrency(totalOverAmount)}
                </span>{' '}
                in total.
              </p>

              {/* List of over-budget items */}
              <ul className="list-disc pl-5 space-y-1">
                {overBudgetItems.map((budget) => (
                  <li key={budget.id}>
                    <span className="font-medium">{budget.name}</span>
                    <span className="text-red-600">
                      {' '}
                      ({formatCurrency(budget.spent)} of{' '}
                      {formatCurrency(budget.amount)})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Dismiss button */}
        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-100 -mt-1 -mr-2"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss alert"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        )}
      </div>
    </div>
  );
}

export default OverBudgetAlert;
