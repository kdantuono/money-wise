'use client';

import { ReactNode } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CommandPalette } from '@/components/dashboard/CommandPalette';

export default function DashboardRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
      <CommandPalette />
    </ProtectedRoute>
  );
}
