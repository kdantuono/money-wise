'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types/dashboard.types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    signDisplay: 'never',
  }).format(Math.abs(amount));
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

// Category icons as inline SVG
function getCategoryIcon(category: string): React.ReactNode {
  switch (category.toLowerCase()) {
    case 'food & groceries':
    case 'food & dining':
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
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
        </svg>
      );
    case 'utilities':
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
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case 'income':
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
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    default:
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
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
  }
}

interface TransactionItemProps {
  transaction: Transaction;
}

function TransactionItem({ transaction }: TransactionItemProps) {
  const isIncome = transaction.type === 'income';

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center',
            isIncome
              ? 'bg-green-100 text-green-600'
              : 'bg-gray-100 text-gray-600'
          )}
        >
          {getCategoryIcon(transaction.category)}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm text-gray-900 truncate">
            {transaction.description}
          </p>
          <p className="text-xs text-muted-foreground">{transaction.category}</p>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-2">
        <p
          className={cn(
            'font-semibold text-sm',
            isIncome ? 'text-green-600' : 'text-gray-900'
          )}
        >
          {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(transaction.date)}
        </p>
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

function TransactionSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
        <div className="space-y-1">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="text-right space-y-1">
        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}

function RecentTransactionsSkeleton() {
  return (
    <Card className="min-h-[340px] flex flex-col" data-testid="recent-transactions-skeleton">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <TransactionSkeleton key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="min-h-[340px] flex flex-col" data-testid="recent-transactions">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">
          Recent Transactions
        </CardTitle>
        <a
          href="/dashboard/transactions"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View all
          <ArrowRightIcon />
        </a>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">No transactions yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Link a bank account or add transactions manually
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface RecentTransactionsProps {
  transactions?: Transaction[];
  isLoading?: boolean;
}

export function RecentTransactions({ transactions, isLoading }: RecentTransactionsProps) {
  if (isLoading) {
    return <RecentTransactionsSkeleton />;
  }

  if (!transactions || transactions.length === 0) {
    return <EmptyState />;
  }

  return (
    <Card className="min-h-[340px] flex flex-col" data-testid="recent-transactions">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">
          Recent Transactions
        </CardTitle>
        <a
          href="/dashboard/transactions"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View all
          <ArrowRightIcon />
        </a>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="divide-y divide-gray-100">
          {transactions.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
