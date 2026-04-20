import { ProtectedRoute } from '@/components/auth/protected-route';
import { PlanPageClient } from '@/components/onboarding/PlanPageClient';

export const metadata = {
  title: 'Piano Finanziario — Zecca',
  description: 'Genera o modifica il tuo piano finanziario personalizzato in 5 passi',
};

interface OnboardingPlanPageProps {
  searchParams: Promise<{ mode?: string }>;
}

export default async function OnboardingPlanPage({ searchParams }: OnboardingPlanPageProps) {
  const params = await searchParams;
  const mode: 'create' | 'edit' = params.mode === 'edit' ? 'edit' : 'create';

  // ProtectedRoute hydrates auth store via validateSession() on mount — required
  // so PlanPageClient's useAuthStore((s) => s.user?.id) returns a real uuid.
  return (
    <ProtectedRoute>
      <PlanPageClient mode={mode} />
    </ProtectedRoute>
  );
}
