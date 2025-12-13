/**
 * Liability Details Page
 *
 * Displays detailed information for a single liability including
 * balance, payment schedule, and installment plans.
 *
 * @module app/dashboard/liabilities/[id]/page
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronRight,
  CreditCard,
  ShoppingBag,
  Landmark,
  Home,
  CircleDot,
  Calendar,
  Percent,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import {
  liabilitiesClient,
  type Liability,
  type UpdateLiabilityRequest,
} from '@/services/liabilities.client';
import { LiabilityForm, InstallmentTimeline } from '@/components/liabilities';

// =============================================================================
// Helper Functions
// =============================================================================

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'CREDIT_CARD':
      return CreditCard;
    case 'BNPL':
      return ShoppingBag;
    case 'LOAN':
      return Landmark;
    case 'MORTGAGE':
      return Home;
    default:
      return CircleDot;
  }
}

function getTypeLabel(type: string): string {
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

function getTypeColors(type: string): { bg: string; text: string; icon: string } {
  switch (type) {
    case 'CREDIT_CARD':
      return { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'text-purple-600' };
    case 'BNPL':
      return { bg: 'bg-orange-100', text: 'text-orange-700', icon: 'text-orange-600' };
    case 'LOAN':
      return { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'text-blue-600' };
    case 'MORTGAGE':
      return { bg: 'bg-green-100', text: 'text-green-700', icon: 'text-green-600' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', icon: 'text-gray-600' };
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'ACTIVE':
      return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Active' };
    case 'PAID_OFF':
      return { bg: 'bg-green-100', text: 'text-green-700', label: 'Paid Off' };
    case 'CLOSED':
      return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Closed' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
  }
}

// =============================================================================
// Component
// =============================================================================

export default function LiabilityDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const liabilityId = params?.id as string;

  // State
  const [liability, setLiability] = useState<Liability | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  // Edit state
  const [showEditForm, setShowEditForm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Fetch liability data
   */
  const fetchLiability = useCallback(async () => {
    if (!liabilityId) return;

    try {
      setIsLoading(true);
      setError(null);
      setIsNotFound(false);

      const data = await liabilitiesClient.getLiability(liabilityId);
      setLiability(data);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
        setIsNotFound(true);
        setError('Liability not found');
      } else {
        setError('Failed to load liability. Please try again.');
      }
      console.error('Failed to fetch liability:', err);
    } finally {
      setIsLoading(false);
    }
  }, [liabilityId]);

  useEffect(() => {
    fetchLiability();
  }, [fetchLiability]);

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Handle edit
   */
  const handleEdit = () => {
    setShowEditForm(true);
  };

  /**
   * Handle update liability
   */
  const handleUpdateLiability = async (data: UpdateLiabilityRequest) => {
    try {
      setIsUpdating(true);
      await liabilitiesClient.updateLiability(liabilityId, data);
      setShowEditForm(false);
      await fetchLiability();
    } catch (err) {
      console.error('Failed to update liability:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle delete
   */
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await liabilitiesClient.deleteLiability(liabilityId);
      router.push('/dashboard/liabilities');
    } catch (err) {
      console.error('Failed to delete liability:', err);
      setError('Failed to delete liability. Please try again.');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-[400px]"
        data-testid="liability-loading"
      >
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {isNotFound ? 'Liability Not Found' : 'Error Loading Liability'}
        </h2>
        <p className="text-gray-600 mb-4">
          {isNotFound
            ? 'The liability you are looking for does not exist or has been deleted.'
            : 'Failed to load liability details. Please try again.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/dashboard/liabilities')}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg
              hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Liabilities
          </button>
          {!isNotFound && (
            <button
              onClick={fetchLiability}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!liability) return null;

  const TypeIcon = getTypeIcon(liability.type);
  const colors = getTypeColors(liability.type);
  const statusBadge = getStatusBadge(liability.status);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/dashboard/liabilities"
          className="hover:text-gray-700 transition-colors"
        >
          Liabilities
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">{liability.name}</span>
      </nav>

      {/* Liability Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          {/* Liability Info */}
          <div className="flex items-start gap-4">
            <button
              onClick={handleBack}
              aria-label="Back to liabilities"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>

            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${colors.bg}`}>
                <TypeIcon className={`h-8 w-8 ${colors.icon}`} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">{liability.name}</h1>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <span className={`px-2 py-0.5 rounded ${colors.bg} ${colors.text} text-xs font-medium`}>
                    {getTypeLabel(liability.type)}
                  </span>
                  {liability.provider && (
                    <>
                      <span>•</span>
                      <span>{liability.provider}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}
                  >
                    {statusBadge.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Balance */}
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(liability.currentBalance, liability.currency)}
            </p>
            <p className="text-sm text-gray-500">Current Balance</p>
            {liability.creditLimit && (
              <p className="text-sm text-gray-500 mt-1">
                of {formatCurrency(liability.creditLimit, liability.currency)} limit
              </p>
            )}
          </div>
        </div>

        {/* Credit Utilization (for credit cards) */}
        {liability.creditLimit && liability.utilizationPercent !== undefined && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Credit Utilization</span>
              <span className="font-medium text-gray-900">
                {liability.utilizationPercent.toFixed(0)}%
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  liability.utilizationPercent >= 90
                    ? 'bg-red-500'
                    : liability.utilizationPercent >= 70
                    ? 'bg-orange-500'
                    : liability.utilizationPercent >= 50
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, liability.utilizationPercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Available: {formatCurrency(liability.availableCredit || 0, liability.currency)}</span>
              <span>Limit: {formatCurrency(liability.creditLimit, liability.currency)}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 mt-6 pt-6 border-t border-gray-100">
          <button
            onClick={handleEdit}
            aria-label="Edit liability"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Delete liability"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {liability.interestRate !== undefined && liability.interestRate > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Percent className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">APR</p>
                <p className="text-lg font-semibold text-gray-900">
                  {liability.interestRate.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {liability.minimumPayment !== undefined && liability.minimumPayment > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Minimum Payment</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(liability.minimumPayment, liability.currency)}
                </p>
              </div>
            </div>
          </div>
        )}

        {liability.nextPaymentDate && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Next Payment</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDate(liability.nextPaymentDate)}
                </p>
              </div>
            </div>
          </div>
        )}

        {liability.originalAmount && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Original Amount</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(liability.originalAmount, liability.currency)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Installment Plans */}
      {liability.installmentPlans && liability.installmentPlans.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Plans</h2>
          <div className="space-y-6">
            {liability.installmentPlans.map((plan) => (
              <div key={plan.id} className="border-t border-gray-100 pt-4 first:border-0 first:pt-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {plan.numberOfInstallments}-Payment Plan
                    </h3>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(plan.installmentAmount, plan.currency)} per payment
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(plan.totalAmount, plan.currency)}
                    </p>
                    <p className="text-sm text-gray-500">Total</p>
                  </div>
                </div>
                <InstallmentTimeline plan={plan} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {liability.billingCycleDay && (
            <div>
              <dt className="text-sm text-gray-500">Billing Cycle Day</dt>
              <dd className="text-gray-900 font-medium">{liability.billingCycleDay}</dd>
            </div>
          )}
          {liability.paymentDueDay && (
            <div>
              <dt className="text-sm text-gray-500">Payment Due Day</dt>
              <dd className="text-gray-900 font-medium">{liability.paymentDueDay}</dd>
            </div>
          )}
          {liability.statementCloseDay && (
            <div>
              <dt className="text-sm text-gray-500">Statement Close Day</dt>
              <dd className="text-gray-900 font-medium">{liability.statementCloseDay}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-gray-500">Created</dt>
            <dd className="text-gray-900 font-medium">{formatDate(liability.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Last Updated</dt>
            <dd className="text-gray-900 font-medium">{formatDate(liability.updatedAt)}</dd>
          </div>
        </dl>
      </div>

      {/* Edit Form Modal */}
      <LiabilityForm
        liability={liability}
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSubmit={handleUpdateLiability}
        isLoading={isUpdating}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Delete Liability</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete &quot;{liability.name}&quot;? This action cannot be
                undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
