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
import { useAuthStore } from '@/stores/auth-store';
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
  Bell,
  Search,
  PiggyBank,
  ChevronDown,
  ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Accounts', href: '/dashboard/accounts', icon: Wallet },
  { name: 'Transactions', href: '/dashboard/transactions', icon: CreditCard },
  { name: 'Investments', href: '/dashboard/investments', icon: TrendingUp },
  { name: 'Goals', href: '/dashboard/goals', icon: Target },
];

const planningItems = [
  { name: 'Budgets', href: '/dashboard/budgets', icon: PiggyBank },
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
    router.push('/auth/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Wallet className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">MoneyWise</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
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
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
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
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                }`}
                data-testid="nav-planning"
                aria-expanded={planningOpen}
              >
                <div className="flex items-center">
                  <ClipboardList
                    className={`mr-3 h-5 w-5 ${
                      isPlanningActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
                    }`}
                  />
                  Planning
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    planningOpen ? 'rotate-180' : ''
                  } ${isPlanningActive ? 'text-blue-600' : 'text-gray-400'}`}
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
                            ? 'bg-blue-100 text-blue-600'
                            : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                        data-testid={`nav-${item.name.toLowerCase()}`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <item.icon
                          className={`mr-3 h-4 w-4 ${
                            isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
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
            <div className="pt-4 border-t border-gray-100 mt-4">
              {bottomNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors group ${
                      isActive
                        ? 'bg-blue-100 text-blue-600'
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                    data-testid={`nav-${item.name.toLowerCase()}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 ${
                        isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
                      }`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-gray-50" data-testid="user-menu">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">
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
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Search bar (desktop) */}
            <div className="hidden lg:flex flex-1 max-w-lg">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search transactions, accounts..."
                  data-testid="search-input"
                />
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100 relative">
                <Bell className="h-6 w-6" />
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>

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
