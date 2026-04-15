'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Bell,
  ShoppingCart,
  Home,
  Car,
  Utensils,
  Zap,
  CreditCard,
  DollarSign,
  MoreHorizontal,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DashboardFilters } from '@/components/dashboard';
import { useAuthStore } from '@/store/auth.store';
import { useDashboardData } from '@/hooks/useDashboardStats';
import type { TimePeriod, CategorySpending, Transaction } from '@/types/dashboard.types';
import { cn } from '@/lib/utils';

// =============================================================================
// Formatting Helpers
// =============================================================================

function formatEUR(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

function formatCompactEUR(n: number): string {
  return n.toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function formatChartMonth(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('it-IT', { month: 'short' }).format(date);
}

// =============================================================================
// Category Icon Mapping
// =============================================================================

function getCategoryIcon(category: string) {
  const lower = category.toLowerCase();
  if (lower.includes('food') || lower.includes('grocer') || lower.includes('dining'))
    return <Utensils className="h-4 w-4" />;
  if (lower.includes('transport') || lower.includes('auto') || lower.includes('car'))
    return <Car className="h-4 w-4" />;
  if (lower.includes('home') || lower.includes('rent') || lower.includes('mortgage'))
    return <Home className="h-4 w-4" />;
  if (lower.includes('utilit') || lower.includes('electric') || lower.includes('gas'))
    return <Zap className="h-4 w-4" />;
  if (lower.includes('shop') || lower.includes('retail'))
    return <ShoppingCart className="h-4 w-4" />;
  if (lower.includes('income') || lower.includes('salary'))
    return <DollarSign className="h-4 w-4" />;
  if (lower.includes('credit') || lower.includes('payment'))
    return <CreditCard className="h-4 w-4" />;
  return <MoreHorizontal className="h-4 w-4" />;
}

// =============================================================================
// Animation Variants
// =============================================================================

const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// =============================================================================
// Custom Chart Tooltip
// =============================================================================

interface ChartTooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadEntry[];
  label?: string;
}

function CustomChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border/50 rounded-xl px-4 py-3 shadow-lg">
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      {payload.map((entry: ChartTooltipPayloadEntry, i: number) => (
        <p key={i} className="text-[13px] font-medium" style={{ color: entry.color }}>
          {entry.name}: {formatEUR(entry.value)}
        </p>
      ))}
    </div>
  );
}

// =============================================================================
// Skeleton Components
// =============================================================================

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border-0 shadow-sm bg-card p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-muted" />
        <div className="h-3 w-16 bg-muted rounded" />
      </div>
      <div className="h-7 w-24 bg-muted rounded mb-2" />
      <div className="h-3 w-20 bg-muted rounded" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-2xl border-0 shadow-sm bg-card p-6 animate-pulse">
      <div className="h-5 w-40 bg-muted rounded mb-2" />
      <div className="h-3 w-28 bg-muted rounded mb-6" />
      <div className="h-[300px] bg-muted/50 rounded-xl" />
    </div>
  );
}

function TransactionSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="h-3 w-20 bg-muted rounded animate-pulse" />
      </div>
      <div className="h-4 w-16 bg-muted rounded animate-pulse" />
    </div>
  );
}

// =============================================================================
// Stat Card
// =============================================================================

interface StatCardProps {
  label: string;
  value: string;
  trend?: number;
  icon: React.ReactNode;
  iconGradient: string;
  delay: number;
}

function StatCard({ label, value, trend, icon, iconGradient, delay }: StatCardProps) {
  return (
    <motion.div
      {...fadeSlide}
      transition={{ delay, duration: 0.3 }}
      className="rounded-2xl border-0 shadow-sm bg-card p-5"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center text-white', iconGradient)}>
          {icon}
        </div>
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold tracking-[-0.03em] text-foreground">{value}</p>
      {trend !== undefined && (
        <p className={cn(
          'text-[11px] font-medium mt-1',
          trend >= 0 ? 'text-emerald-500' : 'text-rose-500'
        )}>
          {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% vs mese prec.
        </p>
      )}
    </motion.div>
  );
}

// =============================================================================
// CATEGORY COLORS for Pie Chart
// =============================================================================

const DEFAULT_PIE_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
];

