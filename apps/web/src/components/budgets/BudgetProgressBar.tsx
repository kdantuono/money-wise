'use client';

/**
 * BudgetProgressBar Component
 *
 * Displays a progress bar showing budget usage with color coding.
 * - Green: < 80% used (safe)
 * - Yellow: 80-99% used (warning)
 * - Red: >= 100% used (over budget)
 *
 * @module components/budgets/BudgetProgressBar
 */

import { cn } from '@/lib/utils';
import type { Budget } from '@/services/budgets.client';

export interface BudgetProgressBarProps {
  /** Budget data */
  budget: Budget;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the label */
  showLabel?: boolean;
  /** Whether to show the amount text */
  showAmount?: boolean;
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
 * Map icon names to emoji representations
 * This provides a simple fallback until a proper icon library is integrated
 */
function getIconEmoji(iconName: string): string {
  const iconMap: Record<string, string> = {
    'shopping-cart': '🛒',
    'utensils': '🍴',
    'car': '🚗',
    'film': '🎬',
    'bolt': '⚡',
    'shopping-bag': '🛍️',
    'heart': '❤️',
    'book': '📚',
    'home': '🏠',
    'plane': '✈️',
    'phone': '📱',
    'coffee': '☕',
    'gift': '🎁',
    'music': '🎵',
  };

  return iconMap[iconName] || '📊';
}

/**
 * BudgetProgressBar Component
 *
 * @param props - Component props
 * @returns Progress bar with color-coded status
 *
 * @example
 * ```tsx
 * <BudgetProgressBar
 *   budget={budget}
 *   showLabel
 *   showAmount
 * />
 * ```
 */
export function BudgetProgressBar({
  budget,
  className,
  showLabel = true,
  showAmount = true,
  'data-testid': testId,
}: BudgetProgressBarProps) {
  const { name, amount, spent, percentage, progressStatus, category } = budget;

  // Cap percentage at 100% for display, but allow overflow indication
  const displayPercentage = Math.min(percentage, 100);

  // Color mapping for progress bar
  const colorMap = {
    safe: 'bg-green-500',
    warning: 'bg-orange-500',
    maxed: 'bg-yellow-500',
    over: 'bg-red-500',
  };

  // Background color for the bar container
  const bgColorMap = {
    safe: 'bg-green-100',
    warning: 'bg-orange-100',
    maxed: 'bg-yellow-100',
    over: 'bg-red-100',
  };

  return (
    <div
      className={cn('space-y-2', className)}
      data-testid={testId || `budget-progress-${budget.id}`}
    >
      {/* Label row */}
      {showLabel && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {category.icon && (
              <span
                className="text-lg"
                style={{ color: category.color || undefined }}
                role="img"
                aria-label={`${category.name} icon`}
              >
                {getIconEmoji(category.icon)}
              </span>
            )}
            <span className="font-medium text-sm text-gray-900">
              {name}
            </span>
            <span className="text-xs text-gray-500">
              ({category.name})
            </span>
          </div>
          <span
            className={cn(
              'text-xs font-medium',
              progressStatus === 'over' && 'text-red-600',
              progressStatus === 'maxed' && 'text-yellow-600',
              progressStatus === 'warning' && 'text-orange-600',
              progressStatus === 'safe' && 'text-green-600'
            )}
          >
            {percentage}%
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div
        className={cn(
          'h-2.5 rounded-full overflow-hidden',
          bgColorMap[progressStatus]
        )}
      >
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            colorMap[progressStatus]
          )}
          style={{ width: `${displayPercentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${name} budget: ${percentage}% used`}
        />
      </div>

      {/* Amount row */}
      {showAmount && (
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            {formatCurrency(spent)} spent
          </span>
          <span>
            {formatCurrency(amount)} budget
          </span>
        </div>
      )}
    </div>
  );
}

export default BudgetProgressBar;
