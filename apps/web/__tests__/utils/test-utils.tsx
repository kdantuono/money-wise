/**
 * Custom testing utilities for MoneyWise Web
 * Provides configured render function and common testing helpers
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// Mock providers setup for testing
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

// Custom render function with providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const user = userEvent.setup();

  return {
    user,
    ...render(ui, { wrapper: AllTheProviders, ...options })
  };
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Common test utilities
export const createMockRouter = (overrides = {}) => ({
  route: '/',
  pathname: '/',
  query: {},
  asPath: '/',
  push: vi.fn(),
  pop: vi.fn(),
  reload: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn().mockResolvedValue(undefined),
  beforePopState: vi.fn(),
  events: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
  isFallback: false,
  ...overrides,
});

export const mockWindowLocation = (url: string) => {
  delete (window as any).location;
  window.location = new URL(url) as any;
};

export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};