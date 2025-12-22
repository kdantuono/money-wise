/**
 * Financial Alerts Widget
 *
 * Displays priority notifications including budget alerts and bill reminders.
 * Shows 3-5 most recent unread notifications with appropriate icons and colors.
 *
 * @module components/dashboard/FinancialAlertsWidget
 */

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { notificationsClient } from '@/services/notifications.client';
import type { Notification, NotificationType } from '@/types/notification.types';
import { cn } from '@/lib/utils';

// ============================================================================
// Icons
// ============================================================================

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function DollarSignIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get icon for notification type
 */
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'budget-alert':
      return <AlertTriangleIcon />;
    case 'transaction-received':
      return <DollarSignIcon />;
    case 'goal-milestone':
      return <CheckCircleIcon />;
    default:
      return <BellIcon />;
  }
}

/**
 * Get color classes for notification type and priority
 */
function getNotificationStyles(type: NotificationType, priority: string) {
  // Priority-based coloring for budget alerts
  if (type === 'budget-alert') {
    if (priority === 'critical' || priority === 'high') {
      return {
        bg: 'bg-red-50',
        border: 'border-l-red-500',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
      };
    }
    return {
      bg: 'bg-orange-50',
      border: 'border-l-orange-500',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    };
  }

  // Type-based coloring for other notifications
  switch (type) {
    case 'transaction-received':
      return {
        bg: 'bg-blue-50',
        border: 'border-l-blue-500',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
      };
    case 'goal-milestone':
      return {
        bg: 'bg-green-50',
        border: 'border-l-green-500',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
      };
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-l-gray-500',
        iconBg: 'bg-gray-100',
        iconColor: 'text-gray-600',
      };
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ============================================================================
// Component
// ============================================================================

function FinancialAlertsSkeleton() {
  return (
    <Card data-testid="financial-alerts-widget" aria-busy="true">
      <CardHeader>
        <CardTitle>Financial Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg bg-gray-50">
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Hook to fetch priority notifications
 */
function usePriorityNotifications() {
  return useQuery({
    queryKey: ['notifications', 'priority'],
    queryFn: async () => {
      const response = await notificationsClient.getNotifications({
        read: false,
        limit: 5,
      });

      // Filter for priority types: budget alerts and transaction notifications
      const priorityTypes: NotificationType[] = [
        'budget-alert',
        'transaction-received',
        'goal-milestone',
      ];

      const filtered = response.data.filter((notification: Notification) =>
        priorityTypes.includes(notification.type)
      );

      // Return top 5
      return filtered.slice(0, 5);
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 2,
    refetchOnWindowFocus: true,
  });
}

export function FinancialAlertsWidget() {
  const { data: notifications, isLoading, error } = usePriorityNotifications();

  if (isLoading) {
    return <FinancialAlertsSkeleton />;
  }

  if (error) {
    return (
      <Card data-testid="financial-alerts-widget">
        <CardHeader>
          <CardTitle>Financial Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-600 text-sm">Unable to load alerts</p>
            <p className="text-xs text-red-500 mt-1">
              {error instanceof Error ? error.message : 'Please try again'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <Card data-testid="financial-alerts-widget">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellIcon />
            Financial Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mx-auto mb-3">
              <CheckCircleIcon />
            </div>
            <p className="font-medium text-gray-900">No alerts - you're on track!</p>
            <p className="text-sm text-muted-foreground mt-1">
              All budgets and bills are in good shape
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="financial-alerts-widget">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BellIcon />
            Financial Alerts
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {notifications.length} unread
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {notifications.map((notification: Notification) => {
            const styles = getNotificationStyles(notification.type, notification.priority);
            const icon = getNotificationIcon(notification.type);

            return (
              <div
                key={notification.id}
                className={cn(
                  'flex gap-3 p-3 rounded-lg border-l-4 transition-colors hover:bg-gray-50',
                  styles.bg,
                  styles.border
                )}
                data-testid="alert-item"
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                    styles.iconBg,
                    styles.iconColor
                  )}
                >
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {notification.title}
                  </p>
                  <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                    {notification.actionUrl && notification.actionLabel && (
                      <Link
                        href={notification.actionUrl}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        {notification.actionLabel}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* View all link */}
          <Link
            href="/notifications"
            className="block text-center text-sm text-primary hover:underline pt-2"
          >
            View all notifications
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
