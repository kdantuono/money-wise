/**
 * Tests for services/categorization.client — fetch + suggest + apply flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock builder: the service chains .from().select().is().order().limit() for
// pending; .from().select().order() for categories; .from().update().eq() for
// applyCategory. We wire selective chains per test.
const mocks = vi.hoisted(() => ({
  fromSpy: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock('../../src/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: mocks.fromSpy,
    functions: { invoke: mocks.invoke },
  })),
}));

import {
  categorizationClient,
  CategorizationApiError,
} from '../../src/services/categorization.client';
import type {
  CategoryRow,
  PendingTransactionRow,
} from '../../src/types/categorization';

function pendingChain(result: {
  data: PendingTransactionRow[] | null;
  error: { message: string } | null;
}) {
  return {
    select: vi.fn().mockReturnValue({
      is: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(result),
        }),
      }),
      order: vi.fn(),
    }),
    update: vi.fn(),
  };
}

function categoriesChain(result: {
  data: CategoryRow[] | null;
  error: { message: string } | null;
}) {
  const terminal = { order: vi.fn().mockResolvedValue(result) };
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue(terminal),
      order: vi.fn(),
      is: vi.fn(),
    }),
    update: vi.fn(),
  };
}

function updateChain(
  errorResult: { message: string } | null,
  count: number | null = 1
) {
  const eq = vi.fn().mockResolvedValue({ error: errorResult, count });
  return {
    update: vi.fn().mockReturnValue({ eq }),
    select: vi.fn(),
    eq,
  };
}

const TX: PendingTransactionRow = {
  id: 'tx-1',
  description: 'Pagamento Esselunga',
  merchant_name: 'Esselunga',
  amount: -67.3,
  type: 'DEBIT',
  date: '2026-04-14',
  category_id: null,
};

const CAT: CategoryRow = {
  id: 'cat-food',
  name: 'Spesa Alimentare',
  icon: '🛒',
  type: 'EXPENSE',
};

describe('categorizationClient.fetchPendingTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns data array on success', async () => {
    mocks.fromSpy.mockReturnValueOnce(
      pendingChain({ data: [TX], error: null })
    );
    const r = await categorizationClient.fetchPendingTransactions();
    expect(r).toEqual([TX]);
  });

  it('throws fetch_failed on error', async () => {
    mocks.fromSpy.mockReturnValueOnce(
      pendingChain({ data: null, error: { message: 'RLS denied' } })
    );
    await expect(
      categorizationClient.fetchPendingTransactions()
    ).rejects.toMatchObject({
      name: 'CategorizationApiError',
      code: 'fetch_failed',
      message: expect.stringContaining('RLS'),
    });
  });

  it('returns empty array when data is null', async () => {
    mocks.fromSpy.mockReturnValueOnce(
      pendingChain({ data: null, error: null })
    );
    const r = await categorizationClient.fetchPendingTransactions();
    expect(r).toEqual([]);
  });
});

describe('categorizationClient.fetchCategories', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns data on success', async () => {
    mocks.fromSpy.mockReturnValueOnce(
      categoriesChain({ data: [CAT], error: null })
    );
    const r = await categorizationClient.fetchCategories();
    expect(r).toEqual([CAT]);
  });

  it('throws fetch_failed on error', async () => {
    mocks.fromSpy.mockReturnValueOnce(
      categoriesChain({ data: null, error: { message: 'oops' } })
    );
    await expect(categorizationClient.fetchCategories()).rejects.toMatchObject(
      { code: 'fetch_failed' }
    );
  });
});

describe('categorizationClient.suggestCategory', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invokes edge fn with mapped body', async () => {
    mocks.invoke.mockResolvedValueOnce({
      data: { categoryId: 'cat-food', confidence: 97, matchedBy: 'keyword' },
      error: null,
    });
    const r = await categorizationClient.suggestCategory(TX);
    expect(mocks.invoke).toHaveBeenCalledWith('categorize-transaction', {
      body: {
        description: 'Pagamento Esselunga',
        merchantName: 'Esselunga',
        amount: -67.3,
        type: 'DEBIT',
      },
    });
    expect(r.categoryId).toBe('cat-food');
    expect(r.confidence).toBe(97);
  });

  it('throws suggest_failed when invoke returns error', async () => {
    mocks.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'edge down' },
    });
    await expect(
      categorizationClient.suggestCategory(TX)
    ).rejects.toMatchObject({ code: 'suggest_failed' });
  });

  it('throws suggest_failed when data is null (no error)', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: null, error: null });
    await expect(
      categorizationClient.suggestCategory(TX)
    ).rejects.toMatchObject({ code: 'suggest_failed' });
  });
});

describe('categorizationClient.applyCategory', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends UPDATE with category_id and filters by txId via .eq("id", txId)', async () => {
    const chain = updateChain(null);
    mocks.fromSpy.mockReturnValueOnce(chain);
    await categorizationClient.applyCategory('tx-1', 'cat-food');
    // The payload is the first arg; the second arg is the count option
    // (checked separately — see "passes { count: 'exact' }" test).
    const callArgs = chain.update.mock.calls[0];
    expect(callArgs[0]).toEqual({ category_id: 'cat-food' });
    // Regression guard: a refactor that drops/changes the filter would
    // broadcast the UPDATE to every row in the user's scope.
    expect(chain.eq).toHaveBeenCalledWith('id', 'tx-1');
  });

  // ⚠️ Contract test — bug observed post-deploy 2026-04-18.
  // Without `{ count: 'exact' }` passed to .update(), PostgREST returns
  // `count: null` and the count === 0 branch below never fires — the UI
  // would drop transactions as "reviewed" on no-op UPDATEs. This test
  // pins the contract so future refactors can't silently disable the
  // safety net.
  it('passes { count: "exact" } as the second argument to update()', async () => {
    const chain = updateChain(null);
    mocks.fromSpy.mockReturnValueOnce(chain);
    await categorizationClient.applyCategory('tx-1', 'cat-food');
    expect(chain.update).toHaveBeenCalledWith(
      { category_id: 'cat-food' },
      { count: 'exact' }
    );
  });

  // Integration test for the count-based safety net: when the driver
  // reports zero rows affected (tx already categorized, removed, or
  // RLS-blocked), we surface a 404 instead of silently succeeding.
  it('throws apply_failed (404) when UPDATE affected zero rows', async () => {
    mocks.fromSpy.mockReturnValueOnce(updateChain(null, 0));
    await expect(
      categorizationClient.applyCategory('tx-1', 'cat-food')
    ).rejects.toMatchObject({
      name: 'CategorizationApiError',
      code: 'apply_failed',
      statusCode: 404,
    });
  });

  it('succeeds when UPDATE affected one row', async () => {
    mocks.fromSpy.mockReturnValueOnce(updateChain(null, 1));
    await expect(
      categorizationClient.applyCategory('tx-1', 'cat-food')
    ).resolves.toBeUndefined();
  });

  it('rejects empty txId / categoryId without touching DB', async () => {
    await expect(
      categorizationClient.applyCategory('', 'cat')
    ).rejects.toMatchObject({ code: 'apply_failed' });
    await expect(
      categorizationClient.applyCategory('tx', '')
    ).rejects.toMatchObject({ code: 'apply_failed' });
    expect(mocks.fromSpy).not.toHaveBeenCalled();
  });

  it('throws apply_failed when UPDATE errors', async () => {
    mocks.fromSpy.mockReturnValueOnce(
      updateChain({ message: 'RLS violation' })
    );
    await expect(
      categorizationClient.applyCategory('tx-1', 'cat-food')
    ).rejects.toMatchObject({
      code: 'apply_failed',
      message: expect.stringContaining('RLS'),
    });
  });
});

describe('categorizationClient.loadPendingWithSuggestions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns enriched items and categories', async () => {
    mocks.fromSpy
      .mockReturnValueOnce(pendingChain({ data: [TX], error: null }))
      .mockReturnValueOnce(categoriesChain({ data: [CAT], error: null }));
    mocks.invoke.mockResolvedValueOnce({
      data: { categoryId: 'cat-food', confidence: 97, matchedBy: 'keyword' },
      error: null,
    });
    const r = await categorizationClient.loadPendingWithSuggestions();
    expect(r.categories).toEqual([CAT]);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]).toMatchObject({
      id: 'tx-1',
      suggestedCategoryId: 'cat-food',
      suggestedCategoryName: 'Spesa Alimentare',
      suggestedCategoryIcon: '🛒',
      confidence: 97,
    });
  });

  it('falls back gracefully when suggestion throws (one tx)', async () => {
    mocks.fromSpy
      .mockReturnValueOnce(pendingChain({ data: [TX], error: null }))
      .mockReturnValueOnce(categoriesChain({ data: [CAT], error: null }));
    mocks.invoke.mockRejectedValueOnce(new Error('edge oops'));
    const r = await categorizationClient.loadPendingWithSuggestions();
    expect(r.items[0].suggestedCategoryId).toBeNull();
    expect(r.items[0].confidence).toBe(0);
    expect(r.items[0].matchedBy).toBe('fallback');
    expect(r.items[0].suggestedCategoryName).toBe('Da categorizzare');
  });
});

describe('CategorizationApiError', () => {
  it('carries code + statusCode + details', () => {
    const e = new CategorizationApiError('msg', 500, 'fetch_failed', {
      x: 1,
    });
    expect(e.name).toBe('CategorizationApiError');
    expect(e.code).toBe('fetch_failed');
    expect(e.details).toEqual({ x: 1 });
    expect(e instanceof CategorizationApiError).toBe(true);
  });
});
