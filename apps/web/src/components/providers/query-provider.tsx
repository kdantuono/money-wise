/**
 * React Query Provider Component
 *
 * Provides TanStack Query (v5) context for data fetching hooks.
 * Configures default options for caching, refetching, and error handling.
 */

'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * Create QueryClient with default options
 *
 * Options:
 * - staleTime: 5 minutes - data is considered fresh for 5 minutes
 * - gcTime: 10 minutes - data is kept in cache for 10 minutes (renamed from cacheTime in v5)
 * - refetchOnWindowFocus: false - don't refetch on tab focus
 * - retry: 1 - retry failed requests once
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Use useState to ensure the same client across re-renders on client
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
