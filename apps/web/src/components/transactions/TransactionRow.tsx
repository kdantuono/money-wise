'use client';

import { memo, useCallback } from 'react';
import { Pencil, Trash2, Loader2, ArrowLeftRight, ArrowUpRight, ArrowDownRight, CreditCard } from 'lucide-react';
import type { Transaction } from '@/services/transactions.client';

// =============================================================================
// Type Definitions
// =============================================================================

export interface TransactionRowProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
  onSelect: (transactionId: string) => void;
  isSelected?: boolean;
  isSelectable?: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;
  categoryName?: string;
  categoryIcon?: string;
  accountName?: string;
  /**
   * #044: controlla visibilità bottoni Modifica/Elimina inline.
   * Default true (backward-compat). Pass false in contesti read-only (es.
   * account detail view) dove non vogliamo azioni per-row.
   */
  showActions?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number, currency = 'EUR'): string {
  try {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency,
    }).format(Math.abs(amount));
  } catch {
    // Fallback to EUR if currency code is invalid
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(Math.abs(amount));
  }
}

// =============================================================================
// TransactionRow — Figma design language
// =============================================================================

export const TransactionRow = memo(function TransactionRow({
  transaction,
  onEdit,
  onDelete,
  onSelect,
  isSelected = false,
  isSelectable = true,
  isUpdating = false,
  isDeleting = false,
  showActions = true,
  categoryName,
  categoryIcon,
  accountName,
}: TransactionRowProps) {
  const isCredit = transaction.type === 'CREDIT';
  const isPending = transaction.status === 'PENDING' || transaction.isPending;

  const handleEdit = useCallback(() => onEdit(transaction), [onEdit, transaction]);
  const handleDelete = useCallback(() => onDelete(transaction.id), [onDelete, transaction.id]);
  const handleSelect = useCallback(() => onSelect(transaction.id), [onSelect, transaction.id]);

  const amountPrefix = isCredit ? '+' : '-';

  return (
    <article
      className={`group flex items-center gap-3 p-3.5 rounded-xl transition-all
        ${isSelected
          ? 'bg-emerald-500/5 ring-1 ring-emerald-500/30'
          : 'bg-background hover:bg-muted/30'
        }
        ${isUpdating || isDeleting ? 'opacity-60' : ''}`}
    >
      {/* Checkbox */}
      {isSelectable && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleSelect}
          aria-label={`Seleziona ${transaction.description}`}
          className="h-4 w-4 rounded appearance-none border border-border/50 bg-muted checked:bg-emerald-500 checked:border-black focus:ring-emerald-500 focus:ring-offset-0 flex-shrink-0 cursor-pointer relative
            checked:after:content-['✓'] checked:after:text-black checked:after:text-[14px] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:leading-none"
        />
      )}

      {/* Category/type icon — Figma w-11 h-11 circle */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform ${
        categoryIcon ? 'bg-muted/50'
        : isCredit ? 'bg-emerald-500/10'
        : 'bg-rose-500/10'
      }`}>
        {categoryIcon ? (
          <span className="text-[20px] leading-none">{categoryIcon}</span>
        ) : transaction.flowType === 'TRANSFER' ? (
          <ArrowLeftRight className="w-5 h-5 text-blue-500" />
        ) : transaction.flowType === 'LIABILITY_PAYMENT' ? (
          <CreditCard className="w-5 h-5 text-purple-500" />
        ) : isCredit ? (
          <ArrowUpRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <ArrowDownRight className="w-5 h-5 text-rose-600 dark:text-rose-400" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-foreground truncate">
            {transaction.description}
          </p>
          {isPending && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
              In attesa
            </span>
          )}
          {transaction.flowType === 'TRANSFER' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
              Trasferimento
            </span>
          )}
          {transaction.flowType === 'LIABILITY_PAYMENT' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-medium">
              Debito
            </span>
          )}
          {transaction.isRecurring && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-medium">
              Ricorrente
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {categoryName ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-border/50 text-muted-foreground font-medium">
              {categoryName}
            </span>
          ) : !transaction.categoryId ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-border/50 text-muted-foreground/50 italic">
              Non categorizzata
            </span>
          ) : null}
          {accountName && (
            <>
              <span className="text-muted-foreground/30 text-[10px]">·</span>
              <span className="text-[11px] text-muted-foreground/60 truncate">{accountName}</span>
            </>
          )}
        </div>
      </div>

      {/* Amount + date */}
      <div className="text-right flex-shrink-0">
        <p
          aria-label={`${isCredit ? 'Entrata' : 'Uscita'} di ${formatCurrency(transaction.amount, transaction.currency)}`}
          className={`text-[13px] font-semibold tabular-nums ${
            isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {amountPrefix}{formatCurrency(transaction.amount, transaction.currency)}
        </p>
        <time className="text-[10px] text-muted-foreground/60 mt-0.5 block">
          {formatDate(transaction.date)}
        </time>
      </div>

      {/* Actions — always visible on small screens, visible on hover/focus on larger screens */}
      {/* #044: `showActions=false` nasconde bottoni in contesti read-only (evita stub no-op handlers) */}
      {showActions && (
        <div className="flex-shrink-0 flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleEdit}
            disabled={isUpdating || isDeleting}
            aria-label="Modifica transazione"
            className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted/50 focus-visible:text-foreground focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 transition-colors"
          >
            {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isUpdating || isDeleting}
            aria-label="Elimina transazione"
            className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-rose-600 hover:bg-rose-500/10 focus-visible:text-rose-600 focus-visible:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 transition-colors"
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </article>
  );
});

export default TransactionRow;
