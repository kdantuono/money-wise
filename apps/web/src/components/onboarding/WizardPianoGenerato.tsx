'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import {
  useOnboardingPlanStore,
  selectCanAdvanceFromStep2,
} from '@/store/onboarding-plan.store';
import { useAuthStore } from '@/store/auth.store';
import { onboardingPlanClient, OnboardingPlanApiError } from '@/services/onboarding-plan.client';
import { StepWelcome } from './steps/StepWelcome';
import { StepProfile } from './steps/StepProfile';
import { StepGoals } from './steps/StepGoals';
import { StepCalibration } from './steps/StepCalibration';
import { StepReady } from './steps/StepReady';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Step indicator configuration — 5 steps (Welcome + Profilo + Obiettivi + Piano + AI-Prefs)
// Sprint 1.5.2 integrated: WP-B StepWelcome + WP-C StepProfile (4-budget model)
// Step 1 = Benvenuto (WP-B), Step 2 = Profilo (WP-C merged), Steps 3-5 unchanged
// ---------------------------------------------------------------------------
const STEP_CONFIG = [
  { label: 'Benvenuto' },
  { label: 'Profilo' },
  { label: 'I tuoi goal' },
  { label: 'Piano proposto' },
  { label: 'Pronto' },
] as const;

const TOTAL_STEPS = STEP_CONFIG.length; // 5

interface WizardPianoGeneratoProps {
  /** 'create' (default) = first-time onboarding. 'edit' = pre-populated from existing plan. */
  mode?: 'create' | 'edit';
  /** Called when the dialog should close (handled by parent Dialog.Root via onOpenChange). */
  onClose?: () => void;
}

