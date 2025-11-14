/**
 * Banking Client Unit Tests
 *
 * Tests for banking integration API client.
 * Uses Vitest with mocked fetch.
 *
 * @module services/__tests__/banking.client.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  bankingClient,
  BankingApiError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  ServerError,
  type BankingAccount,
  type InitiateLinkResponse,
  type CompleteLinkResponse,
  type GetAccountsResponse,
  type SyncResponse,
} from '../banking.client';

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Mock fetch globally
global.fetch = vi.fn();

describe('Banking Client', () => {
  const mockAccount: BankingAccount = {
    id: 'acc-1',
    name: 'Test Account',
    balance: 1000,
    currency: 'EUR',
    syncStatus: 'SYNCED',
    linkedAt: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console to avoid cluttering test output
    console.log = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    // Restore console
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('Error Classes', () => {
    it('should create BankingApiError', () => {
      const error = new BankingApiError('Test error', 500, 'TestError');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BankingApiError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.errorType).toBe('TestError');
      expect(error.name).toBe('BankingApiError');
    });

    it('should create AuthenticationError', () => {
      const error = new AuthenticationError();
      expect(error).toBeInstanceOf(BankingApiError);
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toContain('Authentication failed');
    });

    it('should create AuthenticationError with custom message', () => {
      const error = new AuthenticationError('Custom auth error');
      expect(error.message).toBe('Custom auth error');
    });

    it('should create AuthorizationError', () => {
      const error = new AuthorizationError();
      expect(error).toBeInstanceOf(BankingApiError);
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe('AuthorizationError');
    });

    it('should create NotFoundError', () => {
      const error = new NotFoundError();
      expect(error).toBeInstanceOf(BankingApiError);
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('NotFoundError');
    });

    it('should create ValidationError', () => {
      const error = new ValidationError();
      expect(error).toBeInstanceOf(BankingApiError);
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ValidationError');
    });

    it('should create ValidationError with details', () => {
      const details = { field: 'email', issue: 'invalid' };
      const error = new ValidationError('Validation failed', details);
      expect(error.details).toEqual(details);
    });

    it('should create ServerError', () => {
      const error = new ServerError();
      expect(error).toBeInstanceOf(BankingApiError);
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('ServerError');
    });
  });

  describe('initiateLink', () => {
    it('should initiate link successfully', async () => {
      const mockResponse: InitiateLinkResponse = {
        redirectUrl: 'https://bank.com/oauth',
        connectionId: 'conn-123',
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await bankingClient.initiateLink('SALTEDGE');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/banking/initiate-link'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          credentials: 'include',
        })
      );
    });

    it('should initiate link without provider', async () => {
      const mockResponse: InitiateLinkResponse = {
        redirectUrl: 'https://bank.com/oauth',
        connectionId: 'conn-123',
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await bankingClient.initiateLink();

      expect(result).toEqual(mockResponse);
    });

    it('should handle authentication error (401)', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () =>
          JSON.stringify({
            statusCode: 401,
            message: 'Authentication required',
          }),
      });

      await expect(bankingClient.initiateLink()).rejects.toThrow(
        AuthenticationError
      );
    });

    it('should handle validation error (400)', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () =>
          JSON.stringify({
            statusCode: 400,
            message: 'Invalid provider',
          }),
      });

      await expect(bankingClient.initiateLink('INVALID' as any)).rejects.toThrow(
        ValidationError
      );
    });

    it('should handle server error (500)', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () =>
          JSON.stringify({
            statusCode: 500,
            message: 'Server error',
          }),
      });

      await expect(bankingClient.initiateLink()).rejects.toThrow(ServerError);
    });

    it('should handle error with array message', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            statusCode: 400,
            message: ['Error 1', 'Error 2'],
          }),
      });

      await expect(bankingClient.initiateLink()).rejects.toThrow('Error 1, Error 2');
    });

    it('should handle error with empty response body', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => '',
      });

      await expect(bankingClient.initiateLink()).rejects.toThrow(ServerError);
    });

    it('should handle error with invalid JSON', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Invalid JSON',
      });

      await expect(bankingClient.initiateLink()).rejects.toThrow(ServerError);
    });
  });

  describe('completeLink', () => {
    it('should complete link successfully', async () => {
      const mockResponse: CompleteLinkResponse = {
        accounts: [mockAccount],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await bankingClient.completeLink('conn-123');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/banking/complete-link'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ connectionId: 'conn-123' }),
        })
      );
    });

    it('should handle not found error (404)', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () =>
          JSON.stringify({
            statusCode: 404,
            message: 'Connection not found',
          }),
      });

      await expect(bankingClient.completeLink('invalid-id')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should handle authorization error (403)', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () =>
          JSON.stringify({
            statusCode: 403,
            message: 'Access denied',
          }),
      });

      await expect(bankingClient.completeLink('conn-123')).rejects.toThrow(
        AuthorizationError
      );
    });
  });

  describe('getAccounts', () => {
    it('should get accounts successfully', async () => {
      const mockResponse: GetAccountsResponse = {
        accounts: [mockAccount],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await bankingClient.getAccounts();

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/banking/accounts'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );
    });

    it('should handle empty accounts list', async () => {
      const mockResponse: GetAccountsResponse = {
        accounts: [],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await bankingClient.getAccounts();

      expect(result.accounts).toHaveLength(0);
    });

    it('should handle authentication error', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () =>
          JSON.stringify({
            statusCode: 401,
            message: 'Not authenticated',
          }),
      });

      await expect(bankingClient.getAccounts()).rejects.toThrow(
        AuthenticationError
      );
    });
  });

  describe('syncAccount', () => {
    it('should sync account successfully', async () => {
      const mockResponse: SyncResponse = {
        syncLogId: 'log-123',
        status: 'SYNCED',
        transactionsSynced: 10,
        balanceUpdated: true,
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await bankingClient.syncAccount('acc-1');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/banking/sync/acc-1'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });

    it('should handle sync with error in response', async () => {
      const mockResponse: SyncResponse = {
        syncLogId: 'log-123',
        status: 'ERROR',
        transactionsSynced: 0,
        balanceUpdated: false,
        error: 'Sync failed',
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await bankingClient.syncAccount('acc-1');

      expect(result.status).toBe('ERROR');
      expect(result.error).toBe('Sync failed');
    });

    it('should handle sync not found error', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () =>
          JSON.stringify({
            statusCode: 404,
            message: 'Account not found',
          }),
      });

      await expect(bankingClient.syncAccount('invalid-id')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should handle service unavailable error (503)', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () =>
          JSON.stringify({
            statusCode: 503,
            message: 'Service unavailable',
          }),
      });

      await expect(bankingClient.syncAccount('acc-1')).rejects.toThrow(
        ServerError
      );
    });

    it('should handle bad gateway error (502)', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () =>
          JSON.stringify({
            statusCode: 502,
            message: 'Bad gateway',
          }),
      });

      await expect(bankingClient.syncAccount('acc-1')).rejects.toThrow(
        ServerError
      );
    });

    it('should handle gateway timeout error (504)', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 504,
        text: async () =>
          JSON.stringify({
            statusCode: 504,
            message: 'Gateway timeout',
          }),
      });

      await expect(bankingClient.syncAccount('acc-1')).rejects.toThrow(
        ServerError
      );
    });
  });

  describe('revokeConnection', () => {
    it('should revoke connection successfully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await expect(bankingClient.revokeConnection('conn-123')).resolves.toBeUndefined();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/banking/revoke/conn-123'),
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include',
        })
      );
    });

    it('should handle revoke not found error', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () =>
          JSON.stringify({
            statusCode: 404,
            message: 'Connection not found',
          }),
      });

      await expect(bankingClient.revokeConnection('invalid-id')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should handle revoke authorization error', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () =>
          JSON.stringify({
            statusCode: 403,
            message: 'Cannot revoke this connection',
          }),
      });

      await expect(bankingClient.revokeConnection('conn-123')).rejects.toThrow(
        AuthorizationError
      );
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle unknown status code', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 418, // I'm a teapot
        text: async () =>
          JSON.stringify({
            statusCode: 418,
            message: 'Unknown error',
            error: 'TeapotError',
          }),
      });

      await expect(bankingClient.getAccounts()).rejects.toThrow(BankingApiError);
    });

    it('should handle error without statusText', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: '',
        text: async () => '',
      });

      await expect(bankingClient.getAccounts()).rejects.toThrow('An error occurred');
    });

    it('should use statusText when no error message', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Custom Status Text',
        text: async () => JSON.stringify({ statusCode: 500 }),
      });

      await expect(bankingClient.getAccounts()).rejects.toThrow('Custom Status Text');
    });
  });

  describe('Request Logging', () => {
    it('should log requests in development', async () => {
      // Set NODE_ENV to development using vi.stubEnv
      vi.stubEnv('NODE_ENV', 'development');

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ accounts: [] }),
      });

      await bankingClient.getAccounts();

      expect(console.log).toHaveBeenCalled();

      // Restore environment variables
      vi.unstubAllEnvs();
    });

    it('should log errors in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () =>
          JSON.stringify({
            statusCode: 500,
            message: 'Error',
          }),
      });

      await expect(bankingClient.getAccounts()).rejects.toThrow();

      expect(console.error).toHaveBeenCalled();

      vi.unstubAllEnvs();
    });
  });
});
