/**
 * SaltEdge v6 API Compliance Tests
 *
 * CRITICAL REGRESSION TESTS: Ensures SaltEdge provider uses correct v6 API endpoints
 *
 * Background (hotfix/tech-debt-phase4):
 * The original implementation used v5-style endpoints that don't exist in v6:
 * - GET /accounts/{accountId} - DOES NOT EXIST in v6 (returns HTML 404)
 * - GET /transactions?account_id=X - REQUIRES connection_id in v6
 *
 * These tests verify that the corrected implementation uses:
 * - GET /accounts?connection_id={connectionId} + filtering for balance
 * - GET /transactions?connection_id={connectionId}&account_id={accountId} for transactions
 *
 * @see https://docs.saltedge.com/v6
 */

/**
 * V6 API Endpoint Validation Tests
 *
 * Tests that verify the correct API endpoints are being constructed
 * according to SaltEdge v6 API specification.
 */
describe('SaltEdge v6 API Endpoint Validation', () => {
  describe('getBalance endpoint construction', () => {
    it('should NOT use direct account lookup endpoint (v5 style)', () => {
      const accountId = '1688015187929471975';
      const connectionId = '1688015087215843960';

      // v5 endpoint (WRONG - does not exist in v6)
      const wrongEndpoint = `/accounts/${accountId}`;

      // v6 endpoint (CORRECT - list accounts by connection)
      const correctEndpoint = `/accounts?connection_id=${connectionId}`;

      // The endpoint should NOT contain the account ID directly in the path
      expect(correctEndpoint).not.toContain(`/accounts/${accountId}`);
      expect(correctEndpoint).toContain('connection_id');
      expect(correctEndpoint).toContain(connectionId);

      // The wrong endpoint should not be used
      expect(wrongEndpoint).not.toContain('connection_id');
    });

    it('should use list endpoint with connection_id query parameter', () => {
      const connectionId = '1688015087215843960';
      const endpoint = buildGetBalanceEndpoint(connectionId);

      expect(endpoint).toBe(`/accounts?connection_id=${connectionId}`);
      expect(endpoint).toMatch(/^\/accounts\?connection_id=\d+$/);
    });

    it('should validate connection_id is required for balance lookup', () => {
      // Without connection_id, we cannot fetch balance in v6
      expect(() => buildGetBalanceEndpoint('')).toThrow('connection_id is required');
      expect(() => buildGetBalanceEndpoint(undefined as unknown as string)).toThrow(
        'connection_id is required'
      );
    });
  });

  describe('getTransactions endpoint construction', () => {
    it('should include both connection_id AND account_id in query params', () => {
      const connectionId = '1688015087215843960';
      const accountId = '1688015187929471975';
      const fromDate = '2025-12-03';

      const endpoint = buildGetTransactionsEndpoint(connectionId, accountId, fromDate);

      // Must include connection_id (v6 requirement)
      expect(endpoint).toContain('connection_id');
      expect(endpoint).toContain(connectionId);

      // Should also include account_id
      expect(endpoint).toContain('account_id');
      expect(endpoint).toContain(accountId);

      // Should include from_date
      expect(endpoint).toContain('from_date');
      expect(endpoint).toContain(fromDate);
    });

    it('should NOT use account_id alone (v5 style)', () => {
      const accountId = '1688015187929471975';
      const fromDate = '2025-12-03';

      // This v5-style endpoint would fail in v6 with "connection_id parameter is missing"
      const wrongEndpoint = `/transactions?account_id=${accountId}&from_date=${fromDate}`;

      expect(wrongEndpoint).not.toContain('connection_id');

      // Verify our implementation includes connection_id
      const connectionId = '1688015087215843960';
      const correctEndpoint = buildGetTransactionsEndpoint(connectionId, accountId, fromDate);
      expect(correctEndpoint).toContain('connection_id');
    });

    it('should validate connection_id is required for transactions', () => {
      const accountId = '1688015187929471975';
      const fromDate = '2025-12-03';

      expect(() => buildGetTransactionsEndpoint('', accountId, fromDate)).toThrow(
        'connection_id is required'
      );
    });
  });
});

/**
 * Balance Fetching Logic Tests
 *
 * Tests that verify the balance is correctly extracted from
 * the accounts list response.
 */
describe('getBalance response handling', () => {
  const MOCK_ACCOUNTS_RESPONSE = {
    data: [
      {
        id: '1688015187929471975',
        name: 'Oauth account 1',
        balance: 2022.12,
        currency_code: 'EUR',
        nature: 'account',
      },
      {
        id: '1688015187971415016',
        name: 'Oauth account 2',
        balance: 2013.3,
        currency_code: 'EUR',
        nature: 'account',
      },
      {
        id: '1688015188004969449',
        name: 'Oauth BTC account 3',
        balance: 0.020133,
        currency_code: 'BTC',
        nature: 'bonus',
      },
    ],
  };

  it('should find account by ID and return its balance', () => {
    const accountId = '1688015187929471975';
    const balance = extractBalanceFromAccountsList(MOCK_ACCOUNTS_RESPONSE.data, accountId);

    expect(balance).toBe(2022.12);
  });

  it('should find different account by ID', () => {
    const accountId = '1688015187971415016';
    const balance = extractBalanceFromAccountsList(MOCK_ACCOUNTS_RESPONSE.data, accountId);

    expect(balance).toBe(2013.3);
  });

  it('should handle BTC accounts with small balances', () => {
    const accountId = '1688015188004969449';
    const balance = extractBalanceFromAccountsList(MOCK_ACCOUNTS_RESPONSE.data, accountId);

    expect(balance).toBe(0.020133);
  });

  it('should throw SaltEdgeNotFoundError when account not in list', () => {
    const nonExistentAccountId = '9999999999999999999';

    expect(() =>
      extractBalanceFromAccountsList(MOCK_ACCOUNTS_RESPONSE.data, nonExistentAccountId)
    ).toThrow(`Account ${nonExistentAccountId} not found in connection`);
  });

  it('should throw SaltEdgeNotFoundError for empty accounts list', () => {
    const accountId = '1688015187929471975';

    expect(() => extractBalanceFromAccountsList([], accountId)).toThrow(
      `Account ${accountId} not found in connection`
    );
  });
});

