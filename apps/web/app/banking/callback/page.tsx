/**
 * Banking OAuth Callback Handler
 *
 * Handles the OAuth redirect after user authorizes bank access on the provider's website.
 * Completes the linking process and redirects to the banking page.
 *
 * Features:
 * - Extract connectionId and state from URL parameters
 * - Validate OAuth state for security
 * - Complete the linking process via API
 * - Show success/error feedback
 * - Auto-redirect to /banking after completion
 * - Handle error scenarios gracefully
 *
 * @module app/banking/callback/page
 *
 * @example
 * // OAuth Flow:
 * // 1. User clicks "Link Bank" → redirectUrl opens in popup
 * // 2. SaltEdge OAuth → User authorizes → Redirects to this page
 * // 3. Extract connectionId from URL → Call completeLinking()
 * // 4. Show success → Auto-redirect to /banking
 */

'use client';

import { Suspense } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBanking } from '@/store';
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react';

/**
 * OAuth callback status type
 */
type CallbackStatus = 'processing' | 'success' | 'error' | 'invalid';

/**
 * BankingCallbackContent Component
 *
 * Inner component that handles OAuth redirect and completes the bank linking process.
 * Shows loading, success, and error states with auto-redirect.
 *
 * @returns {JSX.Element} Callback page with status feedback
 */
function BankingCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Zustand store
  const { completeLinking } = useBanking();

  // Local state
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [accountCount, setAccountCount] = useState<number>(0);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(5);

  /**
   * Navigate back to banking page
   */
  const handleBackToBanking = useCallback(() => {
    router.push('/banking');
  }, [router]);

  /**
   * Retry the linking process
   */
  const handleRetry = useCallback(() => {
    setStatus('processing');
    setErrorMessage('');
    // Will trigger useEffect again
  }, []);

  /**
   * Complete the OAuth linking process
   */
  useEffect(() => {
    // Only process once
    if (status !== 'processing') return;

    const processCallback = async () => {
      try {
        // Extract our internal connection ID from URL (we set this in initiateBankingLink)
        const connectionId = searchParams.get('connectionId');
        // Extract SaltEdge's connection_id from URL (they append this after OAuth)
        const saltEdgeConnectionId = searchParams.get('connection_id');
        const state = searchParams.get('state');

        // Log parameters for debugging
        console.log('OAuth callback params:', {
          connectionId,
          saltEdgeConnectionId,
          state,
          allParams: Object.fromEntries(searchParams.entries()),
        });

        // Validate required parameters
        if (!connectionId) {
          setStatus('invalid');
          setErrorMessage(
            'Missing connection ID. The authorization link may be invalid or expired.'
          );
          return;
        }

        // Optional: Validate state parameter for security
        // In a production app, you should verify the state matches what was stored
        // before initiating OAuth to prevent CSRF attacks
        if (state) {
          const storedState = sessionStorage.getItem('oauth_state');
          if (storedState && storedState !== state) {
            setStatus('error');
            setErrorMessage(
              'Security validation failed. Please try linking your account again.'
            );
            return;
          }
          // Clear stored state after validation
          sessionStorage.removeItem('oauth_state');
        }

        // Complete the linking process with both IDs
        // - connectionId: our internal UUID identifying the pending connection
        // - saltEdgeConnectionId: SaltEdge's ID for the actual bank connection
        await completeLinking(connectionId, saltEdgeConnectionId || undefined);

        // Success!
        setStatus('success');
        setAccountCount(0);
      } catch (err) {
        console.error('OAuth callback error:', err);

        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to complete bank account linking. Please try again.';

        setStatus('error');
        setErrorMessage(errorMessage);
      }
    };

    processCallback();
  }, [status, searchParams, completeLinking]);

  /**
   * Auto-redirect countdown on success
   */
  useEffect(() => {
    if (status !== 'success') return;

    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleBackToBanking();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, handleBackToBanking]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Processing State */}
        {status === 'processing' && (
          <div
            className="bg-white rounded-lg shadow-lg p-8 text-center"
            role="status"
            aria-live="polite"
            aria-label="Processing bank account linking"
          >
            <Loader2
              className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4"
              aria-hidden="true"
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Completing Connection
            </h1>
            <p className="text-gray-600 mb-4">
              Please wait while we link your bank account...
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              <div
                className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"
                style={{ animationDelay: '0.2s' }}
              />
              <div
                className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"
                style={{ animationDelay: '0.4s' }}
              />
            </div>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div
            className="bg-white rounded-lg shadow-lg p-8 text-center"
            role="status"
            aria-live="polite"
            aria-label="Bank account linked successfully"
          >
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
                <CheckCircle2
                  className="w-10 h-10 text-green-600"
                  aria-hidden="true"
                />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Account Linked Successfully!
            </h1>

            <p className="text-gray-600 mb-6">
              {accountCount > 0 ? (
                <>
                  We&apos;ve successfully linked{' '}
                  <strong>
                    {accountCount} account{accountCount !== 1 ? 's' : ''}
                  </strong>{' '}
                  to your MoneyWise profile.
                </>
              ) : (
                'Your bank account has been successfully linked to MoneyWise.'
              )}
            </p>

            <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
              <p className="text-sm text-blue-800">
                Redirecting to your banking dashboard in{' '}
                <strong>{redirectCountdown}</strong> second
                {redirectCountdown !== 1 ? 's' : ''}...
              </p>
            </div>

            <button
              onClick={handleBackToBanking}
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium
                bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
                transition-colors duration-200"
              aria-label="Go to banking dashboard now"
            >
              Go to Banking Dashboard
            </button>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div
            className="bg-white rounded-lg shadow-lg p-8"
            role="alert"
            aria-live="assertive"
            aria-label="Error linking bank account"
          >
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
                <XCircle
                  className="w-10 h-10 text-red-600"
                  aria-hidden="true"
                />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Connection Failed
            </h1>

            <p className="text-gray-600 mb-4 text-center">
              We encountered an error while linking your bank account.
            </p>

            {errorMessage && (
              <div className="bg-red-50 rounded-lg p-4 mb-6 border border-red-200">
                <p className="text-sm text-red-800 font-medium mb-1">
                  Error Details:
                </p>
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}

            <div className="bg-yellow-50 rounded-lg p-4 mb-6 border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Common causes:</strong>
              </p>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
                <li>Authorization was cancelled or declined</li>
                <li>Connection link expired</li>
                <li>Network connectivity issues</li>
                <li>Bank provider temporarily unavailable</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="flex-1 inline-flex items-center justify-center px-4 py-3 rounded-lg font-medium
                  bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
                  transition-colors duration-200"
                aria-label="Retry linking bank account"
              >
                Try Again
              </button>

              <button
                onClick={handleBackToBanking}
                className="flex-1 inline-flex items-center justify-center px-4 py-3 rounded-lg font-medium
                  bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500
                  transition-colors duration-200"
                aria-label="Go back to banking page"
              >
                <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
                Back to Banking
              </button>
            </div>
          </div>
        )}

        {/* Invalid State */}
        {status === 'invalid' && (
          <div
            className="bg-white rounded-lg shadow-lg p-8"
            role="alert"
            aria-live="assertive"
            aria-label="Invalid connection link"
          >
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-100">
                <XCircle
                  className="w-10 h-10 text-orange-600"
                  aria-hidden="true"
                />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Invalid Connection Link
            </h1>

            <p className="text-gray-600 mb-4 text-center">
              The connection link you used is invalid or expired.
            </p>

            {errorMessage && (
              <div className="bg-orange-50 rounded-lg p-4 mb-6 border border-orange-200">
                <p className="text-sm text-orange-800">{errorMessage}</p>
              </div>
            )}

            <button
              onClick={handleBackToBanking}
              className="w-full inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium
                bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
                transition-colors duration-200"
              aria-label="Return to banking page to start again"
            >
              <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
              Return to Banking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * BankingCallbackPage Wrapper
 *
 * Wraps the callback content in a Suspense boundary to handle useSearchParams.
 *
 * @returns {JSX.Element} Callback page wrapped with Suspense
 */
export default function BankingCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div
              className="bg-white rounded-lg shadow-lg p-8 text-center"
              role="status"
              aria-live="polite"
              aria-label="Loading bank account linking"
            >
              <Loader2
                className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4"
                aria-hidden="true"
              />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Loading
              </h1>
              <p className="text-gray-600">Please wait...</p>
            </div>
          </div>
        </div>
      }
    >
      <BankingCallbackContent />
    </Suspense>
  );
}
