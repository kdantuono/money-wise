/**
 * Available to Spend Card
 *
 * Displays the "safe to spend" amount based on active budgets.
 * Shows budget utilization progress and warning indicators.
 *
 * @module components/dashboard/AvailableToSpendCard
 */

'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAvailableToSpend } from '@/hooks/useAvailableToSpend';
import { cn } from '@/lib/utils';

// ============================================================================
// Icons
// ============================================================================

function WalletIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

// ============================================================================
// Utilities
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get color classes based on percentage remaining
 */
function getStatusColor(percentRemaining: number) {
  if (percentRemaining < 10) {
    return {
      text: 'text-red-600',
      bg: 'bg-red-100',
      progressBar: 'bg-red-500',
      border: 'border-red-300',
    };
  }
  if (percentRemaining < 20) {
    return {
      text: 'text-orange-600',
      bg: 'bg-orange-100',
      progressBar: 'bg-orange-500',
      border: 'border-orange-300',
    };
  }
  if (percentRemaining < 50) {
    return {
      text: 'text-yellow-600',
      bg: 'bg-yellow-100',
      progressBar: 'bg-yellow-500',
      border: 'border-yellow-300',
    };
  }
  return {
    text: 'text-green-600',
    bg: 'bg-green-100',
    progressBar: 'bg-green-500',
    border: 'border-green-300',
  };
}

// ============================================================================
// Component
// ============================================================================

function AvailableToSpendSkeleton() {
  return (
    <Card data-testid="available-to-spend-card" aria-busy="true">
      <CardHeader>
        <CardTitle>Safe to Spend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AvailableToSpendCard() {
  const { data, isLoading, error } = useAvailableToSpend();

  if (isLoading) {
    return <AvailableToSpendSkeleton />;
  }

  if (error) {
    return (
      <Card data-testid="available-to-spend-card">
        <CardHeader>
          <CardTitle>Safe to Spend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-600 text-sm">Unable to load budget data</p>
            <p className="text-xs text-red-500 mt-1">
              {error instanceof Error ? error.message : 'Please try again'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.budgetCount === 0) {
    return (
      <Card data-testid="available-to-spend-card">
        <CardHeader>
          <CardTitle>Safe to Spend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground text-sm">No active budgets</p>
            <Link
              href="/dashboard/budgets"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
            >
              Create a budget
              <ArrowRightIcon />
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { availableToSpend, totalBudget, totalSpent, percentRemaining } = data;
  const statusColors = getStatusColor(percentRemaining);
  const isLowBudget = percentRemaining < 20;
  const percentUsed = 100 - percentRemaining;

  return (
    <Card
      data-testid="available-to-spend-card"
      className={cn(
        'transition-colors',
        isLowBudget && `border-2 ${statusColors.border}`
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>Safe to Spend</span>
          {isLowBudget && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                statusColors.bg,
                statusColors.text
              )}
            >
              <AlertTriangleIcon />
              Low Budget
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Available Amount */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Available</p>
              <p
                className={cn('text-3xl font-bold', statusColors.text)}
                data-testid="available-amount"
              >
                {formatCurrency(availableToSpend)}
              </p>
              <p className="text-xs text-muted-foreground">
                of {formatCurrency(totalBudget)} budgeted
              </p>
            </div>
            <div
              className={cn(
                'h-12 w-12 rounded-full flex items-center justify-center',
                statusColors.bg,
                statusColors.text
              )}
            >
              <WalletIcon />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full transition-all', statusColors.progressBar)}
                style={{ width: `${Math.min(percentUsed, 100)}%` }}
                aria-label={`Budget used: ${percentUsed.toFixed(1)}%`}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {formatCurrency(totalSpent)} spent ({percentUsed.toFixed(1)}%)
              </span>
              <span>{percentRemaining.toFixed(1)}% remaining</span>
            </div>
          </div>

          {/* Link to budgets */}
          <Link
            href="/dashboard/budgets"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View all budgets
            <ArrowRightIcon />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
