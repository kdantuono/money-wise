'use client';

import { useState, useEffect, useId } from 'react';
import { AccountType, AccountSource } from '../../types/account.types';
import type { CreateAccountRequest } from '../../services/accounts.client';
import { useActiveGoals } from '../../hooks/useActiveGoals';

/**
 * ManualAccountForm Component
 *
 * Form per creare conti manuali (contanti, portafogli, tracking custom).
 * Sprint 1.6 Fase 2B: supporta linking opzionale a obiettivo.
 */

interface ManualAccountFormProps {
  onSubmit: (data: CreateAccountRequest) => Promise<void>;
  onCancel: () => void;
  className?: string;
  isSubmitting?: boolean;
  error?: string;
  isModal?: boolean;
}

interface FormErrors {
  name?: string;
  type?: string;
  balance?: string;
  creditLimit?: string;
}

const accountTypeOptions = [
  { value: '', label: 'Seleziona tipo conto', disabled: true },
  { value: AccountType.CHECKING, label: 'Conto corrente' },
  { value: AccountType.SAVINGS, label: 'Risparmio' },
  { value: AccountType.CREDIT_CARD, label: 'Carta di credito' },
  { value: AccountType.INVESTMENT, label: 'Investimento' },
  { value: AccountType.LOAN, label: 'Finanziamento' },
  { value: AccountType.MORTGAGE, label: 'Mutuo' },
  { value: AccountType.OTHER, label: 'Altro' },
];

const currencyOptions = [
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'USD', label: 'USD - Dollaro USA' },
  { value: 'GBP', label: 'GBP - Sterlina' },
  { value: 'CAD', label: 'CAD - Dollaro canadese' },
  { value: 'AUD', label: 'AUD - Dollaro australiano' },
  { value: 'JPY', label: 'JPY - Yen giapponese' },
  { value: 'CHF', label: 'CHF - Franco svizzero' },
];

