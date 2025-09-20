import { useState, useCallback, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { plaidApi, type PlaidAccount } from '@/lib/api/plaid';

interface PlaidLinkHookProps {
  userId: string;
  onSuccess?: (publicToken: string, metadata: any) => void;
  onExit?: (error: any, metadata: any) => void;
  onEvent?: (eventName: string, metadata: any) => void;
}

export const usePlaidBanking = ({
  userId,
  onSuccess,
  onExit,
  onEvent,
}: PlaidLinkHookProps) => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);

  // Initialize Plaid Link token
  const initializePlaidLink = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await plaidApi.createLinkToken(userId);
      setLinkToken(data.linkToken);
      return data.linkToken;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Handle successful Plaid Link connection
  const handleOnSuccess = useCallback(
    async (publicToken: string, metadata: any) => {
      setLoading(true);

      try {
        const data = await plaidApi.exchangePublicToken(publicToken, metadata);

        // Refresh accounts list
        await fetchAccounts();

        onSuccess?.(publicToken, metadata);
        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to connect bank account';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [onSuccess]
  );

  // Handle Plaid Link exit
  const handleOnExit = useCallback(
    (error: any, metadata: any) => {
      if (error) {
        setError(
          error.display_message ||
            error.error_message ||
            'Connection was cancelled'
        );
      }
      onExit?.(error, metadata);
    },
    [onExit]
  );

  // Handle Plaid Link events
  const handleOnEvent = useCallback(
    (eventName: string, metadata: any) => {
      console.log('Plaid Link Event:', eventName, metadata);
      onEvent?.(eventName, metadata);
    },
    [onEvent]
  );

  // Fetch user's connected accounts
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await plaidApi.getAccounts();
      setAccounts(data);
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch accounts';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync transactions for a specific account
  const syncTransactions = useCallback(async (plaidAccountId: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await plaidApi.syncTransactions(plaidAccountId);
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to sync transactions';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Disconnect an account
  const disconnectAccount = useCallback(
    async (accountId: string) => {
      setLoading(true);
      setError(null);

      try {
        await plaidApi.disconnectAccount(accountId);

        // Refresh accounts list
        await fetchAccounts();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to disconnect account';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchAccounts]
  );

  // Configure Plaid Link
  const config = {
    token: linkToken,
    onSuccess: handleOnSuccess,
    onExit: handleOnExit,
    onEvent: handleOnEvent,
  };

  const { open, ready } = usePlaidLink(config);

  // Auto-fetch accounts on mount
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return {
    // Link management
    initializePlaidLink,
    open,
    ready: ready && !!linkToken,

    // Account management
    accounts,
    fetchAccounts,
    syncTransactions,
    disconnectAccount,

    // State
    loading,
    error,
    setError,
  };
};
