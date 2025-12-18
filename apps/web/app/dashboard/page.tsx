'use client';

import { useState } from 'react';
import {
  StatsCards,
  RecentTransactions,
  BudgetProgress,
  SpendingChart,
  QuickActions,
  DashboardFilters,
  NetWorthWidget,
  AvailableToSpendCard,
  FinancialAlertsWidget,
} from '@/components/dashboard';
import { useAuthStore } from '@/stores/auth-store';
import { useDashboardData } from '@/hooks/useDashboardStats';
import type { TimePeriod } from '@/types/dashboard.types';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<TimePeriod>('monthly');
  const { stats, spending, transactions, isLoading, error } = useDashboardData(period);

  // Error state
  if (error) {
    return (
      <div className="space-y-6" data-testid="dashboard">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back,{' '}
              <span data-testid="user-name">{user?.firstName}</span>!
            </h1>
            <p className="text-gray-600 mt-1">
              Here&apos;s an overview of your financial dashboard
            </p>
          </div>
          <DashboardFilters period={period} onPeriodChange={setPeriod} />
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium">Unable to load dashboard data</p>
          <p className="text-red-500 text-sm mt-1">
            {error.message || 'Please try again later'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Welcome Section with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welcome back,{' '}
            <span data-testid="user-name">{user?.firstName}</span>!
          </h1>
          <p className="text-gray-600 mt-1">
            Here&apos;s an overview of your financial dashboard
          </p>
        </div>
        <DashboardFilters period={period} onPeriodChange={setPeriod} />
      </div>

      {/* Stats Cards - Full Width */}
      <StatsCards stats={stats} isLoading={isLoading} />

      {/* Net Worth Widget - Full Width */}
      <NetWorthWidget />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <SpendingChart data={spending} isLoading={isLoading} />
          <QuickActions />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <RecentTransactions transactions={transactions} isLoading={isLoading} />
          <BudgetProgress />
        </div>
      </div>

      {/* Financial Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AvailableToSpendCard />
        <FinancialAlertsWidget />
      </div>
    </div>
  );
}
