'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Budget {
  id: string;
  category: string;
  spent: number;
  limit: number;
  color: string;
}

// Mock budget data
const mockBudgets: Budget[] = [
  {
    id: '1',
    category: 'Food & Groceries',
    spent: 425,
    limit: 600,
    color: 'bg-green-500',
  },
  {
    id: '2',
    category: 'Transportation',
    spent: 180,
    limit: 200,
    color: 'bg-blue-500',
  },
  {
    id: '3',
    category: 'Entertainment',
    spent: 145,
    limit: 150,
    color: 'bg-purple-500',
  },
  {
    id: '4',
    category: 'Utilities',
    spent: 210,
    limit: 300,
    color: 'bg-yellow-500',
  },
  {
    id: '5',
    category: 'Shopping',
    spent: 320,
    limit: 250,
    color: 'bg-red-500',
  },
];

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
  const percentage = Math.min((budget.spent / budget.limit) * 100, 100);
  const isOverBudget = budget.spent > budget.limit;
  const remaining = budget.limit - budget.spent;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">
          {budget.category}
        </span>
        <span
          className={cn(
            'text-sm font-medium',
            isOverBudget ? 'text-red-600' : 'text-gray-600'
          )}
        >
          {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
        </span>
      </div>
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
            isOverBudget ? 'bg-red-500' : budget.color
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {percentage.toFixed(0)}% used
        </span>
        <span
          className={cn(
            isOverBudget ? 'text-red-600 font-medium' : 'text-muted-foreground'
          )}
        >
          {isOverBudget
            ? `${formatCurrency(Math.abs(remaining))} over`
            : `${formatCurrency(remaining)} left`}
        </span>
      </div>
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
  const totalBudget = mockBudgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = mockBudgets.reduce((sum, b) => sum + b.spent, 0);
  const overBudgetCount = mockBudgets.filter((b) => b.spent > b.limit).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">Budget Progress</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {formatCurrency(totalSpent)} of {formatCurrency(totalBudget)} spent
            {overBudgetCount > 0 && (
              <span className="text-red-600 ml-2">
                ({overBudgetCount} over budget)
              </span>
            )}
          </p>
        </div>
        <a
          href="/budgets"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Manage
          <ArrowRightIcon />
        </a>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockBudgets.map((budget) => (
            <BudgetItem key={budget.id} budget={budget} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
