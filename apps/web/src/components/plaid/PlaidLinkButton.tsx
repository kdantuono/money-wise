'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Plus,
  Bank,
  CheckCircle,
  AlertCircle,
  Sync,
  X,
} from 'lucide-react';
import { usePlaidBanking } from '@/hooks/usePlaidLink';

interface PlaidLinkButtonProps {
  userId: string;
  onSuccess?: () => void;
  className?: string;
}

interface PlaidAccount {
  id: string;
  plaidAccountId: string;
  institutionName: string;
  accountName: string;
  accountType: string;
  accountSubtype: string;
  currentBalance: number;
  availableBalance: number;
  currencyCode: string;
  lastSyncAt: Date;
  createdAt: Date;
  transactionCount: number;
}

export const PlaidLinkButton: React.FC<PlaidLinkButtonProps> = ({
  userId,
  onSuccess,
  className = '',
}) => {
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    initializePlaidLink,
    open,
    ready,
    accounts,
    fetchAccounts,
    syncTransactions,
    disconnectAccount,
    loading,
    error,
    setError,
  } = usePlaidBanking({
    userId,
    onSuccess: (publicToken, metadata) => {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      onSuccess?.();
    },
    onExit: (error, metadata) => {
      if (error) {
        console.error('Plaid Link Error:', error);
      }
    },
  });

  const handleConnectBank = async () => {
    try {
      if (!ready) {
        await initializePlaidLink();
      }
      setTimeout(() => open(), 100); // Small delay to ensure token is set
    } catch (err) {
      console.error('Error initializing Plaid Link:', err);
    }
  };

  const handleSyncTransactions = async (accountId: string) => {
    try {
      await syncTransactions(accountId);
      await fetchAccounts(); // Refresh to show updated sync time
    } catch (err) {
      console.error('Error syncing transactions:', err);
    }
  };

  const handleDisconnectAccount = async (accountId: string) => {
    if (confirm('Are you sure you want to disconnect this account?')) {
      try {
        await disconnectAccount(accountId);
      } catch (err) {
        console.error('Error disconnecting account:', err);
      }
    }
  };

  const formatBalance = (balance: number, currencyCode: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(balance);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAccountTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'depository':
        return 'bg-blue-100 text-blue-800';
      case 'credit':
        return 'bg-red-100 text-red-800';
      case 'investment':
        return 'bg-green-100 text-green-800';
      case 'loan':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Success Alert */}
      {showSuccess && (
        <Alert className='border-green-200 bg-green-50'>
          <CheckCircle className='h-4 w-4 text-green-600' />
          <AlertDescription className='text-green-800'>
            Bank account connected successfully! Your transactions are being
            synced.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            {error}
            <Button
              variant='ghost'
              size='sm'
              className='ml-2 h-auto p-0 text-destructive hover:text-destructive/80'
              onClick={() => setError(null)}
            >
              <X className='h-3 w-3' />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Connect Bank Button */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Bank className='h-5 w-5' />
            Bank Connections
          </CardTitle>
          <CardDescription>
            Connect your bank accounts to automatically track transactions and
            manage your finances.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleConnectBank}
            disabled={loading}
            className='w-full sm:w-auto'
          >
            {loading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Connecting...
              </>
            ) : (
              <>
                <Plus className='mr-2 h-4 w-4' />
                Connect Bank Account
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      {accounts.length > 0 && (
        <div className='space-y-4'>
          <h3 className='text-lg font-semibold'>Connected Accounts</h3>
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {accounts.map((account: PlaidAccount) => (
              <Card key={account.id} className='relative'>
                <CardHeader className='pb-3'>
                  <div className='flex items-start justify-between'>
                    <div className='space-y-1'>
                      <CardTitle className='text-base'>
                        {account.accountName}
                      </CardTitle>
                      <CardDescription className='text-sm'>
                        {account.institutionName}
                      </CardDescription>
                    </div>
                    <Badge className={getAccountTypeColor(account.accountType)}>
                      {account.accountType}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {/* Balance Information */}
                  <div className='space-y-2'>
                    <div className='flex justify-between text-sm'>
                      <span className='text-muted-foreground'>
                        Current Balance:
                      </span>
                      <span className='font-medium'>
                        {formatBalance(
                          account.currentBalance,
                          account.currencyCode
                        )}
                      </span>
                    </div>
                    {account.availableBalance !== null && (
                      <div className='flex justify-between text-sm'>
                        <span className='text-muted-foreground'>
                          Available:
                        </span>
                        <span className='font-medium'>
                          {formatBalance(
                            account.availableBalance,
                            account.currencyCode
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Transaction Count */}
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>Transactions:</span>
                    <span className='font-medium'>
                      {account.transactionCount}
                    </span>
                  </div>

                  {/* Last Sync */}
                  <div className='text-xs text-muted-foreground'>
                    Last synced: {formatDate(account.lastSyncAt)}
                  </div>

                  {/* Actions */}
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        handleSyncTransactions(account.plaidAccountId)
                      }
                      disabled={loading}
                      className='flex-1'
                    >
                      {loading ? (
                        <Loader2 className='h-3 w-3 animate-spin' />
                      ) : (
                        <Sync className='h-3 w-3' />
                      )}
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleDisconnectAccount(account.id)}
                      disabled={loading}
                      className='flex-1 text-destructive hover:text-destructive'
                    >
                      Disconnect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Loading State for Account List */}
      {loading && accounts.length === 0 && (
        <Card>
          <CardContent className='flex items-center justify-center py-8'>
            <div className='flex items-center gap-2 text-muted-foreground'>
              <Loader2 className='h-4 w-4 animate-spin' />
              Loading accounts...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && accounts.length === 0 && !error && (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-8 text-center'>
            <Bank className='h-12 w-12 text-muted-foreground mb-4' />
            <h3 className='text-lg font-semibold mb-2'>
              No Connected Accounts
            </h3>
            <p className='text-muted-foreground mb-4'>
              Connect your first bank account to start tracking your finances
              automatically.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
