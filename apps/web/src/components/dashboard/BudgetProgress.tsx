'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  useBudgets,
  useBudgetsLoading,
  useBudgetsSummary,
  useBudgetsStore,
} from '@/store/budgets.store';
import type { Budget } from '@/services/budgets.client';
import { getBudgetProgressStatus } from '@/utils/budget-progress';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface BudgetItemProps {
  budget: Budget;
}

function BudgetItem({ budget }: BudgetItemProps) {
  // Safety check for percentage - handle NaN, undefined, null
  const safePercentage = typeof budget.percentage === 'number' && !isNaN(budget.percentage)
    ? budget.percentage
    : 0;
  const percentage = Math.min(Math.max(safePercentage, 0), 100);
  const displayPercentage = safePercentage;
  const isOverBudget = budget.isOverBudget;
  const remaining = budget.remaining;

  // Get budget progress status with dynamic colors and animation
  const progressStatus = getBudgetProgressStatus({
    percentage: safePercentage,
    startDate: budget.startDate ? new Date(budget.startDate) : undefined,
    endDate: budget.endDate ? new Date(budget.endDate) : undefined,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">
          {budget.name}
        </span>
        <span
          className="text-sm font-medium"
          style={{ color: progressStatus.textColor }}
        >
          {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
        </span>
      </div>
      <div
        className="relative h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: progressStatus.backgroundColor }}
      >
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
            progressStatus.shouldPulse && 'animate-budget-pulse'
          )}
          style={{ width: `${percentage}%`, backgroundColor: progressStatus.color }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {displayPercentage.toFixed(0)}% used
        </span>
        <span
          className="font-medium"
          style={{ color: progressStatus.textColor }}
        >
          {isOverBudget
            ? `${formatCurrency(Math.abs(remaining))} over`
            : `${formatCurrency(remaining)} left`}
        </span>
      </div>
    </div>
  );
}

function BudgetProgressSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2 animate-pulse">
          <div className="flex justify-between">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-4 w-20 bg-gray-200 rounded" />
          </div>
          <div className="h-2 bg-gray-200 rounded-full" />
          <div className="flex justify-between">
            <div className="h-3 w-16 bg-gray-200 rounded" />
            <div className="h-3 w-14 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
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

export function BudgetProgress() {
  const budgets = useBudgets();
  const isLoading = useBudgetsLoading();
  const summary = useBudgetsSummary();
  const { fetchBudgets } = useBudgetsStore();
  const hasFetchedRef = useRef(false);

  // Fetch budgets on mount (only once)
  useEffect(() => {
    if (!hasFetchedRef.current && !isLoading) {
      hasFetchedRef.current = true;
      fetchBudgets();
    }
  }, [isLoading, fetchBudgets]);

  const totalBudget = summary.totalBudgeted;
  const totalSpent = summary.totalSpent;
  const overBudgetCount = summary.overBudgetCount;

  return (
    <Card className="min-h-[340px] flex flex-col" data-testid="category-breakdown">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">Budget Overview</CardTitle>
          {!isLoading && budgets.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {formatCurrency(totalSpent)} of {formatCurrency(totalBudget)} spent
              {overBudgetCount > 0 && (
                <span className="text-red-600 ml-2">
                  ({overBudgetCount} over budget)
                </span>
              )}
            </p>
          )}
        </div>
        <a
          href="/dashboard/budgets"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Manage
          <ArrowRightIcon />
        </a>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <BudgetProgressSkeleton />
        ) : budgets.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-3">No budgets yet</p>
            <a
              href="/dashboard/budgets"
              className="text-sm text-primary hover:underline"
            >
              Create a budget
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {budgets.slice(0, 5).map((budget) => (
              <BudgetItem key={budget.id} budget={budget} />
            ))}
            {budgets.length > 5 && (
              <p className="text-sm text-muted-foreground text-center pt-2">
                +{budgets.length - 5} more budgets
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
