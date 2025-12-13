'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, AlertCircle, TrendingDown, Folder } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  categoriesClient,
  type CategorySpending,
  type CategorySpendingSummary as SpendingSummary,
} from '@/services/categories.client';

// =============================================================================
// Constants
// =============================================================================

type DateRangePreset = 'this-month' | 'last-month' | 'last-3-months' | 'custom';

interface DateRangeOption {
  id: DateRangePreset;
  label: string;
}

const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { id: 'this-month', label: 'This Month' },
  { id: 'last-month', label: 'Last Month' },
  { id: 'last-3-months', label: 'Last 3 Months' },
  { id: 'custom', label: 'Custom' },
];

// =============================================================================
// Type Definitions
// =============================================================================

export interface CategorySpendingSummaryProps {
  /** Initial start date */
  startDate?: Date;
  /** Initial end date */
  endDate?: Date;
  /** Callback when a category is clicked */
  onCategoryClick?: (categoryId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getIconComponent(iconName: string | null): LucideIcon {
  if (!iconName) return Folder;
  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  return icons[iconName] || Folder;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function getDateRange(preset: DateRangePreset): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  switch (preset) {
    case 'this-month':
      return { start, end };
    case 'last-month':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    case 'last-3-months':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        end,
      };
    default:
      return { start, end };
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// =============================================================================
// Donut Chart Component
// =============================================================================

interface DonutChartProps {
  data: CategorySpending[];
  size?: number;
  onSegmentClick?: (categoryId: string) => void;
}

function DonutChart({ data, size = 200, onSegmentClick }: DonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.totalAmount, 0);
  const innerRadius = size * 0.3;
  const outerRadius = size * 0.45;
  const center = size / 2;

  // Generate arc paths
  const arcs = useMemo(() => {
    let currentAngle = -Math.PI / 2; // Start from top

    return data.map((item, index) => {
      const percentage = total > 0 ? item.totalAmount / total : 0;
      const angleSize = percentage * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleSize;
      currentAngle = endAngle;

      // Calculate arc path
      const largeArcFlag = angleSize > Math.PI ? 1 : 0;

      const x1 = center + outerRadius * Math.cos(startAngle);
      const y1 = center + outerRadius * Math.sin(startAngle);
      const x2 = center + outerRadius * Math.cos(endAngle);
      const y2 = center + outerRadius * Math.sin(endAngle);
      const x3 = center + innerRadius * Math.cos(endAngle);
      const y3 = center + innerRadius * Math.sin(endAngle);
      const x4 = center + innerRadius * Math.cos(startAngle);
      const y4 = center + innerRadius * Math.sin(startAngle);

      const path = `
        M ${x1} ${y1}
        A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}
        L ${x3} ${y3}
        A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
        Z
      `;

      return {
        path,
        color: item.color || '#6b7280',
        item,
        index,
        percentage,
      };
    });
  }, [data, total, center, innerRadius, outerRadius]);

  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div className="text-center text-gray-400">
          <TrendingDown className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">No spending data</p>
        </div>
      </div>
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((arc) => (
        <path
          key={arc.index}
          d={arc.path}
          fill={arc.color}
          opacity={hoveredIndex === null || hoveredIndex === arc.index ? 1 : 0.5}
          stroke="white"
          strokeWidth={2}
          style={{
            cursor: onSegmentClick ? 'pointer' : 'default',
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={() => setHoveredIndex(arc.index)}
          onMouseLeave={() => setHoveredIndex(null)}
          onClick={() => onSegmentClick?.(arc.item.categoryId)}
        />
      ))}
      {/* Center text */}
      <text
        x={center}
        y={center - 8}
        textAnchor="middle"
        className="fill-gray-500 text-xs"
      >
        Total
      </text>
      <text
        x={center}
        y={center + 12}
        textAnchor="middle"
        className="fill-gray-900 text-lg font-semibold"
      >
        {formatCurrency(total)}
      </text>
    </svg>
  );
}

// =============================================================================
// Legend Component
// =============================================================================

interface SpendingLegendProps {
  data: CategorySpending[];
  total: number;
  onCategoryClick?: (categoryId: string) => void;
}

function SpendingLegend({ data, total, onCategoryClick }: SpendingLegendProps) {
  return (
    <div className="space-y-2">
      {data.map((item) => {
        const IconComponent = getIconComponent(item.icon);
        const percentage = total > 0 ? (item.totalAmount / total) * 100 : 0;

        return (
          <button
            key={item.categoryId}
            type="button"
            onClick={() => onCategoryClick?.(item.categoryId)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50
              transition-colors text-left"
          >
            {/* Color indicator and icon */}
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${item.color || '#6b7280'}20` }}
            >
              <IconComponent
                className="h-4 w-4"
                style={{ color: item.color || '#6b7280' }}
              />
            </span>

            {/* Category name and percentage */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {item.categoryName}
                </span>
                <span className="text-sm text-gray-500 ml-2">
                  {percentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-gray-500">
                  {item.transactionCount} transactions
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(item.totalAmount)}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function CategorySpendingSummary({
  startDate: initialStart,
  endDate: initialEnd,
  onCategoryClick,
  className = '',
}: CategorySpendingSummaryProps) {
  // State
  const [datePreset, setDatePreset] = useState<DateRangePreset>('this-month');
  const [customStart, setCustomStart] = useState<Date>(
    initialStart || getDateRange('this-month').start
  );
  const [customEnd, setCustomEnd] = useState<Date>(
    initialEnd || getDateRange('this-month').end
  );
  const [data, setData] = useState<SpendingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get active date range
  const dateRange = useMemo(() => {
    if (datePreset === 'custom') {
      return { start: customStart, end: customEnd };
    }
    return getDateRange(datePreset);
  }, [datePreset, customStart, customEnd]);

  // Fetch spending data
  const fetchSpending = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await categoriesClient.getSpending(
        formatDate(dateRange.start),
        formatDate(dateRange.end),
        true // parentOnly
      );

      setData(result);
    } catch (err) {
      console.error('Failed to fetch spending:', err);
      setError(err instanceof Error ? err.message : 'Failed to load spending data');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  // Fetch on mount and when date range changes
  useEffect(() => {
    fetchSpending();
  }, [fetchSpending]);

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Spending by Category</h2>

        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          {DATE_RANGE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setDatePreset(option.id)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors
                ${datePreset === option.id
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Inputs */}
      {datePreset === 'custom' && (
        <div className="flex items-center gap-4 mb-6">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={formatDate(customStart)}
              onChange={(e) => setCustomStart(new Date(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={formatDate(customEnd)}
              onChange={(e) => setCustomEnd(new Date(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            />
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : data && data.categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Donut Chart */}
          <div className="flex items-center justify-center">
            <DonutChart
              data={data.categories}
              size={220}
              onSegmentClick={onCategoryClick}
            />
          </div>

          {/* Legend */}
          <SpendingLegend
            data={data.categories}
            total={data.totalSpending}
            onCategoryClick={onCategoryClick}
          />
        </div>
      ) : (
        <div className="text-center py-12">
          <TrendingDown className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No spending data</p>
          <p className="text-gray-400 text-sm mt-1">
            No transactions found for this period
          </p>
        </div>
      )}
    </div>
  );
}

export default CategorySpendingSummary;
