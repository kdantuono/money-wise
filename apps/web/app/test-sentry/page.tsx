'use client';

import { useState } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function TestSentryPage() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toISOString()}: ${result}`]);
  };

  const testBasicError = () => {
    try {
      throw new Error('Test error: Frontend basic error for Sentry testing');
    } catch (error) {
      Sentry.captureException(error);
      addResult('✅ Basic error captured and sent to Sentry');
    }
  };

  const testUnhandledError = () => {
    addResult('⚠️ Triggering unhandled error in 1 second...');
    setTimeout(() => {
      throw new Error('Test error: Unhandled frontend error');
    }, 1000);
  };

  const testNetworkError = () => {
    fetch('/api/non-existent-endpoint')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Network error: ${res.status} ${res.statusText}`);
        }
      })
      .catch(error => {
        Sentry.captureException(error);
        addResult('✅ Network error captured and sent to Sentry');
      });
  };

  const testMessage = () => {
    Sentry.captureMessage('Test message: Frontend message for Sentry', 'info');
    addResult('✅ Message sent to Sentry');
  };

  const testBreadcrumbs = () => {
    Sentry.addBreadcrumb({
      message: 'User clicked test button',
      level: 'info',
      category: 'ui.click',
    });

    Sentry.addBreadcrumb({
      message: 'Test flow initiated',
      level: 'debug',
      category: 'test',
    });

    const error = new Error('Test error with breadcrumbs');
    Sentry.captureException(error);
    addResult('✅ Error with breadcrumbs captured');
  };

  const testUserContext = () => {
    Sentry.setUser({
      id: 'test-user-123',
      email: 'test@example.com',
      username: 'testuser',
    });

    const error = new Error('Test error with user context');
    Sentry.captureException(error);
    addResult('✅ Error with user context captured');
  };

  const testCustomContext = () => {
    Sentry.withScope((scope) => {
      scope.setTag('test_type', 'frontend');
      scope.setLevel('error');
      scope.setContext('test_data', {
        component: 'TestSentryPage',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      });

      const error = new Error('Test error with custom context');
      Sentry.captureException(error);
    });
    addResult('✅ Error with custom context captured');
  };

  const verifyConfiguration = () => {
    const client = Sentry.getClient();
    const options = client?.getOptions();

    const config = {
      sentryEnabled: !!options?.dsn,
      environment: options?.environment || 'not-set',
      tracesSampleRate: options?.tracesSampleRate,
      release: options?.release || 'not-set',
    };

    addResult(`📊 Configuration: ${JSON.stringify(config, null, 2)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Frontend Sentry Testing</h1>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            ⚠️ This page is for testing only and should not be deployed to production.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={verifyConfiguration}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Verify Configuration
          </button>

          <button
            onClick={testMessage}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Test Message Capture
          </button>

          <button
            onClick={testBasicError}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Test Basic Error
          </button>

          <button
            onClick={testUnhandledError}
            className="px-4 py-2 bg-red-800 text-white rounded hover:bg-red-900"
          >
            Test Unhandled Error
          </button>

          <button
            onClick={testNetworkError}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Test Network Error
          </button>

          <button
            onClick={testBreadcrumbs}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Test Breadcrumbs
          </button>

          <button
            onClick={testUserContext}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Test User Context
          </button>

          <button
            onClick={testCustomContext}
            className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700"
          >
            Test Custom Context
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="space-y-2">
            {testResults.length === 0 ? (
              <p className="text-gray-500">No tests run yet. Click buttons above to test.</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono p-2 bg-gray-50 rounded">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}