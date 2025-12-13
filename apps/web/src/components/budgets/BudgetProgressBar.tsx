'use client';

/**
 * BudgetProgressBar Component
 *
 * Displays a progress bar showing budget usage with dynamic color coding and time awareness.
 * - Green: < 60% used (safe)
 * - Yellow: 60-79% used (moderate)
 * - Orange: 80-94% used (warning)
 * - Red: 95-100% used (critical)
 * - Dark Red: > 100% used (over budget, with pulse animation)
 *
 * Time-aware escalation: Status may be escalated if spending is significantly ahead of schedule.
 *
 * @module components/budgets/BudgetProgressBar
 */

import { cn } from '@/lib/utils';
import type { Budget } from '@/services/budgets.client';
import { getBudgetProgressStatus } from '@/utils/budget-progress';

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
  const { name, amount, spent, percentage, category } = budget;

  // Ensure percentage is a valid number, defaulting to 0
  const safePercentage = typeof percentage === 'number' && !isNaN(percentage) ? percentage : 0;
  const displayPercentage = Math.min(Math.max(safePercentage, 0), 100);

  // Get progress status with dynamic colors using the new utility
  const progressStatus = getBudgetProgressStatus({
    percentage: safePercentage,
    startDate: budget.startDate ? new Date(budget.startDate) : undefined,
    endDate: budget.endDate ? new Date(budget.endDate) : undefined,
  });

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
            className="text-xs font-medium"
            style={{ color: progressStatus.textColor }}
          >
            {safePercentage}%
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div
        className="h-2.5 rounded-full overflow-hidden"
        style={{ backgroundColor: progressStatus.backgroundColor }}
      >
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            progressStatus.shouldPulse && 'animate-budget-pulse'
          )}
          style={{
            width: `${displayPercentage}%`,
            backgroundColor: progressStatus.color
          }}
          role="progressbar"
          aria-valuenow={safePercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${name} budget: ${safePercentage}% used`}
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
