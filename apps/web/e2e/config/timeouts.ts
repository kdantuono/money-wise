/**
 * Timeout Constants
 * Centralized timeout configurations for E2E tests
 */

/**
 * Standard timeout values (in milliseconds)
 */
export const TIMEOUTS = {
  // Very short timeouts
  INSTANT: 100,
  ANIMATION: 300,
  DEBOUNCE: 500,

  // Short timeouts
  SHORT: 1000,
  CLICK: 2000,
  FORM_VALIDATION: 2000,

  // Medium timeouts
  MEDIUM: 5000,
  DEFAULT: 5000,
  ELEMENT_VISIBLE: 5000,
  PAGE_TRANSITION: 5000,

  // Long timeouts
  LONG: 10000,
  API_REQUEST: 10000,
  PAGE_LOAD: 10000,

  // Very long timeouts
  VERY_LONG: 30000,
  NAVIGATION: 30000,
  FILE_UPLOAD: 30000,

  // Special timeouts
  NETWORK_IDLE: 15000,
  BANKING_OAUTH: 60000, // Banking OAuth can take time
  REPORT_GENERATION: 20000,
} as const;

/**
 * Retry configurations
 */
export const RETRIES = {
  DEFAULT: 3,
  API_REQUEST: 2,
  FLAKY_TEST: 3,
  NONE: 0,
} as const;

/**
 * Polling intervals (in milliseconds)
 */
export const POLLING = {
  FAST: 100,
  DEFAULT: 500,
  SLOW: 1000,
} as const;

/**
 * Helper to calculate timeout based on environment
 */
export function getTimeout(baseTimeout: number): number {
  const CI_MULTIPLIER = process.env.CI ? 2 : 1;
  const DEBUG_MULTIPLIER = process.env.DEBUG ? 3 : 1;

  return baseTimeout * CI_MULTIPLIER * DEBUG_MULTIPLIER;
}

/**
 * Helper to create a promise that resolves after a delay
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to wait with condition checking
 */
export async function waitUntil(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    message?: string;
  } = {}
): Promise<void> {
  const timeout = options.timeout || TIMEOUTS.DEFAULT;
  const interval = options.interval || POLLING.DEFAULT;
  const message = options.message || 'Condition not met within timeout';

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await wait(interval);
  }

  throw new Error(message);
}
