/**
 * MSW Provider Component
 *
 * Provides Mock Service Worker (MSW) setup for API mocking in development.
 */

'use client';

import { ReactNode, useEffect } from 'react';

interface MSWProviderProps {
  children: ReactNode;
}

export function MSWProvider({ children }: MSWProviderProps) {
  useEffect(() => {
    // Initialize MSW if needed
    // This is a placeholder for MSW setup
    if (process.env.NODE_ENV === 'development') {
      // Import and setup MSW handlers if configured
    }
  }, []);

  return <>{children}</>;
}
