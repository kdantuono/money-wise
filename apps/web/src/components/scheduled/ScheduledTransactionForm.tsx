'use client';

import { memo, useState, useEffect, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import type {
  ScheduledTransaction,
  TransactionType,
  FlowType,
  ScheduledTransactionStatus,
  CreateScheduledTransactionRequest,
  CreateRecurrenceRuleRequest,
} from '@/services/scheduled.client';
import { RecurrenceSelector } from './RecurrenceSelector';

// =============================================================================
// Type Definitions
// =============================================================================

export interface ScheduledTransactionFormProps {
  transaction?: ScheduledTransaction | null;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  onSubmit: (data: CreateScheduledTransactionRequest) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

interface FormData {
  accountId: string;
  amount: string;
  type: TransactionType;
  flowType: FlowType;
  description: string;
  merchantName: string;
  categoryId: string;
  nextDueDate: string;
  autoCreate: boolean;
  reminderDaysBefore: number;
  status: ScheduledTransactionStatus;
  recurrenceRule: CreateRecurrenceRuleRequest | null;
}

// =============================================================================
// Constants
// =============================================================================

const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'DEBIT', label: 'Expense' },
  { value: 'CREDIT', label: 'Income' },
];

const FLOW_TYPES: { value: FlowType; label: string }[] = [
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'INCOME', label: 'Income' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'LIABILITY_PAYMENT', label: 'Liability Payment' },
  { value: 'REFUND', label: 'Refund' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
];

