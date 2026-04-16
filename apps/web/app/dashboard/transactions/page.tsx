'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Receipt,
  Plus,
  Calendar,
  TrendingUp,
  Repeat,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { transactionsClient, type Transaction } from '@/services/transactions.client';
import { accountsClient, type Account } from '@/services/accounts.client';
import { categoriesClient, type CategoryOption, type CategorySpending } from '@/services/categories.client';
import { QuickAddTransaction, EnhancedTransactionList } from '@/components/transactions';

// ---------------------------------------------------------------------------
// Chart tooltip — Figma style
// ---------------------------------------------------------------------------

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">Totale: <span className="font-medium text-foreground">€{payload[0]?.value?.toFixed(2)}</span></p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab types
// ---------------------------------------------------------------------------

type TabKey = 'all' | 'expenses' | 'income' | 'recurring';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'Tutte' },
  { key: 'expenses', label: 'Uscite' },
  { key: 'income', label: 'Entrate' },
  { key: 'recurring', label: 'Ricorrenti' },
];

// ---------------------------------------------------------------------------
// Expenses Page — 1:1 Figma layout + real Supabase data
// ---------------------------------------------------------------------------

export default function ExpensesPage() {
  const router = useRouter();

  // Data state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter state
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  // Current month range
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

  // Maps for EnhancedTransactionList
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((cat) => map.set(cat.id, cat.name));
    return map;
  }, [categories]);

  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((acc) => map.set(acc.id, acc.displayName || acc.name));
    return map;
  }, [accounts]);

  // Category expense class map for fixed/variable classification
  const expenseClassMap = useMemo(() => {
    const map = new Map<string, 'FIXED' | 'VARIABLE'>();
    categories.forEach((cat) => { if (cat.expenseClass) map.set(cat.id, cat.expenseClass); });
    return map;
  }, [categories]);

  // Fetch all data
  const fetchData = useCallback(async (accountId?: string) => {
    try {
      const [allAccounts, allCategories, allTransactions, spending] = await Promise.all([
        accountsClient.getAccounts(),
        categoriesClient.getOptions(),
        transactionsClient.getTransactions({
          accountId: accountId === 'all' ? undefined : accountId,
        }),
        categoriesClient.getSpending(monthStart, monthEnd).catch(() => ({ categories: [], totalSpending: 0, startDate: monthStart, endDate: monthEnd })),
      ]);

      setAccounts(allAccounts.filter(a => a.isActive));
      setCategories(allCategories);
      setTransactions(allTransactions);
      setCategorySpending(spending.categories);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [monthStart, monthEnd]);

  useEffect(() => { fetchData(selectedAccountId); }, [fetchData, selectedAccountId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData(selectedAccountId);
    setIsRefreshing(false);
  };

  // Computed summaries
  const totalExpenses = useMemo(
    () => transactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [transactions]
  );

  const recurringCount = useMemo(
    () => transactions.filter(t => t.isRecurring).length,
    [transactions]
  );

  const totalFixed = useMemo(
    () => transactions
      .filter(t => t.type === 'DEBIT' && t.categoryId && expenseClassMap.get(t.categoryId) === 'FIXED')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [transactions, expenseClassMap]
  );

  const totalVariable = useMemo(
    () => transactions
      .filter(t => t.type === 'DEBIT' && t.categoryId && expenseClassMap.get(t.categoryId) === 'VARIABLE')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [transactions, expenseClassMap]
  );

  const pendingReview = useMemo(
    () => transactions.filter(t => !t.categoryId).length,
    [transactions]
  );

  // Chart data from real category spending
  const chartData = useMemo(
    () => categorySpending
      .map(cat => ({
        name: cat.categoryName,
        value: Number(cat.totalAmount.toFixed(2)),
        color: cat.color || '#6b7280',
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    [categorySpending]
  );

  // Filter transactions by tab
  const filteredTransactions = useMemo(() => {
    switch (activeTab) {
      case 'expenses': return transactions.filter(t => t.type === 'DEBIT');
      case 'income': return transactions.filter(t => t.type === 'CREDIT');
      case 'recurring': return transactions.filter(t => t.isRecurring);
      default: return transactions;
    }
  }, [transactions, activeTab]);

  // Tab counts
  const tabCounts: Record<TabKey, number> = useMemo(() => ({
    all: transactions.length,
    expenses: transactions.filter(t => t.type === 'DEBIT').length,
    income: transactions.filter(t => t.type === 'CREDIT').length,
    recurring: transactions.filter(t => t.isRecurring).length,
  }), [transactions]);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-40 bg-muted rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-2xl" />)}
          </div>
          <div className="h-80 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header — Figma style */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[32px] tracking-[-0.03em] text-foreground">Spese</h1>
          <p className="text-[13px] text-muted-foreground mt-1.5">Monitora e gestisci le tue spese</p>
        </div>
        <div className="flex items-center gap-3">
          {/* AI categorization CTA — Figma style */}
          {pendingReview > 0 && (
            <Button
              variant="outline"
              className="rounded-xl border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 shadow-sm text-[13px]"
              onClick={() => window.location.href = '/dashboard/categories'}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Revisiona {pendingReview} {pendingReview === 1 ? 'transazione' : 'transazioni'}
            </Button>
          )}
          {/* Account filter */}
          {accounts.length > 0 && (
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              aria-label="Filtra per conto"
              className="px-3 py-2 border border-border/50 rounded-xl text-[13px] text-foreground bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <option value="all">Tutti i conti</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          )}
          <Button
            variant="outline"
            className="rounded-xl border-border/50 text-[13px]"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
          <QuickAddTransaction
            trigger={({ onClick }) => (
              <Button
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20 border-0 rounded-xl px-5 py-2.5 text-[13px]"
                onClick={onClick}
              >
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi Spesa
              </Button>
            )}
            onSuccess={() => fetchData(selectedAccountId)}
          />
        </div>
      </div>

      {/* Summary Cards — 1:1 Figma: Bilancio + Fissi + Variabili + Ricorrenti */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Card 1: Bilancio Mensile — no hover (non navigabile) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-6 rounded-2xl border-0 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Spese Totali</p>
                <h3 className="text-lg lg:text-2xl font-bold mt-1 text-foreground tabular-nums">€{totalExpenses.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="p-3 bg-red-100/60 dark:bg-red-900/30 rounded-full">
                <Receipt className="w-5 h-5 lg:w-6 lg:h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Questo mese</p>
          </Card>
        </motion.div>

        {/* Card 2: Costi Fissi — navigabile */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-6 rounded-2xl border-0 shadow-sm cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all" onClick={() => router.push('/dashboard/transactions/fixed')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Costi Fissi</p>
                <h3 className="text-lg lg:text-2xl font-bold mt-1 text-foreground tabular-nums">€{totalFixed.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="p-3 bg-blue-100/60 dark:bg-blue-900/30 rounded-full">
                <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Mensili</p>
          </Card>
        </motion.div>

        {/* Card 3: Costi Variabili — navigabile */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="p-6 rounded-2xl border-0 shadow-sm cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all" onClick={() => router.push('/dashboard/transactions/variable')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Costi Variabili</p>
                <h3 className="text-lg lg:text-2xl font-bold mt-1 text-foreground tabular-nums">€{totalVariable.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="p-3 bg-yellow-100/60 dark:bg-yellow-900/30 rounded-full">
                <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Mensili</p>
          </Card>
        </motion.div>

        {/* Card 4: Ricorrenti — navigabile */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-6 rounded-2xl border-0 shadow-sm cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all" onClick={() => router.push('/dashboard/transactions/recurring')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ricorrenti</p>
                <h3 className="text-lg lg:text-2xl font-bold mt-1 text-foreground tabular-nums">{recurringCount}</h3>
              </div>
              <div className="p-3 bg-purple-100/60 dark:bg-purple-900/30 rounded-full">
                <Repeat className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Attive</p>
          </Card>
        </motion.div>
      </div>

      {/* Bar Chart — Spese per Categoria */}
      {chartData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="p-6 rounded-2xl border-0 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">Spese per Categoria</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" opacity={0.5} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground, #6b7280)' }}
                  axisLine={{ stroke: 'var(--color-border, #e5e7eb)' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--color-muted-foreground, #6b7280)' }}
                  axisLine={{ stroke: 'var(--color-border, #e5e7eb)' }}
                  tickFormatter={(v) => `€${v}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-muted, #f3f4f6)', opacity: 0.3 }} />
                <Bar dataKey="value" name="Importo (€)" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      )}

      {/* Tabs + Transaction List */}
      <div className="space-y-4">
        {/* Tab buttons — simple styled buttons */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label} ({tabCounts[tab.key]})
            </button>
          ))}
        </div>

        {/* Transaction list — existing EnhancedTransactionList with pre-filtered data */}
        <Card className="p-4 rounded-2xl border-0 shadow-sm">
          <EnhancedTransactionList
            transactions={filteredTransactions}
            isLoading={isRefreshing}
            categoryMap={categoryMap}
            accountMap={accountMap}
            onRefresh={() => fetchData(selectedAccountId)}
          />
        </Card>
      </div>
    </div>
  );
}
