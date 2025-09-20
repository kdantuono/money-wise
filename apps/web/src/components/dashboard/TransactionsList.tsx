'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: Date;
  merchantName?: string;
}

export function TransactionsList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setTransactions([
        {
          id: '1',
          description: 'Salary',
          amount: 5420.0,
          type: 'income',
          category: 'Salary',
          date: new Date(),
          merchantName: 'Company Inc.',
        },
        {
          id: '2',
          description: 'Groceries',
          amount: 120.5,
          type: 'expense',
          category: 'Food',
          date: new Date(Date.now() - 86400000),
          merchantName: 'Fresh Market',
        },
        {
          id: '3',
          description: 'Gas Station',
          amount: 45.2,
          type: 'expense',
          category: 'Transportation',
          date: new Date(Date.now() - 172800000),
          merchantName: 'Shell',
        },
        {
          id: '4',
          description: 'Netflix Subscription',
          amount: 15.99,
          type: 'expense',
          category: 'Entertainment',
          date: new Date(Date.now() - 259200000),
          merchantName: 'Netflix',
        },
        {
          id: '5',
          description: 'Coffee Shop',
          amount: 8.5,
          type: 'expense',
          category: 'Food',
          date: new Date(Date.now() - 345600000),
          merchantName: 'Local Coffee',
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className='bg-white rounded-lg shadow-sm border border-gray-200'>
        <div className='p-6'>
          <div className='h-6 bg-gray-200 rounded w-1/4 mb-6 animate-pulse'></div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className='flex items-center justify-between py-4 border-b border-gray-200 last:border-b-0 animate-pulse'
            >
              <div className='flex items-center space-x-4'>
                <div className='w-10 h-10 bg-gray-200 rounded-full'></div>
                <div>
                  <div className='h-4 bg-gray-200 rounded w-32 mb-1'></div>
                  <div className='h-3 bg-gray-200 rounded w-24'></div>
                </div>
              </div>
              <div className='text-right'>
                <div className='h-4 bg-gray-200 rounded w-16 mb-1'></div>
                <div className='h-3 bg-gray-200 rounded w-12'></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='bg-white rounded-lg shadow-sm border border-gray-200'>
      <div className='p-6'>
        <div className='flex items-center justify-between mb-6'>
          <h3 className='text-lg font-semibold text-gray-900'>
            Recent Transactions
          </h3>
          <button className='text-blue-600 hover:text-blue-700 text-sm font-medium'>
            View all
          </button>
        </div>

        <div className='space-y-0'>
          {transactions.map(transaction => (
            <div
              key={transaction.id}
              className='flex items-center justify-between py-4 border-b border-gray-200 last:border-b-0'
            >
              <div className='flex items-center space-x-4'>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.type === 'income'
                      ? 'bg-green-100'
                      : 'bg-red-100'
                  }`}
                >
                  {transaction.type === 'income' ? (
                    <ArrowUpRight className='h-5 w-5 text-green-600' />
                  ) : (
                    <ArrowDownRight className='h-5 w-5 text-red-600' />
                  )}
                </div>
                <div>
                  <p className='text-sm font-medium text-gray-900'>
                    {transaction.description}
                  </p>
                  <p className='text-xs text-gray-500'>
                    {transaction.merchantName} • {transaction.category}
                  </p>
                </div>
              </div>

              <div className='flex items-center space-x-4'>
                <div className='text-right'>
                  <p
                    className={`text-sm font-medium ${
                      transaction.type === 'income'
                        ? 'text-green-600'
                        : 'text-gray-900'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '-'}$
                    {transaction.amount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  <p className='text-xs text-gray-500'>
                    {format(transaction.date, 'MMM dd')}
                  </p>
                </div>
                <button className='text-gray-400 hover:text-gray-600'>
                  <MoreHorizontal className='h-4 w-4' />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
