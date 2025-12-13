/**
 * Transaction Components Index
 *
 * Re-exports all transaction-related components for clean imports.
 *
 * @module components/transactions
 *
 * @example
 * ```typescript
 * import {
 *   TransactionForm,
 *   TransactionFormModal,
 *   QuickAddTransaction,
 *   CategorySelector,
 * } from '@/components/transactions';
 * ```
 */

// Form components
export { TransactionForm } from './TransactionForm';
export type { TransactionFormProps, Account } from './TransactionForm';

export { TransactionFormModal } from './TransactionFormModal';
export type { TransactionFormModalProps } from './TransactionFormModal';

export { QuickAddTransaction } from './QuickAddTransaction';
export type { QuickAddTransactionProps } from './QuickAddTransaction';

// Category selector
export { CategorySelector } from './CategorySelector';
export type { CategorySelectorProps } from './CategorySelector';

// Transaction row (for lists)
export { TransactionRow } from './TransactionRow';
export type { TransactionRowProps } from './TransactionRow';

// Bulk actions bar
export { BulkActionsBar } from './BulkActionsBar';
export type { BulkActionsBarProps } from './BulkActionsBar';

// Delete confirmation dialog
export { DeleteConfirmDialog } from './DeleteConfirmDialog';
export type { DeleteConfirmDialogProps } from './DeleteConfirmDialog';

// Enhanced transaction list with CRUD
export { EnhancedTransactionList } from './EnhancedTransactionList';
export type { EnhancedTransactionListProps } from './EnhancedTransactionList';
