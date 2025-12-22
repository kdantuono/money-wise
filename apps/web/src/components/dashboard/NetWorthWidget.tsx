/**
 * Net Worth Widget
 *
 * Displays financial summary including net worth, total assets, and total liabilities.
 * Shows breakdown with visual indicators and trend information.
 *
 * @module components/dashboard/NetWorthWidget
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { cn } from '@/lib/utils';

// ============================================================================
// Icons
// ============================================================================

function TrendingUpIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function Building2Icon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}

// ============================================================================
// Utilities
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================================================
// Component
// ============================================================================

function NetWorthSkeleton() {
  return (
    <Card data-testid="net-worth-widget" aria-busy="true">
      <CardHeader>
        <CardTitle>Net Worth</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Main net worth display */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-2 w-full bg-gray-200 rounded-full animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-2 w-full bg-gray-200 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NetWorthWidget() {
  const { data, isLoading, error } = useFinancialSummary();

  if (isLoading) {
    return <NetWorthSkeleton />;
  }

  if (error) {
    return (
      <Card data-testid="net-worth-widget">
        <CardHeader>
          <CardTitle>Net Worth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 font-medium">Unable to load financial data</p>
            <p className="text-sm text-red-500 mt-1">
              {error instanceof Error ? error.message : 'Please try again later'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card data-testid="net-worth-widget">
        <CardHeader>
          <CardTitle>Net Worth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No financial data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { netWorth, totalAssets, totalLiabilities } = data;
  const isPositive = netWorth >= 0;

  // Calculate percentages for visual breakdown
  const total = totalAssets + totalLiabilities;
  const assetsPercentage = total > 0 ? (totalAssets / total) * 100 : 50;
  const liabilitiesPercentage = total > 0 ? (totalLiabilities / total) * 100 : 50;

  return (
    <Card data-testid="net-worth-widget">
      <CardHeader>
        <CardTitle>Net Worth Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Main Net Worth Display */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Net Worth</p>
              <p
                className={cn(
                  'text-3xl font-bold',
                  isPositive ? 'text-green-600' : 'text-red-600'
                )}
                data-testid="net-worth-amount"
              >
                {formatCurrency(netWorth)}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPositive ? 'Positive Net Worth' : 'Negative Net Worth'}
              </p>
            </div>
            <div
              className={cn(
                'h-12 w-12 rounded-full flex items-center justify-center',
                isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              )}
            >
              <TrendingUpIcon />
            </div>
          </div>

          {/* Assets and Liabilities Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            {/* Assets */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Building2Icon />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assets</p>
                  <p className="text-lg font-semibold" data-testid="total-assets">
                    {formatCurrency(totalAssets)}
                  </p>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${assetsPercentage}%` }}
                  aria-label={`Assets: ${assetsPercentage.toFixed(1)}%`}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {assetsPercentage.toFixed(1)}% of total
              </p>
            </div>

            {/* Liabilities */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                  <CreditCardIcon />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Liabilities</p>
                  <p className="text-lg font-semibold" data-testid="total-liabilities">
                    {formatCurrency(totalLiabilities)}
                  </p>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 transition-all"
                  style={{ width: `${liabilitiesPercentage}%` }}
                  aria-label={`Liabilities: ${liabilitiesPercentage.toFixed(1)}%`}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {liabilitiesPercentage.toFixed(1)}% of total
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
