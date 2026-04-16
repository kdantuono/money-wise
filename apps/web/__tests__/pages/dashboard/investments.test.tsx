/**
 * Tests for InvestmentsPage component
 *
 * After the Figma Design Sprint, this page renders a full investment
 * portfolio with mock data (stocks, crypto, ETFs), summary cards,
 * a performance chart, and investment cards. All text is in Italian.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../utils/test-utils';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target: unknown, prop: string | symbol) => {
      if (prop === '__esModule') return false;
      return ({ children, initial, animate, exit, transition, whileHover, whileTap, whileInView, variants, ...rest }: Record<string, unknown>) => {
        const Tag = typeof prop === 'string' ? prop : 'div';
        return React.createElement(Tag as string, rest, children as React.ReactNode);
      };
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

import InvestmentsPage from '../../../app/dashboard/investments/page';

describe('InvestmentsPage', () => {
  describe('Header', () => {
    it('renders the page heading in Italian', () => {
      render(<InvestmentsPage />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Investimenti');
    });

    it('renders the description text in Italian', () => {
      render(<InvestmentsPage />);

      expect(screen.getByText('Gestisci il tuo portafoglio di investimenti')).toBeInTheDocument();
    });
  });

  describe('Add Investment Button', () => {
    it('renders the add investment button in Italian', () => {
      render(<InvestmentsPage />);

      expect(screen.getByRole('button', { name: /Aggiungi Investimento/i })).toBeInTheDocument();
    });
  });

  describe('Summary Cards', () => {
    it('renders Valore Totale label', () => {
      render(<InvestmentsPage />);

      expect(screen.getByText('Valore Totale')).toBeInTheDocument();
    });

    it('renders Azioni label', () => {
      render(<InvestmentsPage />);

      expect(screen.getByText('Azioni')).toBeInTheDocument();
    });

    it('renders Crypto label', () => {
      render(<InvestmentsPage />);

      expect(screen.getByText('Crypto')).toBeInTheDocument();
    });
  });

  describe('Investment Cards', () => {
    it('renders individual investment names', () => {
      render(<InvestmentsPage />);

      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
      expect(screen.getByText('Bitcoin')).toBeInTheDocument();
      expect(screen.getByText('MSCI World ETF')).toBeInTheDocument();
    });

    it('renders investment symbols', () => {
      render(<InvestmentsPage />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('BTC')).toBeInTheDocument();
    });
  });

  describe('Tab Filters', () => {
    it('renders filter tabs', () => {
      render(<InvestmentsPage />);

      // Tab labels include counts, e.g. "Tutti (6)", "Azioni (2)"
      expect(screen.getByText(/Tutti \(/)).toBeInTheDocument();
      expect(screen.getByText(/Azioni \(/)).toBeInTheDocument();
      expect(screen.getByText(/Crypto \(/)).toBeInTheDocument();
      expect(screen.getByText(/ETF \(/)).toBeInTheDocument();
    });
  });

  describe('AI Banner', () => {
    it('renders AI investment advice banner', () => {
      render(<InvestmentsPage />);

      expect(screen.getByText('Consiglio AI Investimenti')).toBeInTheDocument();
    });
  });

  describe('Performance Chart', () => {
    it('renders Performance Portfolio heading', () => {
      render(<InvestmentsPage />);

      expect(screen.getByText('Performance Portfolio')).toBeInTheDocument();
    });
  });
});
