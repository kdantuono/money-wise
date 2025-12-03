/**
 * SaltEdge Provider Unit Tests
 *
 * COMPREHENSIVE REGRESSION TESTS: Ensures SaltEdge provider implementation
 * correctly uses v6 API patterns and handles errors appropriately.
 *
 * These tests mock the HTTP layer (axios) to validate:
 * 1. Correct API endpoints are called (v6 compliance)
 * 2. Proper query parameters are passed
 * 3. Response data is correctly mapped
 * 4. Error handling works as expected
 *
 * @see https://docs.saltedge.com/v6
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { SaltEdgeProvider, SaltEdgeNotFoundError } from '../../../../src/banking/providers/saltedge.provider';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SaltEdgeProvider', () => {
  let provider: SaltEdgeProvider;
  let mockAxiosInstance: any;

  const mockConfig = {
    SALTEDGE_APP_ID: 'test-app-id',
    SALTEDGE_SECRET: 'test-secret',
    SALTEDGE_BASE_URL: 'https://www.saltedge.com/api/v6',
    SALTEDGE_PRIVATE_KEY_PATH: undefined,
  };

  beforeAll(async () => {
    // Create mock axios instance
    mockAxiosInstance = {
      request: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaltEdgeProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key as keyof typeof mockConfig]),
            getOrThrow: jest.fn((key: string) => {
              const value = mockConfig[key as keyof typeof mockConfig];
              if (!value && key !== 'SALTEDGE_PRIVATE_KEY_PATH') throw new Error(`Missing config: ${key}`);
              return value;
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<SaltEdgeProvider>(SaltEdgeProvider);

    // Mock the generateSignature private method to bypass RSA signing
    // This is necessary because we don't have a real private key in tests
    jest.spyOn(provider as any, 'generateSignature').mockReturnValue({
      signature: 'mock-signature',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    });
  });

  beforeEach(() => {
    mockAxiosInstance.request.mockReset();
    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // =============================================================================
  // getBalance Tests - v6 API Compliance
  // =============================================================================

  describe('getBalance', () => {
    const connectionId = '1688015087215843960';
    const accountId = '1688015187929471975';

    const mockAccountsResponse = {
      data: [
        {
          id: '1688015187929471975',
          name: 'Oauth account 1',
          balance: 2022.12,
          currency_code: 'EUR',
          nature: 'account',
          connection_id: connectionId,
        },
        {
          id: '1688015187971415016',
          name: 'Oauth account 2',
          balance: 2013.30,
          currency_code: 'EUR',
          nature: 'account',
          connection_id: connectionId,
        },
      ],
    };

    it('should use v6 list endpoint with connection_id (NOT v5 direct lookup)', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: mockAccountsResponse,
      });

      await provider.getBalance(connectionId, accountId);

      // Verify the correct v6 endpoint was called
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
      const callArgs = mockAxiosInstance.request.mock.calls[0][0];

      // CRITICAL: Should use list endpoint with connection_id
      expect(callArgs.url).toContain('/accounts?connection_id=');
      expect(callArgs.url).toContain(connectionId);

      // CRITICAL: Should NOT use direct account lookup (v5 style)
      expect(callArgs.url).not.toMatch(/\/accounts\/\d+$/);
    });

    it('should return correct balance for specified account', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: mockAccountsResponse,
      });

      const balance = await provider.getBalance(connectionId, accountId);

      expect(balance).toBe(2022.12);
    });

    it('should return balance for different account in same connection', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: mockAccountsResponse,
      });

      const balance = await provider.getBalance(connectionId, '1688015187971415016');

      expect(balance).toBe(2013.30);
    });

    it('should throw SaltEdgeNotFoundError when account not in connection', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: mockAccountsResponse,
      });

      const nonExistentAccountId = '9999999999999999999';

      await expect(provider.getBalance(connectionId, nonExistentAccountId))
        .rejects.toThrow(SaltEdgeNotFoundError);
    });

    it('should throw SaltEdgeNotFoundError when accounts list is empty', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: { data: [] },
      });

      await expect(provider.getBalance(connectionId, accountId))
        .rejects.toThrow(SaltEdgeNotFoundError);
    });

    it('should handle API errors gracefully', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 401,
        data: {
          error: {
            class: 'InvalidCredentials',
            message: 'Invalid API credentials',
          },
        },
      });

      await expect(provider.getBalance(connectionId, accountId))
        .rejects.toThrow('SaltEdge API error');
    });
  });

  // =============================================================================
  // getTransactions Tests - v6 API Compliance
  // =============================================================================

  describe('getTransactions', () => {
    const connectionId = '1688015087215843960';
    const accountId = '1688015187929471975';
    const fromDate = new Date('2025-12-01');
    const toDate = new Date('2025-12-03');

    const mockTransactionsResponse = {
      data: [
        {
          id: 'tx-001',
          account_id: accountId,
          made_on: '2025-12-01',
          amount: -50.00,
          currency_code: 'EUR',
          description: 'Grocery store',
          category: 'food_and_groceries',
          status: 'posted',
          duplicated: false,
          mode: 'normal',
        },
        {
          id: 'tx-002',
          account_id: accountId,
          made_on: '2025-12-02',
          amount: 1500.00,
          currency_code: 'EUR',
          description: 'Salary',
          category: 'income',
          status: 'posted',
          duplicated: false,
          mode: 'normal',
        },
      ],
      meta: {},
    };

    it('should include connection_id in query params (v6 requirement)', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: mockTransactionsResponse,
      });

      await provider.getTransactions(connectionId, accountId, fromDate);

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
      const callArgs = mockAxiosInstance.request.mock.calls[0][0];

      // CRITICAL: Must include connection_id (v6 requirement)
      expect(callArgs.url).toContain('connection_id=');
      expect(callArgs.url).toContain(connectionId);
    });

    it('should include account_id in query params', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: mockTransactionsResponse,
      });

      await provider.getTransactions(connectionId, accountId, fromDate);

      const callArgs = mockAxiosInstance.request.mock.calls[0][0];
      expect(callArgs.url).toContain('account_id=');
      expect(callArgs.url).toContain(accountId);
    });

    it('should include from_date in YYYY-MM-DD format', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: mockTransactionsResponse,
      });

      await provider.getTransactions(connectionId, accountId, fromDate);

      const callArgs = mockAxiosInstance.request.mock.calls[0][0];
      expect(callArgs.url).toContain('from_date=2025-12-01');
    });

    it('should include to_date when provided', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: mockTransactionsResponse,
      });

      await provider.getTransactions(connectionId, accountId, fromDate, toDate);

      const callArgs = mockAxiosInstance.request.mock.calls[0][0];
      expect(callArgs.url).toContain('to_date=2025-12-03');
    });

    it('should NOT include to_date when not provided', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: mockTransactionsResponse,
      });

      await provider.getTransactions(connectionId, accountId, fromDate);

      const callArgs = mockAxiosInstance.request.mock.calls[0][0];
      expect(callArgs.url).not.toContain('to_date=');
    });

    it('should return mapped transactions', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: mockTransactionsResponse,
      });

      const transactions = await provider.getTransactions(connectionId, accountId, fromDate);

      expect(transactions).toHaveLength(2);
      expect(transactions[0]).toHaveProperty('id');
      expect(transactions[0]).toHaveProperty('amount');
      expect(transactions[0]).toHaveProperty('description');
    });

    it('should handle pagination with from_id', async () => {
      // First page with next_id
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: {
          data: [mockTransactionsResponse.data[0]],
          meta: { next_id: 'page-2-id' },
        },
      });

      // Second page (last)
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: {
          data: [mockTransactionsResponse.data[1]],
          meta: {},
        },
      });

      const transactions = await provider.getTransactions(connectionId, accountId, fromDate);

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
      expect(transactions).toHaveLength(2);

      // Second call should include from_id
      const secondCallArgs = mockAxiosInstance.request.mock.calls[1][0];
      expect(secondCallArgs.url).toContain('from_id=page-2-id');
    });

    it('should handle empty transactions response', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: { data: [], meta: {} },
      });

      const transactions = await provider.getTransactions(connectionId, accountId, fromDate);

      expect(transactions).toEqual([]);
    });
  });

  // =============================================================================
  // getAccounts Tests
  // =============================================================================

  describe('getAccounts', () => {
    const connectionId = '1688015087215843960';

    const mockAccountsResponse = {
      data: [
        {
          id: '1688015187929471975',
          name: 'Oauth account 1',
          balance: 2022.12,
          currency_code: 'EUR',
          nature: 'account',
          connection_id: connectionId,
          extra: {
            iban: 'DE89370400440532013000',
          },
        },
      ],
    };

    it('should use connection_id in endpoint', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: mockAccountsResponse,
      });

      await provider.getAccounts(connectionId);

      const callArgs = mockAxiosInstance.request.mock.calls[0][0];
      expect(callArgs.url).toContain(`/accounts?connection_id=${connectionId}`);
    });

    it('should return mapped accounts', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: mockAccountsResponse,
      });

      const accounts = await provider.getAccounts(connectionId);

      expect(accounts).toHaveLength(1);
      expect(accounts[0]).toHaveProperty('id');
      expect(accounts[0]).toHaveProperty('name');
      expect(accounts[0]).toHaveProperty('balance');
      expect(accounts[0]).toHaveProperty('currency');
    });
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  describe('Error Handling', () => {
    it('should distinguish HTML 404 from API 404', async () => {
      // HTML 404 - indicates wrong endpoint (like v5 direct account lookup)
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 404,
        data: '<!DOCTYPE html><html><body>404 Not Found</body></html>',
      });

      // Should throw generic error, not SaltEdgeNotFoundError
      await expect(provider.getBalance('conn-123', 'acc-456'))
        .rejects.toThrow();

      // Should not be SaltEdgeNotFoundError (which would trigger cleanup)
      try {
        mockAxiosInstance.request.mockResolvedValueOnce({
          status: 404,
          data: '<!DOCTYPE html><html><body>404 Not Found</body></html>',
        });
        await provider.getBalance('conn-123', 'acc-456');
      } catch (error) {
        expect(error).not.toBeInstanceOf(SaltEdgeNotFoundError);
      }
    });

    it('should handle JSON API 404 (resource not found) as SaltEdgeNotFoundError', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 404,
        data: {
          error: {
            class: 'ConnectionNotFound',
            message: 'Connection not found',
          },
        },
      });

      await expect(provider.getBalance('non-existent', 'acc-456'))
        .rejects.toThrow(SaltEdgeNotFoundError);
    });

    it('should handle rate limiting (429)', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 429,
        data: {
          error: {
            class: 'RateLimitExceeded',
            message: 'Too many requests',
          },
        },
      });

      await expect(provider.getBalance('conn-123', 'acc-456'))
        .rejects.toThrow('RateLimitExceeded');
    });

    it('should handle server errors (500)', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 500,
        data: {
          error: {
            class: 'InternalServerError',
            message: 'Internal server error',
          },
        },
      });

      await expect(provider.getBalance('conn-123', 'acc-456'))
        .rejects.toThrow('InternalServerError');
    });
  });

  // =============================================================================
  // Provider Type Tests
  // =============================================================================

  describe('Provider Identification', () => {
    it('should return SALTEDGE as provider type', () => {
      expect(provider.getProviderType()).toBe('SALTEDGE');
    });
  });
});

// =============================================================================
// SaltEdgeNotFoundError Tests
// =============================================================================

describe('SaltEdgeNotFoundError', () => {
  it('should create error with resource type and ID', () => {
    const error = new SaltEdgeNotFoundError('Account not found', 'account', 'acc-123');

    expect(error.message).toBe('Account not found');
    expect(error.resourceType).toBe('account');
    expect(error.resourceId).toBe('acc-123');
    expect(error.name).toBe('SaltEdgeNotFoundError');
  });

  it('should be instance of Error', () => {
    const error = new SaltEdgeNotFoundError('Test', 'account', '123');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SaltEdgeNotFoundError);
  });

  it('should have statusCode 404', () => {
    const error = new SaltEdgeNotFoundError('Test', 'connection', '123');

    expect(error.statusCode).toBe(404);
  });

  it('should support all resource types', () => {
    const accountError = new SaltEdgeNotFoundError('Not found', 'account', '1');
    const connectionError = new SaltEdgeNotFoundError('Not found', 'connection', '2');
    const customerError = new SaltEdgeNotFoundError('Not found', 'customer', '3');
    const unknownError = new SaltEdgeNotFoundError('Not found', 'unknown', '4');

    expect(accountError.resourceType).toBe('account');
    expect(connectionError.resourceType).toBe('connection');
    expect(customerError.resourceType).toBe('customer');
    expect(unknownError.resourceType).toBe('unknown');
  });
});

// =============================================================================
// Integration Scenario Tests
// =============================================================================

describe('SaltEdge Provider - Integration Scenarios', () => {
  let provider: SaltEdgeProvider;
  let mockAxiosInstance: any;

  beforeAll(async () => {
    mockAxiosInstance = {
      request: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaltEdgeProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => ({
              SALTEDGE_APP_ID: 'test-app-id',
              SALTEDGE_SECRET: 'test-secret',
              SALTEDGE_BASE_URL: 'https://www.saltedge.com/api/v6',
              SALTEDGE_PRIVATE_KEY_PATH: undefined,
            }[key])),
            getOrThrow: jest.fn((key: string) => {
              const config: Record<string, string | undefined> = {
                SALTEDGE_APP_ID: 'test-app-id',
                SALTEDGE_SECRET: 'test-secret',
                SALTEDGE_BASE_URL: 'https://www.saltedge.com/api/v6',
                SALTEDGE_PRIVATE_KEY_PATH: undefined,
              };
              return config[key] || '';
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<SaltEdgeProvider>(SaltEdgeProvider);

    // Mock the generateSignature private method to bypass RSA signing
    jest.spyOn(provider as any, 'generateSignature').mockReturnValue({
      signature: 'mock-signature',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    });
  });

  beforeEach(() => {
    mockAxiosInstance.request.mockReset();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  describe('Full sync flow scenario', () => {
    const connectionId = '1688015087215843960';
    const accountId = '1688015187929471975';

    it('should successfully fetch balance and transactions in sequence', async () => {
      // Setup: Mock balance fetch (via accounts list)
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: {
          data: [
            {
              id: accountId,
              name: 'Test Account',
              balance: 1500.00,
              currency_code: 'EUR',
              nature: 'account',
            },
          ],
        },
      });

      // Setup: Mock transactions fetch
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: {
          data: [
            {
              id: 'tx-001',
              account_id: accountId,
              made_on: '2025-12-01',
              amount: -100.00,
              currency_code: 'EUR',
              description: 'Test transaction',
              category: 'shopping',
              status: 'posted',
              duplicated: false,
              mode: 'normal',
            },
          ],
          meta: {},
        },
      });

      // Execute: Sync flow
      const balance = await provider.getBalance(connectionId, accountId);
      const transactions = await provider.getTransactions(
        connectionId,
        accountId,
        new Date('2025-12-01'),
      );

      // Verify
      expect(balance).toBe(1500.00);
      expect(transactions).toHaveLength(1);
      // The provider may transform the amount (e.g., absolute value)
      // We verify it has a value from the mocked response
      expect(Math.abs(transactions[0].amount)).toBe(100.00);

      // Verify both API calls used connection_id (v6 compliance)
      const balanceCall = mockAxiosInstance.request.mock.calls[0][0];
      const transactionsCall = mockAxiosInstance.request.mock.calls[1][0];

      expect(balanceCall.url).toContain('connection_id=');
      expect(transactionsCall.url).toContain('connection_id=');
    });

    it('should handle account deletion during sync gracefully', async () => {
      // First call succeeds (accounts exist)
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: {
          data: [
            {
              id: accountId,
              name: 'Test Account',
              balance: 1500.00,
              currency_code: 'EUR',
              nature: 'account',
            },
          ],
        },
      });

      // Second call returns empty list (account was deleted)
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: { data: [] },
      });

      // First balance fetch succeeds
      const balance = await provider.getBalance(connectionId, accountId);
      expect(balance).toBe(1500.00);

      // Second balance fetch fails (account deleted)
      await expect(provider.getBalance(connectionId, accountId))
        .rejects.toThrow(SaltEdgeNotFoundError);
    });
  });

  describe('v6 API compliance verification', () => {
    it('should never use v5-style direct account lookup', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        status: 200,
        data: {
          data: [{
            id: 'test-account',
            name: 'Test',
            balance: 100,
            currency_code: 'EUR',
            nature: 'account',
          }],
        },
      });

      // Call getBalance multiple times
      await provider.getBalance('conn-1', 'test-account');
      await provider.getBalance('conn-2', 'test-account');
      await provider.getBalance('conn-3', 'test-account');

      // Verify none of the calls used v5-style direct lookup
      mockAxiosInstance.request.mock.calls.forEach((call: any[]) => {
        const url = call[0].url;
        // v5 style would be: /accounts/{id}
        // v6 style is: /accounts?connection_id={connectionId}
        expect(url).not.toMatch(/\/accounts\/\d+$/);
        expect(url).toMatch(/\/accounts\?connection_id=/);
      });
    });

    it('should never call transactions endpoint without connection_id', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        status: 200,
        data: { data: [], meta: {} },
      });

      // Call getTransactions multiple times
      await provider.getTransactions('conn-1', 'acc-1', new Date());
      await provider.getTransactions('conn-2', 'acc-2', new Date());
      await provider.getTransactions('conn-3', 'acc-3', new Date());

      // Verify all calls include connection_id
      mockAxiosInstance.request.mock.calls.forEach((call: any[]) => {
        const url = call[0].url;
        if (url.includes('/transactions')) {
          expect(url).toContain('connection_id=');
        }
      });
    });
  });
});
