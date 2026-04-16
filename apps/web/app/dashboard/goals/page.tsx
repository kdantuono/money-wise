'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import {
  Plus,
  Sparkles,
  Car,
  Home,
  Plane,
  GraduationCap,
  Umbrella,
  Calendar,
  Check,
  X,
} from 'lucide-react';

const goalsData = [
  { id: '1', name: 'Fondo Emergenza', Icon: Umbrella, target: 15000, current: 12340, deadline: '2026-06-30', color: 'blue', priority: 'high' as const },
  { id: '2', name: 'Vacanza Estate', Icon: Plane, target: 3000, current: 1850, deadline: '2026-07-15', color: 'orange', priority: 'medium' as const },
  { id: '3', name: 'Anticipo Casa', Icon: Home, target: 50000, current: 18500, deadline: '2028-12-31', color: 'green', priority: 'high' as const },
  { id: '4', name: 'Auto Nuova', Icon: Car, target: 25000, current: 8200, deadline: '2027-06-30', color: 'purple', priority: 'low' as const },
  { id: '5', name: 'Corso MBA', Icon: GraduationCap, target: 12000, current: 4500, deadline: '2027-01-31', color: 'cyan', priority: 'medium' as const },
];

export default function GoalsPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', target: '', deadline: '' });
  const [feedback, setFeedback] = useState<string | null>(null);

  const totalTarget = goalsData.reduce((s, g) => s + g.target, 0);
  const totalCurrent = goalsData.reduce((s, g) => s + g.current, 0);

  const getColorClasses = (color: string) => {
    const map: Record<string, { bg: string; text: string; light: string }> = {
      blue: { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50 dark:bg-blue-950/30' },
      orange: { bg: 'bg-orange-600', text: 'text-orange-600', light: 'bg-orange-50 dark:bg-orange-950/30' },
      green: { bg: 'bg-green-600', text: 'text-green-600', light: 'bg-green-50 dark:bg-green-950/30' },
      purple: { bg: 'bg-purple-600', text: 'text-purple-600', light: 'bg-purple-50 dark:bg-purple-950/30' },
      cyan: { bg: 'bg-cyan-600', text: 'text-cyan-600', light: 'bg-cyan-50 dark:bg-cyan-950/30' },
    };
    return map[color] || map.blue;
  };

  const handleAdd = () => {
    setFeedback('Obiettivo creato con successo!');
    setShowAdd(false);
    setNewGoal({ name: '', target: '', deadline: '' });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Obiettivi</h1>
          <p className="text-muted-foreground mt-1">Monitora i tuoi obiettivi di risparmio</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Nuovo Obiettivo
        </Button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl"
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900">
            <X className="w-4 h-4 text-emerald-600" />
          </button>
        </motion.div>
      )}

      {/* Overall Progress */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-blue-100 text-sm">Progresso Complessivo</p>
                <p className="text-3xl font-bold mt-1">
                  &euro;{totalCurrent.toLocaleString('it-IT')} / &euro;{totalTarget.toLocaleString('it-IT')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold">{((totalCurrent / totalTarget) * 100).toFixed(0)}%</p>
                <p className="text-blue-100 text-sm">{goalsData.length} obiettivi attivi</p>
              </div>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(totalCurrent / totalTarget) * 100}%` }}
                transition={{ delay: 0.5, duration: 1 }}
                className="h-full bg-white rounded-full"
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* AI Suggestion */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Suggerimento AI</p>
              <p className="text-sm text-muted-foreground mt-1">
                Con il tuo tasso di risparmio attuale (34.5%), raggiungerai il Fondo Emergenza entro Maggio 2026,
                un mese in anticipo! Considera di allocare &euro;200/mese extra verso l&apos;anticipo casa per accelerare del 15%.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goalsData.map((goal, i) => {
          const pct = (goal.current / goal.target) * 100;
          const colors = getColorClasses(goal.color);
          const remaining = goal.target - goal.current;
          // Parse YYYY-MM-DD as local-midnight to avoid timezone drift in daysLeft
          const [dy, dm, dd] = goal.deadline.slice(0, 10).split('-').map(Number);
          const deadlineLocal = new Date(dy, (dm || 1) - 1, dd || 1).getTime();
          const todayLocal = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
          const daysLeft = Math.max(0, Math.ceil((deadlineLocal - todayLocal) / (1000 * 60 * 60 * 24)));
          const monthlyNeeded = remaining / Math.max(1, daysLeft / 30);

          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
            >
              <Card className={`p-6 hover:shadow-lg transition-shadow ${colors.light}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${colors.bg} text-white`}>
                      <goal.Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{goal.name}</h3>
                      <Badge variant="outline" className="text-xs mt-0.5">
                        {goal.priority === 'high' ? 'Alta' : goal.priority === 'medium' ? 'Media' : 'Bassa'} priorit&agrave;
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">&euro;{goal.current.toLocaleString('it-IT')}</span>
                    <span className="font-semibold text-foreground">&euro;{goal.target.toLocaleString('it-IT')}</span>
                  </div>
                  <Progress value={pct} className="h-2.5" />
                  <p className={`text-sm font-bold mt-1 ${colors.text}`}>{pct.toFixed(0)}%</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/50">
                  <div>
                    <p className="text-xs text-muted-foreground">Scadenza</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">{daysLeft}g</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Servono/mese</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">&euro;{monthlyNeeded.toFixed(0)}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Add Goal Modal */}
      {showAdd && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAdd(false)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">Nuovo Obiettivo</h3>
              <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Nome Obiettivo</label>
                <input
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                  placeholder="es. Vacanza Giappone"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Importo Obiettivo (&euro;)</label>
                <input
                  type="number"
                  value={newGoal.target}
                  onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                  placeholder="5000"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Scadenza</label>
                <input
                  type="date"
                  value={newGoal.deadline}
                  onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Annulla</Button>
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white">Crea Obiettivo</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
