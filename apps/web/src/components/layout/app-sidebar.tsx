/**
 * App Sidebar Component
 *
 * Collapsible sidebar navigation based on the Figma Make design.
 * Uses the @money-wise/ui Sidebar system which handles
 * desktop (fixed sidebar) and mobile (sheet overlay) automatically.
 */

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  PiggyBank,
  Tags,
  Calendar,
  Clock,
  Target,
  CreditCard,
  Settings,
  LogOut,
  Plus,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  Avatar,
  AvatarFallback,
  Button,
  Separator,
} from '@money-wise/ui';
import { useAuthStore } from '@/store/auth.store';

const financeItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, testId: 'nav-dashboard' },
  { name: 'Conti', href: '/dashboard/accounts', icon: Wallet, testId: 'nav-accounts' },
  { name: 'Transazioni', href: '/dashboard/transactions', icon: Receipt, testId: 'nav-transactions' },
  { name: 'Budget', href: '/dashboard/budgets', icon: PiggyBank, testId: 'nav-budgets' },
  { name: 'Categorie', href: '/dashboard/categories', icon: Tags, testId: 'nav-categories' },
];

const toolsItems = [
  { name: 'Calendario', href: '/dashboard/calendar', icon: Calendar, testId: 'nav-calendar' },
  { name: 'Scheduled', href: '/dashboard/scheduled', icon: Clock, testId: 'nav-scheduled' },
  { name: 'Liabilities', href: '/dashboard/liabilities', icon: CreditCard, testId: 'nav-liabilities' },
  { name: 'Goals', href: '/dashboard/goals', icon: Target, testId: 'nav-goals' },
];

const otherItems = [
  { name: 'Impostazioni', href: '/dashboard/settings', icon: Settings, testId: 'nav-settings' },
];

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(href);
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    router.replace('/auth/login');
    logout();
  };

  const userInitials = user
    ? `${(user.firstName?.[0] ?? '').toUpperCase()}${(user.lastName?.[0] ?? '').toUpperCase()}`
    : '?';

  return (
    <Sidebar collapsible="icon">
      {/* Header: Logo */}
      <SidebarHeader className="p-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 overflow-hidden"
        >
          <Wallet className="size-6 shrink-0 text-sidebar-primary" />
          <span className="text-lg font-bold text-sidebar-foreground truncate group-data-[collapsible=icon]:hidden">
            MoneyWise
          </span>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Navigation */}
      <SidebarContent>
        {/* Finanze group */}
        <SidebarGroup>
          <SidebarGroupLabel>Finanze</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {financeItems.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActiveRoute(pathname, item.href)}
                    tooltip={item.name}
                  >
                    <Link
                      href={item.href}
                      data-testid={item.testId}
                    >
                      <item.icon />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Strumenti group */}
        <SidebarGroup>
          <SidebarGroupLabel>Strumenti</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActiveRoute(pathname, item.href)}
                    tooltip={item.name}
                  >
                    <Link
                      href={item.href}
                      data-testid={item.testId}
                    >
                      <item.icon />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Altro group */}
        <SidebarGroup>
          <SidebarGroupLabel>Altro</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {otherItems.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActiveRoute(pathname, item.href)}
                    tooltip={item.name}
                  >
                    <Link
                      href={item.href}
                      data-testid={item.testId}
                    >
                      <item.icon />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      {/* Footer: CTA + User info */}
      <SidebarFooter>
        {/* New Transaction CTA */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Nuova Transazione"
              className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground"
            >
              <Link href="/dashboard/transactions?action=new">
                <Plus />
                <span>Nuova Transazione</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <Separator className="my-1" />

        {/* User info + logout */}
        <div className="flex items-center gap-2 overflow-hidden px-1 py-1.5" data-testid="user-menu">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="size-7 shrink-0 group-data-[collapsible=icon]:hidden"
            data-testid="logout-button"
            aria-label="Logout"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
