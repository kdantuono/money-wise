'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import {
  Diamond,
  Trophy,
  Target,
  CheckCircle2,
  Lock,
  Palette,
  Zap,
  Star,
  Gift,
  TrendingUp,
  Calendar,
  Flame,
} from 'lucide-react';

// ─── Mock Data (from Figma) ───────────────────────────────────

const userStats = {
  diamonds: 1250,
  level: 7,
  levelName: 'Investitore',
  nextLevel: 'Esperto',
  xpCurrent: 1250,
  xpNext: 2000,
  streak: 12,
  totalTransactions: 156,
  monthlyGoalsMet: 4,
};

const challenges = [
  {
    id: '1',
    title: 'Registra 5 transazioni',
    desc: 'Inserisci 5 transazioni questa settimana',
    reward: 25,
    progress: 3,
    total: 5,
    active: true,
  },
  {
    id: '2',
    title: 'Rispetta il budget',
    desc: 'Non superare il budget alimentari',
    reward: 50,
    progress: 287,
    total: 400,
    active: true,
    unit: '€',
  },
  {
    id: '3',
    title: 'Streak 7 giorni',
    desc: "Accedi all'app per 7 giorni consecutivi",
    reward: 100,
    progress: 5,
    total: 7,
    active: true,
  },
  {
    id: '4',
    title: 'Primo investimento',
    desc: 'Aggiungi un nuovo investimento',
    reward: 75,
    progress: 0,
    total: 1,
    active: true,
  },
];

const rewards = [
  {
    id: '1',
    title: 'Tema Midnight Blue',
    desc: 'Sblocca un tema esclusivo',
    cost: 500,
    icon: Palette,
    category: 'tema',
    unlocked: true,
  },
  {
    id: '2',
    title: 'Tema Sunset',
    desc: 'Colori caldi e accoglienti',
    cost: 500,
    icon: Palette,
    category: 'tema',
    unlocked: true,
  },
  {
    id: '3',
    title: 'Report AI Avanzato',
    desc: 'Analisi dettagliata mensile',
    cost: 1000,
    icon: Zap,
    category: 'feature',
    unlocked: true,
  },
  {
    id: '4',
    title: 'Widget Dashboard Pro',
    desc: 'Widget personalizzabili aggiuntivi',
    cost: 1500,
    icon: Star,
    category: 'feature',
    unlocked: false,
  },
  {
    id: '5',
    title: 'Sconto 20% Premium',
    desc: '20% sul piano premium',
    cost: 2000,
    icon: Gift,
    category: 'sconto',
    unlocked: false,
  },
  {
    id: '6',
    title: 'Tema Aurora Boreale',
    desc: 'Sfumature polari esclusive',
    cost: 3000,
    icon: Palette,
    category: 'tema',
    unlocked: false,
  },
];

const achievements = [
  {
    id: '1',
    title: 'Primo Passo',
    desc: 'Prima transazione registrata',
    unlocked: true,
    icon: CheckCircle2,
  },
  {
    id: '2',
    title: 'Risparmiatore',
    desc: 'Risparmiato il 20% del reddito',
    unlocked: true,
    icon: Trophy,
  },
  {
    id: '3',
    title: 'Investitore',
    desc: 'Portafoglio investimenti creato',
    unlocked: true,
    icon: TrendingUp,
  },
  {
    id: '4',
    title: 'Costanza',
    desc: '30 giorni consecutivi di utilizzo',
    unlocked: false,
    icon: Flame,
  },
  {
    id: '5',
    title: 'Budget Master',
    desc: '3 mesi sotto budget',
    unlocked: false,
    icon: Target,
  },
];

