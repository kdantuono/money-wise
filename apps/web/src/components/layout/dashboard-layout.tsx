/**
 * Dashboard Layout Component
 *
 * Provides the sidebar + main content layout for all dashboard pages.
 * Uses the @money-wise/ui Sidebar system which handles desktop (fixed
 * sidebar) and mobile (sheet overlay) automatically.
 */

'use client';

import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger, Separator } from '@money-wise/ui';
import { AppSidebar } from './app-sidebar';
import { NotificationBell } from '@/components/notifications';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Top header bar */}
        <header className="flex h-14 items-center gap-2 border-b border-border bg-background px-4 sticky top-0 z-10">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1" />
          <NotificationBell />
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
