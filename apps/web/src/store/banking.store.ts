/**
 * Banking State Management Store
 *
 * Zustand store for managing banking account state, linking flow, and synchronization.
 * Provides a single source of truth for all banking-related state in the application.
 *
 * Features:
 * - Account data management
 * - Linking flow state tracking
 * - Per-account sync status
 * - Error state management
 * - LocalStorage persistence
 * - Automatic account fetching
 *
 * @module store/banking
 *
 * @example
 * ```typescript
 * // Full state access
 * const { accounts, isLoading, initiateLinking } = useBanking();
 *
 * // Just accounts
 * const accounts = useAccounts();
 *
 * // Error state
 * const error = useBankingError();
 *
 * // Sync status for single account
 * const isSyncing = useSyncStatus(accountId);
 * ```
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  bankingClient,
  BankingAccount,
  BankingApiError,
  AuthenticationError,
  BankingProvider,
} from '../services/banking.client';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Banking Store State
 *
 * Complete state structure for banking management.
 */
export interface BankingState {
  // ========== Account Data ==========
  /** All linked banking accounts */
  accounts: BankingAccount[];

  /** Number of active banking connections */
  linkedConnections: number;

  // ========== Loading States ==========
  /** General loading state (e.g., fetching accounts) */
  isLoading: boolean;

  /** Linking flow in progress */
  isLinking: boolean;

  /** Per-account sync status (accountId → syncing) */
  isSyncing: Record<string, boolean>;

  // ========== Error States ==========
  /** General error message */
  error: string | null;

  /** Linking flow error */
  linkError: string | null;

  /** Per-account sync errors (accountId → error message) */
  syncErrors: Record<string, string>;

  // ========== State Management Actions ==========
  /**
   * Set all accounts
   *
   * @param accounts - Array of banking accounts
   */
  setAccounts(accounts: BankingAccount[]): void;

  /**
   * Add a single account
   *
   * @param account - Banking account to add
   */
  addAccount(account: BankingAccount): void;

  /**
   * Remove an account
   *
   * @param accountId - Account ID to remove
   */
  removeAccount(accountId: string): void;

  /**
   * Update an account
   *
   * @param accountId - Account ID to update
   * @param updates - Partial account data to merge
   */
  updateAccount(accountId: string, updates: Partial<BankingAccount>): void;

  // ========== Linking Flow Actions ==========
  /**
   * Initiate banking link
   *
   * Starts the OAuth flow with the specified provider.
   * Returns redirect URL and connection ID.
   *
   * @param provider - Banking provider (SALTEDGE, TINK, etc.)
   * @returns Promise with redirect URL and connection ID
   * @throws {BankingApiError} If API call fails
   */
  initiateLinking(provider?: string): Promise<{
    redirectUrl: string;
    connectionId: string;
  }>;

  /**
   * Complete banking link
   *
   * Called after OAuth to fetch and store linked accounts.
   *
   * @param connectionId - Our internal connection ID from initiate-link
   * @param saltEdgeConnectionId - Optional SaltEdge connection_id from redirect URL
   * @throws {BankingApiError} If API call fails
   */
  completeLinking(connectionId: string, saltEdgeConnectionId?: string): Promise<void>;

  /**
   * Fetch all linked accounts
   *
   * @throws {BankingApiError} If API call fails
   */
  fetchAccounts(): Promise<void>;

  // ========== Syncing Actions ==========
  /**
   * Sync a specific account
   *
   * Fetches latest transactions and balance from the bank.
   *
   * @param accountId - Account ID to sync
   * @throws {BankingApiError} If sync fails
   */
  syncAccount(accountId: string): Promise<void>;

  /**
   * Revoke a banking connection
   *
   * Disconnects and removes all accounts from the connection.
   *
   * @param connectionId - Connection ID to revoke
   * @throws {BankingApiError} If revoke fails
   */
  revokeConnection(connectionId: string): Promise<void>;

  // ========== Error Management ==========
  /**
   * Set general error
   *
   * @param error - Error message or null to clear
   */
  setError(error: string | null): void;

  /**
   * Clear general error
   */
  clearError(): void;

  /**
   * Clear sync error for specific account
   *
   * @param accountId - Account ID to clear error for
   */
  clearSyncError(accountId: string): void;