export function WizardPianoGenerato({ mode = 'create', onClose }: WizardPianoGeneratoProps) {
  const isEditMode = mode === 'edit';
  const router = useRouter();
  const currentStep = useOnboardingPlanStore((s) => s.currentStep);
  const nextStep = useOnboardingPlanStore((s) => s.nextStep);
  const prevStep = useOnboardingPlanStore((s) => s.prevStep);
  const step2 = useOnboardingPlanStore((s) => s.step2);
  const step3 = useOnboardingPlanStore((s) => s.step3);
  const allocationPreview = useOnboardingPlanStore((s) => s.step4.allocationPreview);
  const step5 = useOnboardingPlanStore((s) => s.step5);
  const setIsPersisting = useOnboardingPlanStore((s) => s.setIsPersisting);
  const setPersistedPlanId = useOnboardingPlanStore((s) => s.setPersistedPlanId);
  const setSkipState = useOnboardingPlanStore((s) => s.setSkipState);
  const isPersisting = useOnboardingPlanStore((s) => s.isPersisting);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const userId = user?.id;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [prevStepRef, setPrevStepRef] = useState(currentStep);

  // Step 2 (Profilo) gate: all 5 allocation fields valid + sum constraint
  const canAdvanceStep2 = useOnboardingPlanStore(selectCanAdvanceFromStep2);

  const isLastStep = currentStep === TOTAL_STEPS;
  const canSubmit = !!userId && !!allocationPreview && step3.goals.length > 0 && !isPersisting;

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

  /** Salta: save skip state, then close via parent onOpenChange. */
  const handleSalta = () => {
    setSkipState({ atStep: currentStep, savedAt: new Date().toISOString() });
    onClose?.();
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
      const { planId } = await onboardingPlanClient.persistPlan(userId, {
        plan: {
          monthlyIncome: step2.monthlyIncome,
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
        aiPreferences: {
          enableAiCategorization: step5.enableAiCategorization,
          enableAiInsights: step5.enableAiInsights,
        },
      });
      setPersistedPlanId(planId);
      setUser({ ...user, onboarded: true });
      router.push('/dashboard/goals');
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

  // Step 1 (Welcome) always allows advancing.
  // Step 2 (Profilo) requires all 5 allocation fields valid + sum constraint.
  // Step 4 (Calibration/WP-E) is blocked when the advisor detected a hard-block condition.
  // All other steps allow free navigation.
  const step4HardBlocked = currentStep === 4 && !!allocationPreview?.hardBlock;
  const canAdvance =
    currentStep === 2 ? canAdvanceStep2 :
    currentStep === 4 ? !step4HardBlocked :
    true;

  return (
    <Dialog.Portal>
      {/* Dim overlay — click closes via Radix default onOpenChange */}
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />

      <Dialog.Content
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card shadow-2xl p-6 outline-none max-h-[90vh] overflow-y-auto"
        aria-describedby="wizard-step-description"
      >
        {/* Accessible title (Radix requirement) */}
        <Dialog.Title className="text-xl font-bold text-foreground pr-8">
          {isEditMode ? 'Modifica il tuo piano' : 'Piano Finanziario'}
        </Dialog.Title>

        {/* X close button — visible on all steps */}
        <Dialog.Close asChild>
          <button
            className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Chiudi wizard"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </Dialog.Close>

        {/* Step indicator — clean lines + labels, no circle icons */}
        <div
          className="flex gap-2 mt-4"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={currentStep}
          aria-label={`Passo ${currentStep} di ${TOTAL_STEPS}`}
        >
          {STEP_CONFIG.map((step, idx) => {
            const stepNum = idx + 1;
            const isActive = stepNum === currentStep;
            const isDone = stepNum < currentStep;
            return (
              <div key={stepNum} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-full transition-all ${
                    isDone
                      ? 'h-1 bg-blue-600'
                      : isActive
                        ? 'h-1.5 bg-blue-400'
                        : 'h-1 bg-gray-300 dark:bg-gray-600'
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`text-xs transition-colors ${
                    isActive
                      ? 'text-blue-600 font-semibold'
                      : isDone
                        ? 'text-blue-500'
                        : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step subtitle — visually hidden description for screen readers */}
        <p
          id="wizard-step-description"
          className="text-sm text-muted-foreground mt-2"
        >
          Passo {currentStep} di {TOTAL_STEPS} — {STEP_CONFIG[currentStep - 1]!.label}
        </p>

        {/* Step content with framer-motion slide transitions */}
        <main className="mt-4 min-h-[200px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentStep}
              initial={{ x: direction * 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction * -40, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {/* Step 1 — Benvenuto (WP-B) */}
              {currentStep === 1 && <StepWelcome firstName={user?.firstName ?? null} />}
              {/* Step 2 — Profilo 4-budget model (WP-C) */}
              {currentStep === 2 && <StepProfile />}
              {/* Step 3 — Obiettivi */}
              {currentStep === 3 && <StepGoals />}
              {/* Step 4 — Calibrazione AI-First (WP-E) */}
              {currentStep === 4 && <StepCalibration />}
              {/* Step 5 — Preferenze AI + Pronto (WP-F) */}
              {currentStep === 5 && <StepReady />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Error banner */}
        {submitError && (
          <div
            className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
            role="alert"
          >
            <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p>
          </div>
        )}

        {/* Warning banner when submit is blocked */}
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

        {/* Footer: Salta (Step 1 only), Indietro, Avanti/Conferma */}
        <footer className="flex justify-between pt-6 border-t border-border mt-6">
          <div className="flex items-center gap-2">
            {/* Salta: visible ONLY on Step 1 (Benvenuto) */}
            {currentStep === 1 && (
              <Button
                variant="ghost"
                onClick={handleSalta}
                className="text-muted-foreground hover:text-foreground"
              >
                Salta
              </Button>
            )}
            {/* Indietro: visible on steps 2-5 */}
            {currentStep > 1 && (
              <Button
                variant="outline"
                disabled={isPersisting}
                onClick={handlePrev}
              >
                <ChevronLeft className="w-4 h-4 mr-2" aria-hidden="true" />
                Indietro
              </Button>
            )}
          </div>

          {isLastStep ? (
            <Button
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPersisting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  {isEditMode ? 'Salvataggio...' : 'Creazione piano...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" aria-hidden="true" />
                  {isEditMode ? 'Salva modifiche' : 'Crea il mio piano'}
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canAdvance}>
              Avanti
              <ChevronRight className="w-4 h-4 ml-2" aria-hidden="true" />
            </Button>
          )}
        </footer>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
