/**
 * Protected Route Component (defense-in-depth)
 *
 * Server-side middleware blocks unauthenticated users before render.
 * This component validates the session client-side and shows a loading
 * state while checking, instead of a blank page.
 */

'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, user, validateSession } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (isAuthenticated && user) {
        if (!cancelled) setIsChecking(false);
        return;
      }

      const ok = await validateSession();
      if (cancelled) return;

      if (!ok) {
        // Set isChecking false before redirect to avoid stale loading state
        if (!cancelled) setIsChecking(false);
        router.push('/auth/login');
        return;
      }

      if (!cancelled) setIsChecking(false);
    };

    run();
    return () => { cancelled = true; };
  }, [isAuthenticated, user, validateSession, router]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !user) {
    return null;
  }

  return <>{children}</>;
}
