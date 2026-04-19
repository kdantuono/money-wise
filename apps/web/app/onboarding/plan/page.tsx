import { ProtectedRoute } from '@/components/auth/protected-route';
import { WizardPianoGenerato } from '@/components/onboarding/WizardPianoGenerato';

export const metadata = {
  title: 'Piano Finanziario — Zecca',
  description: 'Genera il tuo piano finanziario personalizzato in 5 passi',
};

export default function OnboardingPlanPage() {
  // ProtectedRoute hydrates auth store via validateSession() on mount — required
  // so WizardPianoGenerato's useAuthStore((s) => s.user?.id) returns a real uuid
  // before the "Conferma e crea piano" button's canSubmit gate evaluates.
  // Without this wrap, user could reach the wizard (via direct URL or reload) with
  // a valid Supabase session cookie but empty Zustand auth state, causing the
  // submit button to stay disabled forever.
  return (
    <ProtectedRoute>
      <WizardPianoGenerato />
    </ProtectedRoute>
  );
}
