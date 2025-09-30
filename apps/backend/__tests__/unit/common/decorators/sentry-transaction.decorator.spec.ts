import * as Sentry from '@sentry/nestjs';
import {
  withSentryTransaction,
  SentryTransactionManager,
} from '@/common/decorators/sentry-transaction.decorator';

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
      const mockSpan = { setAttributes: jest.fn(), setStatus: jest.fn() };
      const mockOperation = jest.fn().mockResolvedValue('test result');

      (Sentry.startSpan as jest.Mock).mockImplementation((config, fn) => {
        return fn(mockSpan);
      });

      const result = await withSentryTransaction(
        'test-operation',
        mockOperation
      );

      expect(Sentry.startSpan).toHaveBeenCalledWith(
        {
          name: 'test-operation',
          op: 'function',
        },
        expect.any(Function)
      );

      expect(mockOperation).toHaveBeenCalled();
      expect(result).toBe('test result');
    });

    it('should handle errors in wrapped function', async () => {
      const testError = new Error('Test error');
      const mockOperation = jest.fn().mockRejectedValue(testError);
      const mockSpan = { 
        setAttributes: jest.fn(), 
        setStatus: jest.fn(),
        recordException: jest.fn()
      };

      (Sentry.startSpan as jest.Mock).mockImplementation((config, fn) => {
        return fn(mockSpan);
      });

      await expect(withSentryTransaction(
        'test-operation',
        mockOperation
      )).rejects.toThrow('Test error');

      expect(Sentry.startSpan).toHaveBeenCalled();
      expect(mockOperation).toHaveBeenCalled();
    });
  });

  describe('SentryTransactionManager', () => {
    it('should manage transaction lifecycle', () => {
      const transactionId = SentryTransactionManager.startTransaction('test-transaction');
      
      expect(transactionId).toBeDefined();
      expect(typeof transactionId).toBe('string');
      
      // Should not throw when finishing
      expect(() => {
        SentryTransactionManager.finishTransaction(transactionId);
      }).not.toThrow();
    });
  });
});