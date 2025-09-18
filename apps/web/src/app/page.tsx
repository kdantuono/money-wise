'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OverviewCards } from '@/components/dashboard/OverviewCards';
import { SpendingChart } from '@/components/dashboard/SpendingChart';
import { TransactionsList } from '@/components/dashboard/TransactionsList';
import { BudgetProgress } from '@/components/dashboard/BudgetProgress';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    // Simulate user data for now
    setUser({
      id: '1',
      name: 'Demo User',
      email: 'demo@moneywise.com'
    });
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.name}!</p>
        </div>

        <OverviewCards />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SpendingChart />
          <BudgetProgress />
        </div>

        <TransactionsList />
      </div>
    </DashboardLayout>
  );
}