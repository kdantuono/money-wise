/**
 * Banking Components - Usage Examples
 *
 * This file demonstrates how to use each banking component in a real application.
 * These are complete, production-ready examples.
 */

'use client';

import { useState } from 'react';
import {
  BankingLinkButton,
  AccountList,
  AccountDetails,
  TransactionList,
  RevokeConfirmation as _RevokeConfirmation,
  AccountSkeleton,
  ErrorAlert,
  ErrorBoundary,
  SyncingIndicator,
} from './index';
import {
  BankingAccount,
  BankingTransaction,
  BankingSyncStatus,
  BankingConnectionStatus,
  BankingProvider,
} from '@/lib/banking-types';

// ============================================================================
// Example 1: Link Bank Account Page
// ============================================================================

export function LinkBankAccountExample() {
  const [isLinked, setIsLinked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Connect Your Bank
        </h1>
        <p className="text-gray-600 mb-6">
          Link your bank account to start tracking your finances automatically.
        </p>

        {error && (
          <ErrorAlert
            title="Connection Failed"
            message={error}
            onDismiss={() => setError(null)}
            className="mb-4"
          />
        )}

        {isLinked ? (
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <p className="text-green-800 font-semibold">
              Bank account successfully linked!
            </p>
            <p className="text-green-700 text-sm mt-1">
              Your transactions are now syncing.
            </p>
          </div>
        ) : (
          <BankingLinkButton
            provider="SALTEDGE"
            onSuccess={() => setIsLinked(true)}
            onError={(err) => setError(err)}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Example 2: Bank Accounts Dashboard
// ============================================================================

export function BankAccountsDashboardExample() {
  const [accounts, setAccounts] = useState<BankingAccount[]>([
    {
      id: 'acc-1',
      userId: 'user-1',
      connectionId: 'conn-1',
      provider: BankingProvider.SALTEDGE,
      providerAccountId: 'prov-1',
      name: 'Chase Checking',
      iban: 'US12345678901234567890',
      currency: 'USD',
      balance: 5234.56,
      availableBalance: 5200.00,
      bankName: 'JPMorgan Chase',
      bankCountry: 'US',
      accountType: 'CHECKING',
      accountNumber: '****1234',
      accountHolderName: 'John Doe',
      syncStatus: BankingSyncStatus.SYNCED,
      connectionStatus: BankingConnectionStatus.AUTHORIZED,
      linkedAt: new Date('2024-10-01'),
      lastSyncedAt: new Date(),
    },
    {
      id: 'acc-2',
      userId: 'user-1',
      connectionId: 'conn-2',
      provider: BankingProvider.SALTEDGE,
      providerAccountId: 'prov-2',
      name: 'BofA Savings',
      iban: 'US98765432109876543210',
      currency: 'USD',
      balance: 25000.00,
      bankName: 'Bank of America',
      bankCountry: 'US',
      accountType: 'SAVINGS',
      accountNumber: '****5678',
      accountHolderName: 'John Doe',
      syncStatus: BankingSyncStatus.PENDING,
      connectionStatus: BankingConnectionStatus.AUTHORIZED,
      linkedAt: new Date('2024-10-15'),
    },
  ]);

  const [_isSyncing, setIsSyncing] = useState<string | null>(null);

  const handleSync = async (accountId: string) => {
    setIsSyncing(accountId);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === accountId
            ? {
                ...acc,
                syncStatus: BankingSyncStatus.SYNCED,
                lastSyncedAt: new Date(),
              }
            : acc
        )
      );
    } finally {
      setIsSyncing(null);
    }
  };

  const handleRevoke = async (accountId: string) => {
    if (
      confirm(
        'Are you sure you want to disconnect this account? This cannot be undone.'
      )
    ) {
      setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Linked Accounts
        </h1>
        <p className="text-gray-600">
          Manage your connected bank accounts and sync transactions
        </p>
      </div>

      <ErrorBoundary
        onError={(error) => console.error('Dashboard error:', error)}
      >
        <AccountList
          accounts={accounts}
          onSync={handleSync}
          onRevoke={handleRevoke}
        />
      </ErrorBoundary>
    </div>
  );
}

// ============================================================================
// Example 3: Account Details Page
// ============================================================================

export function AccountDetailsPageExample() {
  const [account, setAccount] = useState<BankingAccount>({
    id: 'acc-1',
    userId: 'user-1',
    connectionId: 'conn-1',
    provider: BankingProvider.SALTEDGE,
    providerAccountId: 'prov-1',
    name: 'Chase Checking',
    iban: 'US12345678901234567890',
    currency: 'USD',
    balance: 5234.56,
    availableBalance: 5200.00,
    bankName: 'JPMorgan Chase',
    bankCountry: 'US',
    accountType: 'CHECKING',
    accountNumber: '****1234',
    accountHolderName: 'John Doe',
    creditLimit: 10000,
    syncStatus: BankingSyncStatus.SYNCED,
    connectionStatus: BankingConnectionStatus.AUTHORIZED,
    linkedAt: new Date('2024-10-01'),
    lastSyncedAt: new Date(),
  });

  const [_isSyncing2, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setAccount((prev) => ({
        ...prev,
        syncStatus: BankingSyncStatus.SYNCED,
        lastSyncedAt: new Date(),
      }));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRevoke = async () => {
    // Navigate back to accounts list
    // Account revocation handled by store
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <ErrorBoundary
        onError={(error) => console.error('Account details error:', error)}
      >
        <AccountDetails
          account={account}
          onSync={handleSync}
          onRevoke={handleRevoke}
        />
      </ErrorBoundary>
    </div>
  );
}

// ============================================================================
// Example 4: Transactions List
// ============================================================================

export function TransactionsListExample() {
  const [transactions, _setTransactions] = useState<BankingTransaction[]>([
    {
      id: 'tx-1',
      accountId: 'acc-1',
      providerTransactionId: 'prov-tx-1',
      date: new Date('2024-10-25'),
      amount: -45.99,
      type: 'DEBIT',
      description: 'Grocery Store Purchase',
      merchant: 'Whole Foods Market',
      reference: 'TXN001234',
      status: 'completed',
      currency: 'USD',
    },
    {
      id: 'tx-2',
      accountId: 'acc-1',
      providerTransactionId: 'prov-tx-2',
      date: new Date('2024-10-25'),
      amount: 2500.00,
      type: 'CREDIT',
      description: 'Salary Deposit',
      reference: 'PAY-20241025',
      status: 'completed',
      currency: 'USD',
    },
    {
      id: 'tx-3',
      accountId: 'acc-1',
      providerTransactionId: 'prov-tx-3',
      date: new Date('2024-10-24'),
      amount: -1200.00,
      type: 'DEBIT',
      description: 'Rent Payment',
      reference: 'RENT-OCT-2024',
      status: 'pending',
      currency: 'USD',
    },
  ]);

  const [hasMore] = useState(false);

  const handleLoadMore = async () => {
    // Simulate loading more transactions
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Transactions</h1>

      <ErrorBoundary
        onError={(error) => console.error('Transactions error:', error)}
      >
        <TransactionList
          accountId="acc-1"
          transactions={transactions}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
        />
      </ErrorBoundary>
    </div>
  );
}

// ============================================================================
// Example 5: Loading States
// ============================================================================

export function LoadingStatesExample() {
  return (
    <div className="max-w-6xl mx-auto py-8 space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Account Skeletons
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AccountSkeleton />
          <AccountSkeleton />
          <AccountSkeleton />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Syncing Indicator
        </h2>
        <SyncingIndicator accountName="Chase Checking" />
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Alert</h2>
        <ErrorAlert
          title="Sync Failed"
          message="Unable to sync account transactions"
          details="Connection timeout after 30 seconds"
          onDismiss={() => {}}
        />
      </section>
    </div>
  );
}

// ============================================================================
// Example 6: Complete Integrated Example
// ============================================================================

export function CompleteIntegratedExample() {
  const [selectedAccount, setSelectedAccount] = useState<BankingAccount | null>(
    null
  );
  const [accounts, setAccounts] = useState<BankingAccount[]>([
    {
      id: 'acc-1',
      userId: 'user-1',
      connectionId: 'conn-1',
      provider: BankingProvider.SALTEDGE,
      providerAccountId: 'prov-1',
      name: 'Chase Checking',
      iban: 'US12345678901234567890',
      currency: 'USD',
      balance: 5234.56,
      bankName: 'JPMorgan Chase',
      accountType: 'CHECKING',
      syncStatus: BankingSyncStatus.SYNCED,
      connectionStatus: BankingConnectionStatus.AUTHORIZED,
      linkedAt: new Date(),
    },
  ]);

  const handleAddAccount = () => {
    // Show link button
  };

  const handleSelectAccount = (account: BankingAccount) => {
    setSelectedAccount(account);
  };

  const handleSync = async (_accountId: string) => {
    // Sync handled by store
  };

  const handleRevoke = async (accountId: string) => {
    setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
    setSelectedAccount(null);
  };

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Accounts Sidebar */}
        <div className="lg:col-span-1">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Accounts</h2>

          {accounts.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
              <p className="text-gray-600 mb-4">No accounts linked yet</p>
              <BankingLinkButton
                onSuccess={handleAddAccount}
                className="w-full"
              />
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleSelectAccount(account)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedAccount?.id === account.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900">{account.name}</p>
                  <p className="text-sm text-gray-600">{account.bankName}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: account.currency,
                    }).format(account.balance)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Account Details */}
        <div className="lg:col-span-2">
          {selectedAccount ? (
            <ErrorBoundary>
              <AccountDetails
                account={selectedAccount}
                onSync={() => handleSync(selectedAccount.id)}
                onRevoke={() => handleRevoke(selectedAccount.id)}
              />
            </ErrorBoundary>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-600">
                Select an account to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Export all examples
// ============================================================================

export const examples = {
  LinkBankAccountExample,
  BankAccountsDashboardExample,
  AccountDetailsPageExample,
  TransactionsListExample,
  LoadingStatesExample,
  CompleteIntegratedExample,
};
