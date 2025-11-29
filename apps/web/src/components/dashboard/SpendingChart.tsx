'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CategorySpending } from '@/types/dashboard.types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// SVG Donut Chart Component
function DonutChart({ data }: { data: CategorySpending[] }) {
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedPercentage = 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="transform -rotate-90"
    >
      {/* Background circle */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#f3f4f6"
        strokeWidth={strokeWidth}
      />
      {/* Segments */}
      {data.map((category) => {
        const segmentLength = (category.percentage / 100) * circumference;
        const offset = (accumulatedPercentage / 100) * circumference;
        accumulatedPercentage += category.percentage;

        return (
          <circle
            key={category.id}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={category.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            className="transition-all duration-500"
          />
        );
      })}
    </svg>
  );
}

interface LegendItemProps {
  category: CategorySpending;
}

function LegendItem({ category }: LegendItemProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: category.color }}
        />
        <span className="text-sm text-gray-700 truncate">{category.name}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <span className="text-sm font-medium text-gray-900">
          {formatCurrency(category.amount)}
        </span>
        <span className="text-xs text-muted-foreground w-8 text-right">
          {category.percentage}%
        </span>
      </div>
    </div>
  );
}

function SpendingChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mt-1" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-40 h-40 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1 w-full space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          Spending by Category
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          This period&apos;s expenses
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
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
              className="text-gray-400"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">No spending data</p>
          <p className="text-sm text-gray-500 mt-1">
            Start tracking your expenses to see spending breakdown
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface SpendingChartProps {
  data?: CategorySpending[];
  isLoading?: boolean;
}

export function SpendingChart({ data, isLoading }: SpendingChartProps) {
  if (isLoading) {
    return <SpendingChartSkeleton />;
  }

  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  const totalSpending = data.reduce((sum, cat) => sum + cat.amount, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          Spending by Category
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          This period&apos;s expenses
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Donut Chart */}
          <div className="relative flex-shrink-0">
            <DonutChart data={data} />
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(totalSpending)}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 w-full">
            <div className="divide-y divide-gray-100">
              {data.map((category) => (
                <LegendItem key={category.id} category={category} />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