const REMINDER_OPTIONS = [
  { value: 0, label: 'On due date' },
  { value: 1, label: '1 day before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '1 week before' },
  { value: 14, label: '2 weeks before' },
];

// =============================================================================
// Helper Functions
// =============================================================================

function getDefaultFormData(): FormData {
  const today = new Date();
  today.setDate(today.getDate() + 1);

  return {
    accountId: '',
    amount: '',
    type: 'DEBIT',
    flowType: 'EXPENSE',
    description: '',
    merchantName: '',
    categoryId: '',
    nextDueDate: today.toISOString().split('T')[0],
    autoCreate: false,
    reminderDaysBefore: 3,
    status: 'ACTIVE',
    recurrenceRule: null,
  };
}

function transactionToFormData(transaction: ScheduledTransaction): FormData {
  return {
    accountId: transaction.accountId,
    amount: transaction.amount.toString(),
    type: transaction.type,
    flowType: transaction.flowType || 'EXPENSE',
    description: transaction.description,
    merchantName: transaction.merchantName || '',
    categoryId: transaction.categoryId || '',
    nextDueDate: transaction.nextDueDate.split('T')[0],
    autoCreate: transaction.autoCreate,
    reminderDaysBefore: transaction.reminderDaysBefore,
    status: transaction.status,
    recurrenceRule: transaction.recurrenceRule
      ? {
          frequency: transaction.recurrenceRule.frequency,
          interval: transaction.recurrenceRule.interval,
          dayOfWeek: transaction.recurrenceRule.dayOfWeek,
          dayOfMonth: transaction.recurrenceRule.dayOfMonth,
          endDate: transaction.recurrenceRule.endDate,
          endCount: transaction.recurrenceRule.endCount,
        }
      : null,
  };
}

// =============================================================================
// Component Implementation
// =============================================================================

export const ScheduledTransactionForm = memo(function ScheduledTransactionForm({
  transaction,
  accounts,
  categories,
  onSubmit,
  onClose,
  isLoading = false,
}: ScheduledTransactionFormProps) {
  const isEditing = !!transaction;
  const [formData, setFormData] = useState<FormData>(getDefaultFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    if (transaction) {
      setFormData(transactionToFormData(transaction));
    } else {
      setFormData(getDefaultFormData());
    }
  }, [transaction]);

  const updateField = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    []
  );

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.accountId) {
      newErrors.accountId = 'Account is required';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.nextDueDate) {
      newErrors.nextDueDate = 'Due date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const data: CreateScheduledTransactionRequest = {
      accountId: formData.accountId,
      amount: parseFloat(formData.amount),
      type: formData.type,
      flowType: formData.flowType,
      description: formData.description.trim(),
      nextDueDate: formData.nextDueDate,
      autoCreate: formData.autoCreate,
      reminderDaysBefore: formData.reminderDaysBefore,
      status: formData.status,
    };

    if (formData.merchantName.trim()) {
      data.merchantName = formData.merchantName.trim();
    }

    if (formData.categoryId) {
      data.categoryId = formData.categoryId;
    }

    if (formData.recurrenceRule) {
      data.recurrenceRule = formData.recurrenceRule;
    }

    await onSubmit(data);
  };

  const handleRecurrenceChange = useCallback(
    (value: CreateRecurrenceRuleRequest | null) => {
      updateField('recurrenceRule', value);
    },
    [updateField]
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Scheduled Transaction' : 'New Scheduled Transaction'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Account and Type Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.accountId}
                  onChange={(e) => updateField('accountId', e.target.value)}
                  disabled={isLoading}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                    ${errors.accountId ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                {errors.accountId && (
                  <p className="mt-1 text-sm text-red-500">{errors.accountId}</p>
                )}
              </div>

              {/* Transaction Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <div className="flex gap-2">
                  {TRANSACTION_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        updateField('type', type.value);
                        updateField(
                          'flowType',
                          type.value === 'DEBIT' ? 'EXPENSE' : 'INCOME'
                        );
                      }}
                      disabled={isLoading}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border transition-colors
                        ${
                          formData.type === type.value
                            ? type.value === 'DEBIT'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Amount and Category Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => updateField('amount', e.target.value)}
                    disabled={isLoading}
                    placeholder="0.00"
                    className={`w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                      ${errors.amount ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-500">{errors.amount}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => updateField('categoryId', e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                disabled={isLoading}
                placeholder="e.g., Monthly rent payment"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                  ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-500">{errors.description}</p>
              )}
            </div>

            {/* Merchant Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Merchant Name
              </label>
              <input
                type="text"
                value={formData.merchantName}
                onChange={(e) => updateField('merchantName', e.target.value)}
                disabled={isLoading}
                placeholder="e.g., Netflix, Spotify"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Flow Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Flow Type
              </label>
              <select
                value={formData.flowType}
                onChange={(e) => updateField('flowType', e.target.value as FlowType)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {FLOW_TYPES.map((flow) => (
                  <option key={flow.value} value={flow.value}>
                    {flow.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Next Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.nextDueDate}
                onChange={(e) => updateField('nextDueDate', e.target.value)}
                disabled={isLoading}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                  ${errors.nextDueDate ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.nextDueDate && (
                <p className="mt-1 text-sm text-red-500">{errors.nextDueDate}</p>
              )}
            </div>

            {/* Recurrence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recurrence
              </label>
              <RecurrenceSelector
                value={formData.recurrenceRule}
                onChange={handleRecurrenceChange}
                disabled={isLoading}
              />
            </div>

            {/* Reminder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reminder
              </label>
              <select
                value={formData.reminderDaysBefore}
                onChange={(e) =>
                  updateField('reminderDaysBefore', parseInt(e.target.value))
                }
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {REMINDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-create Toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateField('autoCreate', !formData.autoCreate)}
                disabled={isLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${formData.autoCreate ? 'bg-blue-600' : 'bg-gray-200'}
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${formData.autoCreate ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Auto-create transaction
                </span>
                <p className="text-xs text-gray-500">
                  Automatically create the transaction when due
                </p>
              </div>
            </div>

            {/* Status (only for editing) */}
            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    updateField('status', e.target.value as ScheduledTransactionStatus)
                  }
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Transaction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ScheduledTransactionForm;
