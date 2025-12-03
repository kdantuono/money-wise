/**
 * Loading UI Components
 *
 * Reusable loading state components following DRY principles.
 * Provides consistent loading UX across the application.
 *
 * Components:
 * - LoadingSpinner: Basic animated spinner
 * - LoadingScreen: Full-screen loading state
 * - LoadingCard: Card-style loading state
 * - LoadingButton: Button with integrated loading state
 *
 * @module components/ui/loading
 */

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Size variants for loading components
 */
type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Size class mappings for spinner dimensions
 */
const sizeClasses: Record<LoadingSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

/**
 * LoadingSpinner Props
 */
interface LoadingSpinnerProps {
  /** Size variant of the spinner */
  size?: LoadingSize;
  /** Additional CSS classes */
  className?: string;
}

/**
 * LoadingSpinner Component
 *
 * Animated circular spinner for indicating loading state.
 * Uses CSS animations for smooth, performant rotation.
 *
 * @example
 * ```tsx
 * <LoadingSpinner size="lg" />
 * ```
 */
export function LoadingSpinner({
  size = 'md',
  className
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-primary',
        
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
      aria-live="polite"
    >
      <span className="sr-only">Loading</span>
    </div>
  );
}

/**
 * LoadingScreen Props
 */
interface LoadingScreenProps {
  /** Loading message to display */
  message?: string;
  /** Size of the spinner */
  size?: LoadingSize;
}

/**
 * LoadingScreen Component
 *
 * Full-screen loading state with centered spinner and message.
 * Useful for page-level loading states.
 *
 * @example
 * ```tsx
 * <LoadingScreen message="Loading your dashboard..." size="xl" />
 * ```
 */
export function LoadingScreen({
  message = 'Loading...',
  size = 'lg'
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <LoadingSpinner size={size} />
        </div>
        <p className="text-gray-600 text-lg">{message}</p>
      </div>
    </div>
  );
}

/**
 * LoadingCard Props
 */
interface LoadingCardProps {
  /** Loading message to display */
  message?: string;
  /** Size of the spinner */
  size?: LoadingSize;
  /** Additional CSS classes */
  className?: string;
}

/**
 * LoadingCard Component
 *
 * Card-style loading state with spinner and message.
 * Useful for content sections or modals.
 *
 * @example
 * ```tsx
 * <LoadingCard
 *   message="Fetching transactions..."
 *   className="min-h-[200px]"
 * />
 * ```
 */
export function LoadingCard({
  message = 'Loading...',
  size = 'md',
  className
}: LoadingCardProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8', className)}>
      <LoadingSpinner size={size} />
      <p className="text-gray-600 mt-4">{message}</p>
    </div>
  );
}

/**
 * LoadingButton Props
 */
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Whether button is in loading state */
  isLoading: boolean;
  /** Text to display when loading */
  loadingText?: string;
  /** Button content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * LoadingButton Component
 *
 * Button with integrated loading state management.
 * Automatically disables and shows spinner when loading.
 *
 * Best Practices:
 * - Always disable during loading to prevent double-submission
 * - Provide clear loading text for accessibility
 * - Maintains button dimensions during state changes
 *
 * @example
 * ```tsx
 * <LoadingButton
 *   isLoading={isSubmitting}
 *   loadingText="Saving..."
 *   onClick={handleSubmit}
 * >
 *   Save Changes
 * </LoadingButton>
 * ```
 */
export function LoadingButton({
  isLoading,
  loadingText = 'Loading...',
  children,
  className,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <button
      className={cn('flex items-center justify-center', className)}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && (
        <LoadingSpinner size="sm" className="mr-2" />
      )}
      {isLoading ? loadingText : children}
    </button>
  );
}
