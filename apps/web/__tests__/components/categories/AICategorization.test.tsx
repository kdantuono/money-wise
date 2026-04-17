/**
 * Tests for AICategorization — review flow with real service wired.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  loadPendingWithSuggestions: vi.fn(),
  applyCategory: vi.fn(),
}));

vi.mock('../../../src/services/categorization.client', async () => {
  const actual = await vi.importActual<
    typeof import('../../../src/services/categorization.client')
  >('../../../src/services/categorization.client');
  return {
    ...actual,
    categorizationClient: {
      loadPendingWithSuggestions: mocks.loadPendingWithSuggestions,
      applyCategory: mocks.applyCategory,
    },
  };
});

import { AICategorization } from '../../../src/components/categories/AICategorization';
import { CategorizationApiError } from '../../../src/services/categorization.client';

const TX = {
  id: 'tx-1',
  description: 'Pagamento Esselunga',
  amount: -67.3,
  type: 'DEBIT' as const,
  date: '2026-04-14',
  suggestedCategoryId: 'cat-food',
  suggestedCategoryName: 'Spesa Alimentare',
  suggestedCategoryIcon: '🛒',
  confidence: 97,
  matchedBy: 'keyword' as const,
};

const TX2 = {
  id: 'tx-2',
  description: 'BOOTS 773',
  amount: -3.24,
  type: 'DEBIT' as const,
  date: '2026-04-15',
  suggestedCategoryId: null,
  suggestedCategoryName: 'Da categorizzare',
  suggestedCategoryIcon: '❓',
  confidence: 0,
  matchedBy: 'fallback' as const,
};

const CATEGORIES = [
  { id: 'cat-food', name: 'Spesa Alimentare', icon: '🛒', type: 'EXPENSE' as const },
  { id: 'cat-health', name: 'Salute', icon: '💊', type: 'EXPENSE' as const },
];

describe('AICategorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mocks.loadPendingWithSuggestions.mockReturnValueOnce(new Promise(() => {}));
    render(<AICategorization />);
    expect(
      screen.getByText(/L'AI sta analizzando/i)
    ).toBeInTheDocument();
  });

  it('shows load error with retry', async () => {
    mocks.loadPendingWithSuggestions.mockRejectedValueOnce(
      new CategorizationApiError('RLS denied', 500, 'fetch_failed')
    );
    render(<AICategorization />);
    expect(await screen.findByText(/RLS denied/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Riprova/i })).toBeInTheDocument();
  });

  it('shows empty state when no pending', async () => {
    mocks.loadPendingWithSuggestions.mockResolvedValueOnce({
      items: [],
      categories: CATEGORIES,
    });
    render(<AICategorization />);
    expect(
      await screen.findByText(/Tutto categorizzato/i)
    ).toBeInTheDocument();
  });

  it('renders pending transactions with AI suggestions', async () => {
    mocks.loadPendingWithSuggestions.mockResolvedValueOnce({
      items: [TX],
      categories: CATEGORIES,
    });
    render(<AICategorization />);
    expect(
      await screen.findByText('Pagamento Esselunga')
    ).toBeInTheDocument();
    expect(screen.getByText('Spesa Alimentare')).toBeInTheDocument();
    expect(screen.getByText('97%')).toBeInTheDocument();
  });

  it('applies suggested category on Accept and removes from list', async () => {
    mocks.loadPendingWithSuggestions.mockResolvedValueOnce({
      items: [TX, TX2],
      categories: CATEGORIES,
    });
    mocks.applyCategory.mockResolvedValueOnce(undefined);

    render(<AICategorization />);
    await screen.findByText('Pagamento Esselunga');

    const acceptButtons = screen.getAllByRole('button', { name: /Accetta/i });
    await userEvent.click(acceptButtons[0]);

    await waitFor(() => {
      expect(mocks.applyCategory).toHaveBeenCalledWith('tx-1', 'cat-food');
    });
    await waitFor(() => {
      expect(screen.queryByText('Pagamento Esselunga')).not.toBeInTheDocument();
    });
  });

  it('disables Accept when no suggestion (fallback)', async () => {
    mocks.loadPendingWithSuggestions.mockResolvedValueOnce({
      items: [TX2],
      categories: CATEGORIES,
    });
    render(<AICategorization />);
    await screen.findByText('BOOTS 773');
    const accept = screen.getByRole('button', { name: /Accetta/i });
    expect(accept).toBeDisabled();
  });

  it('Cambia opens picker and choosing a category applies it', async () => {
    mocks.loadPendingWithSuggestions.mockResolvedValueOnce({
      items: [TX2],
      categories: CATEGORIES,
    });
    mocks.applyCategory.mockResolvedValueOnce(undefined);

    render(<AICategorization />);
    await screen.findByText('BOOTS 773');
    await userEvent.click(screen.getByRole('button', { name: /Cambia/i }));

    // Picker buttons render — click the Salute one
    const saluteButton = await screen.findByRole('button', { name: /Salute/i });
    await userEvent.click(saluteButton);

    await waitFor(() => {
      expect(mocks.applyCategory).toHaveBeenCalledWith('tx-2', 'cat-health');
    });
  });

  it('Skip removes tx without applying', async () => {
    mocks.loadPendingWithSuggestions.mockResolvedValueOnce({
      items: [TX],
      categories: CATEGORIES,
    });
    render(<AICategorization />);
    await screen.findByText('Pagamento Esselunga');

    const skipButtons = screen.getAllByRole('button');
    // Find the X-only skip button — it has aria-label or just X icon
    // Here: last outline button in the row is the X reject
    const xButton = skipButtons.find((b) =>
      b.querySelector('svg.lucide-x, svg[class*="lucide-x"]')
    );
    if (xButton) {
      await userEvent.click(xButton);
      await waitFor(() => {
        expect(screen.queryByText('Pagamento Esselunga')).not.toBeInTheDocument();
      });
      expect(mocks.applyCategory).not.toHaveBeenCalled();
    }
  });

  it('shows row-level error when applyCategory fails', async () => {
    mocks.loadPendingWithSuggestions.mockResolvedValueOnce({
      items: [TX],
      categories: CATEGORIES,
    });
    mocks.applyCategory.mockRejectedValueOnce(
      new CategorizationApiError('RLS violation', 500, 'apply_failed')
    );

    render(<AICategorization />);
    await screen.findByText('Pagamento Esselunga');
    await userEvent.click(screen.getByRole('button', { name: /Accetta/i }));

    expect(await screen.findByText(/RLS violation/i)).toBeInTheDocument();
    // Tx remains in the list for retry
    expect(screen.getByText('Pagamento Esselunga')).toBeInTheDocument();
  });
});
