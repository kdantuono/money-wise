'use client';

import { useState, useMemo } from 'react';
// Removed framer-motion for MVP simplicity
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpFromLine,
  ArrowDownToLine,
  Calendar,
  BarChart3,
} from 'lucide-react';

// Enhanced activity data with more realistic values and additional context
const weeklyData = [
  {
    name: 'Sat',
    fullName: 'Saturday',
    deposit: 1250,
    withdraw: 850,
    net: 400,
    date: '2025-01-11',
    transactions: 8,
  },
  {
    name: 'Sun',
    fullName: 'Sunday',
    deposit: 600,
    withdraw: 450,
    net: 150,
    date: '2025-01-12',
    transactions: 4,
  },
  {
    name: 'Mon',
    fullName: 'Monday',
    deposit: 2100,
    withdraw: 1800,
    net: 300,
    date: '2025-01-13',
    transactions: 12,
  },
  {
    name: 'Tue',
    fullName: 'Tuesday',
    deposit: 1850,
    withdraw: 2200,
    net: -350,
    date: '2025-01-14',
    transactions: 15,
  },
  {
    name: 'Wed',
    fullName: 'Wednesday',
    deposit: 3200,
    withdraw: 1100,
    net: 2100,
    date: '2025-01-15',
    transactions: 18,
  },
  {
    name: 'Thu',
    fullName: 'Thursday',
    deposit: 1400,
    withdraw: 1650,
    net: -250,
    date: '2025-01-16',
    transactions: 11,
  },
  {
    name: 'Fri',
    fullName: 'Friday',
    deposit: 2800,
    withdraw: 2400,
    net: 400,
    date: '2025-01-17',
    transactions: 16,
  },
];

