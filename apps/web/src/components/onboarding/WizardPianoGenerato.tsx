'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useOnboardingPlanStore } from '@/store/onboarding-plan.store';
import { useAuthStore } from '@/store/auth.store';
import { onboardingPlanClient, OnboardingPlanApiError } from '@/services/onboarding-plan.client';
import { StepIncome } from './steps/StepIncome';
import { StepSavingsTarget } from './steps/StepSavingsTarget';
import { StepGoals } from './steps/StepGoals';
import { StepPlanReview } from './steps/StepPlanReview';
import { StepAiPrefs } from './steps/StepAiPrefs';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check, Loader2, Wallet, Target, TrendingUp, Rocket, Brain } from 'lucide-react';

const STEP_CONFIG = [
  { label: 'Reddito', icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { label: 'Risparmio', icon: Target, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/30' },
  { label: 'I tuoi goal', icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  { label: 'Piano proposto', icon: Rocket, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  { label: 'Preferenze AI', icon: Brain, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-950/30' },
] as const;

export function WizardPianoGenerato() {
  const router = useRouter();
  const currentStep = useOnboardingPlanStore((s) => s.currentStep);
  const nextStep = useOnboardingPlanStore((s) => s.nextStep);
  const prevStep = useOnboardingPlanStore((s) => s.prevStep);
  const step1 = useOnboardingPlanStore((s) => s.step1);
  const step2 = useOnboardingPlanStore((s) => s.step2);
  const step3 = useOnboardingPlanStore((s) => s.step3);
  const allocationPreview = useOnboardingPlanStore((s) => s.step4.allocationPreview);
  const setIsPersisting = useOnboardingPlanStore((s) => s.setIsPersisting);
  const setPersistedPlanId = useOnboardingPlanStore((s) => s.setPersistedPlanId);
  const isPersisting = useOnboardingPlanStore((s) => s.isPersisting);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const userId = user?.id;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [prevStepRef, setPrevStepRef] = useState(currentStep);

  const isLastStep = currentStep === 5;
  // Submission is gated on having a user + valid allocation preview + at least 1 goal.
  const canSubmit = !!userId && !!allocationPreview && step3.goals.length > 0 && !isPersisting;

  // Diagnostic reason shown to user at Step 5 when canSubmit is false — so they
  // know WHY the button is disabled (not a mysterious stuck state).
  const disabledReason = !userId
    ? 'Sessione utente non rilevata — ricarica la pagina.'
    : step3.goals.length === 0
      ? 'Aggiungi almeno un obiettivo allo Step 3.'
      : !allocationPreview
        ? 'Piano non ancora calcolato — torna allo Step 4 per rigenerarlo.'
        : null;

  // Direction for slide animation: forward (+1) or backward (-1)
  const direction = currentStep >= prevStepRef ? 1 : -1;

  const handleNext = () => {
    setPrevStepRef(currentStep);
    nextStep();
  };

  const handlePrev = () => {
    setPrevStepRef(currentStep);
    prevStep();
  };

  const handleSubmit = async () => {
    if (!userId || !user) {
      setSubmitError('Utente non autenticato. Riaccedi e riprova.');
      return;
    }
    if (!allocationPreview) {
      setSubmitError('Il piano non è ancora stato calcolato.');
      return;
    }
    setSubmitError(null);
    setIsPersisting(true);
    try {
      // incomeAfterEssentials NON passed — derived internally by persistPlan
      // (contract change PR #455 Copilot review: ensures DB snapshot consistency).
      // persistPlan also flips profiles.onboarded = true backend-side.
      const { planId } = await onboardingPlanClient.persistPlan(userId, {
        plan: {
          monthlyIncome: step1.monthlyIncome,
          monthlySavingsTarget: step2.monthlySavingsTarget,
          essentialsPct: step2.essentialsPct,
        },
        goals: step3.goals.map((g) => {
          const item = allocationPreview.items.find((it) => it.goalId === g.tempId);
          return {
            name: g.name,
            target: g.target,
            deadline: g.deadline,
            priority: g.priority,
            monthlyAllocation: item?.monthlyAmount ?? 0,
            allocation: {
              monthlyAmount: item?.monthlyAmount ?? 0,
              deadlineFeasible: item?.deadlineFeasible ?? true,
              reasoning: item?.reasoning ?? '',
            },
          };
        }),
      });
      setPersistedPlanId(planId);
      // Update in-memory auth store so OnboardingGate does not redirect again
      // when the user lands on /dashboard (profiles.onboarded is already true in DB).
      setUser({ ...user, onboarded: true });
      router.push('/dashboard');
    } catch (err) {
      const msg =
        err instanceof OnboardingPlanApiError
          ? `Errore ${err.statusCode}: ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Errore sconosciuto';
      setSubmitError(msg);
    } finally {
      setIsPersisting(false);
    }
  };

  const stepConfig = STEP_CONFIG[currentStep - 1]!;
  const StepIcon = stepConfig.icon;

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Piano Finanziario</h1>

          {/* Step indicator with icons */}
          <div
            className="flex gap-2 mt-4"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={5}
            aria-valuenow={currentStep}
          >
            {STEP_CONFIG.map((step, idx) => {
              const StepIdx = idx + 1;
              const Icon = step.icon;
              const isActive = StepIdx === currentStep;
              const isDone = StepIdx < currentStep;
              return (
                <div key={StepIdx} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? `${step.bg} ring-2 ring-offset-1 ring-current ${step.color}`
                        : isDone
                          ? 'bg-blue-600 text-white'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Icon className={`w-4 h-4 ${isActive ? step.color : ''}`} />
                    )}
                  </div>
                  <div
                    className={`h-1 w-full rounded-full transition-colors ${
                      StepIdx <= currentStep ? 'bg-blue-600' : 'bg-muted'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          <p className="text-sm text-muted-foreground mt-3 flex items-center gap-1.5">
            <StepIcon className={`w-4 h-4 ${stepConfig.color}`} />
            Passo {currentStep} di 5 — {stepConfig.label}
          </p>
        </header>

        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentStep}
              initial={{ x: direction * 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction * -40, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {currentStep === 1 && <StepIncome />}
              {currentStep === 2 && <StepSavingsTarget />}
              {currentStep === 3 && <StepGoals />}
              {currentStep === 4 && <StepPlanReview />}
              {currentStep === 5 && <StepAiPrefs />}
            </motion.div>
          </AnimatePresence>
        </main>

        {submitError && (
          <div
            className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
            role="alert"
          >
            <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p>
          </div>
        )}

        {isLastStep && disabledReason && !submitError && (
          <div
            className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
            role="status"
          >
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Conferma disabilitata: {disabledReason}
            </p>
          </div>
        )}

        <footer className="flex justify-between pt-6 border-t border-border">
          <Button
            variant="outline"
            disabled={currentStep === 1 || isPersisting}
            onClick={handlePrev}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Indietro
          </Button>
          {isLastStep ? (
            <Button
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPersisting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creazione piano...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Conferma e crea piano
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Avanti
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}
