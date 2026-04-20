'use client';

/**
 * PlanPageClient — hydration layer for /onboarding/plan.
 *
 * Owns the Radix Dialog.Root that wraps WizardPianoGenerato.
 * - In 'create' mode (first-time onboarding): dialog opens immediately.
 * - In 'edit' mode: loads existing plan, hydrates store, then opens dialog.
 * Close/ESC/backdrop click navigates to invokerRoute (from ?from= param or
 * document.referrer same-origin), falling back to /dashboard.
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const hydrateFromPlan = useOnboardingPlanStore((s) => s.hydrateFromPlan);
  const setInvokerRoute = useOnboardingPlanStore((s) => s.setInvokerRoute);
  const invokerRoute = useOnboardingPlanStore((s) => s.invokerRoute);
  const [isHydrating, setIsHydrating] = useState(mode === 'edit');
  const [hydrateError, setHydrateError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  // Determine invoker route once on mount — from ?from= param, same-origin referrer,
  // or fallback to /dashboard.
  useEffect(() => {
    const fromParam = searchParams.get('from');
    if (fromParam) {
      setInvokerRoute(fromParam);
      return;
    }
    try {
      const ref = document.referrer;
      if (ref && new URL(ref).origin === window.location.origin) {
        setInvokerRoute(new URL(ref).pathname);
        return;
      }
    } catch {
      // referrer parse failed — use fallback
    }
    setInvokerRoute('/dashboard');
  }, [searchParams, setInvokerRoute]);

  useEffect(() => {
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
          hydrateFromPlan(bundle);
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

  /** Navigate away when the dialog closes (ESC, overlay click, X button, Salta). */
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      router.push(invokerRoute ?? '/dashboard');
    }
  };

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

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <WizardPianoGenerato mode={mode} onClose={() => handleOpenChange(false)} />
    </Dialog.Root>
  );
}
