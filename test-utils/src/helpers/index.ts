/**
 * Test Helpers
 * Common helper functions for MoneyWise tests
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';

// Type utilities for tests
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type MockFunction<T extends (...args: any[]) => any> = jest.MockedFunction<T>;

// Async test helpers
export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
};

export const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

// Custom render function for React components with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Add provider options here as needed
  initialState?: any;
  theme?: 'light' | 'dark';
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialState, theme = 'light', ...renderOptions } = options;

  // Create a wrapper with providers
  const Wrapper = ({ children }: { children: ReactNode }) => {
    // Add your providers here (Theme, Router, State, etc.)
    return <div data-theme={theme}>{children}</div>;
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Error boundary for testing error states
export class TestErrorBoundary extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TestErrorBoundary';
  }
}

export const throwTestError = (message = 'Test error') => {
  throw new TestErrorBoundary(message);
};

// Form testing helpers
export const fillForm = async (fields: Record<string, string>) => {
  const { userEvent } = await import('@testing-library/user-event');
  const user = userEvent.setup();

  for (const [label, value] of Object.entries(fields)) {
    const field = document.querySelector(`[name="${label}"]`) as HTMLInputElement;
    if (field) {
      await user.clear(field);
      await user.type(field, value);
    }
  }
};

// Mock implementation helpers
export const createSpyObj = <T extends Record<string, any>>(
  baseName: string,
  methodNames: (keyof T)[]
): jest.Mocked<T> => {
  const obj: any = {};

  methodNames.forEach(name => {
    obj[name] = jest.fn().mockName(`${baseName}.${String(name)}`);
  });

  return obj;
};

// Test ID helpers
export const testId = (id: string) => `[data-testid="${id}"]`;

export const getTestId = (id: string) => document.querySelector(testId(id));

// Number and currency helpers for financial tests
export const formatCurrency = (amount: number, currency = 'USD'): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);

export const randomAmount = (min = 1, max = 1000): number =>
  Math.round((Math.random() * (max - min) + min) * 100) / 100;

// Date helpers for financial tests
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const startOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const endOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};