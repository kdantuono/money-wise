'use client';

import { ReactNode } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CommandPalette } from '@/components/dashboard/CommandPalette';
import { OnboardingGate } from '@/components/onboarding/onboarding-gate';

export default function DashboardRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ProtectedRoute>
      <OnboardingGate>
        <DashboardLayout>{children}</DashboardLayout>
        <CommandPalette />
      </OnboardingGate>
    </ProtectedRoute>
  );
}
