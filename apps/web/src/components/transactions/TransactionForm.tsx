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
      newErrors.amount = 'Importo obbligatorio';
    } else if (isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'L\'importo deve essere maggiore di 0';
    }

    // Description validation
    if (!description || description.trim() === '') {
      newErrors.description = 'Descrizione obbligatoria';
    }

    // Date validation
    if (!date) {
      newErrors.date = 'Data obbligatoria';
    }

    // Account validation
    if (!accountId) {
      newErrors.accountId = 'Seleziona un conto';
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
            err instanceof Error ? err.message : 'Si è verificato un errore imprevisto',
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
      <h3 className="text-lg font-semibold text-foreground">
        {isEditMode ? 'Modifica Transazione' : 'Aggiungi Transazione'}
      </h3>

      {/* Linked Transaction Notice */}
      {isLinkedTransaction && (
        <div className="p-4 text-sm rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="font-medium text-amber-600 dark:text-amber-400">Transazione sincronizzata dalla banca</p>
          <p className="mt-1 text-muted-foreground">
            Solo la categoria e le note possono essere modificate. Gli altri campi sono sincronizzati dalla banca.
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
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-2 border-rose-500/30'
              : 'bg-muted/50 text-muted-foreground border-2 border-transparent hover:bg-muted'
          } ${formLoading || isFieldLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          Uscita
        </button>
        <button
          type="button"
          onClick={() => setTransactionType('CREDIT')}
          aria-pressed={transactionType === 'CREDIT'}
          disabled={formLoading || isFieldLocked}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            transactionType === 'CREDIT'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500/30'
              : 'bg-muted/50 text-muted-foreground border-2 border-transparent hover:bg-muted'
          } ${formLoading || isFieldLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          Entrata
        </button>
      </div>

      {/* Amount */}
      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-foreground mb-1"
        >
          Importo <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            €
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
            className={`w-full pl-8 pr-3 py-2 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50
              ${errors.amount ? 'border-rose-500/50' : 'border-border/50'}
              ${formLoading || isFieldLocked ? 'bg-muted/30 cursor-not-allowed opacity-50 text-muted-foreground' : ''}`}
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
          className="block text-sm font-medium text-foreground mb-1"
        >
          Descrizione <span className="text-red-500">*</span>
        </label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A cosa si riferisce?"
          disabled={formLoading || isFieldLocked}
          className={`w-full px-3 py-2 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50
            ${errors.description ? 'border-rose-500/50' : 'border-border/50'}
            ${formLoading || isFieldLocked ? 'bg-muted/30 cursor-not-allowed opacity-50 text-muted-foreground' : ''}`}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      {/* Date */}
      <div>
        <label
          htmlFor="date"
          className="block text-sm font-medium text-foreground mb-1"
        >
          Data <span className="text-red-500">*</span>
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={formLoading || isFieldLocked}
          className={`w-full px-3 py-2 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50
            ${errors.date ? 'border-rose-500/50' : 'border-border/50'}
            ${formLoading || isFieldLocked ? 'bg-muted/30 cursor-not-allowed opacity-50 text-muted-foreground' : ''}`}
        />
        {errors.date && (
          <p className="mt-1 text-sm text-red-600">{errors.date}</p>
        )}
      </div>

      {/* Account */}
      <div>
        <label
          htmlFor="account"
          className="block text-sm font-medium text-foreground mb-1"
        >
          Conto <span className="text-red-500">*</span>
        </label>
        <select
          id="account"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          disabled={formLoading || isFieldLocked}
          className={`w-full px-3 py-2 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50
            ${errors.accountId ? 'border-rose-500/50' : 'border-border/50'}
            ${formLoading || isFieldLocked ? 'bg-muted/30 cursor-not-allowed opacity-50 text-muted-foreground' : ''}`}
        >
          <option value="">Seleziona un conto</option>
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
          label="Categoria"
          placeholder="Seleziona una categoria (opzionale)"
          disabled={formLoading}
          clearable
          searchable
        />
      </div>

      {/* Notes - allow notes on linked transactions too since they're user-added */}
      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-foreground mb-1"
        >
          Note
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Aggiungi note aggiuntive..."
          rows={3}
          disabled={formLoading}
          className={`w-full px-3 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50
            ${formLoading ? 'bg-muted cursor-not-allowed' : ''}`}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={formLoading}
          className="flex-1 py-2.5 px-4 border border-border rounded-xl bg-background text-foreground font-medium
            hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={formLoading}
          className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/20
            focus:outline-none focus:ring-2 focus:ring-emerald-500/30
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2"
        >
          {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditMode ? 'Salva Modifiche' : 'Aggiungi Transazione'}
        </button>
      </div>
    </form>
  );
}

export default TransactionForm;
