'use client';

/**
 * OnboardingGate
 *
 * Intercepts the dashboard layout: if the authenticated user's
 * `profiles.onboarded` flag is false, redirects to `/onboarding/plan`
 * (Sprint 1.5 Piano Generato wizard). Already-onboarded users pass through
 * to children immediately.
 *
 * Defensively tolerant of an uninitialized user (still loading from the
 * store): in that case it renders children — ProtectedRoute is the layer
 * responsible for auth loading UX.
 */

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Loader2 } from 'lucide-react';

interface OnboardingGateProps {
  children: ReactNode;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // Redirect to Sprint 1.5 wizard when user is not onboarded.
  // Effect is a no-op when user is null or already onboarded.
  useEffect(() => {
    if (user && !user.onboarded) {
      router.replace('/onboarding/plan');
    }
  }, [user, router]);

  // No user yet (auth store still hydrating) — defer to ProtectedRoute loader.
  if (!user) {
    return <>{children}</>;
  }

  // User onboarded — pass through to dashboard.
  if (user.onboarded) {
    return <>{children}</>;
  }

  // User exists but not onboarded — show loader while redirect effect fires.
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background"
      aria-live="polite"
      aria-label="Reindirizzamento al wizard di onboarding"
    >
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default OnboardingGate;
