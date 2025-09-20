'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  CreditCard,
  PieChart,
  Target,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  user: any;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Transactions', href: '/transactions', icon: CreditCard },
  { name: 'Budgets', href: '/budgets', icon: Target },
  { name: 'Analytics', href: '/analytics', icon: PieChart },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className='flex h-screen bg-gray-100'>
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className='flex items-center justify-between h-16 px-6 border-b border-gray-200'>
          <h1 className='text-xl font-bold text-blue-600'>MoneyWise</h1>
          <button className='lg:hidden' onClick={() => setSidebarOpen(false)}>
            <X className='h-6 w-6' />
          </button>
        </div>

        <nav className='flex-1 px-4 py-6 space-y-2'>
          {navigation.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.icon className='h-5 w-5 mr-3' />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className='border-t border-gray-200 p-4'>
          <div className='flex items-center space-x-3 mb-4'>
            <div className='w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium'>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className='text-sm font-medium text-gray-900'>{user.name}</p>
              <p className='text-xs text-gray-500'>{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className='flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors'
          >
            <LogOut className='h-4 w-4 mr-3' />
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className='flex-1 flex flex-col overflow-hidden lg:ml-0'>
        {/* Top bar */}
        <header className='bg-white shadow-sm border-b border-gray-200 lg:hidden'>
          <div className='flex items-center justify-between h-16 px-4'>
            <button
              onClick={() => setSidebarOpen(true)}
              className='text-gray-500 hover:text-gray-700'
            >
              <Menu className='h-6 w-6' />
            </button>
            <h1 className='text-lg font-semibold text-gray-900'>MoneyWise</h1>
            <div className='w-6' />
          </div>
        </header>

        {/* Main content area */}
        <main className='flex-1 overflow-auto p-6'>{children}</main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className='fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden'
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
