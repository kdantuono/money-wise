'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SpendingData {
  month: string;
  income: number;
  expenses: number;
}

export function SpendingChart() {
  const [data, setData] = useState<SpendingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setData([
        { month: 'Jan', income: 4800, expenses: 3200 },
        { month: 'Feb', income: 5200, expenses: 3400 },
        { month: 'Mar', income: 4900, expenses: 3100 },
        { month: 'Apr', income: 5500, expenses: 3600 },
        { month: 'May', income: 5100, expenses: 3300 },
        { month: 'Jun', income: 5420, expenses: 3241 },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className='bg-white rounded-lg shadow-sm p-6 border border-gray-200'>
        <div className='animate-pulse'>
          <div className='h-6 bg-gray-200 rounded w-1/3 mb-4'></div>
          <div className='h-64 bg-gray-200 rounded'></div>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-white rounded-lg shadow-sm p-6 border border-gray-200'>
      <h3 className='text-lg font-semibold text-gray-900 mb-6'>
        Income vs Expenses
      </h3>
      <ResponsiveContainer width='100%' height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray='3 3' />
          <XAxis dataKey='month' />
          <YAxis />
          <Tooltip
            formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
            labelFormatter={label => `Month: ${label}`}
          />
          <Line
            type='monotone'
            dataKey='income'
            stroke='#10B981'
            strokeWidth={2}
            name='Income'
          />
          <Line
            type='monotone'
            dataKey='expenses'
            stroke='#EF4444'
            strokeWidth={2}
            name='Expenses'
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
