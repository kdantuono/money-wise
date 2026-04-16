/**
 * Tests for HomePage component
 *
 * The home page now redirects to /dashboard via Next.js redirect().
 * In Next.js 15, redirect() throws a NEXT_REDIRECT error.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock next/navigation — redirect throws in Next.js 15
const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  },
}));

import HomePage from '../../app/page';

describe('HomePage', () => {
  it('redirects to /dashboard', () => {
    expect(() => HomePage()).toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
  });
});
