'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Search,
  ChevronDown,
  Settings,
  LogOut,
  User,
  Diamond,
  X,
  MessageSquareText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth.store';

// ---------------------------------------------------------------------------
// Static notification data (no read-tracking — all shown as unread)
// ---------------------------------------------------------------------------

const ALL_NOTIFICATIONS = [
  { id: '1', title: 'Budget Ristorazione al 83%', desc: 'Stai avvicinandoti al limite', time: '5 min fa', type: 'warning' as const },
  { id: '2', title: 'Stipendio accreditato', desc: '+\u20AC3.500,00 su Conto Principale', time: '2 ore fa', type: 'success' as const },
  { id: '3', title: 'Bitcoin +5.2% oggi', desc: 'Il tuo portafoglio crypto sale', time: '3 ore fa', type: 'info' as const },
  { id: '4', title: 'Nuova rata disponibile', desc: 'Finanziamento auto - rata 8/48', time: '1 giorno fa', type: 'info' as const },
  { id: '5', title: 'Obiettivo Fondo Emergenza al 82%', desc: 'Ancora \u20AC2.660 per completarlo!', time: '1 giorno fa', type: 'success' as const },
  { id: '6', title: 'Report Marzo disponibile', desc: 'Il tuo report AI mensile \u00E8 pronto', time: '2 giorni fa', type: 'info' as const },
  { id: '7', title: 'Abbonamento Netflix rinnovato', desc: '-\u20AC15,99 da Carta di Credito', time: '3 giorni fa', type: 'warning' as const },
  { id: '8', title: 'Streak 7 giorni!', desc: 'Hai guadagnato +50 diamanti bonus', time: '5 giorni fa', type: 'success' as const },
];

// ---------------------------------------------------------------------------
// TopBar
// ---------------------------------------------------------------------------

export function TopBar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const searchRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
        setShowAllNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
    router.replace('/auth/login');
  };

  const handleNotificationClick = (n: (typeof ALL_NOTIFICATIONS)[0]) => {
    if (n.title.includes('Budget')) router.push('/dashboard/budgets');
    else if (n.title.includes('Bitcoin') || n.title.includes('crypto')) router.push('/dashboard/investments');
    else if (n.title.includes('Report')) router.push('/dashboard/reports');
    else if (n.title.includes('Obiettivo')) router.push('/dashboard/goals');
    else if (n.title.includes('Stipendio') || n.title.includes('Abbonamento')) router.push('/dashboard/transactions');
    else if (n.title.includes('Streak') || n.title.includes('diamanti')) router.push('/dashboard/rewards');
    setShowNotifications(false);
    setShowAllNotifications(false);
  };

  const displayedNotifications = showAllNotifications ? ALL_NOTIFICATIONS : ALL_NOTIFICATIONS.slice(0, 4);
  const unreadCount = ALL_NOTIFICATIONS.length;

  const userInitials = user
    ? `${(user.firstName?.[0] ?? '').toUpperCase()}${(user.lastName?.[0] ?? '').toUpperCase()}` || 'U'
    : 'U';
  const userName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Utente' : 'Utente';
  const userEmail = user?.email ?? '';

  return (
    <div className="hidden md:flex h-14 bg-card/80 backdrop-blur-xl border-b border-border/50 items-center px-5 gap-4 sticky top-0 z-30">
      {/* Search */}
      <div ref={searchRef} className="flex-1 max-w-lg mx-auto relative">
        <div
          className="flex items-center gap-2.5 bg-background rounded-xl px-3.5 py-2 cursor-text transition-all hover:shadow-sm"
          onClick={() => setShowSearch(true)}
        >
          <Search className="w-4 h-4 text-muted-foreground/60" />
          <input
            className="bg-transparent outline-none flex-1 text-[13px] text-foreground placeholder:text-muted-foreground/50"
            placeholder="Cerca transazioni..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => setShowSearch(true)}
          />
        </div>

        <AnimatePresence>
          {showSearch && searchQuery && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 left-0 right-0 bg-card border border-border/50 rounded-2xl shadow-xl overflow-hidden z-50"
            >
              <div className="p-8 text-center text-muted-foreground text-[13px]">
                Cerca transazioni...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right-side actions */}
      <div className="flex items-center gap-0.5">
        {/* Diamonds — static "0" */}
        <button
          onClick={() => router.push('/dashboard/rewards')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <Diamond className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
          <span className="text-[13px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">0</span>
        </button>

        {/* Ask AI */}
        <button
          onClick={() => router.push('/dashboard/ask-ai')}
          className="p-2 rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
          title="AskAI"
        >
          <MessageSquareText className="w-[18px] h-[18px]" />
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="p-2 rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors relative"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 bg-card border border-border/50 rounded-2xl shadow-xl overflow-hidden z-50"
              >
                <div className="p-3.5 border-b border-border/50 flex items-center justify-between">
                  <span className="text-[13px] text-foreground">
                    Notifiche <span className="text-muted-foreground ml-1 text-[11px]">({unreadCount})</span>
                  </span>
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      setShowAllNotifications(false);
                    }}
                    className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {displayedNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className="p-3.5 hover:bg-muted/30 cursor-pointer transition-colors border-b border-border/30 last:border-0"
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                            n.type === 'warning'
                              ? 'bg-amber-400'
                              : n.type === 'success'
                                ? 'bg-emerald-400'
                                : 'bg-blue-400'
                          }`}
                        />
                        <div>
                          <p className="text-[13px] text-foreground">{n.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{n.desc}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">{n.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-2.5 border-t border-border/50 text-center">
                  <button
                    onClick={() => setShowAllNotifications(!showAllNotifications)}
                    className="text-[11px] text-emerald-500 hover:underline"
                  >
                    {showAllNotifications ? 'Mostra meno' : `Vedi tutte (${ALL_NOTIFICATIONS.length})`}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User dropdown */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-1.5 p-1.5 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-[11px]">
              {userInitials}
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground/40" />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-52 bg-card border border-border/50 rounded-2xl shadow-xl overflow-hidden z-50"
              >
                <div className="p-3.5 border-b border-border/50">
                  <p className="text-[13px] text-foreground">{userName}</p>
                  <p className="text-[11px] text-muted-foreground">{userEmail}</p>
                </div>
                <div className="py-1">
                  {[
                    { icon: User, label: 'Profilo', href: '/dashboard/settings' },
                    { icon: Settings, label: 'Impostazioni', href: '/dashboard/settings' },
                    { icon: Diamond, label: 'Ricompense', href: '/dashboard/rewards' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        router.push(item.href);
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-foreground hover:bg-muted/30 transition-colors"
                    >
                      <item.icon className="w-3.5 h-3.5 text-muted-foreground/60" />
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="border-t border-border/50 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
