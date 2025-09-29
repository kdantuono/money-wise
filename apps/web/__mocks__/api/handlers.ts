import { http, HttpResponse } from 'msw';

// Mock login handler that works with the auth store format
const mockLoginHandler = async ({ request }: { request: Request }) => {
  const body = (await request.json()) as { email: string; password: string };

  if (body.email === 'test@example.com' && body.password === 'password') {
    return HttpResponse.json({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        status: 'active',
        fullName: 'Test User',
        isEmailVerified: true,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      expiresIn: 3600,
    });
  }

  return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
};

// Mock register handler
const mockRegisterHandler = async ({ request }: { request: Request }) => {
  const body = (await request.json()) as {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  };

  return HttpResponse.json({
    accessToken: 'mock-access-token-new',
    refreshToken: 'mock-refresh-token-new',
    user: {
      id: '2',
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      role: 'user',
      status: 'active',
      fullName: `${body.firstName} ${body.lastName}`,
      isEmailVerified: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    expiresIn: 3600,
  });
};

// Define mock API handlers that match both full URLs and relative paths
export const handlers = [
  // Authentication endpoints - both full URL and relative path
  http.post('http://localhost:3001/api/auth/login', mockLoginHandler),
  http.post('/api/auth/login', mockLoginHandler),

  http.post('http://localhost:3001/api/auth/register', mockRegisterHandler),
  http.post('/api/auth/register', mockRegisterHandler),

  http.post('http://localhost:3001/api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),
  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),

  // User profile endpoints
  http.get('http://localhost:3001/api/auth/profile', () => {
    return HttpResponse.json({
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      status: 'active',
      fullName: 'Test User',
      isEmailVerified: true,
      isActive: true,
      avatar: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
  }),

  http.get('http://localhost:3001/api/user/profile', () => {
    return HttpResponse.json({
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      status: 'active',
      fullName: 'Test User',
      isEmailVerified: true,
      isActive: true,
      avatar: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
  }),

  // Account endpoints
  http.get('http://localhost:3001/api/accounts', () => {
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

  http.post('http://localhost:3001/api/accounts', async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      type: string;
      initialBalance: number;
    };

    return HttpResponse.json({
      id: 3,
      name: body.name,
      type: body.type,
      balance: body.initialBalance,
      currency: 'USD',
      isActive: true,
    });
  }),

  // Transaction endpoints
  http.get('http://localhost:3001/api/transactions', () => {
    return HttpResponse.json({
      transactions: [
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
      ],
      total: 2,
      page: 1,
      pageSize: 10,
    });
  }),

  http.post('http://localhost:3001/api/transactions', async ({ request }) => {
    const body = (await request.json()) as {
      accountId: number;
      amount: number;
      description: string;
      category: string;
      type: 'debit' | 'credit';
    };

    return HttpResponse.json({
      id: 3,
      ...body,
      date: new Date().toISOString(),
    });
  }),

  // Analytics endpoints
  http.get('http://localhost:3001/api/analytics/summary', () => {
    return HttpResponse.json({
      totalBalance: 12345.67,
      monthlySpending: 2456.78,
      monthlyIncome: 5000.0,
      savingsGoalProgress: 68,
      topCategories: [
        { category: 'Food & Dining', amount: 567.89, percentage: 23 },
        { category: 'Transportation', amount: 245.67, percentage: 10 },
        { category: 'Entertainment', amount: 180.45, percentage: 7 },
      ],
    });
  }),
];