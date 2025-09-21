const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

interface PlaidLinkResponse {
  linkToken: string;
  expiration: string;
  requestId: string;
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

interface PlaidTransaction {
  id: string;
  plaidTransactionId: string;
  amount: number;
  date: Date;
  description: string;
  merchantName: string;
  category: string[];
  transactionType: string;
  isPending: boolean;
  createdAt: Date;
}

interface SyncTransactionsResponse {
  accountId: string;
  transactionsAdded: number;
  transactionsModified: number;
  transactionsRemoved: number;
  lastSyncAt: Date;
  status: string;
}

class PlaidApiClient {
  private getAuthHeaders(): HeadersInit {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('authToken') : '';
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          data.error ||
          `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return data.data || data;
  }

  /**
   * Create a link token for Plaid Link initialization
   */
  async createLinkToken(
    userId: string,
    options?: {
      clientName?: string;
      language?: string;
      countryCodes?: string[];
      products?: string[];
    }
  ): Promise<PlaidLinkResponse> {
    const response = await fetch(`${API_BASE_URL}/plaid/link-token`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        userId,
        ...options,
      }),
    });

    return this.handleResponse<PlaidLinkResponse>(response);
  }

  /**
   * Exchange public token for access token and save account connections
   */
  async exchangePublicToken(
    publicToken: string,
    metadata?: any
  ): Promise<{
    accounts: PlaidAccount[];
    item: any;
    requestId: string;
  }> {
    const response = await fetch(
      `${API_BASE_URL}/plaid/exchange-public-token`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          publicToken,
          metadata,
        }),
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Get all connected bank accounts for the user
   */
  async getAccounts(): Promise<PlaidAccount[]> {
    const response = await fetch(`${API_BASE_URL}/plaid/accounts`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<PlaidAccount[]>(response);
  }

  /**
   * Sync transactions for a specific account
   */
  async syncTransactions(
    plaidAccountId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      count?: number;
    }
  ): Promise<SyncTransactionsResponse> {
    const response = await fetch(`${API_BASE_URL}/plaid/sync-transactions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        plaidAccountId,
        ...options,
      }),
    });

    return this.handleResponse<SyncTransactionsResponse>(response);
  }

  /**
   * Get transactions for a specific account
   */
  async getAccountTransactions(accountId: string): Promise<PlaidTransaction[]> {
    const response = await fetch(
      `${API_BASE_URL}/plaid/accounts/${accountId}/transactions`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    );

    return this.handleResponse<PlaidTransaction[]>(response);
  }

  /**
   * Disconnect a bank account
   */
  async disconnectAccount(accountId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/plaid/accounts/${accountId}/disconnect`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Handle Plaid webhooks for MVP integration (future enhancement)
   */
  async handleWebhook(webhookData: any): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/plaid/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData),
    });

    return this.handleResponse(response);
  }
}

export const plaidApi = new PlaidApiClient();

// Export types for use in components
export type {
  PlaidAccount,
  PlaidTransaction,
  PlaidLinkResponse,
  SyncTransactionsResponse,
  ApiResponse,
};
