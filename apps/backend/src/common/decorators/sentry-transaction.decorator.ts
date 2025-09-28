import { applyDecorators, SetMetadata } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

export const SENTRY_TRANSACTION_KEY = 'sentry_transaction';

export interface SentryTransactionOptions {
  name?: string;
  op?: string;
  description?: string;
  tags?: Record<string, string>;
  samplingRate?: number;
}

/**
 * Decorator to create Sentry transactions for method monitoring
 * @param options Sentry transaction configuration
 */
export function SentryTransaction(options: SentryTransactionOptions = {}) {
  return applyDecorators(
    SetMetadata(SENTRY_TRANSACTION_KEY, options),
  );
}

/**
 * Utility function to create and execute a Sentry transaction
 * @param name Transaction name
 * @param operation Async operation to wrap
 * @param options Additional transaction options
 */
export async function withSentryTransaction<T>(
  name: string,
  operation: () => Promise<T>,
  options: SentryTransactionOptions = {}
): Promise<T> {
  return await Sentry.startSpan(
    {
      name: options.name || name,
      op: options.op || 'function',
    },
    async (span) => {
      try {
        // Set tags if provided
        if (options.tags) {
          Object.entries(options.tags).forEach(([key, value]) => {
            span.setAttributes({ [key]: value });
          });
        }

        const result = await operation();
        
        span.setStatus({ code: 1 }); // OK status
        return result;
      } catch (error) {
        span.setStatus({ code: 2 }); // ERROR status
        span.recordException(error as Error);
        throw error;
      }
    }
  );
}

/**
 * Utility class for managing Sentry transactions
 */
export class SentryTransactionManager {
  private static activeTransactions = new Map<string, ReturnType<typeof Sentry.startSpan>>();

  static startTransaction(name: string, _options: SentryTransactionOptions = {}): string {
    const transactionId = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Store a placeholder transaction
    this.activeTransactions.set(transactionId, Promise.resolve() as ReturnType<typeof Sentry.startSpan>);
    
    return transactionId;
  }

  static finishTransaction(transactionId: string): void {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      console.warn(`No active transaction found for ID: ${transactionId}`);
      return;
    }

    // Clean up the transaction
    this.activeTransactions.delete(transactionId);
  }

  static setTransactionTag(transactionId: string, key: string, value: string): void {
    const transaction = this.activeTransactions.get(transactionId);
    if (transaction) {
      // Set tag on active span context
      Sentry.setTag(key, value);
    }
  }

  static addTransactionBreadcrumb(
    transactionId: string, 
    message: string, 
    data?: Record<string, unknown>
  ): void {
    const transaction = this.activeTransactions.get(transactionId);
    if (transaction) {
      Sentry.addBreadcrumb({
        message,
        data,
        level: 'info',
      });
    }
  }
}