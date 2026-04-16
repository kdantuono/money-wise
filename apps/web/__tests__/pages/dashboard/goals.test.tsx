/**
 * Tests for GoalsPage component
 *
 * After the Figma Design Sprint, this page renders a full goals
 * dashboard with hardcoded goal data, progress bars, AI suggestions,
 * and a modal for adding new goals. All text is in Italian.
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

import GoalsPage from '../../../app/dashboard/goals/page';

describe('GoalsPage', () => {
  describe('Header', () => {
    it('renders the page heading in Italian', () => {
      render(<GoalsPage />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Obiettivi');
    });

    it('renders the description text in Italian', () => {
      render(<GoalsPage />);

      expect(screen.getByText('Monitora i tuoi obiettivi di risparmio')).toBeInTheDocument();
    });
  });

  describe('Add Goal Button', () => {
    it('renders Nuovo Obiettivo button', () => {
      render(<GoalsPage />);

      expect(screen.getByRole('button', { name: /Nuovo Obiettivo/i })).toBeInTheDocument();
    });
  });

  describe('Overall Progress', () => {
    it('renders Progresso Complessivo label', () => {
      render(<GoalsPage />);

      expect(screen.getByText('Progresso Complessivo')).toBeInTheDocument();
    });

    it('renders the count of active goals', () => {
      render(<GoalsPage />);

      expect(screen.getByText('5 obiettivi attivi')).toBeInTheDocument();
    });
  });

  describe('Goal Cards', () => {
    it('renders goal names', () => {
      render(<GoalsPage />);

      expect(screen.getByText('Fondo Emergenza')).toBeInTheDocument();
      expect(screen.getByText('Vacanza Estate')).toBeInTheDocument();
      expect(screen.getByText('Anticipo Casa')).toBeInTheDocument();
      expect(screen.getByText('Auto Nuova')).toBeInTheDocument();
      expect(screen.getByText('Corso MBA')).toBeInTheDocument();
    });

    it('renders priority badges', () => {
      render(<GoalsPage />);

      const badges = screen.getAllByText(/priorit/i);
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('AI Suggestion', () => {
    it('renders AI suggestion section', () => {
      render(<GoalsPage />);

      expect(screen.getByText('Suggerimento AI')).toBeInTheDocument();
    });
  });

  describe('Add Goal Modal', () => {
    it('opens the modal when Nuovo Obiettivo is clicked', async () => {
      const { user } = render(<GoalsPage />);

      const addButton = screen.getByRole('button', { name: /Nuovo Obiettivo/i });
      await user.click(addButton);

      // Modal should show form labels
      expect(screen.getByText('Nome Obiettivo')).toBeInTheDocument();
      expect(screen.getByText(/Importo Obiettivo/)).toBeInTheDocument();
      // "Scadenza" label exists in both modal and goal cards, so use getAllByText
      const scadenzaLabels = screen.getAllByText('Scadenza');
      expect(scadenzaLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('has Crea Obiettivo button in modal', async () => {
      const { user } = render(<GoalsPage />);

      const addButton = screen.getByRole('button', { name: /Nuovo Obiettivo/i });
      await user.click(addButton);

      expect(screen.getByRole('button', { name: /Crea Obiettivo/i })).toBeInTheDocument();
    });
  });
});