  // ========== Internal Helpers ==========
  /**
   * Reset all state to initial values
   * @internal
   */
  _reset(): void;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState = {
  accounts: [],
  linkedConnections: 0,
  isLoading: false,
  isLinking: false,
  isSyncing: {},
  error: null,
  linkError: null,
  syncErrors: {},
};

// =============================================================================
// Store Implementation
// =============================================================================

/**
 * Banking Store
 *
 * Zustand store with immer middleware for immutable updates and
 * persist middleware for localStorage synchronization.
 */
export const useBankingStore = create<BankingState>()(
  persist(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    immer((set, _get) => ({
      // Initial state
      ...initialState,

      // ========== State Management Actions ==========

      setAccounts: (accounts) => {
        set((state) => {
          state.accounts = accounts;
          // Count unique connections
          const connections = new Set(
            accounts
              .filter((acc) => acc.syncStatus !== 'DISCONNECTED')
              .map((acc) => acc.id) // Use connection pattern if available
          );
          state.linkedConnections = connections.size;
        });
      },

      addAccount: (account) => {
        set((state) => {
          // Check if account already exists
          const existingIndex = state.accounts.findIndex(
            (acc) => acc.id === account.id
          );

          if (existingIndex >= 0) {
            // Update existing account
            // eslint-disable-next-line security/detect-object-injection
            state.accounts[existingIndex] = account;
          } else {
            // Add new account
            state.accounts.push(account);
            state.linkedConnections += 1;
          }
        });
      },

      removeAccount: (accountId) => {
        set((state) => {
          const index = state.accounts.findIndex((acc) => acc.id === accountId);
          if (index >= 0) {
            state.accounts.splice(index, 1);
            state.linkedConnections = Math.max(0, state.linkedConnections - 1);
          }
          // Clean up sync state
          // eslint-disable-next-line security/detect-object-injection
          delete state.isSyncing[accountId];
          // eslint-disable-next-line security/detect-object-injection
          delete state.syncErrors[accountId];
        });
      },

      updateAccount: (accountId, updates) => {
        set((state) => {
          const account = state.accounts.find((acc) => acc.id === accountId);
          if (account) {
            Object.assign(account, updates);
          }
        });
      },

      // ========== Linking Flow Actions ==========

      initiateLinking: async (provider) => {
        set((state) => {
          state.isLinking = true;
          state.linkError = null;
        });

        try {
          const response = await bankingClient.initiateLink(
            provider as BankingProvider | undefined
          );

          set((state) => {
            state.isLinking = false;
          });

          return response;
        } catch (error) {
          const errorMessage =
            error instanceof BankingApiError
              ? error.message
              : 'Failed to initiate bank linking. Please try again.';

          set((state) => {
            state.isLinking = false;
            state.linkError = errorMessage;
            state.error = errorMessage;
          });

          throw error;
        }
      },

      completeLinking: async (connectionId, saltEdgeConnectionId) => {
        set((state) => {
          state.isLinking = true;
          state.linkError = null;
        });

        try {
          const response = await bankingClient.completeLink(connectionId, saltEdgeConnectionId);

          set((state) => {
            state.isLinking = false;
            // Add all new accounts
            response.accounts.forEach((account) => {
              const existingIndex = state.accounts.findIndex(
                (acc) => acc.id === account.id
              );
              if (existingIndex >= 0) {
                // eslint-disable-next-line security/detect-object-injection
                state.accounts[existingIndex] = account;
              } else {
                state.accounts.push(account);
              }
            });
            // Update connection count
            const connections = new Set(
              state.accounts
                .filter((acc) => acc.syncStatus !== 'DISCONNECTED')
                .map((acc) => acc.id)
            );
            state.linkedConnections = connections.size;
          });
        } catch (error) {
          const errorMessage =
            error instanceof BankingApiError
              ? error.message
              : 'Failed to complete bank linking. Please try again.';

          set((state) => {
            state.isLinking = false;
            state.linkError = errorMessage;
            state.error = errorMessage;
          });

          throw error;
        }
      },

      fetchAccounts: async () => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const response = await bankingClient.getAccounts();

          set((state) => {
            state.isLoading = false;
            state.accounts = response.accounts;
            // Update connection count
            const connections = new Set(
              response.accounts
                .filter((acc) => acc.syncStatus !== 'DISCONNECTED')
                .map((acc) => acc.id)
            );
            state.linkedConnections = connections.size;
          });
        } catch (error) {
          const errorMessage =
            error instanceof AuthenticationError
              ? 'Please log in to view your banking accounts.'
              : error instanceof BankingApiError
                ? error.message
                : 'Failed to fetch banking accounts. Please try again.';

          set((state) => {
            state.isLoading = false;
            state.error = errorMessage;
          });

          throw error;
        }
      },

      // ========== Syncing Actions ==========

      syncAccount: async (accountId) => {
        set((state) => {
          // eslint-disable-next-line security/detect-object-injection
          state.isSyncing[accountId] = true;
          // eslint-disable-next-line security/detect-object-injection
          delete state.syncErrors[accountId];
        });

        try {
          const response = await bankingClient.syncAccount(accountId);

          set((state) => {
            // eslint-disable-next-line security/detect-object-injection
            state.isSyncing[accountId] = false;

            // Update account with sync result
            const account = state.accounts.find((acc) => acc.id === accountId);
            if (account) {
              account.syncStatus = response.status ?? 'SYNCED';
              account.lastSynced = new Date().toISOString();

              if (response.balanceUpdated && response.status === 'SYNCED') {
                // Balance was updated - will be reflected in next fetch
                // Optionally trigger a re-fetch here
              }
            }

            if (response.error) {
              // eslint-disable-next-line security/detect-object-injection
              state.syncErrors[accountId] = response.error;
            }
          });
        } catch (error) {
          const errorMessage =
            error instanceof BankingApiError
              ? error.message
              : 'Failed to sync account. Please try again.';

          set((state) => {
            // eslint-disable-next-line security/detect-object-injection
            state.isSyncing[accountId] = false;
            // eslint-disable-next-line security/detect-object-injection
            state.syncErrors[accountId] = errorMessage;

            // Update account status to ERROR
            const account = state.accounts.find((acc) => acc.id === accountId);
            if (account) {
              account.syncStatus = 'ERROR';
            }
          });

          throw error;
        }
      },

      revokeConnection: async (connectionId) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          await bankingClient.revokeConnection(connectionId);

          set((state) => {
            state.isLoading = false;
            // Mark all accounts from this connection as disconnected
            // Note: We'd need connection tracking to properly do this
            // For now, remove the account if ID matches connection
            state.accounts = state.accounts.filter(
              (acc) => acc.id !== connectionId
            );
            state.linkedConnections = Math.max(
              0,
              state.linkedConnections - 1
            );
          });
        } catch (error) {
          const errorMessage =
            error instanceof BankingApiError
              ? error.message
              : 'Failed to revoke connection. Please try again.';

          set((state) => {
            state.isLoading = false;
            state.error = errorMessage;
          });

          throw error;
        }
      },

      // ========== Error Management ==========

      setError: (error) => {
        set((state) => {
          state.error = error;
        });
      },

      clearError: () => {
        set((state) => {
          state.error = null;
          state.linkError = null;
        });
      },

      clearSyncError: (accountId) => {
        set((state) => {
          // eslint-disable-next-line security/detect-object-injection
          delete state.syncErrors[accountId];
        });
      },

      // ========== Internal Helpers ==========

      _reset: () => {
        set(initialState);
      },
    })),
    {
      name: 'banking-storage', // LocalStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist certain fields
      partialize: (state) => ({
        accounts: state.accounts,
        linkedConnections: state.linkedConnections,
      }),
    }
  )
);