const diamondHistory = [
  { action: 'Report AI generato', amount: 20, timestamp: '2026-04-12T10:30:00' },
  { action: 'Transazione registrata', amount: 5, timestamp: '2026-04-11T14:15:00' },
  { action: 'Streak 7 giorni', amount: 100, timestamp: '2026-04-10T09:00:00' },
  { action: 'Budget rispettato', amount: 50, timestamp: '2026-04-08T18:00:00' },
  { action: 'Transazione registrata', amount: 5, timestamp: '2026-04-07T12:30:00' },
];

// ─── Page Component ───────────────────────────────────────────

export default function RewardsPage() {
  const levelProgress = (userStats.xpCurrent / userStats.xpNext) * 100;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header with Level */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6 bg-gradient-to-r from-cyan-600 to-blue-700 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Diamond className="w-6 h-6" />
                  <span className="text-3xl font-bold">
                    {userStats.diamonds.toLocaleString()}
                  </span>
                  <span className="text-cyan-200">diamanti</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-white/20 text-white border-0">
                    Livello {userStats.level}
                  </Badge>
                  <span className="text-sm text-cyan-100">{userStats.levelName}</span>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <Flame className="w-5 h-5 mx-auto mb-1 text-orange-300" />
                  <p className="text-2xl font-bold">{userStats.streak}</p>
                  <p className="text-xs text-cyan-200">giorni streak</p>
                </div>
                <div className="text-center">
                  <Calendar className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{userStats.totalTransactions}</p>
                  <p className="text-xs text-cyan-200">transazioni</p>
                </div>
                <div className="text-center">
                  <Target className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{userStats.monthlyGoalsMet}</p>
                  <p className="text-xs text-cyan-200">obiettivi</p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-cyan-100">
                  Livello {userStats.level} &rarr; {userStats.nextLevel}
                </span>
                <span>
                  {userStats.xpCurrent}/{userStats.xpNext} XP
                </span>
              </div>
              <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress}%` }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="h-full bg-white rounded-full"
                />
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Challenges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-xl font-bold text-foreground mb-4">Sfide Attive</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map((ch, i) => {
            const pct = Math.min((ch.progress / ch.total) * 100, 100);
            return (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
              >
                <Card className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-foreground">{ch.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{ch.desc}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-cyan-100 dark:bg-cyan-900 px-2 py-0.5 rounded-full">
                      <Diamond className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                      <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300">
                        +{ch.reward}
                      </span>
                    </div>
                  </div>
                  <Progress value={pct} className="h-2 mb-1.5" />
                  <p className="text-xs text-muted-foreground">
                    {ch.progress}
                    {ch.unit || ''}/{ch.total}
                    {ch.unit || ''}
                  </p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Shop */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-foreground mb-4">Negozio Ricompense</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
            >
              <Card className={`p-5 ${!r.unlocked ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2.5 bg-muted rounded-xl">
                    <r.icon className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{r.title}</h4>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                </div>
                <button
                  className={`w-full py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                    r.unlocked && userStats.diamonds >= r.cost
                      ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                  disabled={!r.unlocked || userStats.diamonds < r.cost}
                >
                  {!r.unlocked ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <Diamond className="w-3.5 h-3.5" />
                  )}
                  {r.cost.toLocaleString()} diamanti
                </button>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Achievements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-xl font-bold text-foreground mb-4">Achievement</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {achievements.map((a) => (
            <Card
              key={a.id}
              className={`p-4 min-w-[160px] text-center ${!a.unlocked ? 'opacity-40' : ''}`}
            >
              <div
                className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${a.unlocked ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400' : 'bg-muted text-muted-foreground'}`}
              >
                {a.unlocked ? <a.icon className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
              </div>
              <h4 className="font-semibold text-foreground text-sm">{a.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Diamond History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-xl font-bold text-foreground mb-4">Storico Diamanti</h2>
        <Card className="p-4">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {diamondHistory.map((event, i) => (
              <div
                key={`dh-${i}`}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
              >
                <div>
                  <p className="text-sm text-foreground">{event.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                  <Diamond className="w-3.5 h-3.5" />
                  <span className="text-sm font-semibold">+{event.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
