/**
 * Dashboard Layout Component
 *
 * Provides consistent layout structure for dashboard pages.
 * Includes sidebar navigation and main content area.
 */

'use client';

import { ReactNode, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  TrendingUp,
  Target,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Search,
  PiggyBank,
  ChevronDown,
  ClipboardList,
  Tags,
  Calendar,
  Clock,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Accounts', href: '/dashboard/accounts', icon: Wallet },
  { name: 'Transactions', href: '/dashboard/transactions', icon: CreditCard },
  { name: 'Categories', href: '/dashboard/categories', icon: Tags },
  { name: 'Liabilities', href: '/dashboard/liabilities', icon: Receipt },
  { name: 'Investments', href: '/dashboard/investments', icon: TrendingUp },
];

const planningItems = [
  { name: 'Budgets', href: '/dashboard/budgets', icon: PiggyBank },
  { name: 'Goals', href: '/dashboard/goals', icon: Target },
  { name: 'Scheduled', href: '/dashboard/scheduled', icon: Clock },
  { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
];

const bottomNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check if any planning route is active to auto-expand the dropdown
  const isPlanningActive = planningItems.some(item => pathname.startsWith(item.href));
  const [planningOpen, setPlanningOpen] = useState(isPlanningActive);

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-border">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Wallet className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">MoneyWise</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-muted-foreground hover:text-foreground/80"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {/* Main navigation items */}
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors group ${
                    isActive
                      ? 'bg-accent text-primary'
                      : 'text-foreground/80 hover:bg-accent/50 hover:text-primary'
                  }`}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}

            {/* Planning dropdown section */}
            <div className="pt-2">
              <button
                onClick={() => setPlanningOpen(!planningOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors group ${
                  isPlanningActive
                    ? 'bg-accent/50 text-primary'
                    : 'text-foreground/80 hover:bg-accent/50 hover:text-primary'
                }`}
                data-testid="nav-planning"
                aria-expanded={planningOpen}
              >
                <div className="flex items-center">
                  <ClipboardList
                    className={`mr-3 h-5 w-5 ${
                      isPlanningActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
                    }`}
                  />
                  Planning
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    planningOpen ? 'rotate-180' : ''
                  } ${isPlanningActive ? 'text-primary' : 'text-muted-foreground'}`}
                />
              </button>

              {/* Planning sub-items */}
              {planningOpen && (
                <div className="mt-1 ml-4 space-y-1">
                  {planningItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors group ${
                          isActive
                            ? 'bg-accent text-primary'
                            : 'text-muted-foreground hover:bg-accent/50 hover:text-primary'
                        }`}
                        data-testid={`nav-${item.name.toLowerCase()}`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <item.icon
                          className={`mr-3 h-4 w-4 ${
                            isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
                          }`}
                        />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom navigation items (Settings) */}
            <div className="pt-4 border-t border-border mt-4">
              {bottomNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors group ${
                      isActive
                        ? 'bg-accent text-primary'
                        : 'text-foreground/80 hover:bg-accent/50 hover:text-primary'
                    }`}
                    data-testid={`nav-${item.name.toLowerCase()}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 ${
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
                      }`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-background" data-testid="user-menu">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header Bar */}
        <header className="bg-card border-b border-border sticky top-0 z-10">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground/80"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Search bar (desktop) */}
            <div className="hidden lg:flex flex-1 max-w-lg">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-border rounded-lg leading-5 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:placeholder-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="Search transactions, accounts..."
                  data-testid="search-input"
                />
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <NotificationBell />

              {/* Logout Button */}
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
                data-testid="logout-button"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
