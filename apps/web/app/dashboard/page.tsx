'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Wallet,
  Brain,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { useDashboardData } from '@/hooks/useDashboardStats';
import { useAuthStore } from '@/store/auth.store';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLORS = ['#2dd4a8', '#818cf8', '#f59e0b', '#f472b6', '#a78bfa', '#fb923c', '#38bdf8', '#4ade80'];

// ---------------------------------------------------------------------------
// Custom Tooltip — 1:1 from Figma
// ---------------------------------------------------------------------------

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border/50 rounded-xl px-3.5 py-2.5 shadow-lg">
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[12px] text-foreground" style={{ color: p.color }}>
          {p.name}: €{p.value?.toLocaleString('it-IT')}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Page — 1:1 from Figma Dashboard.tsx
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [period] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const { stats, spending, transactions, trends, isLoading } = useDashboardData(period);

  const firstName = user?.firstName ?? 'Utente';
  const totalBalance = stats?.totalBalance ?? 0;
  const monthIncome = stats?.monthlyIncome ?? 0;
  const monthExpenses = stats?.monthlyExpenses ?? 0;
  const incomeTrend = stats?.incomeTrend ?? 0;
  const expensesTrend = stats?.expensesTrend ?? 0;

  // Map trends to chart format
  const chartData = (trends ?? []).map((t) => ({
    month: new Date(t.date).toLocaleDateString('it-IT', { month: 'short' }),
    income: t.income,
    expenses: t.expenses,
    savings: t.income - t.expenses,
  }));

  // Map spending to pie chart format
  const pieData = (spending ?? []).map((s) => ({
    name: s.name,
    value: s.amount,
    percentage: s.percentage,
  }));

  const recentTransactions = transactions ?? [];

  // Simple AI insights from stats
  const insights = [
    {
      title: monthExpenses > monthIncome ? 'Spese superiori alle entrate' : 'Buon equilibrio finanziario',
      description: monthExpenses > monthIncome
        ? `Le spese superano le entrate di €${(monthExpenses - monthIncome).toLocaleString('it-IT', { maximumFractionDigits: 0 })}`
        : `Stai risparmiando €${(monthIncome - monthExpenses).toLocaleString('it-IT', { maximumFractionDigits: 0 })} questo mese`,
      priority: monthExpenses > monthIncome ? 'high' : 'low',
    },
    {
      title: expensesTrend < 0 ? 'Spese in diminuzione' : 'Spese in aumento',
      description: `Le spese sono ${expensesTrend < 0 ? 'diminuite' : 'aumentate'} del ${Math.abs(expensesTrend).toFixed(1)}% rispetto al periodo precedente`,
      priority: expensesTrend > 20 ? 'high' : expensesTrend > 0 ? 'medium' : 'low',
    },
    {
      title: 'Analisi categorie',
      description: pieData.length > 0
        ? `La categoria principale è "${pieData[0]?.name}" con il ${pieData[0]?.percentage}% delle spese`
        : 'Aggiungi transazioni per vedere l\'analisi',
      priority: 'medium' as const,
    },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 w-48 bg-muted rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-2xl" />)}
          </div>
          <div className="h-72 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Liquidità', value: totalBalance, change: `${incomeTrend >= 0 ? '+' : ''}${incomeTrend.toFixed(1)}%`, positive: incomeTrend >= 0, icon: Wallet, gradient: 'from-blue-500/10 to-cyan-500/10', iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500' },
    { label: 'Investimenti', value: 0, change: '—', positive: true, icon: TrendingUp, gradient: 'from-emerald-500/10 to-teal-500/10', iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500' },
    { label: 'Entrate', value: monthIncome, change: `${incomeTrend >= 0 ? '+' : ''}${incomeTrend.toFixed(1)}%`, positive: incomeTrend >= 0, icon: ArrowUpRight, gradient: 'from-green-500/10 to-emerald-500/10', iconBg: 'bg-gradient-to-br from-green-500 to-emerald-500' },
    { label: 'Spese', value: monthExpenses, change: `${expensesTrend <= 0 ? '' : '+'}${expensesTrend.toFixed(1)}%`, positive: expensesTrend <= 0, icon: ArrowDownRight, gradient: 'from-rose-500/10 to-pink-500/10', iconBg: 'bg-gradient-to-br from-rose-500 to-pink-500' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8" data-testid="dashboard">
      {/* Header */}
      <div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[13px] text-muted-foreground">
          Buongiorno, {firstName} 👋
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-1">
          <h1 className="text-[32px] tracking-[-0.03em] text-foreground" data-testid="current-balance">
            €{totalBalance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-[13px] flex items-center gap-0.5 ${incomeTrend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {incomeTrend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {incomeTrend >= 0 ? '+' : ''}{incomeTrend.toFixed(1)}%
            </span>
            <span className="text-[13px] text-muted-foreground">patrimonio totale</span>
          </div>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05 }}>
            <Card className={`p-5 rounded-2xl border-0 shadow-sm bg-gradient-to-br ${stat.gradient} hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer group`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] text-muted-foreground">{stat.label}</p>
                <div className={`w-9 h-9 rounded-xl ${stat.iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-[24px] tracking-[-0.03em] text-foreground tabular-nums">
                €{stat.value.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <span className={`text-[11px] font-medium ${stat.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{stat.change}</span>
                <span className="text-[11px] text-muted-foreground">vs mese scorso</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="lg:col-span-2">
          <Card className="p-5 rounded-2xl border-0 shadow-sm bg-card">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[13px] text-foreground">Andamento</p>
              <div className="flex items-center gap-3">
                {[{ color: '#2dd4a8', label: 'Entrate' }, { color: '#f472b6', label: 'Spese' }, { color: '#818cf8', label: 'Risparmi' }].map((l) => (
                  <span key={l.label} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2dd4a8" stopOpacity={0.15} /><stop offset="100%" stopColor="#2dd4a8" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gExpenses" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f472b6" stopOpacity={0.15} /><stop offset="100%" stopColor="#f472b6" stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8e8ea0' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8e8ea0' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} dx={-4} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="income" stroke="#2dd4a8" strokeWidth={2} fill="url(#gIncome)" name="Entrate" />
                <Area type="monotone" dataKey="expenses" stroke="#f472b6" strokeWidth={2} fill="url(#gExpenses)" name="Spese" />
                <Area type="monotone" dataKey="savings" stroke="#818cf8" strokeWidth={2} fill="transparent" name="Risparmi" strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-5 rounded-2xl border-0 shadow-sm bg-card h-full">
            <p className="text-[13px] text-foreground mb-4">Distribuzione</p>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none">{pieData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip content={<CustomTooltip />} /></PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-3">
                  {pieData.slice(0, 4).map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[11px] text-muted-foreground"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />{item.name}</span>
                      <span className="text-[11px] text-foreground tabular-nums">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-[13px] text-muted-foreground">Nessuna spesa registrata</div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Bottom: Transactions + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="p-5 rounded-2xl border-0 shadow-sm bg-card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] text-foreground">Recenti</p>
              <button onClick={() => router.push('/dashboard/transactions')} className="text-[11px] text-emerald-500 hover:underline">Vedi tutte</button>
            </div>
            <div className="space-y-1" data-testid="recent-transactions">
              {recentTransactions.length > 0 ? recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2.5 hover:bg-muted/20 px-2 -mx-2 rounded-xl transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[14px] bg-muted/50 group-hover:scale-110 transition-transform">{t.type === 'income' ? '💰' : '💸'}</div>
                    <div><p className="text-[13px] text-foreground">{t.description}</p><p className="text-[11px] text-muted-foreground">{t.category}</p></div>
                  </div>
                  <div className="text-right">
                    <p className={`text-[13px] tabular-nums ${t.type === 'income' ? 'text-emerald-500' : 'text-foreground'}`}>{t.type === 'income' ? '+' : '-'}€{Math.abs(t.amount).toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">{t.date}</p>
                  </div>
                </div>
              )) : (
                <p className="text-[13px] text-muted-foreground py-8 text-center">Nessuna transazione recente</p>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="p-5 rounded-2xl border-0 shadow-sm bg-card">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-indigo-400" />
              <p className="text-[13px] text-foreground">Insight AI</p>
              <span className="ml-auto text-[10px] text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" /> Per te</span>
            </div>
            <div className="space-y-2.5">
              {insights.map((insight, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-background hover:bg-muted/30 cursor-pointer transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1"><p className="text-[13px] text-foreground">{insight.title}</p><p className="text-[11px] text-muted-foreground mt-0.5">{insight.description}</p></div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${insight.priority === 'high' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10' : insight.priority === 'medium' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'}`}>
                      {insight.priority === 'high' ? 'Alta' : insight.priority === 'medium' ? 'Media' : 'Bassa'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
