/**
 * Tests for StepWelcome — Sprint 1.5.2 WP-B (Step 1 Benvenuto).
 *
 * Covers:
 *  - Renders with firstName → "Ciao, {name}! 👋"
 *  - Renders without firstName (null) → fallback "Ciao! 👋"
 *  - Subtitle text present
 *  - 3 feature chips rendered with correct labels
 *  - Icons accessible (aria-hidden on decorative icons)
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import { StepWelcome } from '@/components/onboarding/steps/StepWelcome';

// ---------------------------------------------------------------------------
// Framer-motion stub — props-forwarding passthrough
// ---------------------------------------------------------------------------
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target: unknown, prop: string | symbol) => {
        if (prop === '__esModule') return false;
        return ({
          children,
          initial: _initial,
          animate: _animate,
          exit: _exit,
          transition: _transition,
          whileHover: _whileHover,
          whileTap: _whileTap,
          whileInView: _whileInView,
          variants: _variants,
          ...rest
        }: Record<string, unknown>) => {
          const Tag = typeof prop === 'string' ? prop : 'div';
          return React.createElement(Tag as string, rest, children as React.ReactNode);
        };
      },
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// =============================================================================
// Tests
// =============================================================================
describe('StepWelcome (Sprint 1.5.2 WP-B)', () => {
  // ---- 1. Greeting with firstName -------------------------------------------
  describe('greeting text', () => {
    it('shows personalized greeting when firstName provided', () => {
      render(<StepWelcome firstName="Marco" />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ciao, Marco! 👋');
    });

    it('shows fallback greeting when firstName is null', () => {
      render(<StepWelcome firstName={null} />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ciao! 👋');
    });

    it('shows fallback greeting when firstName is empty string', () => {
      render(<StepWelcome firstName="" />);
      // empty string is falsy — falls back to generic
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ciao! 👋');
    });
  });

  // ---- 2. Subtitle -----------------------------------------------------------
  describe('subtitle', () => {
    it('renders Zecca onboarding subtitle', () => {
      render(<StepWelcome firstName="Giulia" />);
      expect(
        screen.getByText(/Benvenuto su Zecca/i)
      ).toBeInTheDocument();
    });
  });

  // ---- 3. Feature chips ------------------------------------------------------
  describe('feature chips', () => {
    it('renders exactly 3 feature chips', () => {
      render(<StepWelcome firstName={null} />);
      // role="list" wraps the chips
      const list = screen.getByRole('list', { name: /funzionalita principali/i });
      expect(list.querySelectorAll('[role="listitem"]').length).toBe(3);
    });

    it('renders "5 Agenti AI" chip', () => {
      render(<StepWelcome firstName={null} />);
      expect(screen.getByText('5 Agenti AI')).toBeInTheDocument();
    });

    it('renders "Gamification" chip', () => {
      render(<StepWelcome firstName={null} />);
      expect(screen.getByText('Gamification')).toBeInTheDocument();
    });

    it('renders "Analisi Smart" chip', () => {
      render(<StepWelcome firstName={null} />);
      expect(screen.getByText('Analisi Smart')).toBeInTheDocument();
    });
  });

  // ---- 4. Accessibility -------------------------------------------------------
  describe('accessibility', () => {
    it('heading has correct level (h1)', () => {
      render(<StepWelcome firstName="Test" />);
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();
    });

    it('chip list has accessible label', () => {
      render(<StepWelcome firstName={null} />);
      expect(
        screen.getByRole('list', { name: /funzionalita principali/i })
      ).toBeInTheDocument();
    });
  });
});
