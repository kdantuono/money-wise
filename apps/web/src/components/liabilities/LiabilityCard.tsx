'use client';

import { memo, useMemo } from 'react';
import {
  CreditCard,
  ShoppingBag,
  Landmark,
  Home,
  CircleDot,
  Calendar,
  Percent,
  DollarSign,
} from 'lucide-react';
import type { Liability, LiabilityType } from '@/services/liabilities.client';

// =============================================================================
// Type Definitions
// =============================================================================

export interface LiabilityCardProps {
  /** Liability data */
  liability: Liability;
  /** Callback when card is clicked */
  onClick?: (liability: Liability) => void;
  /** Whether the card is in a compact view */
  compact?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Type icon component that renders the appropriate icon based on liability type
 */
function TypeIcon({ type, className }: { type: LiabilityType; className?: string }) {
  switch (type) {
    case 'CREDIT_CARD':
      return <CreditCard className={className} />;
    case 'BNPL':
      return <ShoppingBag className={className} />;
    case 'LOAN':
      return <Landmark className={className} />;
    case 'MORTGAGE':
      return <Home className={className} />;
    default:
      return <CircleDot className={className} />;
  }
}

/**
 * Get color classes for liability type
 */
function getTypeColors(type: LiabilityType): { bg: string; text: string; icon: string } {
  switch (type) {
    case 'CREDIT_CARD':
      return { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-500' };
    case 'BNPL':
      return { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-500' };
    case 'LOAN':
      return { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-500' };
    case 'MORTGAGE':
      return { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-500' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', icon: 'text-gray-500' };
  }
}

/**
 * Get human-readable label for liability type
 */
function getTypeLabel(type: LiabilityType): string {
  switch (type) {
    case 'CREDIT_CARD':
      return 'Credit Card';
    case 'BNPL':
      return 'Buy Now Pay Later';
    case 'LOAN':
      return 'Loan';
    case 'MORTGAGE':
      return 'Mortgage';
    default:
      return 'Other';
  }
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date for display
 */
function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Get utilization color class
 */
function getUtilizationColor(percent: number): string {
  if (percent >= 90) return 'bg-red-500';
  if (percent >= 70) return 'bg-orange-500';
  if (percent >= 50) return 'bg-yellow-500';
  return 'bg-green-500';
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * LiabilityCard Component
 *
 * Displays a single liability with type icon, balance, and key details.
 * Supports both full and compact views.
 */
export const LiabilityCard = memo(function LiabilityCard({
  liability,
  onClick,
  compact = false,
}: LiabilityCardProps) {
  const colors = getTypeColors(liability.type);
  const typeLabel = getTypeLabel(liability.type);

  const utilizationPercent = useMemo(() => {
    if (liability.creditLimit && liability.creditLimit > 0) {
      return Math.min(100, (liability.currentBalance / liability.creditLimit) * 100);
    }
    return null;
  }, [liability.currentBalance, liability.creditLimit]);

  const handleClick = () => {
    if (onClick) {
      onClick(liability);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  if (compact) {
    return (
      <div
        role="button"
        tabIndex={onClick ? 0 : undefined}
        onClick={handleClick}
        onKeyDown={onClick ? handleKeyDown : undefined}
        className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white
          ${onClick ? 'cursor-pointer hover:border-gray-300 hover:shadow-sm' : ''}`}
      >
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <TypeIcon type={liability.type} className={`h-4 w-4 ${colors.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{liability.name}</p>
          <p className="text-sm text-gray-500">{typeLabel}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-900">
            {formatCurrency(liability.currentBalance, liability.currency)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <article
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      className={`rounded-xl border border-gray-200 bg-white p-5 transition-all
        ${onClick ? 'cursor-pointer hover:border-gray-300 hover:shadow-md' : ''}
        focus:outline-none focus:ring-2 focus:ring-blue-500`}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${colors.bg}`}>
          <TypeIcon type={liability.type} className={`h-6 w-6 ${colors.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{liability.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}
            >
              {typeLabel}
            </span>
            {liability.provider && (
              <span className="text-xs text-gray-500">{liability.provider}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(liability.currentBalance, liability.currency)}
          </p>
          <p className="text-sm text-gray-500">Current Balance</p>
        </div>
      </div>

      {/* Credit Utilization Bar (for credit cards) */}
      {utilizationPercent !== null && liability.creditLimit && (
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Credit Utilization</span>
            <span className="font-medium text-gray-900">
              {utilizationPercent.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getUtilizationColor(utilizationPercent)}`}
              style={{ width: `${utilizationPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Used: {formatCurrency(liability.currentBalance, liability.currency)}</span>
            <span>Limit: {formatCurrency(liability.creditLimit, liability.currency)}</span>
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
        {liability.interestRate !== undefined && liability.interestRate > 0 && (
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">APR</p>
              <p className="text-sm font-medium text-gray-900">
                {liability.interestRate.toFixed(2)}%
              </p>
            </div>
          </div>
        )}

        {liability.minimumPayment !== undefined && liability.minimumPayment > 0 && (
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Min Payment</p>
              <p className="text-sm font-medium text-gray-900">
                {formatCurrency(liability.minimumPayment, liability.currency)}
              </p>
            </div>
          </div>
        )}

        {liability.nextPaymentDate && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Next Payment</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(liability.nextPaymentDate)}
              </p>
            </div>
          </div>
        )}

        {liability.availableCredit !== undefined && (
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Available</p>
              <p className="text-sm font-medium text-green-600">
                {formatCurrency(liability.availableCredit, liability.currency)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status Badge */}
      {liability.status !== 'ACTIVE' && (
        <div className="mt-4">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${liability.status === 'PAID_OFF'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
              }`}
          >
            {liability.status === 'PAID_OFF' ? 'Paid Off' : 'Closed'}
          </span>
        </div>
      )}
    </article>
  );
});

export default LiabilityCard;
