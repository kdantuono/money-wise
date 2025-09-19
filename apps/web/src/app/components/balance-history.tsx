"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, CalendarDays } from "lucide-react";

// Enhanced data with more realistic financial data
const balanceData = [
  {
    month: "Jul",
    balance: 8500,
    income: 3200,
    expenses: 2800,
    date: "2024-07-01",
    change: 5.2
  },
  {
    month: "Aug",
    balance: 9200,
    income: 3400,
    expenses: 2700,
    date: "2024-08-01",
    change: 8.2
  },
  {
    month: "Sep",
    balance: 8800,
    income: 2900,
    expenses: 3300,
    date: "2024-09-01",
    change: -4.3
  },
  {
    month: "Oct",
    balance: 11200,
    income: 4100,
    expenses: 1700,
    date: "2024-10-01",
    change: 27.3
  },
  {
    month: "Nov",
    balance: 10800,
    income: 3300,
    expenses: 3700,
    date: "2024-11-01",
    change: -3.6
  },
  {
    month: "Dec",
    balance: 12400,
    income: 4200,
    expenses: 2600,
    date: "2024-12-01",
    change: 14.8
  },
  {
    month: "Jan",
    balance: 11900,
    income: 3600,
    expenses: 4100,
    date: "2025-01-01",
    change: -4.0
  },
];

// Custom tooltip component with enhanced accessibility
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700"
        role="tooltip"
        aria-label={`Balance data for ${label}`}
      >
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          {label} 2024
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600 dark:text-neutral-400">Balance:</span>
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              ${data.balance.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600 dark:text-neutral-400">Income:</span>
            <span className="text-sm font-medium text-success-600 dark:text-success-400">
              +${data.income.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600 dark:text-neutral-400">Expenses:</span>
            <span className="text-sm font-medium text-error-600 dark:text-error-400">
              -${data.expenses.toLocaleString()}
            </span>
          </div>
          <div className="border-t border-neutral-200 dark:border-neutral-600 pt-1 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-600 dark:text-neutral-400">Change:</span>
              <span className={`text-sm font-medium flex items-center ${
                data.change >= 0
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-error-600 dark:text-error-400'
              }`}>
                {data.change >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(data.change)}%
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
  return null;
};

type TimeRange = 'all' | '6m' | '3m';

export function BalanceHistory() {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [hoveredData, setHoveredData] = useState(null);

  // Filter data based on selected time range
  const filteredData = useMemo(() => {
    if (timeRange === 'all') return balanceData;
    if (timeRange === '6m') return balanceData.slice(-6);
    if (timeRange === '3m') return balanceData.slice(-3);
    return balanceData;
  }, [timeRange]);

  // Calculate statistics
  const currentBalance = filteredData[filteredData.length - 1]?.balance || 0;
  const previousBalance = filteredData[filteredData.length - 2]?.balance || 0;
  const balanceChange = currentBalance - previousBalance;
  const balanceChangePercent = previousBalance > 0 ? ((balanceChange / previousBalance) * 100) : 0;

  return (
    <Card className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-card hover:shadow-card-hover transition-shadow duration-300">
      {/* Header with Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
        <div className="space-y-1">
          <h3 className="text-financial-subheading">Balance Overview</h3>
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-primary-500 mr-1" />
              <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                ${currentBalance.toLocaleString()}
              </span>
            </div>
            <div className={`flex items-center text-sm ${
              balanceChange >= 0
                ? 'text-success-600 dark:text-success-400'
                : 'text-error-600 dark:text-error-400'
            }`}>
              {balanceChange >= 0 ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              <span className="font-medium">
                {Math.abs(balanceChangePercent).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center space-x-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
          {[
            { key: '3m' as TimeRange, label: '3M' },
            { key: '6m' as TimeRange, label: '6M' },
            { key: 'all' as TimeRange, label: 'All' }
          ].map((option) => (
            <Button
              key={option.key}
              variant={timeRange === option.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeRange(option.key)}
              className={`h-8 px-3 text-xs font-medium rounded-md transition-all duration-200 ${
                timeRange === option.key
                  ? 'bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
              aria-label={`View ${option.label} time range`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div className="h-[280px] w-full" role="img" aria-label="Balance history chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={filteredData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            onMouseMove={(data) => setHoveredData(data?.activePayload?.[0]?.payload)}
            onMouseLeave={() => setHoveredData(null)}
          >
            {/* Enhanced Grid */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--neutral-200))"
              strokeOpacity={0.3}
              vertical={false}
            />

            {/* X-Axis with better accessibility */}
            <XAxis
              dataKey="month"
              tick={{
                fontSize: 12,
                fill: "hsl(var(--neutral-500))",
                fontWeight: 500
              }}
              axisLine={{ stroke: "hsl(var(--neutral-300))" }}
              tickLine={false}
              height={40}
              interval={0}
            />

            {/* Y-Axis with currency formatting */}
            <YAxis
              tick={{
                fontSize: 12,
                fill: "hsl(var(--neutral-500))",
                fontWeight: 500
              }}
              axisLine={{ stroke: "hsl(var(--neutral-300))" }}
              tickLine={false}
              width={60}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              domain={['dataMin - 500', 'dataMax + 500']}
            />

            {/* Enhanced Tooltip */}
            <Tooltip content={<CustomTooltip />} />

            {/* Interactive Area */}
            <Area
              type="monotone"
              dataKey="balance"
              stroke="hsl(var(--primary-500))"
              strokeWidth={3}
              fill="url(#balanceGradient)"
              fillOpacity={0.6}
              dot={{
                r: 4,
                fill: "hsl(var(--primary-500))",
                strokeWidth: 2,
                stroke: "white"
              }}
              activeDot={{
                r: 6,
                fill: "hsl(var(--primary-500))",
                strokeWidth: 3,
                stroke: "white",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
              }}
            />

            {/* Gradient Definition */}
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary-500))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary-500))" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            {/* Brush for data selection on larger datasets */}
            {filteredData.length > 6 && (
              <Brush
                dataKey="month"
                height={30}
                stroke="hsl(var(--primary-400))"
                fill="hsl(var(--primary-50))"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Enhanced Legend */}
      <motion.div
        className="flex items-center justify-center mt-4 space-x-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-primary-500"></div>
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Balance Trend
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <CalendarDays className="h-3 w-3 text-neutral-400" />
          <span className="text-xs text-neutral-500 dark:text-neutral-500">
            Last {filteredData.length} months
          </span>
        </div>
      </motion.div>

      {/* Screen Reader Data Table */}
      <div className="sr-only">
        <table>
          <caption>Balance history data by month</caption>
          <thead>
            <tr>
              <th>Month</th>
              <th>Balance</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr key={item.month}>
                <td>{item.month} 2024</td>
                <td>${item.balance.toLocaleString()}</td>
                <td>{item.change}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
