'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Wallet,
  PiggyBank,
  Banknote,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Pencil,
  Trash2,
  FileText,
  Download,
  RefreshCw,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { accountsClient, type Account, type UpdateAccountRequest } from '@/services/accounts.client';
import { transactionsClient, type Transaction } from '@/services/transactions.client';
import { useBankingStore } from '@/store';
import { initiateLink } from '@/services/banking.client';
import { ManualAccountForm } from '@/components/accounts';
import { EditAccountForm } from '@/components/accounts/EditAccountForm';
import { useActiveGoals } from '@/hooks/useActiveGoals';
import { NewFeatureBanner } from '@/components/ui/new-feature-banner';

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

type ModalType = 'edit' | 'delete' | 'statement' | 'manual' | null;

// ---------------------------------------------------------------------------
// Accounts Page — 1:1 Figma layout + real Supabase data
// ---------------------------------------------------------------------------

export default function AccountsPage() {
  const { syncAccount } = useBankingStore();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const { data: activeGoals = [] } = useActiveGoals();
  const goalNameById = new Map(activeGoals.map((g) => [g.id, g.name]));
  const [isLoading, setIsLoading] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Transactions for selected account
  const [accountTransactions, setAccountTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

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

  // Fetch transactions when selected account changes
  useEffect(() => {
    if (!selectedId) {
      setAccountTransactions([]);
      return;
    }
    let cancelled = false;
    setIsLoadingTransactions(true);
    transactionsClient.getTransactions({ accountId: selectedId })
      .then((data) => { if (!cancelled) setAccountTransactions(data); })
      .catch((err) => { console.error('Failed to fetch transactions:', err); })
      .finally(() => { if (!cancelled) setIsLoadingTransactions(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

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
    if (!selectedAccount) return;
    try {
      await accountsClient.deleteAccount(selectedAccount.id);
      setActiveModal(null);
      setSelectedId(null);
      await fetchAccounts();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleEdit = async (data: UpdateAccountRequest & { id: string }) => {
    setEditSubmitting(true);
    try {
      await accountsClient.updateAccount(data.id, data);
      setActiveModal(null);
      await fetchAccounts();
    } catch (err) {
      console.error('Edit failed:', err);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleCreate = async (data: Parameters<typeof accountsClient.createAccount>[0]) => {
    setIsCreating(true);
    setCreateError(null);
    try {
      await accountsClient.createAccount(data);
      setActiveModal(null);
      await fetchAccounts();
    } catch (err) {
      console.error('Create account failed:', err);
      setCreateError('Impossibile creare il conto. Riprova.');
    } finally {
      setIsCreating(false);
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
      {/* ADR-005 Fase 2.1: deprecation hint verso unified Patrimonio */}
      <NewFeatureBanner
        href="/dashboard/patrimonio"
        message="Conti + investimenti + debiti in un'unica vista unificata."
        testId="accounts-patrimonio-banner"
      />

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
                    onClick={() => { setActiveModal('manual'); setShowAddMenu(false); }}
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
              <Card className={`relative p-5 rounded-2xl border-0 shadow-sm bg-gradient-to-br ${style.gradient} hover:shadow-lg hover:scale-[1.02] transition-all group ${isSelected ? `ring-2 ${style.ring} shadow-xl` : ''} ${account.status === 'HIDDEN' ? 'opacity-50' : ''}`}>
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
                          <button onClick={() => { setSelectedId(account.id); setActiveModal('edit'); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted">
                            <Pencil className="w-3.5 h-3.5" /> Modifica
                          </button>
                          <button onClick={() => { setSelectedId(account.id); setActiveModal('statement'); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted">
                            <FileText className="w-3.5 h-3.5" /> Estratto Conto
                          </button>
                          {!account.isManualAccount && (
                            <button onClick={() => { handleSync(account.id); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted">
                              <RefreshCw className="w-3.5 h-3.5" /> Sincronizza
                            </button>
                          )}
                          <button onClick={() => { setSelectedId(account.id); setActiveModal('delete'); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
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
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                    {account.lastSyncAt
                      ? `Agg. ${new Date(account.lastSyncAt).toLocaleDateString('it-IT')}`
                      : `Creato ${new Date(account.createdAt).toLocaleDateString('it-IT')}`
                    }
                  </p>
                </div>
                {account.goalId && goalNameById.has(account.goalId) && (
                  <div
                    data-testid="account-goal-badge"
                    className="mt-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 max-w-full"
                    title={`Collegato a ${goalNameById.get(account.goalId)}`}
                  >
                    <span aria-hidden="true">🎯</span>
                    <span className="truncate">{goalNameById.get(account.goalId)}</span>
                  </div>
                )}
                {/* Sync status indicator — bottom-right */}
                {account.isManualAccount ? (
                  <div className="absolute bottom-4 right-4 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center" title="Manuale">
                    <Pencil className="w-3 h-3 text-slate-500" />
                  </div>
                ) : account.needsSync ? (
                  <div className="absolute bottom-4 right-4 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center" title="Da sincronizzare">
                    <RefreshCw className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  </div>
                ) : account.syncError ? (
                  <div className="absolute bottom-4 right-4 w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center" title="Errore sync">
                    <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  </div>
                ) : account.isSyncable ? (
                  <div className="absolute bottom-4 right-4 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center" title="Sincronizzato">
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                ) : null}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Account Details — 1:1 Figma: Movimenti (left 2/3) + Dettagli + Azioni (right 1/3) */}
      {selectedAccount && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Movimenti (Transactions) */}
          <div className="lg:col-span-2">
            <Card className="p-6 rounded-2xl border-0 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[16px] font-medium text-foreground">
                  Movimenti - {selectedAccount.name}
                </h3>
                <Button variant="outline" size="sm" className="rounded-xl border-border/50 hover:bg-muted/50">Filtra</Button>
              </div>
              <div className="space-y-2">
                {isLoadingTransactions ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-3.5 animate-pulse">
                        <div className="w-10 h-10 rounded-xl bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 bg-muted rounded w-1/3" />
                          <div className="h-3 bg-muted rounded w-1/4" />
                        </div>
                        <div className="h-4 bg-muted rounded w-16" />
                      </div>
                    ))}
                  </div>
                ) : accountTransactions.length > 0 ? (
                  accountTransactions.map((transaction) => {
                    const isIncome = transaction.type === 'CREDIT';
                    return (
                      <motion.div
                        key={transaction.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-3.5 bg-background hover:bg-muted/30 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isIncome ? 'bg-emerald-500/10' : 'bg-rose-500/10'} group-hover:scale-110 transition-transform`}>
                            {isIncome
                              ? <ArrowUpRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                              : <ArrowDownRight className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                            }
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-foreground">{transaction.description}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[11px] text-muted-foreground">{transaction.merchantName || (isIncome ? 'Entrata' : 'Uscita')}</p>
                              {transaction.isRecurring && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded border border-indigo-500/20">
                                  Ricorrente
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-[13px] font-semibold tabular-nums ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isIncome ? '+' : '-'}€{transaction.displayAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{new Date(transaction.date).toLocaleDateString('it-IT')}</p>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-[13px] text-muted-foreground">Nessuna transazione per questo conto</div>
                )}
              </div>
            </Card>
          </div>

          {/* Right: Dettagli Conto + Azioni — 1:1 Figma sidebar */}
          <div className="space-y-4">
            <Card className="p-5 rounded-2xl border-0 shadow-sm">
              <h3 className="text-[16px] font-medium text-foreground mb-4">Dettagli Conto</h3>
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
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium">Stato</p>
                  <div className="mt-1">
                    {selectedAccount.isManualAccount ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20 font-medium">Manuale</span>
                    ) : selectedAccount.needsSync ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">Da sincronizzare</span>
                    ) : selectedAccount.syncError ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium">Errore sync</span>
                    ) : selectedAccount.isSyncable ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">Sincronizzato</span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{selectedAccount.source}</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium">Saldo</p>
                  <p className="text-[20px] font-semibold text-foreground mt-1 tabular-nums">€{(selectedAccount.currentBalance ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium">Ultimo Aggiornamento</p>
                  <p className="text-[13px] font-medium text-foreground mt-1">
                    {selectedAccount.lastSyncAt
                      ? new Date(selectedAccount.lastSyncAt).toLocaleString('it-IT')
                      : new Date(selectedAccount.updatedAt).toLocaleString('it-IT')
                    }
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 rounded-2xl border-0 shadow-sm">
              <h3 className="text-[16px] font-medium text-foreground mb-4">Azioni</h3>
              <div className="space-y-2">
                <Button className="w-full rounded-xl border-border/50 hover:bg-muted/50 text-[13px]" variant="outline" onClick={() => setActiveModal('statement')}>
                  <FileText className="w-4 h-4 mr-2" />Estratto Conto
                </Button>
                <Button className="w-full rounded-xl border-border/50 hover:bg-muted/50 text-[13px]" variant="outline" onClick={() => setActiveModal('edit')}>
                  <Pencil className="w-4 h-4 mr-2" />Modifica Conto
                </Button>
                {!selectedAccount.isManualAccount && (
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
                  onClick={() => setActiveModal('delete')}
                >
                  <Trash2 className="w-4 h-4 mr-2" />Elimina Conto
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Manual Account Form — modal */}
      {activeModal === 'manual' && (
        <ManualAccountForm
          isModal
          onCancel={() => { setActiveModal(null); setCreateError(null); }}
          onSubmit={handleCreate}
          isSubmitting={isCreating}
          error={createError ?? undefined}
        />
      )}

      {/* Edit Account Form — modal (reuse existing component) */}
      {activeModal === 'edit' && selectedAccount && (
        <EditAccountForm
          account={selectedAccount}
          isModal
          isSubmitting={editSubmitting}
          displaySettingsOnly={selectedAccount.source === 'SALTEDGE'}
          onCancel={() => setActiveModal(null)}
          onSubmit={async (data) => {
            await handleEdit(data);
          }}
        />
      )}

      {/* Modals — delete + statement */}
      <AnimatePresence>
        {activeModal === 'delete' && selectedAccount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h3 className="text-lg font-bold text-foreground">Elimina Conto</h3>
                <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="p-5">
                <p className="text-foreground">Sei sicuro di voler eliminare <strong>{selectedAccount.name}</strong>? Questa azione è irreversibile.</p>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-border">
                <Button variant="outline" onClick={() => setActiveModal(null)}>Annulla</Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>Elimina</Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'statement' && selectedAccount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h3 className="text-lg font-bold text-foreground">Estratto Conto</h3>
                <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="p-5">
                <div className="bg-muted/50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-muted-foreground">Conto</p>
                  <p className="font-bold text-foreground">{selectedAccount.name}</p>
                  <p className="text-sm text-muted-foreground mt-2">Saldo attuale</p>
                  <p className="font-bold text-foreground text-xl">€{(selectedAccount.currentBalance ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                </div>
                <h4 className="font-semibold text-foreground mb-3">Movimenti Recenti</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {accountTransactions.length > 0 ? accountTransactions.slice(0, 20).map((t) => {
                    const isIncome = t.type === 'CREDIT';
                    return (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{t.description}</p>
                          <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString('it-IT')}</p>
                        </div>
                        <p className={`text-sm font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                          {isIncome ? '+' : '-'}€{t.displayAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    );
                  }) : (
                    <p className="text-muted-foreground text-sm text-center py-4">Nessun movimento</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-border">
                <Button variant="outline" onClick={() => setActiveModal(null)}>Chiudi</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Download className="w-4 h-4 mr-2" /> Esporta PDF
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
