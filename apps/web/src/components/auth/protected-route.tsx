/**
 * Protected Route Component (defense-in-depth)
 *
 * Server-side middleware should block unauthenticated users before render.
 * This component ensures no protected UI flashes on the client while a
 * session check is in progress, and navigates to login if validation fails.
 */

'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

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
      // If we already have a user, we can render immediately
      if (isAuthenticated && user) {
        if (!cancelled) setIsChecking(false);
        return;
      }

      // Otherwise validate the cookie-based session with backend
      const ok = await validateSession();
      if (!ok) {
        // Keep UI blank and navigate to login
        router.push('/auth/login');
        return;
      }

      if (!cancelled) setIsChecking(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, validateSession, router]);

  // Never render protected UI while checking or when unauthenticated
  if (isChecking || (!isAuthenticated && !user)) {
    return null;
  }

  return <>{children}</>;
}
