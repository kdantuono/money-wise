/**
 * EditAccountForm Component
 *
 * Modal per modificare dettagli conto manuale (nome, saldo, valuta, tipo,
 * istituto, icona, colore). Sprint 1.6 Fase 2B: supporta linking opzionale
 * a obiettivo.
 */

'use client';

import { useState, useEffect, useId, useRef } from 'react';
import { AccountType } from '../../types/account.types';
import type { Account, UpdateAccountRequest } from '../../services/accounts.client';
import { useActiveGoals } from '../../hooks/useActiveGoals';
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

const ICON_OPTIONS = [
  { id: 'wallet', label: 'Portafoglio', Icon: Wallet },
  { id: 'piggybank', label: 'Salvadanaio', Icon: PiggyBank },
  { id: 'creditcard', label: 'Carta di credito', Icon: CreditCard },
  { id: 'bank', label: 'Banca', Icon: Building2 },
  { id: 'investment', label: 'Investimento', Icon: TrendingUp },
  { id: 'home', label: 'Casa', Icon: Home },
  { id: 'cash', label: 'Contanti', Icon: Banknote },
  { id: 'business', label: 'Lavoro', Icon: Briefcase },
] as const;

const COLOR_OPTIONS = [
  { id: 'blue', label: 'Blu', value: '#3B82F6' },
  { id: 'green', label: 'Verde', value: '#10B981' },
  { id: 'purple', label: 'Viola', value: '#8B5CF6' },
  { id: 'red', label: 'Rosso', value: '#EF4444' },
  { id: 'yellow', label: 'Giallo', value: '#F59E0B' },
  { id: 'pink', label: 'Rosa', value: '#EC4899' },
  { id: 'indigo', label: 'Indaco', value: '#6366F1' },
  { id: 'teal', label: 'Verde acqua', value: '#14B8A6' },
] as const;

const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'Dollaro USA' },
  { code: 'GBP', symbol: '£', name: 'Sterlina' },
  { code: 'CHF', symbol: 'CHF', name: 'Franco svizzero' },
  { code: 'JPY', symbol: '¥', name: 'Yen giapponese' },
  { code: 'CAD', symbol: 'C$', name: 'Dollaro canadese' },
  { code: 'AUD', symbol: 'A$', name: 'Dollaro australiano' },
];

const ACCOUNT_TYPES = [
  { value: AccountType.CHECKING, label: 'Conto corrente' },
  { value: AccountType.SAVINGS, label: 'Risparmio' },
  { value: AccountType.CREDIT_CARD, label: 'Carta di credito' },
  { value: AccountType.INVESTMENT, label: 'Investimento' },
  { value: AccountType.LOAN, label: 'Finanziamento' },
  { value: AccountType.MORTGAGE, label: 'Mutuo' },
  { value: AccountType.OTHER, label: 'Altro' },
];

interface EditAccountFormProps {
  account: Account;
  onSubmit: (data: UpdateAccountRequest & { id: string; settings?: AccountSettings }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string;
  isModal?: boolean;
  className?: string;
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
  goalId: string;
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
    goalId: account.goalId ?? '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { data: activeGoals = [] } = useActiveGoals();

  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

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

    if (displaySettingsOnly) {
      return true;
    }

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      newErrors.name = 'Il nome del conto è obbligatorio';
    } else if (trimmedName.length < 3) {
      newErrors.name = 'Il nome del conto deve avere almeno 3 caratteri';
    }

    const balance = parseFloat(formData.currentBalance);
    if (isNaN(balance)) {
      newErrors.currentBalance = 'Il saldo è obbligatorio';
    }

