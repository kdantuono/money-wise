'use client';

import { useState, useCallback, useMemo, FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { CategorySelector } from './CategorySelector';
import type { Transaction, CreateTransactionData, TransactionType } from '@/services/transactions.client';
import type { CategoryOption } from '@/services/categories.client';

// =============================================================================
// Type Definitions
// =============================================================================

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

export interface TransactionFormProps {
  /** Transaction to edit (if in edit mode) */
  transaction?: Transaction;
  /** Available accounts */
  accounts: Account[];
  /** Available categories */
  categories: CategoryOption[];
  /** Callback on successful submission */
  onSuccess: (data: CreateTransactionData) => void;
  /** Callback when form is cancelled */
  onCancel: () => void;
  /** Loading state (external control) */
  isLoading?: boolean;
  /** Error message (external control) */
  error?: string | null;
  /** Additional CSS classes */
  className?: string;
}

interface FormErrors {
  amount?: string;
  description?: string;
  date?: string;
  accountId?: string;
  categoryId?: string;
  general?: string;
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * TransactionForm Component
 *
 * Form for creating and editing transactions.
 * Supports type toggle (Expense/Income), category filtering, and validation.
 *
 * For linked (bank-synced) transactions, only the category field is editable.
 * Other fields are locked because they come from the bank and should not be modified.
 */
export function TransactionForm({
  transaction,
  accounts,
  categories,
  onSuccess,
  onCancel,
  isLoading = false,
  error: externalError,
  className = '',
}: TransactionFormProps) {
  const isEditMode = !!transaction;

  // Linked transactions (from bank sync) can only have category edited
  const isLinkedTransaction = isEditMode && transaction?.source !== 'MANUAL';
  const isFieldLocked = isLinkedTransaction;

  // Form state
  const [amount, setAmount] = useState<string>(
    transaction?.amount?.toString() || ''
  );
  const [description, setDescription] = useState(transaction?.description || '');
  const [date, setDate] = useState(
    transaction?.date || new Date().toISOString().split('T')[0]
  );
  const [accountId, setAccountId] = useState(transaction?.accountId || '');
  const [categoryId, setCategoryId] = useState<string | undefined>(
    transaction?.categoryId || undefined
  );
  const [notes, setNotes] = useState(transaction?.notes || '');
  const [transactionType, setTransactionType] = useState<TransactionType>(
    transaction?.type || 'DEBIT'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Filter categories based on transaction type
  const filteredCategories = useMemo(() => {
    const categoryType = transactionType === 'DEBIT' ? 'EXPENSE' : 'INCOME';
    return categories.filter((cat) => cat.type === categoryType);
  }, [categories, transactionType]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    const parsedAmount = parseFloat(amount);

    // Amount validation
    if (!amount || amount.trim() === '') {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    // Description validation
    if (!description || description.trim() === '') {
      newErrors.description = 'Description is required';
    }

    // Date validation
    if (!date) {
      newErrors.date = 'Date is required';
    }

    // Account validation
    if (!accountId) {
      newErrors.accountId = 'Please select an account';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [amount, description, date, accountId]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // For linked transactions, skip validation since most fields are locked
      if (!isLinkedTransaction && !validateForm()) {
        return;
      }

      setIsSubmitting(true);
      setErrors({});

      try {
        // For linked (bank-synced) transactions, only send editable fields
        if (isLinkedTransaction) {
          const data: Partial<CreateTransactionData> = {
            ...(categoryId && { categoryId }),
            ...(notes.trim() && { notes: notes.trim() }),
          };
          onSuccess(data as CreateTransactionData);
        } else {
          // For manual transactions, send all fields
          const data: CreateTransactionData = {
            accountId,
            amount: parseFloat(amount),
            type: transactionType,
            source: 'MANUAL',
            date,
            description: description.trim(),
            ...(categoryId && { categoryId }),
            ...(notes.trim() && { notes: notes.trim() }),
          };
          onSuccess(data);
        }
      } catch (err) {
        setErrors({
          general:
            err instanceof Error ? err.message : 'An unexpected error occurred',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      accountId,
      amount,
      categoryId,
      date,
      description,
      isLinkedTransaction,
      notes,
      onSuccess,
      transactionType,
      validateForm,
    ]
  );

  const formLoading = isLoading || isSubmitting;

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-6 ${className}`}
      noValidate
    >
      {/* Header */}
      <h3 className="text-lg font-semibold text-gray-900">
        {isEditMode ? 'Edit Transaction' : 'Add Transaction'}
      </h3>

      {/* Linked Transaction Notice */}
      {isLinkedTransaction && (
        <div className="p-3 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="font-medium">Bank-synced transaction</p>
          <p className="mt-1 text-blue-600">
            Only the category and notes can be edited. Other details are synced from your bank.
          </p>
        </div>
      )}

      {/* External Error */}
      {externalError && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
          {externalError}
        </div>
      )}

      {/* General Error */}
      {errors.general && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
          {errors.general}
        </div>
      )}

      {/* Type Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTransactionType('DEBIT')}
          aria-pressed={transactionType === 'DEBIT'}
          disabled={formLoading || isFieldLocked}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            transactionType === 'DEBIT'
              ? 'bg-red-100 text-red-700 border-2 border-red-500'
              : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
          } ${formLoading || isFieldLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => setTransactionType('CREDIT')}
          aria-pressed={transactionType === 'CREDIT'}
          disabled={formLoading || isFieldLocked}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            transactionType === 'CREDIT'
              ? 'bg-green-100 text-green-700 border-2 border-green-500'
              : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
          } ${formLoading || isFieldLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Income
        </button>
      </div>

      {/* Amount */}
      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Amount <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            $
          </span>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={formLoading || isFieldLocked}
            className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
              ${errors.amount ? 'border-red-300' : 'border-gray-300'}
              ${formLoading || isFieldLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        {errors.amount && (
          <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description <span className="text-red-500">*</span>
        </label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was this for?"
          disabled={formLoading || isFieldLocked}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
            ${errors.description ? 'border-red-300' : 'border-gray-300'}
            ${formLoading || isFieldLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      {/* Date */}
      <div>
        <label
          htmlFor="date"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Date <span className="text-red-500">*</span>
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={formLoading || isFieldLocked}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
            ${errors.date ? 'border-red-300' : 'border-gray-300'}
            ${formLoading || isFieldLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        {errors.date && (
          <p className="mt-1 text-sm text-red-600">{errors.date}</p>
        )}
      </div>

      {/* Account */}
      <div>
        <label
          htmlFor="account"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Account <span className="text-red-500">*</span>
        </label>
        <select
          id="account"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          disabled={formLoading || isFieldLocked}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
            ${errors.accountId ? 'border-red-300' : 'border-gray-300'}
            ${formLoading || isFieldLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        >
          <option value="">Select an account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
        {errors.accountId && (
          <p className="mt-1 text-sm text-red-600">{errors.accountId}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <CategorySelector
          value={categoryId}
          onChange={setCategoryId}
          categories={filteredCategories}
          filterType={transactionType === 'DEBIT' ? 'EXPENSE' : 'INCOME'}
          label="Category"
          placeholder="Select a category (optional)"
          disabled={formLoading}
          clearable
          searchable
        />
      </div>

      {/* Notes - allow notes on linked transactions too since they're user-added */}
      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any additional notes..."
          rows={3}
          disabled={formLoading}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
            ${formLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={formLoading}
          className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium
            hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={formLoading}
          className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium
            hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2"
        >
          {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditMode ? 'Save Changes' : 'Add Transaction'}
        </button>
      </div>
    </form>
  );
}

export default TransactionForm;
