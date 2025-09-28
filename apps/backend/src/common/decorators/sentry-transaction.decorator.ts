import { applyDecorators, SetMetadata } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

export const SENTRY_TRANSACTION_KEY = 'sentry_transaction';

export interface SentryTransactionOptions {
  name?: string;
  op?: string;
  tags?: Record<string, string>;
  data?: Record<string, any>;
}

/**
 * Decorator to create Sentry transactions for performance monitoring
 * @param options Transaction configuration options
 */
export function SentryTransaction(options: SentryTransactionOptions = {}) {
  return applyDecorators(
    SetMetadata(SENTRY_TRANSACTION_KEY, options),
  );
}

/**
 * Utility function to wrap a function with Sentry transaction
 * @param name Transaction name
 * @param op Operation type
 * @param fn Function to wrap
 */
export function withSentryTransaction<T extends (...args: any[]) => any>(
  name: string,
  op: string,
  fn: T,
): T {
  return ((...args: any[]) => {
    return Sentry.startSpan(
      {
        name,
        op,
      },
      () => fn(...args),
    );
  }) as T;
}

/**
 * Utility function to add breadcrumb
 * @param message Breadcrumb message
 * @param category Breadcrumb category
 * @param level Breadcrumb level
 * @param data Additional data
 */
export function addSentryBreadcrumb(
  message: string,
  category: string = 'custom',
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>,
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Utility function to set Sentry context
 * @param key Context key
 * @param context Context data
 */
export function setSentryContext(key: string, context: Record<string, any>): void {
  Sentry.setContext(key, context);
}

/**
 * Utility function to set Sentry tag
 * @param key Tag key
 * @param value Tag value
 */
export function setSentryTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}