    if (formData.type === AccountType.CREDIT_CARD) {
      const creditLimit = parseFloat(formData.creditLimit);
      if (isNaN(creditLimit) || creditLimit <= 0) {
        newErrors.creditLimit = 'Il limite di credito è obbligatorio per le carte di credito';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
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

    const updateData: UpdateAccountRequest & { id: string; settings?: AccountSettings } = {
      id: account.id,
      name: formData.name.trim(),
      currentBalance: parseFloat(formData.currentBalance),
      institutionName: formData.institutionName.trim() || undefined,
      settings: {
        icon: formData.icon,
        color: formData.color,
      },
      goalId: formData.goalId ? formData.goalId : null,
    };

    if (formData.type === AccountType.CREDIT_CARD && formData.creditLimit) {
      updateData.creditLimit = parseFloat(formData.creditLimit);
    }

    await onSubmit(updateData);
  };

  const isCreditCard = formData.type === AccountType.CREDIT_CARD;

  const formContent = (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {error && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
        >
          {error}
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
        >
          {Object.values(errors)[0]}
        </div>
      )}

      {displaySettingsOnly && (
        <div
          role="note"
          className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700"
        >
          <p className="text-sm">
            <strong>{account.name}</strong> è un conto bancario collegato. Puoi personalizzare icona e colore per la visualizzazione. Saldo e dettagli conto sono sincronizzati dalla banca.
          </p>
        </div>
      )}

      {!displaySettingsOnly && (
        <div>
          <label
            htmlFor={`${formId}-name`}
            className="block text-sm font-medium text-foreground mb-1"
          >
            Nome conto *
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
                : 'border-border focus:ring-blue-500 focus:border-blue-500'
              }
              focus:outline-none focus:ring-2
              disabled:bg-muted disabled:cursor-not-allowed`}
            placeholder="es. I miei risparmi"
          />
          {errors.name && (
            <p id={`${formId}-name-error`} className="mt-1 text-sm text-red-600">
              {errors.name}
            </p>
          )}
        </div>
      )}

      {!displaySettingsOnly && (
        <div>
          <label
            htmlFor={`${formId}-type`}
            className="block text-sm font-medium text-foreground mb-1"
          >
            Tipo conto *
          </label>
          <select
            id={`${formId}-type`}
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value as AccountType)}
            disabled={isSubmitting}
            data-testid="account-type-select"
            className="w-full px-3 py-2 rounded-lg border border-border
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-muted disabled:cursor-not-allowed"
          >
            {ACCOUNT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {!displaySettingsOnly && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={`${formId}-balance`}
              className="block text-sm font-medium text-foreground mb-1"
            >
              Saldo attuale *
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
                  : 'border-border focus:ring-blue-500 focus:border-blue-500'
                }
                focus:outline-none focus:ring-2
                disabled:bg-muted disabled:cursor-not-allowed`}
            />
          </div>

          <div>
            <label
              htmlFor={`${formId}-currency`}
              className="block text-sm font-medium text-foreground mb-1"
            >
              Valuta
            </label>
            <select
              id={`${formId}-currency`}
              value={formData.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              disabled={isSubmitting}
              data-testid="account-currency-select"
              className="w-full px-3 py-2 rounded-lg border border-border
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:bg-muted disabled:cursor-not-allowed"
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

      {!displaySettingsOnly && isCreditCard && (
        <div>
          <label
            htmlFor={`${formId}-credit-limit`}
            className="block text-sm font-medium text-foreground mb-1"
          >
            Limite di credito *
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
                : 'border-border focus:ring-blue-500 focus:border-blue-500'
              }
              focus:outline-none focus:ring-2
              disabled:bg-muted disabled:cursor-not-allowed`}
          />
        </div>
      )}

      {!displaySettingsOnly && (
        <div>
          <label
            htmlFor={`${formId}-institution`}
            className="block text-sm font-medium text-foreground mb-1"
          >
            Istituto
          </label>
          <input
            id={`${formId}-institution`}
            type="text"
            value={formData.institutionName}
            onChange={(e) => handleChange('institutionName', e.target.value)}
            disabled={isSubmitting}
            data-testid="account-institution-input"
            className="w-full px-3 py-2 rounded-lg border border-border
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-muted disabled:cursor-not-allowed"
            placeholder="es. Intesa Sanpaolo"
          />
        </div>
      )}

      {!displaySettingsOnly && (
        <div>
          <label
            htmlFor={`${formId}-goal`}
            className="block text-sm font-medium text-foreground mb-1"
          >
            Collega a obiettivo <span className="text-muted-foreground">(opzionale)</span>
          </label>
          <select
            id={`${formId}-goal`}
            value={formData.goalId}
            onChange={(e) => handleChange('goalId', e.target.value)}
            disabled={isSubmitting}
            data-testid="account-goal-select"
            className="w-full px-3 py-2 rounded-lg border border-border
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-muted disabled:cursor-not-allowed"
          >
            <option value="">Nessun obiettivo</option>
            {activeGoals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                🎯 {goal.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Il saldo contribuirà al progresso dell&apos;obiettivo
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Icona conto
        </label>
        <div
          data-testid="account-icon-selector"
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Seleziona icona conto"
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
                  : 'border-border hover:border-border'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
              title={label}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Colore conto
        </label>
        <div
          data-testid="account-color-picker"
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Seleziona colore conto"
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

      <div className="flex gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 rounded-lg border border-border
            text-foreground font-medium
            hover:bg-muted active:bg-muted
            focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors"
        >
          Annulla
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
              Aggiornamento...
            </>
          ) : (
            'Aggiorna conto'
          )}
        </button>
      </div>
    </form>
  );

  const modalTitle = displaySettingsOnly ? 'Personalizza conto' : 'Modifica conto';

  if (!isModal) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 id={titleId} className="text-xl font-semibold text-foreground mb-6">
          {modalTitle}
        </h2>
        {formContent}
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      <div className="relative bg-card rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 id={titleId} className="text-xl font-semibold text-foreground">
            {modalTitle}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-2 rounded-lg text-muted-foreground hover:text-muted-foreground hover:bg-muted
              focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
            aria-label="Chiudi"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {formContent}
        </div>
      </div>
    </div>
  );
}

export default EditAccountForm;