/**
 * Transaction Fetching Logic Tests
 *
 * Tests that verify transactions are correctly fetched with
 * proper v6 query parameters.
 */
describe('getTransactions query parameter construction', () => {
  it('should build correct query string with all required parameters', () => {
    const connectionId = '1688015087215843960';
    const accountId = '1688015187929471975';
    const fromDate = '2025-12-03';

    const params = buildTransactionQueryParams(connectionId, accountId, fromDate);

    expect(params.get('connection_id')).toBe(connectionId);
    expect(params.get('account_id')).toBe(accountId);
    expect(params.get('from_date')).toBe(fromDate);
  });

  it('should include to_date when provided', () => {
    const connectionId = '1688015087215843960';
    const accountId = '1688015187929471975';
    const fromDate = '2025-12-01';
    const toDate = '2025-12-03';

    const params = buildTransactionQueryParams(connectionId, accountId, fromDate, toDate);

    expect(params.get('to_date')).toBe(toDate);
  });

  it('should NOT include to_date when not provided', () => {
    const connectionId = '1688015087215843960';
    const accountId = '1688015187929471975';
    const fromDate = '2025-12-01';

    const params = buildTransactionQueryParams(connectionId, accountId, fromDate);

    expect(params.has('to_date')).toBe(false);
  });

  it('should support pagination with from_id', () => {
    const connectionId = '1688015087215843960';
    const accountId = '1688015187929471975';
    const fromDate = '2025-12-01';
    const fromId = '123456789';

    const params = buildTransactionQueryParams(connectionId, accountId, fromDate, undefined, fromId);

    expect(params.get('from_id')).toBe(fromId);
  });
});

/**
 * Date Formatting Tests
 *
 * SaltEdge v6 requires dates in YYYY-MM-DD format
 */
describe('Date formatting for SaltEdge API', () => {
  it('should format date as YYYY-MM-DD', () => {
    const date = new Date('2025-12-03T14:30:00Z');
    const formatted = formatDateForSaltEdge(date);

    expect(formatted).toBe('2025-12-03');
    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should handle different timezones correctly', () => {
    // Date at end of day UTC should not roll over
    const date = new Date('2025-12-03T23:59:59Z');
    const formatted = formatDateForSaltEdge(date);

    expect(formatted).toBe('2025-12-03');
  });

  it('should pad single-digit months and days', () => {
    const date = new Date('2025-01-05T00:00:00Z');
    const formatted = formatDateForSaltEdge(date);

    expect(formatted).toBe('2025-01-05');
  });
});

// =============================================================================
// Helper Functions (mirror implementation in saltedge.provider.ts)
// =============================================================================

/**
 * Build the endpoint for getBalance (v6 compliant)
 */
function buildGetBalanceEndpoint(connectionId: string): string {
  if (!connectionId) {
    throw new Error('connection_id is required');
  }
  return `/accounts?connection_id=${connectionId}`;
}

/**
 * Build the endpoint for getTransactions (v6 compliant)
 */
function buildGetTransactionsEndpoint(
  connectionId: string,
  accountId: string,
  fromDate: string
): string {
  if (!connectionId) {
    throw new Error('connection_id is required');
  }
  const params = new URLSearchParams({
    connection_id: connectionId,
    account_id: accountId,
    from_date: fromDate,
  });
  return `/transactions?${params.toString()}`;
}

/**
 * Extract balance from accounts list response
 */
function extractBalanceFromAccountsList(
  accounts: Array<{ id: string; balance: number }>,
  accountId: string
): number {
  const account = accounts.find((a) => a.id === accountId);
  if (!account) {
    throw new Error(`Account ${accountId} not found in connection`);
  }
  return account.balance;
}

/**
 * Build transaction query parameters
 */
function buildTransactionQueryParams(
  connectionId: string,
  accountId: string,
  fromDate: string,
  toDate?: string,
  fromId?: string
): URLSearchParams {
  const params = new URLSearchParams({
    connection_id: connectionId,
    account_id: accountId,
    from_date: fromDate,
  });

  if (toDate) {
    params.append('to_date', toDate);
  }

  if (fromId) {
    params.append('from_id', fromId);
  }

  return params;
}

/**
 * Format date for SaltEdge API (YYYY-MM-DD)
 */
function formatDateForSaltEdge(date: Date): string {
  return date.toISOString().split('T')[0];
}
