'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * BankingLinkButton Component
 *
 * Initiates the OAuth flow to link a user's bank account. Handles:
 * - Opening OAuth URL in a popup window
 * - Tracking OAuth completion when user returns
 * - Loading and error states
 * - Window focus management for accessibility
 *
 * @example
 * <BankingLinkButton
 *   onSuccess={() => console.log('Account linked!')}
 *   onError={(error) => console.log('Error:', error)}
 * />
 */

interface BankingLinkButtonProps {
  /** Callback when account is successfully linked */
  onSuccess?: () => void;
  /** Callback when linking fails with error message */
  onError?: (error: string) => void;
  /** Optional CSS classes for styling */
  className?: string;
  /** Optional custom button text */
  children?: React.ReactNode;
  /** Optional provider selection - if multiple providers supported */
  provider?: 'SALTEDGE' | 'TINK' | 'YAPILY' | 'TRUELAYER';
  /** Optional aria-label override */
  ariaLabel?: string;
}

export function BankingLinkButton({
  onSuccess,
  onError,
  className = '',
  children = 'Link Bank Account',
  provider = 'SALTEDGE',
  ariaLabel,
}: BankingLinkButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle OAuth message from popup callback
   */
  const handleOAuthMessage = useCallback(
    (event: MessageEvent) => {
      // Security: only accept messages from our own origin
      if (event.origin !== window.location.origin) {
        return;
      }

      const data = event.data;
      if (!data || typeof data !== 'object') {
        return;
      }

      if (data.type === 'BANKING_OAUTH_COMPLETE') {
        // Clean up
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        setIsLoading(false);
        onSuccess?.();
      } else if (data.type === 'BANKING_OAUTH_ERROR') {
        // Clean up
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        setIsLoading(false);
        const errorMessage = data.error || 'OAuth authentication failed';
        setError(errorMessage);
        onError?.(errorMessage);
      }
    },
    [onSuccess, onError]
  );

  /**
   * Listen for messages from popup
   */
  useEffect(() => {
    window.addEventListener('message', handleOAuthMessage);
    return () => {
      window.removeEventListener('message', handleOAuthMessage);
    };
  }, [handleOAuthMessage]);

  /**
   * Check if popup is still open and user has returned
   */
  const checkPopupCompletion = useCallback(() => {
    if (!popupRef.current) {
      return;
    }

    // Check if popup was closed by the user (without completing OAuth)
    if (popupRef.current.closed) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      setIsLoading(false);

      // Don't call onSuccess here - wait for postMessage from callback page
      // If popup was closed without completing, user cancelled
      return;
    }
  }, []);

  /**
   * Initiate the OAuth flow
   */
  const handleLinkBank = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call backend to initiate OAuth flow
      const response = await fetch('/api/banking/initiate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'Failed to initiate bank linking'
        );
      }

      const { redirectUrl, _connectionId } = await response.json();

      if (!redirectUrl) {
        throw new Error('No redirect URL provided');
      }

      // Open OAuth URL in centered popup
      const width = 600;
      const height = 700;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;

      popupRef.current = window.open(
        redirectUrl,
        'BankLinkPopup',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      if (!popupRef.current) {
        throw new Error(
          'Popup blocked. Please allow popups for this site to link your bank account.'
        );
      }

      // Focus popup for better UX
      popupRef.current.focus();

      // Poll to check if popup was closed (user completed OAuth)
      pollIntervalRef.current = setInterval(() => {
        checkPopupCompletion();
      }, 500);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to link bank account';
      setError(errorMessage);
      onError?.(errorMessage);
      setIsLoading(false);
    }
  }, [provider, checkPopupCompletion, onError]);

  /**
   * Cleanup on unmount
   */
  const handleClose = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
  }, []);

  // Handle component cleanup
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cleanup = useCallback(handleClose, []);

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleLinkBank}
        disabled={isLoading}
        aria-label={
          ariaLabel || 'Link your bank account via OAuth authentication'
        }
        aria-busy={isLoading}
        aria-describedby={error ? 'banking-link-error' : undefined}
        data-testid="link-bank-button"
        className={`inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors duration-200
          ${
            isLoading
              ? 'bg-gray-400 text-white cursor-not-allowed opacity-75'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500'
          }
          ${className}`}
      >
        {isLoading && (
          <svg
            className="w-4 h-4 mr-2 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>

      {error && (
        <div
          id="banking-link-error"
          role="alert"
          className="p-3 rounded-lg bg-red-100 text-red-800 text-sm flex items-start gap-2"
        >
          <span className="text-lg" aria-hidden="true">
            ⚠️
          </span>
          <div>
            <p className="font-semibold">Error linking account</p>
            <p className="text-red-700 mt-1">{error}</p>
            <button
              onClick={() => {
                setError(null);
                cleanup();
              }}
              className="mt-2 text-red-600 hover:text-red-800 font-semibold text-sm underline"
              aria-label="Dismiss error and try again"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
