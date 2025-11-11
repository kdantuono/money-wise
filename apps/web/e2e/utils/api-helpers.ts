/**
 * API Helpers
 * Utilities for mocking and intercepting API calls in E2E tests
 */

import { Page, Route } from '@playwright/test';
import { API_ROUTES } from '../config/routes';

export interface MockApiResponse {
  status?: number;
  body?: any;
  headers?: Record<string, string>;
  delay?: number;
}

/**
 * API helper class for mocking and intercepting requests
 */
export class ApiHelper {
  constructor(private page: Page) {}

  /**
   * Mock an API endpoint with a custom response
   */
  async mockEndpoint(urlPattern: string | RegExp, response: MockApiResponse): Promise<void> {
    await this.page.route(urlPattern, async (route) => {
      if (response.delay) {
        await new Promise((resolve) => setTimeout(resolve, response.delay));
      }

      await route.fulfill({
        status: response.status || 200,
        body: JSON.stringify(response.body),
        headers: {
          'Content-Type': 'application/json',
          ...response.headers,
        },
      });
    });
  }

  /**
   * Mock successful login
   */
  async mockLoginSuccess(userData: any = {}): Promise<void> {
    await this.mockEndpoint(API_ROUTES.AUTH.LOGIN, {
      status: 200,
      body: {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: '1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          ...userData,
        },
      },
    });
  }

  /**
   * Mock login failure
   */
  async mockLoginFailure(message: string = 'Invalid credentials'): Promise<void> {
    await this.mockEndpoint(API_ROUTES.AUTH.LOGIN, {
      status: 401,
      body: {
        error: 'Unauthorized',
        message,
      },
    });
  }

  /**
   * Mock network error
   */
  async mockNetworkError(urlPattern: string | RegExp): Promise<void> {
    await this.page.route(urlPattern, (route) => route.abort('failed'));
  }

  /**
   * Mock slow API response (for loading state testing)
   */
  async mockSlowResponse(urlPattern: string | RegExp, delay: number = 3000): Promise<void> {
    await this.page.route(urlPattern, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      await route.continue();
    });
  }

  /**
   * Mock server error (500)
   */
  async mockServerError(urlPattern: string | RegExp, message: string = 'Internal Server Error'): Promise<void> {
    await this.mockEndpoint(urlPattern, {
      status: 500,
      body: {
        error: 'Internal Server Error',
        message,
      },
    });
  }

  /**
   * Mock validation error (400)
   */
  async mockValidationError(urlPattern: string | RegExp, errors: Record<string, string[]>): Promise<void> {
    await this.mockEndpoint(urlPattern, {
      status: 400,
      body: {
        error: 'Bad Request',
        message: 'Validation failed',
        errors,
      },
    });
  }

  /**
   * Mock unauthorized error (401)
   */
  async mockUnauthorized(urlPattern: string | RegExp): Promise<void> {
    await this.mockEndpoint(urlPattern, {
      status: 401,
      body: {
        error: 'Unauthorized',
        message: 'Authentication required',
      },
    });
  }

  /**
   * Mock forbidden error (403)
   */
  async mockForbidden(urlPattern: string | RegExp): Promise<void> {
    await this.mockEndpoint(urlPattern, {
      status: 403,
      body: {
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      },
    });
  }

  /**
   * Mock not found error (404)
   */
  async mockNotFound(urlPattern: string | RegExp): Promise<void> {
    await this.mockEndpoint(urlPattern, {
      status: 404,
      body: {
        error: 'Not Found',
        message: 'Resource not found',
      },
    });
  }

  /**
   * Intercept and modify request
   */
  async interceptRequest(
    urlPattern: string | RegExp,
    modifier: (route: Route) => Promise<void> | void
  ): Promise<void> {
    await this.page.route(urlPattern, modifier);
  }

  /**
   * Capture all requests to a URL pattern
   */
  async captureRequests(urlPattern: string | RegExp): Promise<Request[]> {
    const requests: Request[] = [];

    await this.page.route(urlPattern, async (route) => {
      requests.push(route.request());
      await route.continue();
    });

    return requests;
  }

  /**
   * Wait for specific API request
   */
  async waitForRequest(urlPattern: string | RegExp, timeout?: number): Promise<void> {
    await this.page.waitForRequest(urlPattern, { timeout });
  }

  /**
   * Wait for specific API response
   */
  async waitForResponse(urlPattern: string | RegExp, timeout?: number): Promise<void> {
    await this.page.waitForResponse(urlPattern, { timeout });
  }

  /**
   * Remove all route handlers
   */
  async clearMocks(): Promise<void> {
    await this.page.unrouteAll({ behavior: 'wait' });
  }

  /**
   * Mock transactions list
   */
  async mockTransactionsList(transactions: any[] = []): Promise<void> {
    await this.mockEndpoint(API_ROUTES.TRANSACTIONS.LIST, {
      status: 200,
      body: {
        data: transactions,
        total: transactions.length,
        page: 1,
        pageSize: 20,
      },
    });
  }

  /**
   * Mock accounts list
   */
  async mockAccountsList(accounts: any[] = []): Promise<void> {
    await this.mockEndpoint(API_ROUTES.ACCOUNTS.LIST, {
      status: 200,
      body: {
        data: accounts,
        total: accounts.length,
      },
    });
  }

  /**
   * Mock empty list response
   */
  async mockEmptyList(urlPattern: string | RegExp): Promise<void> {
    await this.mockEndpoint(urlPattern, {
      status: 200,
      body: {
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
      },
    });
  }
}

/**
 * Create API helper for a page
 */
export function createApiHelper(page: Page): ApiHelper {
  return new ApiHelper(page);
}

/**
 * Response builders for common scenarios
 */
export const MockResponses = {
  success: (data: any = {}, message: string = 'Success'): MockApiResponse => ({
    status: 200,
    body: { success: true, data, message },
  }),

  created: (data: any = {}, message: string = 'Created successfully'): MockApiResponse => ({
    status: 201,
    body: { success: true, data, message },
  }),

  noContent: (): MockApiResponse => ({
    status: 204,
    body: null,
  }),

  badRequest: (message: string = 'Bad request', errors?: Record<string, string[]>): MockApiResponse => ({
    status: 400,
    body: { error: 'Bad Request', message, errors },
  }),

  unauthorized: (message: string = 'Unauthorized'): MockApiResponse => ({
    status: 401,
    body: { error: 'Unauthorized', message },
  }),

  forbidden: (message: string = 'Forbidden'): MockApiResponse => ({
    status: 403,
    body: { error: 'Forbidden', message },
  }),

  notFound: (message: string = 'Not found'): MockApiResponse => ({
    status: 404,
    body: { error: 'Not Found', message },
  }),

  serverError: (message: string = 'Internal server error'): MockApiResponse => ({
    status: 500,
    body: { error: 'Internal Server Error', message },
  }),

  paginatedList: (data: any[], page: number = 1, pageSize: number = 20): MockApiResponse => ({
    status: 200,
    body: {
      data,
      total: data.length,
      page,
      pageSize,
      totalPages: Math.ceil(data.length / pageSize),
    },
  }),
};
