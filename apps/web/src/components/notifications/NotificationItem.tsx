'use client';

import { formatDistanceToNow } from 'date-fns';
import { X, AlertCircle, DollarSign, CreditCard, Target, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '@/types/notification.types';

/**
 * Props for NotificationItem component
 */
interface NotificationItemProps {
  /** The notification to display */
  notification: Notification;
  /** Callback when notification is clicked */
  onClick?: (notification: Notification) => void;
  /** Callback when dismiss button is clicked */
  onDismiss?: (id: string) => void;
  /** Whether dismiss action is in progress */
  isDismissing?: boolean;
}

/**
 * Get icon color based on notification type and priority
 */
function getIconColor(type: NotificationType, priority: string): string {
  if (priority === 'critical' || priority === 'high') {
    return 'text-red-500';
  }
  switch (type) {
    case 'budget-alert':
      return 'text-amber-500';
    case 'transaction-received':
      return 'text-green-500';
    case 'account-sync-failed':
      return 'text-red-500';
    case 'goal-milestone':
      return 'text-blue-500';
    case 'system':
    default:
      return 'text-gray-500';
  }
}

/**
 * Render notification icon based on type
 */
function NotificationIcon({ type }: { type: NotificationType }) {
  const className = 'h-4 w-4';
  switch (type) {
    case 'budget-alert':
      return <AlertCircle className={className} />;
    case 'transaction-received':
      return <DollarSign className={className} />;
    case 'account-sync-failed':
      return <CreditCard className={className} />;
    case 'goal-milestone':
      return <Target className={className} />;
    case 'system':
    default:
      return <Bell className={className} />;
  }
}

/**
 * Individual notification item component
 *
 * Displays a single notification with icon, title, message, and timestamp.
 * Supports click to view and dismiss actions.
 */
export function NotificationItem({
  notification,
  onClick,
  onDismiss,
  isDismissing,
}: NotificationItemProps) {
  const iconColor = getIconColor(notification.type, notification.priority);
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  });

  const handleClick = () => {
    onClick?.(notification);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss?.(notification.id);
  };

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors',
        !notification.read && 'bg-blue-50/50'
      )}
      onClick={handleClick}
      data-testid={`notification-item-${notification.id}`}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 mt-0.5 p-2 rounded-full bg-gray-100',
          iconColor
        )}
      >
        <NotificationIcon type={notification.type} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm font-medium text-gray-900 truncate',
              !notification.read && 'font-semibold'
            )}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <span className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-blue-500" />
          )}
        </div>
        <p className="mt-0.5 text-sm text-gray-600 line-clamp-2">
          {notification.message}
        </p>
        <p className="mt-1 text-xs text-gray-400">{timeAgo}</p>
      </div>

      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={handleDismiss}
          disabled={isDismissing}
          className={cn(
            'flex-shrink-0 p-1 rounded-full text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-600 hover:bg-gray-200 transition-all',
            isDismissing && 'opacity-50 cursor-not-allowed'
          )}
          data-testid={`notification-dismiss-${notification.id}`}
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default NotificationItem;
