'use client';

/**
 * OnboardingGate
 *
 * Renders between ProtectedRoute and the dashboard: if the authenticated
 * user's `profiles.onboarded` flag is false, it shows the OnboardingWizard
 * fullscreen instead of the children. When the wizard completes, the gate
 * persists the result, marks the user onboarded in the auth store, and
 * reveals the dashboard. Already-onboarded users pass through immediately.
 *
 * Defensively tolerant of an uninitialized user (still loading from the
 * store): in that case it renders children — ProtectedRoute is the layer
 * responsible for auth loading UX.
 */

import { ReactNode, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import type { OnboardingData } from '@/types/onboarding';
import { onboardingClient, OnboardingApiError } from '@/services/onboarding.client';

interface OnboardingGateProps {
  children: ReactNode;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { user, setUser } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No user yet (auth store still hydrating) — defer to ProtectedRoute loader.
  if (!user) {
    return <>{children}</>;
  }

  if (user.onboarded) {
    return <>{children}</>;
  }

  const handleComplete = async (data: OnboardingData) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      await onboardingClient.completeOnboarding(user.id, data);
      setUser({ ...user, onboarded: true });
    } catch (err) {
      const msg =
        err instanceof OnboardingApiError
          ? err.message
          : 'Impossibile salvare le preferenze di onboarding. Riprova.';
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <OnboardingWizard
        userName={user.firstName || user.fullName || 'utente'}
        onComplete={handleComplete}
      />
      {error && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-lg dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </div>
      )}
    </div>
  );
}

export default OnboardingGate;
