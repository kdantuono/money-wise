/**
 * Test Helpers
 * Common helper functions for MoneyWise tests
 */

import { render, RenderOptions, screen, waitFor } from '@testing-library/react';
import React, { ReactElement, ReactNode } from 'react';

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
  router?: {
    initialEntries?: string[];
    initialIndex?: number;
  };
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialState, theme = 'light', router, ...renderOptions } = options;

  // Create a wrapper with providers
  const Wrapper = ({ children }: { children: ReactNode }) => {
    // Add your providers here (Theme, Router, State, etc.)
    return React.createElement(
      'div',
      { 'data-theme': theme, 'data-testid': 'test-wrapper' },
      children
    );
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

export const fillFormByTestId = async (fields: Record<string, string>) => {
  const { userEvent } = await import('@testing-library/user-event');
  const user = userEvent.setup();

  for (const [testId, value] of Object.entries(fields)) {
    const field = screen.getByTestId(testId) as HTMLInputElement;
    if (field) {
      await user.clear(field);
      await user.type(field, value);
    }
  }
};

export const submitForm = async (formTestId = 'form', submitButtonTestId = 'submit-button') => {
  const { userEvent } = await import('@testing-library/user-event');
  const user = userEvent.setup();

  const submitButton = screen.getByTestId(submitButtonTestId);
  await user.click(submitButton);
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

// API mocking helpers
export const createMockApiResponse = <T>(data: T, status = 200) => ({
  data,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  headers: {},
  config: {},
});

export const createMockApiError = (message: string, status = 400) => ({
  response: {
    data: { message },
    status,
    statusText: 'Error',
  },
  message,
  status,
});

// Test ID helpers
export const testId = (id: string) => `[data-testid="${id}"]`;

export const getTestId = (id: string) => document.querySelector(testId(id));

export const getByTestId = (id: string) => screen.getByTestId(id);

export const queryByTestId = (id: string) => screen.queryByTestId(id);

export const findByTestId = (id: string) => screen.findByTestId(id);

// Assertion helpers
export const expectElementToBeVisible = (testId: string) => {
  expect(screen.getByTestId(testId)).toBeVisible();
};

export const expectElementToHaveText = (testId: string, text: string | RegExp) => {
  expect(screen.getByTestId(testId)).toHaveTextContent(text);
};

export const expectElementToBeDisabled = (testId: string) => {
  expect(screen.getByTestId(testId)).toBeDisabled();
};

export const expectElementToBeEnabled = (testId: string) => {
  expect(screen.getByTestId(testId)).toBeEnabled();
};

// Number and currency helpers for financial tests
export const formatCurrency = (amount: number, currency = 'USD'): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);

export const randomAmount = (min = 1, max = 1000): number =>
  Math.round((Math.random() * (max - min) + min) * 100) / 100;

export const randomCurrency = (): string => {
  const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
  return currencies[Math.floor(Math.random() * currencies.length)];
};

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

export const formatDate = (date: Date, format = 'YYYY-MM-DD'): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    default:
      return date.toISOString().split('T')[0];
  }
};

export const randomDate = (startDate?: Date, endDate?: Date): Date => {
  const start = startDate || new Date(2020, 0, 1);
  const end = endDate || new Date();
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Financial test data generators
export const generateTestUser = (overrides = {}) => ({
  id: Math.floor(Math.random() * 10000),
  firstName: 'Test',
  lastName: 'User',
  email: `test${Math.floor(Math.random() * 10000)}@example.com`,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const generateTestAccount = (overrides = {}) => ({
  id: Math.floor(Math.random() * 10000),
  name: `Test Account ${Math.floor(Math.random() * 100)}`,
  type: 'checking' as const,
  balance: randomAmount(0, 10000),
  currency: 'USD',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const generateTestTransaction = (overrides = {}) => ({
  id: Math.floor(Math.random() * 10000),
  amount: randomAmount(-1000, 1000),
  description: `Test Transaction ${Math.floor(Math.random() * 100)}`,
  category: 'food',
  date: randomDate(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const generateTestBudget = (overrides = {}) => ({
  id: Math.floor(Math.random() * 10000),
  name: `Test Budget ${Math.floor(Math.random() * 100)}`,
  amount: randomAmount(100, 2000),
  category: 'food',
  period: 'monthly' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Performance testing helpers
export const measureRenderTime = async (renderFn: () => void): Promise<number> => {
  const start = performance.now();
  renderFn();
  await waitFor(() => {}, { timeout: 100 });
  const end = performance.now();
  return end - start;
};

export const expectRenderTimeUnder = async (renderFn: () => void, maxTime: number) => {
  const renderTime = await measureRenderTime(renderFn);
  expect(renderTime).toBeLessThan(maxTime);
};

// Accessibility testing helpers
export const expectElementToHaveAriaLabel = (testId: string, label: string) => {
  expect(screen.getByTestId(testId)).toHaveAttribute('aria-label', label);
};

export const expectElementToHaveRole = (testId: string, role: string) => {
  expect(screen.getByTestId(testId)).toHaveAttribute('role', role);
};

export const expectFormToBeAccessible = async (formTestId: string) => {
  const form = screen.getByTestId(formTestId);

  // Check for proper form structure
  expect(form).toBeInTheDocument();

  // Check for labels on inputs
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    const id = input.getAttribute('id');
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledBy = input.getAttribute('aria-labelledby');

    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      expect(label || ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  });
};