// Custom tooltip with enhanced financial information
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        className='bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 opacity-100 scale-100'
        role='tooltip'
        aria-label={`Activity data for ${data.fullName}`}
      >
        <div className='space-y-3'>
          <div className='border-b border-neutral-200 dark:border-neutral-600 pb-2'>
            <p className='text-sm font-semibold text-neutral-900 dark:text-neutral-100'>
              {data.fullName}
            </p>
            <p className='text-xs text-neutral-500 dark:text-neutral-400'>
              {new Date(data.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-1'>
              <div className='flex items-center space-x-1'>
                <ArrowUpFromLine className='h-3 w-3 text-success-500' />
                <span className='text-xs text-neutral-600 dark:text-neutral-400'>
                  Deposits
                </span>
              </div>
              <p className='text-sm font-medium text-success-600 dark:text-success-400'>
                +${data.deposit.toLocaleString()}
              </p>
            </div>

            <div className='space-y-1'>
              <div className='flex items-center space-x-1'>
                <ArrowDownToLine className='h-3 w-3 text-error-500' />
                <span className='text-xs text-neutral-600 dark:text-neutral-400'>
                  Withdrawals
                </span>
              </div>
              <p className='text-sm font-medium text-error-600 dark:text-error-400'>
                -${data.withdraw.toLocaleString()}
              </p>
            </div>
          </div>

          <div className='border-t border-neutral-200 dark:border-neutral-600 pt-2'>
            <div className='flex items-center justify-between'>
              <span className='text-xs text-neutral-600 dark:text-neutral-400'>
                Net Flow:
              </span>
              <span
                className={`text-sm font-semibold flex items-center ${
                  data.net >= 0
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-error-600 dark:text-error-400'
                }`}
              >
                {data.net >= 0 ? (
                  <TrendingUp className='h-3 w-3 mr-1' />
                ) : (
                  <TrendingDown className='h-3 w-3 mr-1' />
                )}
                {data.net >= 0 ? '+' : ''}${data.net.toLocaleString()}
              </span>
            </div>
            <div className='flex items-center justify-between mt-1'>
              <span className='text-xs text-neutral-600 dark:text-neutral-400'>
                Transactions:
              </span>
              <span className='text-xs font-medium text-neutral-700 dark:text-neutral-300'>
                {data.transactions}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

type ViewMode = 'comparison' | 'net' | 'volume';

export function WeeklyActivity() {
  const [viewMode, setViewMode] = useState<ViewMode>('comparison');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Calculate weekly totals
  const weeklyTotals = useMemo(() => {
    const totalDeposits = weeklyData.reduce((sum, day) => sum + day.deposit, 0);
    const totalWithdrawals = weeklyData.reduce(
      (sum, day) => sum + day.withdraw,
      0
    );
    const netFlow = totalDeposits - totalWithdrawals;
    const totalTransactions = weeklyData.reduce(
      (sum, day) => sum + day.transactions,
      0
    );

    return {
      totalDeposits,
      totalWithdrawals,
      netFlow,
      totalTransactions,
      averageDaily: netFlow / weeklyData.length,
    };
  }, []);

  // Transform data based on view mode
  const chartData = useMemo(() => {
    return weeklyData.map(day => ({
      ...day,
      volume: day.deposit + day.withdraw,
    }));
  }, []);

  const getBarColor = (value: number, type: 'deposit' | 'withdraw' | 'net') => {
    if (type === 'deposit') return 'hsl(var(--success-500))';
    if (type === 'withdraw') return 'hsl(var(--error-500))';
    if (type === 'net')
      return value >= 0 ? 'hsl(var(--success-500))' : 'hsl(var(--error-500))';
    return 'hsl(var(--primary-500))';
  };

  return (
    <Card className='p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-card hover:shadow-card-hover transition-shadow duration-300'>
      {/* Header with Controls */}
      <div className='flex flex-col space-y-4 mb-6'>
        {/* Title and Weekly Summary */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0'>
          <div>
            <h3 className='text-financial-subheading flex items-center'>
              <BarChart3 className='h-5 w-5 mr-2 text-primary-500' />
              Weekly Activity
            </h3>
            <p className='text-financial-caption flex items-center'>
              <Calendar className='h-3 w-3 mr-1' />
              Jan 11-17, 2025 • {weeklyTotals.totalTransactions} transactions
            </p>
          </div>

          <div className='flex flex-col sm:items-end text-right'>
            <div
              className={`text-lg font-bold flex items-center ${
                weeklyTotals.netFlow >= 0
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-error-600 dark:text-error-400'
              }`}
            >
              {weeklyTotals.netFlow >= 0 ? (
                <TrendingUp className='h-4 w-4 mr-1' />
              ) : (
                <TrendingDown className='h-4 w-4 mr-1' />
              )}
              {weeklyTotals.netFlow >= 0 ? '+' : ''}$
              {weeklyTotals.netFlow.toLocaleString()}
            </div>
            <p className='text-financial-caption'>Net weekly flow</p>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className='flex items-center space-x-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1'>
          {[
            {
              key: 'comparison' as ViewMode,
              label: 'Comparison',
              icon: BarChart3,
            },
            { key: 'net' as ViewMode, label: 'Net Flow', icon: TrendingUp },
            {
              key: 'volume' as ViewMode,
              label: 'Volume',
              icon: ArrowUpFromLine,
            },
          ].map(option => (
            <Button
              key={option.key}
              variant={viewMode === option.key ? 'default' : 'ghost'}
              size='sm'
              onClick={() => setViewMode(option.key)}
              className={`h-8 px-3 text-xs font-medium rounded-md transition-all duration-200 ${
                viewMode === option.key
                  ? 'bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
              aria-label={`View ${option.label} chart`}
            >
              <option.icon className='h-3 w-3 mr-1' />
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div
        className='h-[280px] w-full'
        role='img'
        aria-label='Weekly activity chart'
      >
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
            barGap={viewMode === 'comparison' ? 4 : 8}
          >
            <CartesianGrid
              strokeDasharray='3 3'
              stroke='hsl(var(--neutral-200))'
              strokeOpacity={0.3}
              vertical={false}
            />

            <XAxis
              dataKey='name'
              tick={{
                fontSize: 12,
                fill: 'hsl(var(--neutral-500))',
                fontWeight: 500,
              }}
              axisLine={{ stroke: 'hsl(var(--neutral-300))' }}
              tickLine={false}
              height={40}
            />

            <YAxis
              tick={{
                fontSize: 12,
                fill: 'hsl(var(--neutral-500))',
                fontWeight: 500,
              }}
              axisLine={{ stroke: 'hsl(var(--neutral-300))' }}
              tickLine={false}
              width={60}
              tickFormatter={value => `$${(value / 1000).toFixed(0)}k`}
            />

            <Tooltip content={<CustomTooltip />} />

            <div>
              {viewMode === 'comparison' && (
                <>
                  <Bar
                    dataKey='deposit'
                    fill='hsl(var(--success-500))'
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                    name='Deposits'
                  />
                  <Bar
                    dataKey='withdraw'
                    fill='hsl(var(--error-500))'
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                    name='Withdrawals'
                  />
                </>
              )}

              {viewMode === 'net' && (
                <Bar
                  dataKey='net'
                  radius={[4, 4, 4, 4]}
                  barSize={30}
                  name='Net Flow'
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getBarColor(entry.net, 'net')}
                    />
                  ))}
                </Bar>
              )}

              {viewMode === 'volume' && (
                <Bar
                  dataKey='volume'
                  fill='hsl(var(--primary-500))'
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                  name='Total Volume'
                />
              )}
            </div>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend and Stats */}
      <div
        className='flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 space-y-3 sm:space-y-0 opacity-100'
      >
        {/* Legend */}
        <div className='flex items-center space-x-4'>
          {viewMode === 'comparison' && (
            <>
              <div className='flex items-center space-x-2'>
                <div className='w-3 h-3 rounded-full bg-success-500'></div>
                <span className='text-xs font-medium text-neutral-600 dark:text-neutral-400'>
                  Deposits
                </span>
              </div>
              <div className='flex items-center space-x-2'>
                <div className='w-3 h-3 rounded-full bg-error-500'></div>
                <span className='text-xs font-medium text-neutral-600 dark:text-neutral-400'>
                  Withdrawals
                </span>
              </div>
            </>
          )}
          {viewMode === 'net' && (
            <div className='flex items-center space-x-2'>
              <div className='w-3 h-3 rounded-full bg-primary-500'></div>
              <span className='text-xs font-medium text-neutral-600 dark:text-neutral-400'>
                Net Cash Flow
              </span>
            </div>
          )}
          {viewMode === 'volume' && (
            <div className='flex items-center space-x-2'>
              <div className='w-3 h-3 rounded-full bg-primary-500'></div>
              <span className='text-xs font-medium text-neutral-600 dark:text-neutral-400'>
                Transaction Volume
              </span>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className='flex items-center space-x-4 text-financial-caption'>
          <div>
            <span className='text-success-600'>
              ↑ ${weeklyTotals.totalDeposits.toLocaleString()}
            </span>
          </div>
          <div>
            <span className='text-error-600'>
              ↓ ${weeklyTotals.totalWithdrawals.toLocaleString()}
            </span>
          </div>
          <div>
            <span className='text-neutral-500'>
              Avg: ${Math.abs(weeklyTotals.averageDaily).toLocaleString()}/day
            </span>
          </div>
        </div>
      </div>

      {/* Accessibility Data Table */}
      <div className='sr-only'>
        <table>
          <caption>Weekly activity data by day</caption>
          <thead>
            <tr>
              <th>Day</th>
              <th>Deposits</th>
              <th>Withdrawals</th>
              <th>Net Flow</th>
              <th>Transactions</th>
            </tr>
          </thead>
          <tbody>
            {weeklyData.map(day => (
              <tr key={day.name}>
                <td>{day.fullName}</td>
                <td>${day.deposit.toLocaleString()}</td>
                <td>${day.withdraw.toLocaleString()}</td>
                <td>${day.net.toLocaleString()}</td>
                <td>{day.transactions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
