'use client';

import { ReactNode } from 'react';

/**
 * Dashboard Template Component
 *
 * Provides page transition animations for dashboard pages.
 * Unlike layout.tsx, template.tsx re-mounts on each navigation,
 * allowing CSS animations to trigger on route changes.
 */
export default function DashboardTemplate({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="animate-fade-in">
      {children}
    </div>
  );
}
