'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: 'income' | 'expense';
}

// Mock data for recent transactions
const mockTransactions: Transaction[] = [
  {
    id: '1',
    description: 'Grocery Store',
    amount: -85.50,
    date: '2024-01-15',
    category: 'Food & Groceries',
    type: 'expense',
  },
  {
    id: '2',
    description: 'Salary Deposit',
    amount: 3500.00,
    date: '2024-01-14',
    category: 'Income',
    type: 'income',
  },
  {
    id: '3',
    description: 'Electric Bill',
    amount: -124.30,
    date: '2024-01-13',
    category: 'Utilities',
    type: 'expense',
  },
  {
    id: '4',
    description: 'Coffee Shop',
    amount: -6.75,
    date: '2024-01-12',
    category: 'Food & Dining',
    type: 'expense',
  },
  {
    id: '5',
    description: 'Freelance Payment',
    amount: 450.00,
    date: '2024-01-11',
    category: 'Income',
    type: 'income',
  },
];

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

export function RecentTransactions() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">
          Recent Transactions
        </CardTitle>
        <a
          href="/transactions"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View all
          <ArrowRightIcon />
        </a>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-gray-100">
          {mockTransactions.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
