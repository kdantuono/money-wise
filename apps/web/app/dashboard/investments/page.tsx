'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Bitcoin,
  Activity,
  Brain,
  Sparkles,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// --- Mock data (inline, matching Figma reference) ---

interface Investment {
  id: string;
  name: string;
  symbol: string;
  type: 'stock' | 'crypto' | 'etf';
  quantity: number;
  currentPrice: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercentage: number;
}

const investments: Investment[] = [
  { id: '1', name: 'Apple Inc.', symbol: 'AAPL', type: 'stock', quantity: 15, currentPrice: 178.50, totalValue: 2677.50, gainLoss: 342.00, gainLossPercentage: 14.64 },
  { id: '2', name: 'Tesla Inc.', symbol: 'TSLA', type: 'stock', quantity: 8, currentPrice: 245.20, totalValue: 1961.60, gainLoss: -180.40, gainLossPercentage: -8.42 },
  { id: '3', name: 'Bitcoin', symbol: 'BTC', type: 'crypto', quantity: 0.15, currentPrice: 43250.00, totalValue: 6487.50, gainLoss: 1237.50, gainLossPercentage: 23.57 },
  { id: '4', name: 'Ethereum', symbol: 'ETH', type: 'crypto', quantity: 2.5, currentPrice: 2280.00, totalValue: 5700.00, gainLoss: 700.00, gainLossPercentage: 14.00 },
  { id: '5', name: 'MSCI World ETF', symbol: 'VWCE', type: 'etf', quantity: 25, currentPrice: 98.40, totalValue: 2460.00, gainLoss: 310.00, gainLossPercentage: 14.42 },
  { id: '6', name: 'S&P 500 ETF', symbol: 'CSSPX', type: 'etf', quantity: 10, currentPrice: 485.30, totalValue: 4853.00, gainLoss: 553.00, gainLossPercentage: 12.86 },
];

const investmentPerformance = [
  { date: 'Gen', stocks: 4200, crypto: 10800, etf: 6800 },
  { date: 'Feb', stocks: 4350, crypto: 11200, etf: 6950 },
  { date: 'Mar', stocks: 4100, crypto: 10500, etf: 7100 },
  { date: 'Apr', stocks: 4500, crypto: 11800, etf: 7200 },
  { date: 'Mag', stocks: 4639, crypto: 12187, etf: 7313 },
];

// --- Component ---

