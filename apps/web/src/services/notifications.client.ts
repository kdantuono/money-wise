/**
 * Notifications API Client
 *
 * Provides type-safe HTTP client for notification endpoints.
 * Handles authentication, error handling, and request/response interceptors.
 *
 * @module services/notifications.client
 *
 * @example
 * ```typescript
 * // Get notifications
 * const notifications = await notificationsClient.getNotifications({ limit: 10 });
 *
 * // Get unread count
 * const { count } = await notificationsClient.getUnreadCount();
 *
 * // Mark as read
 * await notificationsClient.markAsRead('notification-id');
 *
 * // Mark all as read
 * await notificationsClient.markAllAsRead();
 * ```
 */

import { getCsrfToken } from '@/utils/csrf';
import type {
  Notification,
  NotificationQueryParams,
  NotificationListResponse,
  UnreadCountResponse,
} from '@/types/notification.types';

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Base error class for notifications API errors
 */
export class NotificationsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'NotificationsApiError';
    Object.setPrototypeOf(this, NotificationsApiError.prototype);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends NotificationsApiError {
  constructor(message: string = 'Authentication failed. Please log in again.') {
    super(message, 401, 'AuthenticationError');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends NotificationsApiError {
  constructor(message: string = 'Notification not found.') {
    super(message, 404, 'NotFoundError');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Server error (500)
 */
export class ServerError extends NotificationsApiError {
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
 * API base URL - uses relative path to go through BFF proxy
 * This ensures cookies are properly included (same-origin requests)
 */
const API_BASE_URL = '/api/notifications';

/**
 * HTTP error response structure
 */
interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
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

  // Throw appropriate error type
  switch (statusCode) {
    case 401:
      throw new AuthenticationError(message);
    case 404:
      throw new NotFoundError(message);
    case 500:
    case 502:
    case 503:
    case 504:
      throw new ServerError(message);
    default:
      throw new NotificationsApiError(
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
  const url = `${API_BASE_URL}${endpoint}`;

  // Include CSRF token for mutations (PATCH, POST, DELETE)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const method = options.method?.toUpperCase() || 'GET';
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text);
}

// =============================================================================
// Notifications API Client
// =============================================================================

/**
 * Notifications API Client
 *
 * Provides methods for fetching and managing notifications.
 * All methods are authenticated and include proper error handling.
 */
export const notificationsClient = {
  /**
   * Get notifications with optional filters
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated notification list
   */
  async getNotifications(
    params: NotificationQueryParams = {}
  ): Promise<NotificationListResponse> {
    const searchParams = new URLSearchParams();
    if (params.read !== undefined) searchParams.set('read', String(params.read));
    if (params.type) searchParams.set('type', params.type);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const queryString = searchParams.toString();
    const endpoint = queryString ? `?${queryString}` : '';

    return request<NotificationListResponse>(endpoint, {
      method: 'GET',
    });
  },

  /**
   * Get unread notification count
   *
   * @returns Unread count
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    return request<UnreadCountResponse>('/unread-count', {
      method: 'GET',
    });
  },

  /**
   * Mark a single notification as read
   *
   * @param id - Notification ID
   * @returns Updated notification
   */
  async markAsRead(id: string): Promise<Notification> {
    return request<Notification>(`/${id}/read`, {
      method: 'PATCH',
    });
  },

  /**
   * Mark all notifications as read
   *
   * @returns Success response with count of updated notifications
   */
  async markAllAsRead(): Promise<{ count: number }> {
    return request<{ count: number }>('/read-all', {
      method: 'PATCH',
    });
  },

  /**
   * Dismiss a notification
   *
   * @param id - Notification ID
   * @returns Updated notification
   */
  async dismiss(id: string): Promise<Notification> {
    return request<Notification>(`/${id}/dismiss`, {
      method: 'PATCH',
    });
  },
};

export default notificationsClient;
