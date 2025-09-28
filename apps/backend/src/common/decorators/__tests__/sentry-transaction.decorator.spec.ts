import { Test, TestingModule } from '@nestjs/testing';
import * as Sentry from '@sentry/nestjs';
import {
  withSentryTransaction,
  addSentryBreadcrumb,
  setSentryContext,
  setSentryTag,
} from '../sentry-transaction.decorator';

// Mock Sentry
jest.mock('@sentry/nestjs', () => ({
  startSpan: jest.fn(),
  addBreadcrumb: jest.fn(),
  setContext: jest.fn(),
  setTag: jest.fn(),
}));

describe('SentryTransactionDecorator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withSentryTransaction', () => {
    it('should wrap function with Sentry transaction', async () => {
      const mockSpan = jest.fn();
      const mockOperation = jest.fn().mockResolvedValue('test result');

      (Sentry.startSpan as jest.Mock).mockImplementation((config, fn) => {
        return fn(mockSpan);
      });

      const wrappedFunction = withSentryTransaction(
        'test-operation',
        'function',
        mockOperation
      );

      const result = await wrappedFunction('arg1', 'arg2');

      expect(Sentry.startSpan).toHaveBeenCalledWith(
        {
          name: 'test-operation',
          op: 'function',
        },
        expect.any(Function)
      );

      expect(mockOperation).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('test result');
    });

    it('should handle errors in wrapped function', async () => {
      const testError = new Error('Test error');
      const mockOperation = jest.fn().mockRejectedValue(testError);

      (Sentry.startSpan as jest.Mock).mockImplementation((config, fn) => {
        return fn({});
      });

      const wrappedFunction = withSentryTransaction(
        'test-operation',
        'function',
        mockOperation
      );

      await expect(wrappedFunction()).rejects.toThrow('Test error');

      expect(Sentry.startSpan).toHaveBeenCalled();
      expect(mockOperation).toHaveBeenCalled();
    });
  });

  describe('addSentryBreadcrumb', () => {
    it('should add breadcrumb with default values', () => {
      addSentryBreadcrumb('Test message');

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Test message',
        category: 'custom',
        level: 'info',
        data: undefined,
        timestamp: expect.any(Number),
      });
    });

    it('should add breadcrumb with custom values', () => {
      const testData = { userId: '123', action: 'create' };

      addSentryBreadcrumb(
        'User action',
        'auth',
        'warning',
        testData
      );

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'User action',
        category: 'auth',
        level: 'warning',
        data: testData,
        timestamp: expect.any(Number),
      });
    });
  });

  describe('setSentryContext', () => {
    it('should set Sentry context', () => {
      const context = { userId: '123', sessionId: 'abc' };

      setSentryContext('user_session', context);

      expect(Sentry.setContext).toHaveBeenCalledWith('user_session', context);
    });
  });

  describe('setSentryTag', () => {
    it('should set Sentry tag', () => {
      setSentryTag('environment', 'production');

      expect(Sentry.setTag).toHaveBeenCalledWith('environment', 'production');
    });
  });
});