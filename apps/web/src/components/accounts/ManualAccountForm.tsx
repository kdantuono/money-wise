'use client';

import { useState, useEffect, useId } from 'react';
import { AccountType, AccountSource } from '../../types/account.types';
import type { CreateAccountRequest } from '../../services/accounts.client';

/**
 * ManualAccountForm Component
 *
 * Form for creating manual accounts (cash, portfolio, custom tracking).
 * Handles validation and submission of account data.
 *
 * @example
 * <ManualAccountForm
 *   onSubmit={async (data) => await createAccount(data)}
 *   onCancel={() => setShowForm(false)}
 * />
 */

interface ManualAccountFormProps {
  /** Called when form is submitted with valid data */
  onSubmit: (data: CreateAccountRequest) => Promise<void>;
  /** Called when user cancels the form */
  onCancel: () => void;
  /** Optional CSS classes */
  className?: string;
  /** Whether form is currently submitting */
  isSubmitting?: boolean;
  /** Server error message to display */
  error?: string;
  /** Render as modal dialog */
  isModal?: boolean;
}

interface FormErrors {
  name?: string;
  type?: string;
  balance?: string;
  creditLimit?: string;
}

// Account type display configuration
const accountTypeOptions = [
  { value: '', label: 'Select account type', disabled: true },
  { value: AccountType.CHECKING, label: 'Checking' },
  { value: AccountType.SAVINGS, label: 'Savings' },
  { value: AccountType.CREDIT_CARD, label: 'Credit Card' },
  { value: AccountType.INVESTMENT, label: 'Investment' },
  { value: AccountType.LOAN, label: 'Loan' },
  { value: AccountType.MORTGAGE, label: 'Mortgage' },
  { value: AccountType.OTHER, label: 'Other' },
];

const currencyOptions = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CHF', label: 'CHF - Swiss Franc' },
];

