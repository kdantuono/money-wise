'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SpendingCategory {
  id: string;
  name: string;
  amount: number;
  color: string;
  percentage: number;
}

// Mock spending data
const mockSpending: SpendingCategory[] = [
  { id: '1', name: 'Food & Groceries', amount: 425, color: '#22c55e', percentage: 33 },
  { id: '2', name: 'Transportation', amount: 180, color: '#3b82f6', percentage: 14 },
  { id: '3', name: 'Entertainment', amount: 145, color: '#a855f7', percentage: 11 },
  { id: '4', name: 'Utilities', amount: 210, color: '#eab308', percentage: 16 },
  { id: '5', name: 'Shopping', amount: 320, color: '#ef4444', percentage: 25 },
];

const totalSpending = mockSpending.reduce((sum, cat) => sum + cat.amount, 0);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// SVG Donut Chart Component
function DonutChart({ data }: { data: SpendingCategory[] }) {
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
  category: SpendingCategory;
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

export function SpendingChart() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          Spending by Category
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          This month&apos;s expenses
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Donut Chart */}
          <div className="relative flex-shrink-0">
            <DonutChart data={mockSpending} />
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
              {mockSpending.map((category) => (
                <LegendItem key={category.id} category={category} />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
