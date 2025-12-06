'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, ExternalLink, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

/**
 * OAuthPopupModal Component
 *
 * Modal that opens SaltEdge OAuth in a popup window while keeping the
 * blurred background. Listens for postMessage callbacks from the popup
 * to detect completion.
 *
 * Flow:
 * 1. Show modal with blurred background
 * 2. Open OAuth URL in centered popup window
 * 3. Listen for postMessage from SaltEdge/callback page
 * 4. On success: close popup, call onSuccess
 * 5. On error/cancel: show error state, allow retry
 *
 * @example
 * <OAuthPopupModal
 *   redirectUrl="https://www.saltedge.com/connect?..."
 *   connectionId="uuid-123"
 *   onSuccess={(connectionId) => handleSuccess(connectionId)}
 *   onCancel={() => setShowModal(false)}
 * />
 */

type ModalStatus = 'waiting' | 'processing' | 'success' | 'error';

interface OAuthPopupModalProps {
  /** SaltEdge OAuth redirect URL */
  redirectUrl: string;
  /** Our internal connection ID */
  connectionId: string;
  /** Called when OAuth completes successfully */
  onSuccess: (connectionId?: string) => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Optional title for the modal */
  title?: string;
}

export function OAuthPopupModal({
  redirectUrl,
  connectionId,
  onSuccess,
  onCancel,
  title = 'Link Bank Account',
}: OAuthPopupModalProps) {
  const [status, setStatus] = useState<ModalStatus>('waiting');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const popupRef = useRef<Window | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Open OAuth URL in a centered popup window
   */
  const openPopup = useCallback(() => {
    // Calculate centered position
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    // Open popup
    popupRef.current = window.open(
      redirectUrl,
      'saltedge-oauth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
    );

    if (!popupRef.current) {
      setStatus('error');
      setErrorMessage('Popup was blocked. Please allow popups for this site.');
      return;
    }

    setStatus('processing');

    // Check if popup is closed manually (user cancelled)
    checkIntervalRef.current = setInterval(() => {
      if (popupRef.current?.closed) {
        clearInterval(checkIntervalRef.current!);
        // Don't set error if we're already in success/error state
        setStatus((current) => {
          if (current === 'processing') {
            return 'error';
          }
          return current;
        });
        setErrorMessage((current) =>
          current || 'The authorization window was closed. You can try again.'
        );
      }
    }, 500);
  }, [redirectUrl]);

  /**
   * Handle messages from popup (SaltEdge postMessage or our callback page)
   */
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Only accept messages from our own origin or SaltEdge
      const isSameOrigin = event.origin === window.location.origin;

      // Properly validate SaltEdge origin to prevent subdomain spoofing
      // Valid patterns: https://saltedge.com, https://www.saltedge.com, https://connect.saltedge.com
      let isSaltEdge = false;
      try {
        const originUrl = new URL(event.origin);
        const hostname = originUrl.hostname;
        // Must be exactly saltedge.com or end with .saltedge.com (subdomain)
        isSaltEdge =
          hostname === 'saltedge.com' || hostname.endsWith('.saltedge.com');
      } catch {
        // Invalid URL origin - not from SaltEdge
        isSaltEdge = false;
      }

      if (!isSameOrigin && !isSaltEdge) {
        return;
      }

      const data = event.data;

      // Handle SaltEdge postMessage callbacks
      // SaltEdge sends messages like: { type: 'sdk', data: { stage: 'success', ... } }
      if (data?.type === 'sdk' || data?.event_type) {
        const stage = data?.data?.stage || data?.stage;

        if (stage === 'success' || stage === 'finish') {
          setStatus('success');
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
          }
          // Close popup after short delay
          setTimeout(() => {
            popupRef.current?.close();
            onSuccess(data?.data?.connection_id || connectionId);
          }, 500);
        } else if (stage === 'error' || stage === 'fail') {
          setStatus('error');
          setErrorMessage(data?.data?.message || 'Authorization failed');
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
          }
        }
        return;
      }

      // Handle our own callback page messages
      if (data?.type === 'BANKING_OAUTH_COMPLETE') {
        setStatus('success');
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
        }
        setTimeout(() => {
          popupRef.current?.close();
          onSuccess(connectionId);
        }, 500);
      } else if (data?.type === 'BANKING_OAUTH_ERROR') {
        setStatus('error');
        setErrorMessage(data?.error || 'Authorization failed');
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
        }
      }
    },
    [connectionId, onSuccess]
  );

  /**
   * Set up message listener and open popup on mount
   */
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    openPopup();

    return () => {
      window.removeEventListener('message', handleMessage);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      // Don't close popup on unmount - let user complete if they want
    };
  }, [handleMessage, openPopup]);

  /**
   * Handle retry button click
   */
  const handleRetry = () => {
    setStatus('waiting');
    setErrorMessage('');
    openPopup();
  };

  /**
   * Handle cancel/close
   */
  const handleCancel = () => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }
    onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-labelledby="oauth-modal-title"
      aria-modal="true"
    >
      {/* Backdrop click to cancel */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Close Button */}
        <button
          onClick={handleCancel}
          aria-label="Close"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600
            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 rounded"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Header */}
        <div className="bg-blue-50 px-6 py-4 border-b border-blue-200 rounded-t-lg">
          <h2
            id="oauth-modal-title"
            className="text-lg font-bold text-gray-900"
          >
            {title}
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Waiting/Processing State */}
          {(status === 'waiting' || status === 'processing') && (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
                  {status === 'processing' ? (
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  ) : (
                    <ExternalLink className="w-8 h-8 text-blue-600" />
                  )}
                </div>
              </div>

              <p className="text-gray-600 mb-4">
                {status === 'processing'
                  ? 'Complete the authorization in the popup window...'
                  : 'Opening bank authorization...'}
              </p>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Popup not appearing?</strong>
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Check if your browser blocked the popup and allow it for this site.
                </p>
                <button
                  onClick={openPopup}
                  className="mt-3 inline-flex items-center px-4 py-2 text-sm font-medium
                    text-blue-700 bg-white border border-blue-300 rounded-md
                    hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Open Popup Again
                </button>
              </div>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Successfully Linked!
              </h3>
              <p className="text-gray-600 mb-4">
                Your bank account has been connected.
              </p>

              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <p className="text-sm text-green-800">
                  Finishing up... This window will close automatically.
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Authorization Failed
              </h3>

              {errorMessage && (
                <div className="bg-red-50 rounded-lg p-3 mb-4 border border-red-200">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleRetry}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium
                    bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
                    transition-colors duration-200"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium
                    bg-white text-gray-700 border border-gray-300 hover:bg-gray-50
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500
                    transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer for waiting/processing states */}
        {(status === 'waiting' || status === 'processing') && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <button
              onClick={handleCancel}
              className="w-full px-4 py-2 rounded-lg font-medium text-gray-700 bg-white border border-gray-300
                hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500
                transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
