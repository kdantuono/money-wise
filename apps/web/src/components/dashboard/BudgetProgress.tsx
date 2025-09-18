'use client';

import { useState, useEffect } from 'react';

interface BudgetItem {
  id: string;
  name: string;
  category: string;
  allocated: number;
  spent: number;
  percentage: number;
  status: 'on_track' | 'approaching_limit' | 'over_budget';
}

export function BudgetProgress() {
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setBudgets([
        {
          id: '1',
          name: 'Groceries',
          category: 'Food',
          allocated: 600,
          spent: 420,
          percentage: 70,
          status: 'on_track',
        },
        {
          id: '2',
          name: 'Entertainment',
          category: 'Entertainment',
          allocated: 300,
          spent: 280,
          percentage: 93,
          status: 'approaching_limit',
        },
        {
          id: '3',
          name: 'Transportation',
          category: 'Transport',
          allocated: 200,
          spent: 230,
          percentage: 115,
          status: 'over_budget',
        },
        {
          id: '4',
          name: 'Shopping',
          category: 'Shopping',
          allocated: 400,
          spent: 150,
          percentage: 38,
          status: 'on_track',
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'bg-green-500';
      case 'approaching_limit':
        return 'bg-yellow-500';
      case 'over_budget':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'On Track';
      case 'approaching_limit':
        return 'Approaching Limit';
      case 'over_budget':
        return 'Over Budget';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="mb-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Budget Progress</h3>
      <div className="space-y-6">
        {budgets.map((budget) => (
          <div key={budget.id}>
            <div className="flex justify-between items-center mb-2">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{budget.name}</h4>
                <p className="text-xs text-gray-500">{budget.category}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  ${budget.spent.toLocaleString()} / ${budget.allocated.toLocaleString()}
                </p>
                <p className={`text-xs ${
                  budget.status === 'over_budget' ? 'text-red-600' : 
                  budget.status === 'approaching_limit' ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {getStatusText(budget.status)}
                </p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getStatusColor(budget.status)}`}
                style={{ width: `${Math.min(budget.percentage, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {budget.percentage}% used
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}