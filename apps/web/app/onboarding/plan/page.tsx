import { WizardPianoGenerato } from '@/components/onboarding/WizardPianoGenerato';

export const metadata = {
  title: 'Piano Finanziario — Zecca',
  description: 'Genera il tuo piano finanziario personalizzato in 5 passi',
};

export default function OnboardingPlanPage() {
  return <WizardPianoGenerato />;
}
