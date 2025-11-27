'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  StatsCards,
  RecentTransactions,
  BudgetProgress,
  SpendingChart,
  QuickActions,
} from '@/components/dashboard';
import { useAuthStore } from '@/stores/auth-store';

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6" data-testid="dashboard">
          {/* Welcome Section */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back,{' '}
              <span data-testid="user-name">{user?.firstName}</span>!
            </h1>
            <p className="text-gray-600 mt-1">
              Here&apos;s an overview of your financial dashboard
            </p>
          </div>

          {/* Stats Cards - Full Width */}
          <StatsCards />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <SpendingChart />
              <QuickActions />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <RecentTransactions />
              <BudgetProgress />
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
