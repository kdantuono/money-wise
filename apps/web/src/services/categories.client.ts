/**
 * Categories API Client
 *
 * Provides type-safe HTTP client for category management endpoints.
 * Handles authentication, error handling, and request/response formatting.
 *
 * @module services/categories.client
 *
 * @example
 * ```typescript
 * // Get all categories
 * const categories = await categoriesClient.getAll();
 *
 * // Get expense categories only
 * const expenses = await categoriesClient.getAll('EXPENSE');
 *
 * // Get a specific category
 * const category = await categoriesClient.getOne('category-id');
 * ```
 */

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Category type for filtering
 */
export type CategoryType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

/**
 * Category status
 */
export type CategoryStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

/**
 * Category rule for auto-categorization
 */
export interface CategoryRule {
  keywords?: string[];
  merchantPatterns?: string[];
  autoAssign?: boolean;
  confidence?: number;
}

/**
 * Category metadata
 */
export interface CategoryMetadata {
  budgetEnabled?: boolean;
  monthlyLimit?: number;
  taxDeductible?: boolean;
}

/**
 * Category entity from API
 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: CategoryType;
  status: CategoryStatus;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
  isSystem: boolean;
  sortOrder: number;
  parentId: string | null;
  familyId: string;
  rules: CategoryRule | null;
  metadata: CategoryMetadata | null;
  createdAt: string;
  updatedAt: string;
  children?: Category[];
  parent?: Category | null;
}

/**
 * Simplified category for dropdowns and selectors
 */
export interface CategoryOption {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  parentId: string | null;
  isSystem: boolean;
}

/**
 * HTTP error response structure
 */
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp?: string;
  path?: string;
}

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Base error class for categories API errors
 */
export class CategoriesApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'CategoriesApiError';
    Object.setPrototypeOf(this, CategoriesApiError.prototype);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends CategoriesApiError {
  constructor(message: string = 'Authentication failed. Please log in again.') {
    super(message, 401, 'AuthenticationError');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends CategoriesApiError {
  constructor(
    message: string = 'You do not have permission to perform this action.'
  ) {
    super(message, 403, 'AuthorizationError');
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends CategoriesApiError {
  constructor(message: string = 'Category not found.') {
    super(message, 404, 'NotFoundError');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends CategoriesApiError {
  constructor(message: string = 'Invalid request data.', details?: unknown) {
    super(message, 400, 'ValidationError', details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Server error (500)
 */
export class ServerError extends CategoriesApiError {
  constructor(
    message: string = 'Internal server error. Please try again later.'
  ) {
    super(message, 500, 'ServerError');
    this.name = 'ServerError';
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

// =============================================================================
// HTTP Client Configuration
// =============================================================================

/**
 * Get the API base URL from environment variables
 */
function getApiBaseUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

/**
 * Check if code is running in development mode
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Log request details in development mode
 */
function logRequest(method: string, url: string, data?: unknown): void {
  if (isDevelopment()) {
    console.log(`[Categories API] ${method} ${url}`, data ? { body: data } : '');
  }
}

/**
 * Log response details in development mode
 */
function logResponse(
  method: string,
  url: string,
  status: number,
  data?: unknown
): void {
  if (isDevelopment()) {
    console.log(`[Categories API] ${method} ${url} -> ${status}`, data || '');
  }
}

/**
 * Parse error response and throw appropriate error
 */
async function handleErrorResponse(response: Response): Promise<never> {
  let errorData: ApiErrorResponse | null = null;

  try {
    const text = await response.text();
    if (text) {
      errorData = JSON.parse(text);
    }
  } catch {
    // Failed to parse error response
  }

  const statusCode = response.status;
  const message = errorData?.message
    ? Array.isArray(errorData.message)
      ? errorData.message.join(', ')
      : errorData.message
    : response.statusText || 'An error occurred';

  // Log error in development
  if (isDevelopment()) {
    console.error(`[Categories API] Error ${statusCode}:`, errorData || message);
  }

  // Throw appropriate error type
  switch (statusCode) {
    case 400:
      throw new ValidationError(message, errorData);
    case 401:
      throw new AuthenticationError(message);
    case 403:
      throw new AuthorizationError(message);
    case 404:
      throw new NotFoundError(message);
    case 500:
    case 502:
    case 503:
    case 504:
      throw new ServerError(message);
    default:
      throw new CategoriesApiError(
        message,
        statusCode,
        errorData?.error,
        errorData
      );
  }
}

/**
 * Make HTTP request with authentication and error handling
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  // Log request in development
  logRequest(options.method || 'GET', url, options.body);

  // Make request with cookies (authentication handled by HttpOnly cookies)
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle errors
  if (!response.ok) {
    await handleErrorResponse(response);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    logResponse(options.method || 'GET', url, response.status);
    return undefined as T;
  }

  // Parse JSON response
  const data = await response.json();
  logResponse(options.method || 'GET', url, response.status, data);

  return data as T;
}

// =============================================================================
// Categories API Client
// =============================================================================

/**
 * Categories API Client
 *
 * Provides methods for interacting with category management endpoints.
 * All methods are authenticated and include proper error handling.
 */
export const categoriesClient = {
  /**
   * Get all categories for the user's family
   *
   * @param type - Optional filter by category type (EXPENSE, INCOME, TRANSFER)
   * @returns List of categories
   * @throws {AuthenticationError} If not authenticated
   * @throws {ServerError} If server error occurs
   *
   * @example
   * ```typescript
   * // Get all categories
   * const categories = await categoriesClient.getAll();
   *
   * // Get expense categories only
   * const expenses = await categoriesClient.getAll('EXPENSE');
   * ```
   */
  async getAll(type?: CategoryType): Promise<Category[]> {
    const queryParams = type ? `?type=${type}` : '';
    return request<Category[]>(`/api/categories${queryParams}`, {
      method: 'GET',
    });
  },

  /**
   * Get a specific category by ID
   *
   * @param id - Category ID
   * @returns Category with optional parent/children relations
   * @throws {AuthenticationError} If not authenticated
   * @throws {NotFoundError} If category not found
   * @throws {AuthorizationError} If category belongs to different family
   * @throws {ServerError} If server error occurs
   *
   * @example
   * ```typescript
   * const category = await categoriesClient.getOne('category-id');
   * console.log(`${category.name} (${category.type})`);
   * ```
   */
  async getOne(id: string): Promise<Category> {
    return request<Category>(`/api/categories/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Get categories as options for dropdown/selector
   * Returns simplified category data sorted by type and name
   *
   * @param type - Optional filter by category type
   * @returns List of category options
   *
   * @example
   * ```typescript
   * const options = await categoriesClient.getOptions('EXPENSE');
   * // Use in a <select> or dropdown component
   * ```
   */
  async getOptions(type?: CategoryType): Promise<CategoryOption[]> {
    const categories = await this.getAll(type);

    // Filter to active categories only and map to options
    return categories
      .filter(cat => cat.status === 'ACTIVE')
      .sort((a, b) => {
        // Sort by type first (EXPENSE, INCOME, TRANSFER)
        if (a.type !== b.type) {
          const typeOrder = { EXPENSE: 0, INCOME: 1, TRANSFER: 2 };
          return typeOrder[a.type] - typeOrder[b.type];
        }
        // Then by sortOrder
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        // Finally by name
        return a.name.localeCompare(b.name);
      })
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        parentId: cat.parentId,
        isSystem: cat.isSystem,
      }));
  },
};

// =============================================================================
// Exports
// =============================================================================

export default categoriesClient;
