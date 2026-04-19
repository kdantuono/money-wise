'use client';

import { useOnboardingPlanStore } from '@/store/onboarding-plan.store';
import { StepIncome } from './steps/StepIncome';
import { StepSavingsTarget } from './steps/StepSavingsTarget';
import { StepGoals } from './steps/StepGoals';
import { StepPlanReview } from './steps/StepPlanReview';
import { StepAiPrefs } from './steps/StepAiPrefs';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const STEP_LABELS: Record<number, string> = {
  1: 'Reddito',
  2: 'Obiettivo di risparmio',
  3: 'I tuoi goal',
  4: 'Piano proposto',
  5: 'Preferenze AI',
};

export function WizardPianoGenerato() {
  const currentStep = useOnboardingPlanStore((s) => s.currentStep);
  const nextStep = useOnboardingPlanStore((s) => s.nextStep);
  const prevStep = useOnboardingPlanStore((s) => s.prevStep);

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Piano Finanziario</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Passo {currentStep} di 5 — {STEP_LABELS[currentStep]}
          </p>
          <div className="flex gap-1 mt-4" role="progressbar" aria-valuemin={1} aria-valuemax={5} aria-valuenow={currentStep}>
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-blue-600' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </header>

        <main className="flex-1">
          {currentStep === 1 && <StepIncome />}
          {currentStep === 2 && <StepSavingsTarget />}
          {currentStep === 3 && <StepGoals />}
          {currentStep === 4 && <StepPlanReview />}
          {currentStep === 5 && <StepAiPrefs />}
        </main>

        <footer className="flex justify-between pt-6 border-t border-border">
          <Button
            variant="outline"
            disabled={currentStep === 1}
            onClick={prevStep}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Indietro
          </Button>
          <Button
            disabled={currentStep === 5}
            onClick={nextStep}
          >
            Avanti
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </footer>
      </div>
    </div>
  );
}
