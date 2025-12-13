/**
 * EditAccountForm Component
 *
 * Modal form for editing manual account details including name, balance,
 * currency, type, institution, icon, and color.
 *
 * Features:
 * - Pre-populated form fields with current account data
 * - Icon selector with common financial icons
 * - Color picker for account customization
 * - Full validation with inline errors
 * - Loading state handling
 * - WCAG 2.2 AA accessibility compliance
 *
 * @example
 * <EditAccountForm
 *   account={accountToEdit}
 *   onSubmit={handleUpdate}
 *   onCancel={handleCancel}
 * />
 */

'use client';

import { useState, useEffect, useId, useRef } from 'react';
import { AccountType } from '../../types/account.types';
import type { Account, UpdateAccountRequest } from '../../services/accounts.client';
import {
  Wallet,
  PiggyBank,
  CreditCard,
  Building2,
  TrendingUp,
  Home,
  Banknote,
  Briefcase,
  X,
} from 'lucide-react';

// Icon options for account customization
const ICON_OPTIONS = [
  { id: 'wallet', label: 'Wallet', Icon: Wallet },
  { id: 'piggybank', label: 'Piggy Bank', Icon: PiggyBank },
  { id: 'creditcard', label: 'Credit Card', Icon: CreditCard },
  { id: 'bank', label: 'Bank', Icon: Building2 },
  { id: 'investment', label: 'Investment', Icon: TrendingUp },
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'cash', label: 'Cash', Icon: Banknote },
  { id: 'business', label: 'Business', Icon: Briefcase },
] as const;

// Color options for account customization
const COLOR_OPTIONS = [
  { id: 'blue', label: 'Blue', value: '#3B82F6' },
  { id: 'green', label: 'Green', value: '#10B981' },
  { id: 'purple', label: 'Purple', value: '#8B5CF6' },
  { id: 'red', label: 'Red', value: '#EF4444' },
  { id: 'yellow', label: 'Yellow', value: '#F59E0B' },
  { id: 'pink', label: 'Pink', value: '#EC4899' },
  { id: 'indigo', label: 'Indigo', value: '#6366F1' },
  { id: 'teal', label: 'Teal', value: '#14B8A6' },
] as const;

// Currency options
const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

// Account type options
const ACCOUNT_TYPES = [
  { value: AccountType.CHECKING, label: 'Checking' },
  { value: AccountType.SAVINGS, label: 'Savings' },
  { value: AccountType.CREDIT_CARD, label: 'Credit Card' },
  { value: AccountType.INVESTMENT, label: 'Investment' },
  { value: AccountType.LOAN, label: 'Loan' },
  { value: AccountType.MORTGAGE, label: 'Mortgage' },
  { value: AccountType.OTHER, label: 'Other' },
];

interface EditAccountFormProps {
  /** Account to edit */
  account: Account;
  /** Called when form is submitted with updated data */
  onSubmit: (data: UpdateAccountRequest & { id: string; settings?: AccountSettings }) => Promise<void>;
  /** Called when form is cancelled */
  onCancel: () => void;
  /** Whether form submission is in progress */
  isSubmitting?: boolean;
  /** Server error message to display */
  error?: string;
  /** Whether to render as a modal dialog */
  isModal?: boolean;
  /** Optional CSS classes */
  className?: string;
  /**
   * Whether to restrict editing to display settings only (icon/color).
   * Used for linked accounts where bank data shouldn't be modified locally.
   * Defaults to false (show all fields).
   */
  displaySettingsOnly?: boolean;
}

interface AccountSettings {
  icon?: string;
  color?: string;
}

interface FormData {
  name: string;
  type: AccountType;
  currentBalance: string;
  currency: string;
  institutionName: string;
  creditLimit: string;
  icon: string;
  color: string;
}

interface FormErrors {
  name?: string;
  type?: string;
  currentBalance?: string;
  creditLimit?: string;
}

