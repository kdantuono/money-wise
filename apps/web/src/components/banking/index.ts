/**
 * Banking Components
 * Production-ready React components for banking integration
 *
 * Main Components:
 * - BankingLinkButton: Initiates OAuth flow for bank account linking
 * - AccountList: Displays all linked bank accounts
 * - AccountDetails: Detailed view of a single account
 * - TransactionList: Transactions for an account with filtering
 * - RevokeConfirmation: Confirmation dialog for account revocation
 *
 * Loading & Error States:
 * - AccountSkeleton: Placeholder for account list item
 * - AccountDetailsSkeleton: Placeholder for account details
 * - TransactionSkeleton: Placeholder for transaction item
 * - SyncingIndicator: Shows sync in progress
 * - ErrorAlert: Generic error display
 * - ErrorBoundary: React error boundary
 *
 * @example
 * import {
 *   BankingLinkButton,
 *   AccountList,
 *   ErrorBoundary,
 * } from '@/components/banking';
 */

// ============================================================================
// MAIN COMPONENTS
// ============================================================================

export { BankingLinkButton } from './BankingLinkButton';
export { AccountList } from './AccountList';
export { AccountDetails } from './AccountDetails';
export { TransactionList } from './TransactionList';
export { RevokeConfirmation } from './RevokeConfirmation';

// ============================================================================
// LOADING & ERROR STATES
// ============================================================================

export {
  AccountSkeleton,
  AccountDetailsSkeleton,
  TransactionSkeleton,
  SyncingIndicator,
  ErrorAlert,
  ErrorBoundary,
} from './LoadingStates';
