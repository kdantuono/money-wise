'use client';

import { useState, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import type {
  Liability,
  LiabilityType,
  CreateLiabilityRequest,
  UpdateLiabilityRequest,
} from '@/services/liabilities.client';

// =============================================================================
// Type Definitions
// =============================================================================

export interface LiabilityFormProps {
  /** Existing liability for editing (undefined for create mode) */
  liability?: Liability;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when form is submitted */
  onSubmit: (data: CreateLiabilityRequest | UpdateLiabilityRequest) => Promise<void>;
  /** Loading state */
  isLoading?: boolean;
}

interface FormData {
  type: LiabilityType;
  name: string;
  currentBalance: string;
  creditLimit: string;
  originalAmount: string;
  currency: string;
  interestRate: string;
  minimumPayment: string;
  billingCycleDay: string;
  paymentDueDay: string;
  statementCloseDay: string;
  provider: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getInitialFormData(liability?: Liability): FormData {
  return {
    type: liability?.type || 'CREDIT_CARD',
    name: liability?.name || '',
    currentBalance: liability?.currentBalance?.toString() || '',
    creditLimit: liability?.creditLimit?.toString() || '',
    originalAmount: liability?.originalAmount?.toString() || '',
    currency: liability?.currency || 'USD',
    interestRate: liability?.interestRate?.toString() || '',
    minimumPayment: liability?.minimumPayment?.toString() || '',
    billingCycleDay: liability?.billingCycleDay?.toString() || '',
    paymentDueDay: liability?.paymentDueDay?.toString() || '',
    statementCloseDay: liability?.statementCloseDay?.toString() || '',
    provider: liability?.provider || '',
  };
}

// =============================================================================
// Component Implementation
// =============================================================================

export function LiabilityForm({
  liability,
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: LiabilityFormProps) {
  const isEditMode = !!liability;
  const [formData, setFormData] = useState<FormData>(() => getInitialFormData(liability));
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.currentBalance && isNaN(parseFloat(formData.currentBalance))) {
      newErrors.currentBalance = 'Must be a valid number';
    }

    if (formData.creditLimit && isNaN(parseFloat(formData.creditLimit))) {
      newErrors.creditLimit = 'Must be a valid number';
    }

    if (formData.interestRate) {
      const rate = parseFloat(formData.interestRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        newErrors.interestRate = 'Must be between 0 and 100';
      }
    }

    if (formData.billingCycleDay) {
      const day = parseInt(formData.billingCycleDay);
      if (isNaN(day) || day < 1 || day > 31) {
        newErrors.billingCycleDay = 'Must be between 1 and 31';
      }
    }

    if (formData.paymentDueDay) {
      const day = parseInt(formData.paymentDueDay);
      if (isNaN(day) || day < 1 || day > 31) {
        newErrors.paymentDueDay = 'Must be between 1 and 31';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const data: CreateLiabilityRequest | UpdateLiabilityRequest = {
      type: formData.type,
      name: formData.name.trim(),
      currency: formData.currency,
    };

    if (formData.currentBalance) {
      data.currentBalance = parseFloat(formData.currentBalance);
    }
    if (formData.creditLimit) {
      data.creditLimit = parseFloat(formData.creditLimit);
    }
    if (formData.originalAmount) {
      data.originalAmount = parseFloat(formData.originalAmount);
    }
    if (formData.interestRate) {
      data.interestRate = parseFloat(formData.interestRate);
    }
    if (formData.minimumPayment) {
      data.minimumPayment = parseFloat(formData.minimumPayment);
    }
    if (formData.billingCycleDay) {
      data.billingCycleDay = parseInt(formData.billingCycleDay);
    }
    if (formData.paymentDueDay) {
      data.paymentDueDay = parseInt(formData.paymentDueDay);
    }
    if (formData.statementCloseDay) {
      data.statementCloseDay = parseInt(formData.statementCloseDay);
    }
    if (formData.provider.trim()) {
      data.provider = formData.provider.trim();
    }

    await onSubmit(data);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const isCreditCard = formData.type === 'CREDIT_CARD';
  const isBNPL = formData.type === 'BNPL';
  const isLoan = formData.type === 'LOAN' || formData.type === 'MORTGAGE';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Liability' : 'Add New Liability'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                disabled={isEditMode}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="BNPL">Buy Now Pay Later</option>
                <option value="LOAN">Loan</option>
                <option value="MORTGAGE">Mortgage</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Chase Sapphire Preferred"
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Current Balance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Balance
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <input
                  type="text"
                  name="currentBalance"
                  value={formData.currentBalance}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={`w-full border rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    ${errors.currentBalance ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>
              {errors.currentBalance && (
                <p className="mt-1 text-sm text-red-600">{errors.currentBalance}</p>
              )}
            </div>

            {/* Credit Limit (for credit cards) */}
            {isCreditCard && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credit Limit
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <input
                    type="text"
                    name="creditLimit"
                    value={formData.creditLimit}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={`w-full border rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      ${errors.creditLimit ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
              </div>
            )}

            {/* Original Amount (for loans/BNPL) */}
            {(isBNPL || isLoan) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Original Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <input
                    type="text"
                    name="originalAmount"
                    value={formData.originalAmount}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Provider (for BNPL) */}
            {isBNPL && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provider
                </label>
                <input
                  type="text"
                  name="provider"
                  value={formData.provider}
                  onChange={handleChange}
                  placeholder="e.g., Klarna, Afterpay, PayPal"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* Interest Rate */}
            {!isBNPL && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interest Rate (APR %)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="interestRate"
                    value={formData.interestRate}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={`w-full border rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      ${errors.interestRate ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    %
                  </span>
                </div>
                {errors.interestRate && (
                  <p className="mt-1 text-sm text-red-600">{errors.interestRate}</p>
                )}
              </div>
            )}

            {/* Minimum Payment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Payment
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <input
                  type="text"
                  name="minimumPayment"
                  value={formData.minimumPayment}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Billing Cycle Fields (for credit cards) */}
            {isCreditCard && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Cycle Day
                  </label>
                  <input
                    type="text"
                    name="billingCycleDay"
                    value={formData.billingCycleDay}
                    onChange={handleChange}
                    placeholder="1-31"
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      ${errors.billingCycleDay ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Due Day
                  </label>
                  <input
                    type="text"
                    name="paymentDueDay"
                    value={formData.paymentDueDay}
                    onChange={handleChange}
                    placeholder="1-31"
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      ${errors.paymentDueDay ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditMode ? 'Save Changes' : 'Add Liability'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LiabilityForm;
