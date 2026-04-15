'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  Receipt,
  PiggyBank,
  Brain,
  Settings as SettingsIcon,
  Menu,
  X,
  Plus,
  Diamond,
  MessageSquareText,
  Target,
  Upload,
  LogOut,
  FileText,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion';
import { useAuthStore } from '@/store/auth.store';

// ---------------------------------------------------------------------------
// Navigation config — mapped to Next.js App Router paths
// ---------------------------------------------------------------------------

const mainNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Conti', href: '/dashboard/accounts', icon: Wallet },
  { name: 'Investimenti', href: '/dashboard/investments', icon: TrendingUp },
  { name: 'Spese', href: '/dashboard/transactions', icon: Receipt },
  { name: 'Budget', href: '/dashboard/budgets', icon: PiggyBank },
];

const toolsNav = [
  { name: 'Categorizzazione AI', href: '/dashboard/categories', icon: Sparkles },
  { name: 'Obiettivi', href: '/dashboard/goals', icon: Target },
  { name: 'Analisi AI', href: '/dashboard/analysis', icon: Brain },
  { name: 'AskAI', href: '/dashboard/ask-ai', icon: MessageSquareText },
];

const moreNav = [
  { name: 'Import/Export', href: '/dashboard/import-export', icon: Upload },
  { name: 'Report AI', href: '/dashboard/reports', icon: FileText },
  { name: 'Ricompense', href: '/dashboard/rewards', icon: Diamond },
  { name: 'Impostazioni', href: '/dashboard/settings', icon: SettingsIcon },
];

const allNav = [...mainNav, ...toolsNav, ...moreNav];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NavLink({
  item,
  pathname,
  onClick,
}: {
  item: (typeof mainNav)[0];
  pathname: string;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  const active =
    item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 text-[13px] ${
        active
          ? 'bg-foreground/[0.06] text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03]'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={`w-[18px] h-[18px] ${active ? 'text-emerald-500' : ''}`}
          strokeWidth={active ? 2 : 1.5}
        />
        <span className={active ? 'tracking-[-0.01em]' : ''}>{item.name}</span>
      </div>
    </Link>
  );
}

function NavSection({
  label,
  items,
  pathname,
}: {
  label: string;
  items: typeof mainNav;
  pathname: string;
}) {
  return (
    <div className="mb-1">
      <p className="px-3 py-2 text-[10px] tracking-[0.08em] uppercase text-muted-foreground/60">
        {label}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavLink key={item.name} item={item} pathname={pathname} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main layout
// ---------------------------------------------------------------------------

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  const userInitials = user
    ? `${(user.firstName?.[0] ?? '').toUpperCase()}${(user.lastName?.[0] ?? '').toUpperCase()}`
    : '?';
  const userName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '';
  const userEmail = user?.email ?? '';

  return (
    <div className="flex h-screen bg-background">
      {/* ================================================================
          Desktop Sidebar — 1:1 from Figma Root.tsx
          ================================================================ */}
      <aside className="hidden md:flex md:flex-col md:w-60 bg-card flex-shrink-0 border-r border-border/50">
        {/* Logo */}
        <div className="flex items-center h-14 px-5">
          <Link href="/dashboard" className="text-[15px] tracking-[-0.03em] text-foreground">
            <span className="text-emerald-500">●</span>{' '}
            <span className="opacity-90">Zecca</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <NavSection label="Finanze" items={mainNav} pathname={pathname} />
          <NavSection label="Strumenti" items={toolsNav} pathname={pathname} />
          <NavSection label="Altro" items={moreNav} pathname={pathname} />
        </nav>

        {/* User + CTA */}
        <div className="p-3 space-y-3">
          <button
            onClick={() => router.push('/dashboard/transactions?action=new')}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-foreground text-background text-[13px] hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Nuova Transazione
          </button>
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-[11px]">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-foreground truncate">{userName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{userEmail}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              title="Logout"
              data-testid="logout-button"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ================================================================
          Mobile Header — fixed top bar
          ================================================================ */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between h-13 px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-muted-foreground"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="text-[15px] text-foreground">
              <span className="text-emerald-500">●</span> Zecca
            </span>
          </div>
          <button
            onClick={() => router.push('/dashboard/transactions?action=new')}
            className="p-2 rounded-xl bg-foreground text-background"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ================================================================
          Mobile Menu — animated slide drawer
          ================================================================ */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute top-0 left-0 bottom-0 w-64 bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center h-13 px-5 border-b border-border/50">
                <span className="text-[15px] text-foreground">
                  <span className="text-emerald-500">●</span> Zecca
                </span>
              </div>
              <nav
                className="px-3 py-3 space-y-0.5 overflow-y-auto"
                style={{ maxHeight: 'calc(100vh - 120px)' }}
              >
                {allNav.map((item) => (
                  <NavLink
                    key={item.name}
                    item={item}
                    pathname={pathname}
                    onClick={() => setMobileMenuOpen(false)}
                  />
                ))}
              </nav>
              <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border/50 bg-card">
                <div className="flex items-center gap-2.5 px-2 py-1">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-[11px]">
                    {userInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-foreground truncate">{userName}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================
          Main Content — with page transition
          ================================================================ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopBar placeholder — will be replaced in DS-9 */}
        <div className="hidden md:flex h-14 bg-card/80 backdrop-blur-xl border-b border-border/50 items-center px-5">
          <div className="flex-1" />
          <p className="text-[13px] text-muted-foreground">
            {userName}
          </p>
        </div>

        <main className="flex-1 overflow-y-auto pt-13 md:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
