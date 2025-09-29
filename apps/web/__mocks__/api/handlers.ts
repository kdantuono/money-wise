import { http, HttpResponse } from 'msw';

// Define mock API handlers
export const handlers = [
  // Authentication endpoints
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };

    if (body.email === 'test@example.com' && body.password === 'password') {
      return HttpResponse.json({
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
        },
        token: 'mock-jwt-token',
      });
    }

    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const body = (await request.json()) as {
      email: string;
      password: string;
      name: string;
    };

    return HttpResponse.json({
      user: {
        id: 2,
        email: body.email,
        name: body.name,
      },
      token: 'mock-jwt-token-new-user',
    });
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),

  // User profile endpoints
  http.get('/api/user/profile', () => {
    return HttpResponse.json({
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      avatar: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
  }),

  http.put('/api/user/profile', async ({ request }) => {
    const body = (await request.json()) as { name?: string; email?: string };

    return HttpResponse.json({
      id: 1,
      email: body.email || 'test@example.com',
      name: body.name || 'Test User',
      avatar: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    });
  }),

  // Account endpoints
  http.get('/api/accounts', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Checking Account',
        type: 'checking',
        balance: 2500.0,
        currency: 'USD',
        isActive: true,
      },
      {
        id: 2,
        name: 'Savings Account',
        type: 'savings',
        balance: 10000.0,
        currency: 'USD',
        isActive: true,
      },
    ]);
  }),

  http.post('/api/accounts', async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      type: string;
      initialBalance?: number;
    };

    return HttpResponse.json({
      id: 3,
      name: body.name,
      type: body.type,
      balance: body.initialBalance || 0,
      currency: 'USD',
      isActive: true,
    });
  }),

  // Transaction endpoints
  http.get('/api/transactions', ({ request }) => {
    const url = new URL(request.url);
    const accountId = url.searchParams.get('accountId');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const mockTransactions = [
      {
        id: 1,
        accountId: 1,
        amount: -45.67,
        description: 'Grocery Store',
        category: 'Food & Dining',
        date: '2024-09-28T10:30:00Z',
        type: 'debit',
      },
      {
        id: 2,
        accountId: 1,
        amount: 2500.0,
        description: 'Salary Deposit',
        category: 'Income',
        date: '2024-09-25T08:00:00Z',
        type: 'credit',
      },
      {
        id: 3,
        accountId: 2,
        amount: -150.0,
        description: 'Transfer to Checking',
        category: 'Transfer',
        date: '2024-09-24T14:15:00Z',
        type: 'debit',
      },
    ];

    let filteredTransactions = mockTransactions;
    if (accountId) {
      filteredTransactions = mockTransactions.filter(
        t => t.accountId === parseInt(accountId)
      );
    }

    return HttpResponse.json({
      transactions: filteredTransactions.slice(0, limit),
      total: filteredTransactions.length,
      page: 1,
      pageSize: limit,
    });
  }),

  http.post('/api/transactions', async ({ request }) => {
    const body = (await request.json()) as {
      accountId: number;
      amount: number;
      description: string;
      category: string;
      type: 'debit' | 'credit';
    };

    return HttpResponse.json({
      id: 4,
      ...body,
      date: new Date().toISOString(),
    });
  }),

  // Analytics endpoints
  http.get('/api/analytics/spending', () => {
    return HttpResponse.json({
      categories: [
        { category: 'Food & Dining', amount: 456.78, percentage: 35.2 },
        { category: 'Transportation', amount: 234.56, percentage: 18.1 },
        { category: 'Shopping', amount: 189.23, percentage: 14.6 },
        { category: 'Entertainment', amount: 123.45, percentage: 9.5 },
        { category: 'Other', amount: 295.98, percentage: 22.6 },
      ],
      totalSpent: 1300.0,
      period: 'month',
    });
  }),

  http.get('/api/analytics/trends', () => {
    return HttpResponse.json({
      monthlySpending: [
        { month: '2024-07', amount: 1200.0 },
        { month: '2024-08', amount: 1350.0 },
        { month: '2024-09', amount: 1300.0 },
      ],
      monthlyIncome: [
        { month: '2024-07', amount: 2500.0 },
        { month: '2024-08', amount: 2500.0 },
        { month: '2024-09', amount: 2500.0 },
      ],
    });
  }),

  // Error simulation endpoints for testing
  http.get('/api/error/500', () => {
    return HttpResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }),

  http.get('/api/error/timeout', () => {
    return new Promise(() => {
      // Never resolves - simulates timeout
    });
  }),
];
