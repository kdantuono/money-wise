'use client';

import { cn } from '@/lib/utils';
import type { TimePeriod } from '@/types/dashboard.types';

interface DashboardFiltersProps {
  period: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
}

const periods: { value: TimePeriod; label: string }[] = [
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
  { value: 'yearly', label: 'Year' },
];

/**
 * Dashboard Filters Component
 *
 * Provides time period selection for dashboard analytics.
 * Uses a button group design for clear visual feedback.
 */
export function DashboardFilters({
  period,
  onPeriodChange,
}: DashboardFiltersProps) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      {periods.map((p) => (
        <button
          key={p.value}
          onClick={() => onPeriodChange(p.value)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            period === p.value
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
