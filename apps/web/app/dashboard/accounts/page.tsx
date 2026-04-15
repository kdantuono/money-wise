'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion';
import {
  CreditCard,
  Wallet,
  PiggyBank,
  Banknote,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { accountsClient, type Account } from '@/services/accounts.client';
import { useBankingStore } from '@/store';
import { initiateLink } from '@/services/banking.client';
import { ManualAccountForm } from '@/components/accounts';

// ---------------------------------------------------------------------------
// Helpers — 1:1 from Figma Accounts.tsx styling
// ---------------------------------------------------------------------------

function getAccountIcon(type: string) {
  switch (type?.toUpperCase()) {
    case 'CHECKING': return Wallet;
    case 'SAVINGS': return PiggyBank;
    case 'CREDIT_CARD': return CreditCard;
    case 'CASH': return Banknote;
    default: return Wallet;
  }
}

function getAccountTypeLabel(type: string) {
  switch (type?.toUpperCase()) {
    case 'CHECKING': return 'Conto Corrente';
    case 'SAVINGS': return 'Risparmio';
    case 'CREDIT_CARD': return 'Carta di Credito';
    case 'CASH': return 'Contante';
    case 'INVESTMENT': return 'Investimento';
    case 'LOAN': return 'Prestito';
    case 'MORTGAGE': return 'Mutuo';
    default: return type || 'Conto';
  }
}

function getAccountStyle(type: string) {
  switch (type?.toUpperCase()) {
    case 'CHECKING': return { gradient: 'from-blue-500/10 to-cyan-500/10', iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500', ring: 'ring-blue-500/50' };
    case 'SAVINGS': return { gradient: 'from-emerald-500/10 to-teal-500/10', iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500', ring: 'ring-emerald-500/50' };
    case 'CREDIT_CARD': return { gradient: 'from-purple-500/10 to-pink-500/10', iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500', ring: 'ring-purple-500/50' };
    case 'INVESTMENT': return { gradient: 'from-indigo-500/10 to-violet-500/10', iconBg: 'bg-gradient-to-br from-indigo-500 to-violet-500', ring: 'ring-indigo-500/50' };
    default: return { gradient: 'from-amber-500/10 to-orange-500/10', iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500', ring: 'ring-amber-500/50' };
  }
}

// ---------------------------------------------------------------------------
// Accounts Page — Figma visual + existing banking logic
// ---------------------------------------------------------------------------

export default function AccountsPage() {
  const router = useRouter();
  const { syncAccount } = useBankingStore();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await accountsClient.getAccounts(showHidden);
      setAccounts(data);
      if (!selectedId && data.length > 0) setSelectedId(data[0].id);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [showHidden, selectedId]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const selectedAccount = accounts.find(a => a.id === selectedId);
  const visibleAccounts = showHidden ? accounts : accounts.filter(a => a.status !== 'HIDDEN');

  const handleSync = async (accountId: string) => {
    try {
      await syncAccount(accountId);
      await fetchAccounts();
    } catch (err) {
      console.error('Sync failed:', err);
    }
  };

  const handleDelete = async () => {
    if (!deletingAccount) return;
    try {
      await accountsClient.deleteAccount(deletingAccount.id);
      setDeletingAccount(null);
      await fetchAccounts();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-56 bg-muted rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-44 bg-muted rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header — 1:1 Figma */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[32px] tracking-[-0.03em] text-foreground">Conti e Carte</h1>
          <p className="text-[13px] text-muted-foreground mt-1.5">Gestisci i tuoi conti correnti e carte</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-xl border-border/50 text-[13px]"
            onClick={() => setShowHidden(!showHidden)}
          >
            {showHidden ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showHidden ? 'Nascondi' : `Mostra nascosti${accounts.filter(a => a.status === 'HIDDEN').length > 0 ? ` (${accounts.filter(a => a.status === 'HIDDEN').length})` : ''}`}
          </Button>
          {/* Aggiungi Conto dropdown — Figma style */}
          <div className="relative">
            <Button
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20 border-0 rounded-xl px-5 py-2.5 text-[13px]"
              onClick={() => setShowAddMenu(!showAddMenu)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Conto
            </Button>
            <AnimatePresence>
              {showAddMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-2 w-52 bg-card border border-border/50 rounded-2xl shadow-xl z-20 overflow-hidden"
                >
                  <button
                    onClick={() => { setShowManualForm(true); setShowAddMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-foreground hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Conto Manuale</p>
                      <p className="text-[11px] text-muted-foreground">Aggiungi manualmente</p>
                    </div>
                  </button>
                  <button
                    onClick={async () => {
                      setShowAddMenu(false);
                      try {
                        const { redirectUrl } = await initiateLink('SALTEDGE');
                        window.open(redirectUrl, '_blank', 'width=600,height=700');
                      } catch (err) {
                        console.error('Banking link failed:', err);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-foreground hover:bg-muted/30 transition-colors border-t border-border/30"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Collega Banca</p>
                      <p className="text-[11px] text-muted-foreground">Via SaltEdge OAuth</p>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Accounts Grid — 1:1 Figma card styling */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleAccounts.map((account, index) => {
          const Icon = getAccountIcon(account.type);
          const style = getAccountStyle(account.type);
          const isNegative = (account.currentBalance ?? 0) < 0;
          const isSelected = selectedId === account.id;

          return (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedId(account.id)}
              className="cursor-pointer"
            >
              <Card className={`p-5 rounded-2xl border-0 shadow-sm bg-gradient-to-br ${style.gradient} hover:shadow-lg hover:scale-[1.02] transition-all group ${isSelected ? `ring-2 ${style.ring} shadow-xl` : ''} ${account.status === 'HIDDEN' ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl ${style.iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="relative">
                    <button
                      className="p-1.5 hover:bg-background/60 rounded-lg transition-colors"
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === account.id ? null : account.id); }}
                    >
                      <MoreVertical className="w-4 h-4 text-muted-foreground/60" />
                    </button>
                    <AnimatePresence>
                      {menuOpenId === account.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-xl shadow-lg z-10 overflow-hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button onClick={() => { router.push(`/dashboard/accounts/${account.id}`); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted">
                            <Pencil className="w-3.5 h-3.5" /> Dettagli
                          </button>
                          {account.source === 'SALTEDGE' && (
                            <button onClick={() => { handleSync(account.id); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted">
                              <RefreshCw className="w-3.5 h-3.5" /> Sincronizza
                            </button>
                          )}
                          <button onClick={() => { setDeletingAccount(account); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                            <Trash2 className="w-3.5 h-3.5" /> Elimina
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium">{getAccountTypeLabel(account.type)}</p>
                <h3 className="text-[15px] font-medium mt-1.5 text-foreground truncate">{account.name}</h3>
                <div className="mt-4">
                  <p className={`text-[26px] tracking-[-0.03em] font-semibold tabular-nums ${isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                    {isNegative ? '-' : ''}€{Math.abs(account.currentBalance ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                  {account.lastSyncAt && (
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                      Agg. {new Date(account.lastSyncAt).toLocaleDateString('it-IT')}
                    </p>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Account Details — 1:1 Figma layout 2/3 + 1/3 */}
      {selectedAccount && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Details */}
          <div className="lg:col-span-2">
            <Card className="p-6 rounded-2xl border-0 shadow-sm">
              <h3 className="text-[16px] font-medium text-foreground mb-6">
                Dettagli — {selectedAccount.name}
              </h3>
              <div className="space-y-3.5">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium">Nome</p>
                  <p className="text-[13px] font-medium text-foreground mt-1">{selectedAccount.name}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium">Tipo</p>
                  <p className="text-[13px] font-medium text-foreground mt-1">{getAccountTypeLabel(selectedAccount.type)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium">Saldo</p>
                  <p className="text-[20px] font-semibold text-foreground mt-1 tabular-nums">€{(selectedAccount.currentBalance ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium">Fonte</p>
                  <p className="text-[13px] font-medium text-foreground mt-1">{selectedAccount.source ?? 'Manuale'}</p>
                </div>
                {selectedAccount.lastSyncAt && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium">Ultimo Aggiornamento</p>
                    <p className="text-[13px] font-medium text-foreground mt-1">{new Date(selectedAccount.lastSyncAt).toLocaleString('it-IT')}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right: Actions — 1:1 Figma sidebar */}
          <div className="space-y-4">
            <Card className="p-5 rounded-2xl border-0 shadow-sm">
              <h3 className="text-[16px] font-medium text-foreground mb-4">Azioni</h3>
              <div className="space-y-2">
                {selectedAccount.source === 'SALTEDGE' && (
                  <Button
                    className="w-full rounded-xl border-border/50 hover:bg-muted/50 text-[13px]"
                    variant="outline"
                    onClick={() => handleSync(selectedAccount.id)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" /> Sincronizza
                  </Button>
                )}
                <Button
                  className="w-full rounded-xl text-rose-600 hover:text-rose-700 border-rose-200 dark:border-rose-500/20 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-[13px]"
                  variant="outline"
                  onClick={() => setDeletingAccount(selectedAccount)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Elimina Conto
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Manual Account Form */}
      {showManualForm && (
        <ManualAccountForm
          onCancel={() => setShowManualForm(false)}
          onSubmit={async () => {
            setShowManualForm(false);
            await fetchAccounts();
          }}
        />
      )}

      {/* Delete Confirmation — simple modal */}
      <AnimatePresence>
        {deletingAccount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setDeletingAccount(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[16px] font-medium text-foreground mb-2">Elimina Conto</h3>
              <p className="text-[13px] text-muted-foreground mb-6">
                Sei sicuro di voler eliminare <strong>{deletingAccount.name}</strong>? Questa azione è irreversibile.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" className="rounded-xl" onClick={() => setDeletingAccount(null)}>Annulla</Button>
                <Button className="rounded-xl bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>Elimina</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
