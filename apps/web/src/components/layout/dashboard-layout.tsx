/**
 * Dashboard Layout Component
 *
 * Provides consistent layout structure for dashboard pages.
 * Includes sidebar navigation and main content area.
 */

'use client';

import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-gray-200 bg-white">
        {/* Navigation content */}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50 p-8">
        {children}
      </main>
    </div>
  );
}