// =============================================================================
// Main Component
// =============================================================================

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<TimePeriod>('monthly');
  const { stats, spending, transactions, trends, isLoading, error } = useDashboardData(period);

  // Compute savings trend data
  const trendsWithSavings = trends?.map((t) => ({
    ...t,
    savings: t.income - t.expenses,
  }));

  // Error state
  if (error) {
    return (
      <div className="space-y-6" data-testid="dashboard">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] text-muted-foreground">Buongiorno</p>
            <h1 className="text-[32px] font-bold tracking-tight text-foreground">
              {formatEUR(0)}
            </h1>
          </div>
          <DashboardFilters period={period} onPeriodChange={setPeriod} />
        </div>
        <div className="rounded-2xl border-0 shadow-sm bg-card p-6 text-center">
          <p className="text-rose-500 font-medium">Impossibile caricare i dati della dashboard</p>
          <p className="text-rose-400 text-[13px] mt-1">
            {error.message || 'Riprova più tardi'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* ================================================================= */}
      {/* Header Section                                                    */}
      {/* ================================================================= */}
      <motion.div
        {...fadeSlide}
        transition={{ delay: 0, duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      >
        <div>
          <p className="text-[13px] text-muted-foreground mb-1">
            Buongiorno{user?.firstName ? <>, <span data-testid="user-name">{user.firstName}</span></> : ''}
          </p>
          <div className="flex items-baseline gap-3">
            <h1
              className="text-[32px] font-bold tracking-[-0.03em] text-foreground leading-none"
            >
              {isLoading ? (
                <span className="inline-block h-8 w-48 bg-muted rounded animate-pulse align-middle" />
              ) : (
                formatEUR(stats?.totalBalance ?? 0)
              )}
            </h1>
            {!isLoading && stats?.balanceTrend !== undefined && (
              <span className={cn(
                'text-[13px] font-semibold',
                stats.balanceTrend >= 0 ? 'text-emerald-500' : 'text-rose-500'
              )}>
                {stats.balanceTrend >= 0 ? '+' : ''}{stats.balanceTrend.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">
            patrimonio totale
          </p>
        </div>
        <DashboardFilters period={period} onPeriodChange={setPeriod} />
      </motion.div>

      {/* ================================================================= */}
      {/* Stats Grid (2x2 mobile, 4 across desktop)                        */}
      {/* ================================================================= */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="current-balance" aria-busy="true">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="current-balance">
          <StatCard
            label="Liquidità"
            value={formatCompactEUR(stats?.totalBalance ?? 0)}
            trend={stats?.balanceTrend}
            icon={<Wallet className="h-[18px] w-[18px]" />}
            iconGradient="bg-gradient-to-br from-blue-500 to-blue-600"
            delay={0.05}
          />
          <StatCard
            label="Investimenti"
            value={formatCompactEUR(0)} // TODO: Add investments data when hook provides it
            trend={undefined}
            icon={<TrendingUp className="h-[18px] w-[18px]" />}
            iconGradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
            delay={0.1}
          />
          <StatCard
            label="Entrate del mese"
            value={formatCompactEUR(stats?.monthlyIncome ?? 0)}
            trend={stats?.incomeTrend}
            icon={<ArrowUpRight className="h-[18px] w-[18px]" />}
            iconGradient="bg-gradient-to-br from-green-500 to-green-600"
            delay={0.15}
          />
          <StatCard
            label="Spese del mese"
            value={formatCompactEUR(stats?.monthlyExpenses ?? 0)}
            trend={stats?.expensesTrend !== undefined ? -stats.expensesTrend : undefined}
            icon={<ArrowDownRight className="h-[18px] w-[18px]" />}
            iconGradient="bg-gradient-to-br from-rose-500 to-rose-600"
            delay={0.2}
          />
        </div>
      )}

      {/* ================================================================= */}
      {/* Charts Row (2/3 area chart + 1/3 pie chart)                      */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart: Income/Expenses/Savings Trend */}
        {isLoading ? (
          <div className="lg:col-span-2"><ChartSkeleton /></div>
        ) : (
          <motion.div
            {...fadeSlide}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="lg:col-span-2 rounded-2xl border-0 shadow-sm bg-card p-6"
          >
            <div className="mb-4">
              <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
                Andamento Finanziario
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Entrate, uscite e risparmio nel tempo
              </p>
            </div>
            <div className="h-[300px]">
              {trendsWithSavings && trendsWithSavings.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendsWithSavings}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartMonth}
                      className="text-[11px]"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                      className="text-[11px]"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <RechartsTooltip content={<CustomChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="income"
                      name="Entrate"
                      stroke="#10b981"
                      fill="url(#incomeGrad)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      name="Uscite"
                      stroke="#f43f5e"
                      fill="url(#expenseGrad)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="savings"
                      name="Risparmio"
                      stroke="#3b82f6"
                      fill="url(#savingsGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[13px] text-muted-foreground">
                    Nessun dato di tendenza disponibile
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Pie Chart: Expense Distribution */}
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <motion.div
            {...fadeSlide}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="rounded-2xl border-0 shadow-sm bg-card p-6"
          >
            <div className="mb-4">
              <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
                Spese per Categoria
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Distribuzione del periodo
              </p>
            </div>
            {spending && spending.length > 0 ? (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spending}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {spending.map((entry: CategorySpending, index: number) => (
                          <Cell
                            key={entry.id}
                            fill={entry.color || DEFAULT_PIE_COLORS[index % DEFAULT_PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null;
                          const data = payload[0].payload as CategorySpending;
                          return (
                            <div className="bg-card border border-border/50 rounded-xl px-3 py-2 shadow-lg">
                              <p className="text-[13px] font-medium text-foreground">{data.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {formatEUR(data.amount)} ({data.percentage}%)
                              </p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {spending.slice(0, 5).map((cat: CategorySpending, index: number) => (
                    <div key={cat.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat.color || DEFAULT_PIE_COLORS[index % DEFAULT_PIE_COLORS.length] }}
                        />
                        <span className="text-[13px] text-foreground truncate">{cat.name}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground ml-2 flex-shrink-0">
                        {cat.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-[13px] text-muted-foreground">
                  Nessun dato di spesa disponibile
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* ================================================================= */}
      {/* Bottom Row (1/2 recent transactions + 1/2 insights)              */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <motion.div
          {...fadeSlide}
          transition={{ delay: 0.35, duration: 0.3 }}
          className="rounded-2xl border-0 shadow-sm bg-card p-6"
          data-testid="recent-transactions"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
              Transazioni Recenti
            </h2>
            <a
              href="/dashboard/transactions"
              className="text-[11px] text-primary hover:text-primary/80 flex items-center gap-1 font-medium"
            >
              Vedi tutto
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
          {isLoading ? (
            <div className="space-y-0 divide-y divide-border/50">
              {[1, 2, 3, 4, 5].map((i) => (
                <TransactionSkeleton key={i} />
              ))}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-0 divide-y divide-border/50">
              {transactions.map((tx: Transaction) => {
                const isIncome = tx.type === 'income';
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className={cn(
                      'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0',
                      isIncome
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {getCategoryIcon(tx.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {tx.description}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {tx.category} &middot; {formatDate(tx.date)}
                      </p>
                    </div>
                    <p className={cn(
                      'text-[13px] font-semibold tracking-[-0.03em] flex-shrink-0',
                      isIncome ? 'text-emerald-500' : 'text-foreground'
                    )}>
                      {isIncome ? '+' : '-'}{formatCompactEUR(Math.abs(tx.amount))}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-[13px] text-muted-foreground font-medium">
                Nessuna transazione
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Collega un conto o aggiungi transazioni manualmente
              </p>
            </div>
          )}
        </motion.div>

        {/* Financial Insights / Alerts */}
        <motion.div
          {...fadeSlide}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="rounded-2xl border-0 shadow-sm bg-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
              Insights Finanziari
            </h2>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="space-y-3">
            {/* Savings rate insight */}
            {stats && stats.monthlyIncome > 0 && (
              <div className="flex gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground">
                    Tasso di risparmio
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Stai risparmiando il{' '}
                    <span className="font-semibold text-emerald-500">
                      {((stats.savingsRate ?? ((stats.monthlyIncome - stats.monthlyExpenses) / stats.monthlyIncome * 100))).toFixed(1)}%
                    </span>{' '}
                    delle tue entrate questo mese
                  </p>
                </div>
              </div>
            )}

            {/* Expense change insight */}
            {stats?.expensesTrend !== undefined && (
              <div className={cn(
                'flex gap-3 p-3 rounded-xl border',
                stats.expensesTrend > 0
                  ? 'bg-rose-500/5 border-rose-500/10'
                  : 'bg-emerald-500/5 border-emerald-500/10'
              )}>
                <div className={cn(
                  'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  stats.expensesTrend > 0
                    ? 'bg-rose-500/10'
                    : 'bg-emerald-500/10'
                )}>
                  {stats.expensesTrend > 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-rose-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-emerald-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground">
                    {stats.expensesTrend > 0 ? 'Spese in aumento' : 'Spese in calo'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Le tue spese sono {stats.expensesTrend > 0 ? 'aumentate' : 'diminuite'} del{' '}
                    <span className={cn(
                      'font-semibold',
                      stats.expensesTrend > 0 ? 'text-rose-500' : 'text-emerald-500'
                    )}>
                      {Math.abs(stats.expensesTrend).toFixed(1)}%
                    </span>{' '}
                    rispetto al mese precedente
                  </p>
                </div>
              </div>
            )}

            {/* Income change insight */}
            {stats?.incomeTrend !== undefined && (
              <div className={cn(
                'flex gap-3 p-3 rounded-xl border',
                stats.incomeTrend >= 0
                  ? 'bg-emerald-500/5 border-emerald-500/10'
                  : 'bg-rose-500/5 border-rose-500/10'
              )}>
                <div className={cn(
                  'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  stats.incomeTrend >= 0
                    ? 'bg-emerald-500/10'
                    : 'bg-rose-500/10'
                )}>
                  {stats.incomeTrend >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-rose-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground">
                    {stats.incomeTrend >= 0 ? 'Entrate in crescita' : 'Entrate in calo'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Le tue entrate sono {stats.incomeTrend >= 0 ? 'cresciute' : 'calate'} del{' '}
                    <span className={cn(
                      'font-semibold',
                      stats.incomeTrend >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    )}>
                      {Math.abs(stats.incomeTrend).toFixed(1)}%
                    </span>{' '}
                    rispetto al mese precedente
                  </p>
                </div>
              </div>
            )}

            {/* Default state when no stats */}
            {!stats && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-[13px] text-muted-foreground font-medium">
                  Nessun insight disponibile
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Aggiungi transazioni per ottenere insights personalizzati
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
