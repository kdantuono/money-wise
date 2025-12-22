/**
 * Notification Types
 *
 * Type definitions for notification data.
 * These types mirror the backend DTOs for type-safe data fetching.
 */

/**
 * Valid notification types
 */
export type NotificationType =
  | 'budget-alert'
  | 'transaction-received'
  | 'account-sync-failed'
  | 'goal-milestone'
  | 'system';

/**
 * Notification priority levels
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Individual notification
 */
export interface Notification {
  /** Notification ID */
  id: string;
  /** User ID this notification belongs to */
  userId: string;
  /** Type of notification */
  type: NotificationType;
  /** Notification title */
  title: string;
  /** Notification message */
  message: string;
  /** Priority level */
  priority: NotificationPriority;
  /** Whether the notification has been read */
  read: boolean;
  /** Whether the notification has been dismissed */
  dismissed: boolean;
  /** Optional URL for action */
  actionUrl?: string;
  /** Optional label for action button */
  actionLabel?: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Query parameters for fetching notifications
 */
export interface NotificationQueryParams {
  /** Filter by read status */
  read?: boolean;
  /** Filter by type */
  type?: NotificationType;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  limit?: number;
}

/**
 * Paginated notification response
 */
export interface NotificationListResponse {
  /** List of notifications */
  data: Notification[];
  /** Total count of notifications matching query */
  total: number;
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Whether there are more pages */
  hasMore: boolean;
}

/**
 * Unread count response
 */
export interface UnreadCountResponse {
  /** Number of unread notifications */
  count: number;
}
