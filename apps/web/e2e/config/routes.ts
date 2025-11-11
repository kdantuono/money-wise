/**
 * Route Constants
 * Central location for all application routes used in E2E tests
 */

export const ROUTES = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
  },

  // Main App
  DASHBOARD: '/dashboard',
  HOME: '/',

  // Banking
  BANKING: {
    INDEX: '/banking',
    CALLBACK: '/banking/callback',
    ACCOUNTS: '/banking/accounts',
    LINK: '/banking/link',
  },

  // Accounts
  ACCOUNTS: {
    INDEX: '/accounts',
    CREATE: '/accounts/create',
    DETAILS: (id: string) => `/accounts/${id}`,
    EDIT: (id: string) => `/accounts/${id}/edit`,
  },

  // Transactions
  TRANSACTIONS: {
    INDEX: '/transactions',
    CREATE: '/transactions/create',
    DETAILS: (id: string) => `/transactions/${id}`,
    EDIT: (id: string) => `/transactions/${id}/edit`,
  },

  // Budgets
  BUDGETS: {
    INDEX: '/budgets',
    CREATE: '/budgets/create',
    DETAILS: (id: string) => `/budgets/${id}`,
    EDIT: (id: string) => `/budgets/${id}/edit`,
  },

  // Reports
  REPORTS: {
    INDEX: '/reports',
    INCOME_EXPENSE: '/reports/income-expense',
    CASH_FLOW: '/reports/cash-flow',
    SPENDING: '/reports/spending',
    TRENDS: '/reports/trends',
  },

  // Settings
  SETTINGS: {
    INDEX: '/settings',
    PROFILE: '/settings/profile',
    SECURITY: '/settings/security',
    PREFERENCES: '/settings/preferences',
    NOTIFICATIONS: '/settings/notifications',
    BANKING: '/settings/banking',
  },

  // Other
  HELP: '/help',
  ABOUT: '/about',
  PRIVACY: '/privacy',
  TERMS: '/terms',
} as const;

/**
 * API Route Constants
 * Backend API endpoints
 */
export const API_ROUTES = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    PROFILE: '/api/auth/profile',
    VERIFY_EMAIL: '/api/auth/verify-email',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
  },

  // Health
  HEALTH: '/api/health',

  // Accounts
  ACCOUNTS: {
    LIST: '/api/accounts',
    CREATE: '/api/accounts',
    GET: (id: string) => `/api/accounts/${id}`,
    UPDATE: (id: string) => `/api/accounts/${id}`,
    DELETE: (id: string) => `/api/accounts/${id}`,
  },

  // Transactions
  TRANSACTIONS: {
    LIST: '/api/transactions',
    CREATE: '/api/transactions',
    GET: (id: string) => `/api/transactions/${id}`,
    UPDATE: (id: string) => `/api/transactions/${id}`,
    DELETE: (id: string) => `/api/transactions/${id}`,
  },

  // Banking
  BANKING: {
    CONNECT: '/api/banking/connect',
    CALLBACK: '/api/banking/callback',
    ACCOUNTS: '/api/banking/accounts',
    SYNC: (accountId: string) => `/api/banking/accounts/${accountId}/sync`,
    DISCONNECT: (connectionId: string) => `/api/banking/connections/${connectionId}`,
  },

  // Budgets
  BUDGETS: {
    LIST: '/api/budgets',
    CREATE: '/api/budgets',
    GET: (id: string) => `/api/budgets/${id}`,
    UPDATE: (id: string) => `/api/budgets/${id}`,
    DELETE: (id: string) => `/api/budgets/${id}`,
  },

  // Reports
  REPORTS: {
    SUMMARY: '/api/reports/summary',
    INCOME_EXPENSE: '/api/reports/income-expense',
    CASH_FLOW: '/api/reports/cash-flow',
    SPENDING: '/api/reports/spending',
  },
} as const;

/**
 * Helper to check if current URL matches a route
 */
export function matchesRoute(currentUrl: string, route: string): boolean {
  return currentUrl.includes(route);
}

/**
 * Helper to build URL with query params
 */
export function buildUrl(route: string, params?: Record<string, string | number>): string {
  if (!params) return route;

  const queryString = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  return `${route}?${queryString}`;
}
