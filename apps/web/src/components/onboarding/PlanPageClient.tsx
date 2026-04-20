'use client';

/**
 * PlanPageClient — hydration layer for /onboarding/plan.
 *
 * When mode='edit' (user already onboarded), loads the existing plan from
 * Supabase and hydrates the wizard store before rendering WizardPianoGenerato.
 * This ensures the wizard is pre-populated rather than starting from blank state.
 *
 * When mode='create' (first-time onboarding), renders the wizard immediately
 * with no loading round-trip needed.
 */

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useOnboardingPlanStore } from '@/store/onboarding-plan.store';
import { onboardingPlanClient, OnboardingPlanApiError } from '@/services/onboarding-plan.client';
import { WizardPianoGenerato } from './WizardPianoGenerato';

interface PlanPageClientProps {
  /** Passed from the page via searchParams — 'edit' when user has an existing plan. */
  mode: 'create' | 'edit';
}

export function PlanPageClient({ mode }: PlanPageClientProps) {
  const user = useAuthStore((s) => s.user);
  const hydrateFromPlan = useOnboardingPlanStore((s) => s.hydrateFromPlan);
  const [isHydrating, setIsHydrating] = useState(mode === 'edit');
  const [hydrateError, setHydrateError] = useState<string | null>(null);

  useEffect(() => {
    // Only hydrate in edit mode and when user is available.
    if (mode !== 'edit' || !user?.id) {
      setIsHydrating(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const bundle = await onboardingPlanClient.loadPlan(user.id);
        if (cancelled) return;

        if (bundle) {
          // Merge AI preferences from profile if stored there.
          // For now, fall back to defaults — the wizard step 5 lets user adjust.
          hydrateFromPlan(bundle);
        } else {
          // No plan found even though mode=edit — treat as create.
          // (Edge case: user manually navigated with ?mode=edit before creating.)
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof OnboardingPlanApiError
              ? `Errore caricamento piano: ${err.message}`
              : err instanceof Error
                ? err.message
                : 'Errore sconosciuto';
          setHydrateError(msg);
        }
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, user?.id, hydrateFromPlan]);

  if (isHydrating) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        aria-live="polite"
        aria-label="Caricamento piano in corso"
      >
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Caricamento piano...</p>
        </div>
      </div>
    );
  }

  if (hydrateError) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background p-6"
        role="alert"
      >
        <div className="max-w-md text-center">
          <p className="text-sm font-semibold text-foreground mb-1">Impossibile caricare il piano</p>
          <p className="text-sm text-muted-foreground">{hydrateError}</p>
        </div>
      </div>
    );
  }

  return <WizardPianoGenerato mode={mode} />;
}
