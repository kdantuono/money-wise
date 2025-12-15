'use client';

import Link from 'next/link';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { NotificationItem } from './NotificationItem';
import type { Notification } from '@/types/notification.types';

/**
 * Props for NotificationDropdown component
 */
interface NotificationDropdownProps {
  /** List of notifications to display */
  notifications: Notification[];
  /** Whether notifications are loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error?: Error | null;
  /** Callback when a notification is clicked */
  onNotificationClick?: (notification: Notification) => void;
  /** Callback to mark a notification as read */
  onMarkAsRead?: (id: string) => void;
  /** Callback to dismiss a notification */
  onDismiss?: (id: string) => void;
  /** Callback to mark all notifications as read */
  onMarkAllAsRead?: () => void;
  /** Whether mark all as read is in progress */
  isMarkingAllRead?: boolean;
  /** Whether a dismiss action is in progress */
  isDismissing?: boolean;
  /** Callback to close the dropdown */
  onClose?: () => void;
}

/**
 * Notification dropdown content
 *
 * Displays a list of notifications with actions like mark as read and dismiss.
 * Shows loading state, empty state, and error state appropriately.
 */
export function NotificationDropdown({
  notifications,
  isLoading,
  error,
  onNotificationClick,
  onMarkAsRead,
  onDismiss,
  onMarkAllAsRead,
  isMarkingAllRead,
  isDismissing,
  onClose,
}: NotificationDropdownProps) {
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.read) {
      onMarkAsRead?.(notification.id);
    }
    onNotificationClick?.(notification);

    // Navigate if there's an action URL
    if (notification.actionUrl) {
      onClose?.();
    }
  };

  return (
    <div
      className="w-80 sm:w-96 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden"
      data-testid="notifications-dropdown"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
        {notifications.length > 0 && (
          <button
            onClick={onMarkAllAsRead}
            disabled={isMarkingAllRead}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="mark-all-read-button"
          >
            {isMarkingAllRead ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCheck className="h-3 w-3" />
            )}
            Mark all read
          </button>
        )}
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-red-600">Failed to load notifications</p>
            <p className="mt-1 text-xs text-gray-500">{error.message}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="h-8 w-8 mx-auto text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No new notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={handleNotificationClick}
                onDismiss={onDismiss}
                isDismissing={isDismissing}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-gray-100">
          <Link
            href="/dashboard/notifications"
            className="block px-4 py-3 text-center text-sm text-blue-600 hover:text-blue-700 hover:bg-gray-50 transition-colors"
            onClick={onClose}
            data-testid="view-all-notifications-link"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