export function EditAccountForm({
  account,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
  isModal = false,
  className = '',
  displaySettingsOnly = false,
}: EditAccountFormProps) {
  const formId = useId();
  const titleId = `${formId}-title`;
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Extract existing settings
  const existingSettings = (account as { settings?: AccountSettings }).settings || {};

  const [formData, setFormData] = useState<FormData>({
    name: account.name,
    type: account.type,
    currentBalance: String(account.currentBalance),
    currency: account.currency,
    institutionName: account.institutionName || '',
    creditLimit: account.creditLimit ? String(account.creditLimit) : '',
    icon: existingSettings.icon || 'wallet',
    color: existingSettings.color || 'blue',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Focus first input on mount
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  // Handle escape key for modal
  useEffect(() => {
    if (!isModal) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isModal, onCancel]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Skip validation for display settings only mode
    if (displaySettingsOnly) {
      return true;
    }

    // Name validation
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      newErrors.name = 'Account name is required';
    } else if (trimmedName.length < 3) {
      newErrors.name = 'Account name must be at least 3 characters';
    }

    // Balance validation
    const balance = parseFloat(formData.currentBalance);
    if (isNaN(balance)) {
      newErrors.currentBalance = 'Balance is required';
    }

    // Credit limit validation for credit cards
    if (formData.type === AccountType.CREDIT_CARD) {
      const creditLimit = parseFloat(formData.creditLimit);
      if (isNaN(creditLimit) || creditLimit <= 0) {
        newErrors.creditLimit = 'Credit limit is required for credit cards';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
      // Re-validate on change if field was touched
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // For display settings only mode, only send icon and color
    if (displaySettingsOnly) {
      const updateData: UpdateAccountRequest & { id: string; settings?: AccountSettings } = {
        id: account.id,
        settings: {
          icon: formData.icon,
          color: formData.color,
        },
      };
      await onSubmit(updateData);
      return;
    }

    // Full update for manual accounts
    const updateData: UpdateAccountRequest & { id: string; settings?: AccountSettings } = {
      id: account.id,
      name: formData.name.trim(),
      currentBalance: parseFloat(formData.currentBalance),
      institutionName: formData.institutionName.trim() || undefined,
      settings: {
        icon: formData.icon,
        color: formData.color,
      },
    };

    if (formData.type === AccountType.CREDIT_CARD && formData.creditLimit) {
      updateData.creditLimit = parseFloat(formData.creditLimit);
    }

    await onSubmit(updateData);
  };

  const isCreditCard = formData.type === AccountType.CREDIT_CARD;

  const formContent = (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
        >
          {error}
        </div>
      )}

      {/* Validation Error Alert */}
      {Object.keys(errors).length > 0 && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
        >
          {Object.values(errors)[0]}
        </div>
      )}

      {/* Info message for linked accounts */}
      {displaySettingsOnly && (
        <div
          role="note"
          className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700"
        >
          <p className="text-sm">
            <strong>{account.name}</strong> is a linked bank account. You can customize its icon and color for display purposes. Balance and account details are synced from your bank.
          </p>
        </div>
      )}

      {/* Name Field - only for manual accounts */}
      {!displaySettingsOnly && (
        <div>
          <label
            htmlFor={`${formId}-name`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Account Name *
          </label>
          <input
            ref={nameInputRef}
            id={`${formId}-name`}
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            disabled={isSubmitting}
            data-testid="account-name-input"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? `${formId}-name-error` : undefined}
            className={`w-full px-3 py-2 rounded-lg border transition-colors
              ${errors.name
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }
              focus:outline-none focus:ring-2
              disabled:bg-gray-100 disabled:cursor-not-allowed`}
            placeholder="e.g., My Savings"
          />
          {errors.name && (
            <p id={`${formId}-name-error`} className="mt-1 text-sm text-red-600">
              {errors.name}
            </p>
          )}
        </div>
      )}

      {/* Account Type - only for manual accounts */}
      {!displaySettingsOnly && (
        <div>
          <label
            htmlFor={`${formId}-type`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Account Type *
          </label>
          <select
            id={`${formId}-type`}
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value as AccountType)}
            disabled={isSubmitting}
            data-testid="account-type-select"
            className="w-full px-3 py-2 rounded-lg border border-gray-300
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {ACCOUNT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Balance and Currency - only for manual accounts */}
      {!displaySettingsOnly && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={`${formId}-balance`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Current Balance *
            </label>
            <input
              id={`${formId}-balance`}
              type="number"
              step="0.01"
              value={formData.currentBalance}
              onChange={(e) => handleChange('currentBalance', e.target.value)}
              onBlur={() => handleBlur('currentBalance')}
              disabled={isSubmitting}
              data-testid="account-balance-input"
              aria-invalid={!!errors.currentBalance}
              className={`w-full px-3 py-2 rounded-lg border transition-colors
                ${errors.currentBalance
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }
                focus:outline-none focus:ring-2
                disabled:bg-gray-100 disabled:cursor-not-allowed`}
            />
          </div>

          <div>
            <label
              htmlFor={`${formId}-currency`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Currency
            </label>
            <select
              id={`${formId}-currency`}
              value={formData.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              disabled={isSubmitting}
              data-testid="account-currency-select"
              className="w-full px-3 py-2 rounded-lg border border-gray-300
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {CURRENCIES.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.code} - {curr.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Credit Limit (only for credit cards, manual accounts only) */}
      {!displaySettingsOnly && isCreditCard && (
        <div>
          <label
            htmlFor={`${formId}-credit-limit`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Credit Limit *
          </label>
          <input
            id={`${formId}-credit-limit`}
            type="number"
            step="0.01"
            min="0"
            value={formData.creditLimit}
            onChange={(e) => handleChange('creditLimit', e.target.value)}
            onBlur={() => handleBlur('creditLimit')}
            disabled={isSubmitting}
            data-testid="account-credit-limit-input"
            aria-invalid={!!errors.creditLimit}
            className={`w-full px-3 py-2 rounded-lg border transition-colors
              ${errors.creditLimit
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }
              focus:outline-none focus:ring-2
              disabled:bg-gray-100 disabled:cursor-not-allowed`}
          />
        </div>
      )}

      {/* Institution Name - only for manual accounts */}
      {!displaySettingsOnly && (
        <div>
          <label
            htmlFor={`${formId}-institution`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Institution Name
          </label>
          <input
            id={`${formId}-institution`}
            type="text"
            value={formData.institutionName}
            onChange={(e) => handleChange('institutionName', e.target.value)}
            disabled={isSubmitting}
            data-testid="account-institution-input"
            className="w-full px-3 py-2 rounded-lg border border-gray-300
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="e.g., Chase Bank"
          />
        </div>
      )}

      {/* Icon Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Account Icon
        </label>
        <div
          data-testid="account-icon-selector"
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Select account icon"
        >
          {ICON_OPTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleChange('icon', id)}
              disabled={isSubmitting}
              data-testid={`icon-${id}`}
              aria-checked={formData.icon === id}
              role="radio"
              className={`p-2 rounded-lg border-2 transition-all
                ${formData.icon === id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
              title={label}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>

      {/* Color Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Account Color
        </label>
        <div
          data-testid="account-color-picker"
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Select account color"
        >
          {COLOR_OPTIONS.map(({ id, label, value }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleChange('color', id)}
              disabled={isSubmitting}
              data-testid={`color-${id}`}
              aria-checked={formData.color === id}
              role="radio"
              className={`w-8 h-8 rounded-full border-2 transition-all
                ${formData.color === id
                  ? 'ring-2 ring-offset-2 ring-blue-500'
                  : 'hover:scale-110'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{ backgroundColor: value }}
              title={label}
            >
              <span className="sr-only">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300
            text-gray-700 font-medium
            hover:bg-gray-50 active:bg-gray-100
            focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 rounded-lg
            bg-blue-600 text-white font-medium
            hover:bg-blue-700 active:bg-blue-800
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
            inline-flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <svg
                className="w-4 h-4 mr-2 animate-spin"
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
              Updating...
            </>
          ) : (
            'Update Account'
          )}
        </button>
      </div>
    </form>
  );

  // Modal title varies based on account type
  const modalTitle = displaySettingsOnly ? 'Customize Account' : 'Edit Account';

  if (!isModal) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 id={titleId} className="text-xl font-semibold text-gray-900 mb-6">
          {modalTitle}
        </h2>
        {formContent}
      </div>
    );
  }

  // Modal rendering
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id={titleId} className="text-xl font-semibold text-gray-900">
            {modalTitle}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100
              focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6">
          {formContent}
        </div>
      </div>
    </div>
  );
}

export default EditAccountForm;