export function ManualAccountForm({
  onSubmit,
  onCancel,
  className = '',
  isSubmitting = false,
  error,
  isModal = false,
}: ManualAccountFormProps) {
  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType | ''>('');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [institutionName, setInstitutionName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [creditLimit, setCreditLimit] = useState('');

  // Validation state
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Generate unique IDs for accessibility
  const formId = useId();
  const titleId = `${formId}-title`;
  const errorId = `${formId}-error`;
  const nameErrorId = `${formId}-name-error`;
  const typeErrorId = `${formId}-type-error`;
  const balanceErrorId = `${formId}-balance-error`;
  const creditLimitErrorId = `${formId}-credit-limit-error`;

  // Check if credit limit field should be shown
  const showCreditLimit = type === AccountType.CREDIT_CARD;

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = 'Account name is required';
    } else if (trimmedName.length < 3) {
      newErrors.name = 'Account name must be at least 3 characters';
    }

    // Type validation
    if (!type) {
      newErrors.type = 'Please select an account type';
    }

    // Balance validation
    if (!balance) {
      newErrors.balance = 'Balance is required';
    } else {
      const balanceNum = parseFloat(balance);
      if (isNaN(balanceNum)) {
        newErrors.balance = 'Invalid balance';
      }
    }

    // Credit limit validation for credit cards
    if (showCreditLimit && !creditLimit) {
      newErrors.creditLimit = 'Credit limit is required for credit cards';
    } else if (showCreditLimit && creditLimit) {
      const limitNum = parseFloat(creditLimit);
      if (isNaN(limitNum) || limitNum <= 0) {
        newErrors.creditLimit = 'Credit limit must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      type: true,
      balance: true,
      creditLimit: true,
    });

    if (!validateForm()) {
      return;
    }

    const data: CreateAccountRequest = {
      name: name.trim(),
      type: type as AccountType,
      source: AccountSource.MANUAL,
      currentBalance: parseFloat(balance),
      currency,
    };

    // Add optional fields
    const trimmedInstitution = institutionName.trim();
    if (trimmedInstitution) {
      data.institutionName = trimmedInstitution;
    }

    const trimmedAccountNumber = accountNumber.trim();
    if (trimmedAccountNumber) {
      data.accountNumber = trimmedAccountNumber;
    }

    if (showCreditLimit && creditLimit) {
      data.creditLimit = parseFloat(creditLimit);
    }

    await onSubmit(data);
  };

  // Re-validate on field change after first submission
  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      validateForm();
    }
  }, [name, type, balance, creditLimit, touched]);

  // Get current displayed error (form error or server error)
  const displayError = errors.name || errors.type || errors.balance || errors.creditLimit || error;

  const formContent = (
    <form
      onSubmit={handleSubmit}
      className={`space-y-6 ${className}`}
      noValidate
    >
      {/* Form Title */}
      <h2 id={titleId} className="text-xl font-semibold text-gray-900">
        Add Manual Account
      </h2>

      {/* Error Alert */}
      {displayError && (
        <div
          id={errorId}
          role="alert"
          className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm"
        >
          {displayError}
        </div>
      )}

      {/* Account Name */}
      <div className="space-y-1">
        <label
          htmlFor={`${formId}-name`}
          className="block text-sm font-medium text-gray-700"
        >
          Account Name
        </label>
        <input
          id={`${formId}-name`}
          data-testid="account-name-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
          disabled={isSubmitting}
          aria-invalid={touched.name && !!errors.name}
          aria-describedby={errors.name ? nameErrorId : undefined}
          placeholder="e.g., Cash Portfolio, Emergency Fund"
          className={`
            w-full px-3 py-2 rounded-lg border transition-colors
            ${touched.name && errors.name
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }
            disabled:bg-gray-100 disabled:cursor-not-allowed
          `}
        />
        {touched.name && errors.name && (
          <p id={nameErrorId} className="text-sm text-red-600">
            {errors.name}
          </p>
        )}
      </div>

      {/* Account Type */}
      <div className="space-y-1">
        <label
          htmlFor={`${formId}-type`}
          className="block text-sm font-medium text-gray-700"
        >
          Account Type
        </label>
        <select
          id={`${formId}-type`}
          data-testid="account-type-select"
          value={type}
          onChange={(e) => setType(e.target.value as AccountType | '')}
          onBlur={() => setTouched((prev) => ({ ...prev, type: true }))}
          disabled={isSubmitting}
          aria-invalid={touched.type && !!errors.type}
          aria-describedby={errors.type ? typeErrorId : undefined}
          className={`
            w-full px-3 py-2 rounded-lg border transition-colors
            ${touched.type && errors.type
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }
            disabled:bg-gray-100 disabled:cursor-not-allowed
          `}
        >
          {accountTypeOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {touched.type && errors.type && (
          <p id={typeErrorId} className="text-sm text-red-600">
            {errors.type}
          </p>
        )}
      </div>

      {/* Current Balance */}
      <div className="space-y-1">
        <label
          htmlFor={`${formId}-balance`}
          className="block text-sm font-medium text-gray-700"
        >
          Current Balance
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            $
          </span>
          <input
            id={`${formId}-balance`}
            data-testid="account-balance-input"
            type="number"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, balance: true }))}
            disabled={isSubmitting}
            aria-invalid={touched.balance && !!errors.balance}
            aria-describedby={errors.balance ? balanceErrorId : undefined}
            placeholder="0.00"
            className={`
              w-full pl-8 pr-3 py-2 rounded-lg border transition-colors
              ${touched.balance && errors.balance
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }
              disabled:bg-gray-100 disabled:cursor-not-allowed
            `}
          />
        </div>
        {touched.balance && errors.balance && (
          <p id={balanceErrorId} className="text-sm text-red-600">
            {errors.balance}
          </p>
        )}
        <p className="text-xs text-gray-500">
          Use negative values for amounts owed (credit cards, loans)
        </p>
      </div>

      {/* Credit Limit (only for credit cards) */}
      {showCreditLimit && (
        <div className="space-y-1">
          <label
            htmlFor={`${formId}-credit-limit`}
            className="block text-sm font-medium text-gray-700"
          >
            Credit Limit
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              $
            </span>
            <input
              id={`${formId}-credit-limit`}
              data-testid="account-credit-limit-input"
              type="number"
              step="0.01"
              min="0"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, creditLimit: true }))}
              disabled={isSubmitting}
              aria-invalid={touched.creditLimit && !!errors.creditLimit}
              aria-describedby={errors.creditLimit ? creditLimitErrorId : undefined}
              placeholder="0.00"
              className={`
                w-full pl-8 pr-3 py-2 rounded-lg border transition-colors
                ${touched.creditLimit && errors.creditLimit
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }
                disabled:bg-gray-100 disabled:cursor-not-allowed
              `}
            />
          </div>
          {touched.creditLimit && errors.creditLimit && (
            <p id={creditLimitErrorId} className="text-sm text-red-600">
              {errors.creditLimit}
            </p>
          )}
        </div>
      )}

      {/* Currency */}
      <div className="space-y-1">
        <label
          htmlFor={`${formId}-currency`}
          className="block text-sm font-medium text-gray-700"
        >
          Currency
        </label>
        <select
          id={`${formId}-currency`}
          data-testid="account-currency-select"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          disabled={isSubmitting}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {currencyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Institution Name (optional) */}
      <div className="space-y-1">
        <label
          htmlFor={`${formId}-institution`}
          className="block text-sm font-medium text-gray-700"
        >
          Institution Name <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id={`${formId}-institution`}
          data-testid="account-institution-input"
          type="text"
          value={institutionName}
          onChange={(e) => setInstitutionName(e.target.value)}
          disabled={isSubmitting}
          placeholder="e.g., Chase, Bank of America"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Account Number (optional) */}
      <div className="space-y-1">
        <label
          htmlFor={`${formId}-account-number`}
          className="block text-sm font-medium text-gray-700"
        >
          Account Number <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id={`${formId}-account-number`}
          data-testid="account-number-input"
          type="text"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          disabled={isSubmitting}
          placeholder="Last 4 digits, e.g., ****1234"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting && (
            <svg
              className="w-4 h-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {isSubmitting ? 'Creating...' : 'Create Account'}
        </button>
      </div>
    </form>
  );

  // Render as modal dialog if isModal is true
  if (isModal) {
    return (
      <div
        role="dialog"
        aria-labelledby={titleId}
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      >
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
          {formContent}
        </div>
      </div>
    );
  }

  return formContent;
}

export default ManualAccountForm;
