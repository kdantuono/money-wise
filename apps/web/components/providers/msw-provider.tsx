'use client';

import { useEffect, useState } from 'react';

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // MSW is DISABLED - Set USE_MSW=true in .env.local to enable
    const useMSW = process.env.NEXT_PUBLIC_USE_MSW === 'true';

    if (process.env.NODE_ENV === 'development' && useMSW) {
      // Initialize MSW in development (when explicitly enabled)
      const initMSW = async () => {
        try {
          const { startWorker } = await import('../../__mocks__/api/browser');
          await startWorker();
          // eslint-disable-next-line no-console -- Development-only MSW initialization logging
          console.log('🔧 MSW started successfully');
        } catch (error) {
          // eslint-disable-next-line no-console -- Development-only error logging
          console.warn('Failed to start MSW:', error);
        } finally {
          setIsReady(true);
        }
      };

      initMSW();
    } else {
      if (process.env.NODE_ENV === 'development' && !useMSW) {
        // eslint-disable-next-line no-console
        console.log('✅ MSW disabled - Using real backend API at http://localhost:3001');
      }
      setIsReady(true);
    }
  }, []);

  // Show loading only in development while MSW initializes
  if (process.env.NODE_ENV === 'development' && !isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing development environment...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}