export default function InvestmentsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'stocks' | 'crypto' | 'etf'>('all');

  const stocks = investments.filter(inv => inv.type === 'stock');
  const cryptos = investments.filter(inv => inv.type === 'crypto');
  const etfs = investments.filter(inv => inv.type === 'etf');

  const totalValue = investments.reduce((sum, inv) => sum + inv.totalValue, 0);
  const totalGainLoss = investments.reduce((sum, inv) => sum + inv.gainLoss, 0);
  const totalGainLossPercentage = (totalGainLoss / (totalValue - totalGainLoss)) * 100;

  const stocksValue = stocks.reduce((sum, inv) => sum + inv.totalValue, 0);
  const cryptosValue = cryptos.reduce((sum, inv) => sum + inv.totalValue, 0);

  const hasInvestGoal = true;

  const filteredInvestments =
    activeTab === 'stocks' ? stocks
    : activeTab === 'crypto' ? cryptos
    : activeTab === 'etf' ? etfs
    : investments;

  const InvestmentCard = ({ investment }: { investment: Investment }) => {
    const isPositive = investment.gainLoss >= 0;
    const typeStyle =
      investment.type === 'stock'
        ? { gradient: 'from-blue-500/10 to-cyan-500/10', iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500' }
      : investment.type === 'crypto'
        ? { gradient: 'from-orange-500/10 to-amber-500/10', iconBg: 'bg-gradient-to-br from-orange-500 to-amber-500' }
      : investment.type === 'etf'
        ? { gradient: 'from-emerald-500/10 to-teal-500/10', iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500' }
        : { gradient: 'from-purple-500/10 to-pink-500/10', iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500' };

    return (
      <Card className={`p-5 rounded-2xl border-0 shadow-sm bg-gradient-to-br ${typeStyle.gradient} hover:shadow-lg hover:scale-[1.02] transition-all group`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl ${typeStyle.iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
              {investment.type === 'crypto' ? (
                <Bitcoin className="w-5 h-5 text-white" />
              ) : (
                <Activity className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-[15px] font-medium text-foreground">{investment.name}</h3>
              <p className="text-[11px] text-muted-foreground/60 font-medium mt-0.5">{investment.symbol}</p>
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-wide font-medium px-2.5 py-1 rounded-lg bg-background/60 backdrop-blur-sm border border-border/30 text-muted-foreground">
            {investment.type}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium">Quantit&agrave;</p>
            <p className="text-[13px] font-medium text-foreground mt-1 tabular-nums">{investment.quantity}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium">Prezzo</p>
            <p className="text-[13px] font-medium text-foreground mt-1 tabular-nums">&euro;{investment.currentPrice.toLocaleString('it-IT')}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium">Valore</p>
            <p className="text-[16px] font-semibold text-foreground mt-1 tabular-nums">&euro;{investment.totalValue.toLocaleString('it-IT')}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium">P/L</p>
            <div className={`flex items-center gap-1 mt-1 ${
              isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <p className="text-[13px] font-semibold tabular-nums">
                {isPositive ? '+' : ''}&euro;{investment.gainLoss.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border/30">
          <div className={`flex items-center justify-between p-3 rounded-xl ${
            isPositive
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-rose-500/10 border border-rose-500/20'
          }`}>
            <span className="text-[12px] font-medium text-foreground">Performance</span>
            <span className={`text-[15px] font-semibold tabular-nums ${
              isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {isPositive ? '+' : ''}{investment.gainLossPercentage.toFixed(2)}%
            </span>
          </div>
        </div>
      </Card>
    );
  };

  const tabs = [
    { key: 'all' as const, label: `Tutti (${investments.length})` },
    { key: 'stocks' as const, label: `Azioni (${stocks.length})` },
    { key: 'crypto' as const, label: `Crypto (${cryptos.length})` },
    { key: 'etf' as const, label: `ETF (${etfs.length})` },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[32px] tracking-[-0.03em] text-foreground">Investimenti</h1>
          <p className="text-[13px] text-muted-foreground mt-1.5">Gestisci il tuo portafoglio di investimenti</p>
        </div>
        <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20 border-0 rounded-xl px-5 py-2.5">
          <Plus className="w-4 h-4 mr-2" />
          Aggiungi Investimento
        </Button>
      </div>

      {/* Personalized AI Banner */}
      {hasInvestGoal && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 rounded-2xl border-0 shadow-sm bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-medium text-foreground">Consiglio AI Investimenti</p>
                  <span className="text-[10px] text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> Per te
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground mt-1.5">
                  Basandosi sul tuo profilo, un PAC da &euro;200/mese su un ETF globale (es. VWCE) potrebbe generare +&euro;8.400 in 3 anni con rendimento storico del 7%. Inizio automatico disponibile.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-5 rounded-2xl border-0 shadow-sm bg-gradient-to-br from-blue-500/10 to-cyan-500/10 hover:shadow-md hover:scale-[1.02] transition-all group">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] text-muted-foreground">Valore Totale</p>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-[24px] tracking-[-0.03em] font-semibold text-foreground tabular-nums">&euro;{totalValue.toLocaleString('it-IT')}</h3>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className={`p-5 rounded-2xl border-0 shadow-sm bg-gradient-to-br ${
            totalGainLoss >= 0 ? 'from-emerald-500/10 to-teal-500/10' : 'from-rose-500/10 to-pink-500/10'
          } hover:shadow-md hover:scale-[1.02] transition-all group`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] text-muted-foreground">P/L</p>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${
                totalGainLoss >= 0 ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-pink-500'
              } flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                {totalGainLoss >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-white" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
            <h3 className={`text-[24px] tracking-[-0.03em] font-semibold tabular-nums ${
              totalGainLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {totalGainLoss >= 0 ? '+' : ''}&euro;{totalGainLoss.toLocaleString('it-IT')}
            </h3>
            <p className={`text-[11px] font-medium mt-2 ${
              totalGainLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {totalGainLoss >= 0 ? '+' : ''}{totalGainLossPercentage.toFixed(2)}%
            </p>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-5 rounded-2xl border-0 shadow-sm bg-gradient-to-br from-purple-500/10 to-indigo-500/10 hover:shadow-md hover:scale-[1.02] transition-all group">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] text-muted-foreground">Azioni</p>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Activity className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-[24px] tracking-[-0.03em] font-semibold text-foreground tabular-nums">&euro;{stocksValue.toLocaleString('it-IT')}</h3>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-5 rounded-2xl border-0 shadow-sm bg-gradient-to-br from-orange-500/10 to-amber-500/10 hover:shadow-md hover:scale-[1.02] transition-all group">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] text-muted-foreground">Crypto</p>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Bitcoin className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-[24px] tracking-[-0.03em] font-semibold text-foreground tabular-nums">&euro;{cryptosValue.toLocaleString('it-IT')}</h3>
          </Card>
        </motion.div>
      </div>

      {/* Performance Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="p-6 rounded-2xl border-0 shadow-sm">
          <h3 className="text-[16px] font-medium text-foreground mb-6">Performance Portfolio</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={investmentPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" opacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground, #6b7280)' }}
                axisLine={{ stroke: 'var(--color-border, #e5e7eb)' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground, #6b7280)' }}
                axisLine={{ stroke: 'var(--color-border, #e5e7eb)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-card, #fff)',
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '12px',
                  color: 'var(--color-foreground, #111)',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="stocks" stroke="#3b82f6" name="Azioni" strokeWidth={2} />
              <Line type="monotone" dataKey="crypto" stroke="#f97316" name="Crypto" strokeWidth={2} />
              <Line type="monotone" dataKey="etf" stroke="#10b981" name="ETF" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      {/* Investments by Type — Inline Tabs */}
      <div className="w-full">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {filteredInvestments.map((investment, index) => (
            <motion.div
              key={investment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <InvestmentCard investment={investment} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