export function ManualAccountForm({
  onSubmit,
  onCancel,
  className = '',
  isSubmitting = false,
  error,
  isModal = false,
}: ManualAccountFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType | ''>('');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [institutionName, setInstitutionName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [goalId, setGoalId] = useState<string>('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { data: activeGoals = [] } = useActiveGoals();

  const formId = useId();
  const titleId = `${formId}-title`;
  const errorId = `${formId}-error`;
  const nameErrorId = `${formId}-name-error`;
  const typeErrorId = `${formId}-type-error`;
  const balanceErrorId = `${formId}-balance-error`;
  const creditLimitErrorId = `${formId}-credit-limit-error`;

  const showCreditLimit = type === AccountType.CREDIT_CARD;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = 'Il nome del conto è obbligatorio';
    } else if (trimmedName.length < 3) {
      newErrors.name = 'Il nome del conto deve avere almeno 3 caratteri';
    }

    if (!type) {
      newErrors.type = 'Seleziona un tipo di conto';
    }

    if (!balance) {
      newErrors.balance = 'Il saldo è obbligatorio';
    } else {
      const balanceNum = parseFloat(balance);
      if (isNaN(balanceNum)) {
        newErrors.balance = 'Saldo non valido';
      }
    }

    if (showCreditLimit && !creditLimit) {
      newErrors.creditLimit = 'Il limite di credito è obbligatorio per le carte di credito';
    } else if (showCreditLimit && creditLimit) {
      const limitNum = parseFloat(creditLimit);
      if (isNaN(limitNum) || limitNum <= 0) {
        newErrors.creditLimit = 'Il limite di credito deve essere un numero positivo';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    if (goalId) {
      data.goalId = goalId;
    }

    await onSubmit(data);
  };

  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      validateForm();
    }
  }, [name, type, balance, creditLimit, touched]);

  const displayError = errors.name || errors.type || errors.balance || errors.creditLimit || error;

  const formContent = (
    <form
      onSubmit={handleSubmit}
      className={`space-y-6 ${className}`}
      noValidate
    >
      <h2 id={titleId} className="text-xl font-semibold text-foreground">
        Aggiungi conto manuale
      </h2>

      {displayError && (
        <div
          id={errorId}
          role="alert"
          className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm"
        >
          {displayError}
        </div>
      )}

      <div className="space-y-1">
        <label
          htmlFor={`${formId}-name`}
          className="block text-sm font-medium text-foreground"
        >
          Nome conto
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
          placeholder="es. Contanti, Fondo Emergenza"
          className={`
            w-full px-3 py-2 rounded-lg border transition-colors
            ${touched.name && errors.name
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-border focus:ring-blue-500 focus:border-blue-500'
            }
            disabled:bg-muted disabled:cursor-not-allowed
          `}
        />
        {touched.name && errors.name && (
          <p id={nameErrorId} className="text-sm text-red-600">
            {errors.name}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${formId}-type`}
          className="block text-sm font-medium text-foreground"
        >
          Tipo conto
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
              : 'border-border focus:ring-blue-500 focus:border-blue-500'
            }
            disabled:bg-muted disabled:cursor-not-allowed
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

      <div className="space-y-1">
        <label
          htmlFor={`${formId}-balance`}
          className="block text-sm font-medium text-foreground"
        >
          Saldo attuale
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            €
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
                : 'border-border focus:ring-blue-500 focus:border-blue-500'
              }
              disabled:bg-muted disabled:cursor-not-allowed
            `}
          />
        </div>
        {touched.balance && errors.balance && (
          <p id={balanceErrorId} className="text-sm text-red-600">
            {errors.balance}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Usa valori negativi per i debiti (carte di credito, finanziamenti)
        </p>
      </div>

      {showCreditLimit && (
        <div className="space-y-1">
          <label
            htmlFor={`${formId}-credit-limit`}
            className="block text-sm font-medium text-foreground"
          >
            Limite di credito
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              €
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
                  : 'border-border focus:ring-blue-500 focus:border-blue-500'
                }
                disabled:bg-muted disabled:cursor-not-allowed
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

      <div className="space-y-1">
        <label
          htmlFor={`${formId}-currency`}
          className="block text-sm font-medium text-foreground"
        >
          Valuta
        </label>
        <select
          id={`${formId}-currency`}
          data-testid="account-currency-select"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          disabled={isSubmitting}
          className="w-full px-3 py-2 rounded-lg border border-border focus:ring-blue-500 focus:border-blue-500 disabled:bg-muted disabled:cursor-not-allowed"
        >
          {currencyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${formId}-institution`}
          className="block text-sm font-medium text-foreground"
        >
          Istituto <span className="text-muted-foreground">(opzionale)</span>
        </label>
        <input
          id={`${formId}-institution`}
          data-testid="account-institution-input"
          type="text"
          value={institutionName}
          onChange={(e) => setInstitutionName(e.target.value)}
          disabled={isSubmitting}
          placeholder="es. Intesa Sanpaolo, ING"
          className="w-full px-3 py-2 rounded-lg border border-border focus:ring-blue-500 focus:border-blue-500 disabled:bg-muted disabled:cursor-not-allowed"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${formId}-account-number`}
          className="block text-sm font-medium text-foreground"
        >
          Numero conto <span className="text-muted-foreground">(opzionale)</span>
        </label>
        <input
          id={`${formId}-account-number`}
          data-testid="account-number-input"
          type="text"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          disabled={isSubmitting}
          placeholder="Ultime 4 cifre, es. ****1234"
          className="w-full px-3 py-2 rounded-lg border border-border focus:ring-blue-500 focus:border-blue-500 disabled:bg-muted disabled:cursor-not-allowed"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${formId}-goal`}
          className="block text-sm font-medium text-foreground"
        >
          Collega a obiettivo <span className="text-muted-foreground">(opzionale)</span>
        </label>
        <select
          id={`${formId}-goal`}
          data-testid="account-goal-select"
          value={goalId}
          onChange={(e) => setGoalId(e.target.value)}
          disabled={isSubmitting}
          className="w-full px-3 py-2 rounded-lg border border-border focus:ring-blue-500 focus:border-blue-500 disabled:bg-muted disabled:cursor-not-allowed"
        >
          <option value="">Nessun obiettivo</option>
          {activeGoals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              🎯 {goal.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Il saldo del conto contribuirà al progresso dell&apos;obiettivo
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground font-medium hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Annulla
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
          {isSubmitting ? 'Creazione...' : 'Crea conto'}
        </button>
      </div>
    </form>
  );

  if (isModal) {
    return (
      <div
        role="dialog"
        aria-labelledby={titleId}
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      >
        <div className="bg-card rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
          {formContent}
        </div>
      </div>
    );
  }

  return formContent;
}

export default ManualAccountForm;
