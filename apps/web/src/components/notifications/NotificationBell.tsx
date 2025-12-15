'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationBell } from '@/hooks/useNotifications';
import { NotificationDropdown } from './NotificationDropdown';
import type { Notification } from '@/types/notification.types';

/**
 * Props for NotificationBell component
 */
interface NotificationBellProps {
  /** Custom class name for the button */
  className?: string;
  /** Callback when a notification is clicked (for navigation) */
  onNotificationClick?: (notification: Notification) => void;
}

/**
 * Notification bell button with dropdown
 *
 * Displays a bell icon with unread count badge. Clicking opens a dropdown
 * showing recent notifications with actions to mark as read or dismiss.
 *
 * @example
 * ```tsx
 * <NotificationBell
 *   onNotificationClick={(n) => router.push(n.actionUrl || '/notifications')}
 * />
 * ```
 */
export function NotificationBell({
  className,
  onNotificationClick,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    dismiss,
    isMarkingAllRead,
    isDismissing,
  } = useNotificationBell(5);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = (notification: Notification) => {
    onNotificationClick?.(notification);
    if (notification.actionUrl) {
      setIsOpen(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={cn(
          'p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100 relative transition-colors',
          isOpen && 'bg-gray-100 text-gray-500',
          className
        )}
        data-testid="notification-bell"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-6 w-6" />
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white"
            data-testid="notification-badge"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 z-50"
          role="dialog"
          aria-label="Notifications"
        >
          <NotificationDropdown
            notifications={notifications}
            isLoading={isLoading}
            error={error}
            onNotificationClick={handleNotificationClick}
            onMarkAsRead={markAsRead}
            onDismiss={dismiss}
            onMarkAllAsRead={markAllAsRead}
            isMarkingAllRead={isMarkingAllRead}
            isDismissing={isDismissing}
            onClose={handleClose}
          />
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
