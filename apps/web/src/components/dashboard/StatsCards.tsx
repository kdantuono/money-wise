'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DashboardStats } from '@/types/dashboard.types';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

function StatCard({ title, value, icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-xl sm:text-2xl font-bold">{value}</p>
            {trend && (
              <p
                className={cn(
                  'text-xs font-medium',
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}% vs last period
              </p>
            )}
          </div>
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-7 w-28 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-200 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Icons as inline SVG for simplicity
function WalletIcon() {
  return (
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
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function TrendingUpIcon() {
  return (
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
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function TrendingDownIcon() {
  return (
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
    >
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </svg>
  );
}

function PiggyBankIcon() {
  return (
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
    >
      <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" />
      <path d="M2 9v1c0 1.1.9 2 2 2h1" />
      <path d="M16 11h.01" />
    </svg>
  );
}

interface StatsCardsProps {
  stats?: DashboardStats;
  isLoading?: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        data-testid="current-balance"
        aria-busy="true"
        aria-label="Loading dashboard statistics"
      >
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  if (!stats) {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        data-testid="current-balance"
      >
        <StatCard
          title="Total Balance"
          value={formatCurrency(0)}
          icon={<WalletIcon />}
        />
        <StatCard
          title="Income"
          value={formatCurrency(0)}
          icon={<TrendingUpIcon />}
          className="border-l-4 border-l-green-500"
        />
        <StatCard
          title="Expenses"
          value={formatCurrency(0)}
          icon={<TrendingDownIcon />}
          className="border-l-4 border-l-red-500"
        />
        <StatCard
          title="Savings Rate"
          value={formatPercentage(0)}
          icon={<PiggyBankIcon />}
          className="border-l-4 border-l-blue-500"
        />
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      data-testid="current-balance"
    >
      <StatCard
        title="Total Balance"
        value={formatCurrency(stats.totalBalance)}
        icon={<WalletIcon />}
        trend={
          stats.balanceTrend !== undefined
            ? { value: stats.balanceTrend, isPositive: stats.balanceTrend >= 0 }
            : undefined
        }
      />
      <StatCard
        title="Income"
        value={formatCurrency(stats.monthlyIncome)}
        icon={<TrendingUpIcon />}
        trend={
          stats.incomeTrend !== undefined
            ? { value: stats.incomeTrend, isPositive: stats.incomeTrend >= 0 }
            : undefined
        }
        className="border-l-4 border-l-green-500"
      />
      <StatCard
        title="Expenses"
        value={formatCurrency(stats.monthlyExpenses)}
        icon={<TrendingDownIcon />}
        trend={
          stats.expensesTrend !== undefined
            ? {
                value: Math.abs(stats.expensesTrend),
                isPositive: stats.expensesTrend <= 0,
              }
            : undefined
        }
        className="border-l-4 border-l-red-500"
      />
      <StatCard
        title="Savings Rate"
        value={formatPercentage(stats.savingsRate)}
        icon={<PiggyBankIcon />}
        className="border-l-4 border-l-blue-500"
      />
    </div>
  );
}