// =============================================================================
// Convenience Hooks
// =============================================================================

/**
 * Use full banking state
 *
 * @returns Complete banking state and actions
 *
 * @example
 * ```typescript
 * const { accounts, isLoading, fetchAccounts } = useBanking();
 * ```
 */
export const useBanking = () => useBankingStore();

/**
 * Use only accounts
 *
 * @returns Array of banking accounts
 *
 * @example
 * ```typescript
 * const accounts = useAccounts();
 * ```
 */
export const useAccounts = () => useBankingStore((state) => state.accounts);

/**
 * Use banking error state
 *
 * @returns Current error message or null
 *
 * @example
 * ```typescript
 * const error = useBankingError();
 * if (error) {
 *   toast.error(error);
 * }
 * ```
 */
export const useBankingError = () => useBankingStore((state) => state.error);

/**
 * Use sync status for a specific account
 *
 * @param accountId - Account ID to check sync status
 * @returns True if account is currently syncing
 *
 * @example
 * ```typescript
 * const isSyncing = useSyncStatus(accountId);
 * ```
 */
export const useSyncStatus = (accountId: string) =>
  // eslint-disable-next-line security/detect-object-injection
  useBankingStore((state) => state.isSyncing[accountId] ?? false);

/**
 * Use sync error for a specific account
 *
 * @param accountId - Account ID to check sync error
 * @returns Error message or undefined
 *
 * @example
 * ```typescript
 * const syncError = useSyncError(accountId);
 * ```
 */
export const useSyncError = (accountId: string) =>
  // eslint-disable-next-line security/detect-object-injection
  useBankingStore((state) => state.syncErrors[accountId]);

/**
 * Use banking loading states
 *
 * @returns Object with all loading states
 *
 * @example
 * ```typescript
 * const { isLoading, isLinking } = useBankingLoading();
 * ```
 */
export const useBankingLoading = () =>
  useBankingStore((state) => ({
    isLoading: state.isLoading,
    isLinking: state.isLinking,
    isSyncing: state.isSyncing,
  }));

// =============================================================================
// Exports
// =============================================================================

export default useBankingStore;
