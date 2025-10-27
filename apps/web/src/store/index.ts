/**
 * Store Index
 *
 * Central export point for all Zustand stores.
 * Import stores and hooks from here for consistency.
 *
 * @module store
 */

// =============================================================================
// Banking Store
// =============================================================================

export {
  // Main store
  useBankingStore,

  // Convenience hooks
  useBanking,
  useAccounts,
  useBankingError,
  useSyncStatus,
  useSyncError,
  useBankingLoading,

  // Types
  type BankingState,
} from './banking.store';

// =============================================================================
// Re-export Banking Client Types
// =============================================================================

export type {
  BankingAccount,
  BankingProvider,
  SyncStatus,
  SyncResponse,
  InitiateLinkResponse,
  CompleteLinkResponse,
  GetAccountsResponse,
  AvailableProvidersResponse,
} from '../services/banking.client';

// =============================================================================
// Future Stores
// =============================================================================

// export { useTransactionStore } from './transaction.store';
// export { useBudgetStore } from './budget.store';
// export { useAuthStore } from './auth.store';
