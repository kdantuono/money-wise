/**
 * Notification Hooks
 *
 * React Query hooks for fetching and managing notifications.
 * These hooks provide caching, automatic refetching, and error handling.
 *
 * @module hooks/useNotifications
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsClient } from '@/services/notifications.client';
import type {
  Notification,
  NotificationQueryParams,
  NotificationListResponse,
  UnreadCountResponse,
} from '@/types/notification.types';

/**
 * Query keys for notifications
 */
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (params: NotificationQueryParams) =>
    [...notificationKeys.lists(), params] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

/**
 * Hook to fetch notifications with filters
 *
 * @param params - Query parameters for filtering and pagination
 * @returns Query result with notifications
 *
 * @example
 * ```typescript
 * const { data, isLoading, error } = useNotifications({ limit: 10 });
 * ```
 */
export function useNotifications(params: NotificationQueryParams = {}) {
  return useQuery<NotificationListResponse, Error>({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationsClient.getNotifications(params),
    staleTime: 1 * 60 * 1000, // 1 minute (notifications change often)
    refetchOnMount: 'always',
  });
}

/**
 * Hook to fetch unread notification count
 *
 * @returns Query result with unread count
 *
 * @example
 * ```typescript
 * const { data: { count } } = useUnreadCount();
 * ```
 */
export function useUnreadCount() {
  return useQuery<UnreadCountResponse, Error>({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsClient.getUnreadCount(),
    staleTime: 30 * 1000, // 30 seconds (unread count should be fresh)
    refetchInterval: 60 * 1000, // Poll every 60 seconds
    refetchOnMount: 'always',
  });
}

/**
 * Hook to mark a notification as read
 *
 * @returns Mutation for marking notification as read
 *
 * @example
 * ```typescript
 * const markAsRead = useMarkAsRead();
 * markAsRead.mutate('notification-id');
 * ```
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation<Notification, Error, string>({
    mutationFn: (id: string) => notificationsClient.markAsRead(id),
    onSuccess: () => {
      // Invalidate and refetch notifications and unread count
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Hook to mark all notifications as read
 *
 * @returns Mutation for marking all notifications as read
 *
 * @example
 * ```typescript
 * const markAllAsRead = useMarkAllAsRead();
 * markAllAsRead.mutate();
 * ```
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation<{ count: number }, Error, void>({
    mutationFn: () => notificationsClient.markAllAsRead(),
    onSuccess: () => {
      // Invalidate and refetch notifications and unread count
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Hook to dismiss a notification
 *
 * @returns Mutation for dismissing notification
 *
 * @example
 * ```typescript
 * const dismiss = useDismissNotification();
 * dismiss.mutate('notification-id');
 * ```
 */
export function useDismissNotification() {
  const queryClient = useQueryClient();

  return useMutation<Notification, Error, string>({
    mutationFn: (id: string) => notificationsClient.dismiss(id),
    onSuccess: () => {
      // Invalidate and refetch notifications and unread count
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Combined hook for notification bell functionality
 *
 * Provides notifications list, unread count, and mutation functions.
 *
 * @param limit - Number of notifications to fetch (default: 5)
 * @returns Combined notification data and actions
 *
 * @example
 * ```typescript
 * const {
 *   notifications,
 *   unreadCount,
 *   isLoading,
 *   markAsRead,
 *   markAllAsRead,
 *   dismiss,
 * } = useNotificationBell();
 * ```
 */
export function useNotificationBell(limit: number = 5) {
  const notificationsQuery = useNotifications({ limit, read: false });
  const unreadCountQuery = useUnreadCount();
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const dismissMutation = useDismissNotification();

  return {
    notifications: notificationsQuery.data?.data ?? [],
    unreadCount: unreadCountQuery.data?.count ?? 0,
    isLoading: notificationsQuery.isLoading || unreadCountQuery.isLoading,
    error: notificationsQuery.error || unreadCountQuery.error,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    dismiss: dismissMutation.mutate,
    isMarkingRead: markAsReadMutation.isPending,
    isMarkingAllRead: markAllAsReadMutation.isPending,
    isDismissing: dismissMutation.isPending,
    refetch: () => {
      notificationsQuery.refetch();
      unreadCountQuery.refetch();
    },
  };
}
