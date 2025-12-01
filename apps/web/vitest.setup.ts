/**
 * Vitest setup file for MoneyWise Web
 * Global test configuration and utilities for React Testing Library
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// React 19 Configuration
// Tell React Testing Library that we're in a React Act environment
// This prevents act() warnings in React 19
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Note: Avoid enabling fake timers globally; some libraries rely on real timers
// Individual tests can opt-in with vi.useFakeTimers() when needed

// Mock window.open for components that open OAuth popups
// jsdom does not implement real window.open; provide a stub
Object.defineProperty(window, 'open', {
  writable: true,
  value: vi.fn(() => ({
    closed: false,
    focus: vi.fn(),
    close() {
      // simulate user closing the popup
      // consumers may poll .closed
      // set closed to true when close() is called
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - using 'this' on the mocked window object
      this.closed = true;
    },
  })),
});

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter() {
    return {
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
    };
  },
}));

// Mock Next.js navigation (App Router)
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return React.createElement('img', props);
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() { }
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() { }
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock window.scrollTo
global.scrollTo = vi.fn();

// Setup console suppression for tests
global.console = {
  ...console,
  // Suppress console.log in tests
  log: vi.fn(),
  // Keep error and warn for debugging
  error: console.error,
  warn: console.warn,
};