'use client';

import { useEffect, useState } from 'react';

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Initialize MSW in development
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