'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { Plus, Sparkles, Calendar, Loader2, Target } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { onboardingPlanClient, OnboardingPlanApiError } from '@/services/onboarding-plan.client';
import { PRIORITY_LABEL_IT, type PriorityRank } from '@/types/onboarding-plan';

type PlanBundle = Awaited<ReturnType<typeof onboardingPlanClient.loadPlan>>;

const PRIORITY_COLOR: Record<PriorityRank, { bg: string; text: string; light: string }> = {
  1: { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50 dark:bg-blue-950/30' },
  2: { bg: 'bg-orange-600', text: 'text-orange-600', light: 'bg-orange-50 dark:bg-orange-950/30' },
  3: { bg: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-950/30' },
};

export default function GoalsPage() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const [bundle, setBundle] = useState<PlanBundle>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await onboardingPlanClient.loadPlan(userId);
        if (!cancelled) setBundle(result);
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof OnboardingPlanApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Errore caricamento obiettivi';
          setError(msg);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="p-6 border-l-4 border-l-red-500">
          <p className="text-sm font-semibold text-foreground">Errore caricamento obiettivi</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </Card>
      </div>
    );
  }

  // Empty state: no plan yet → CTA to onboarding wizard
  if (!bundle) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Obiettivi</h1>
            <p className="text-muted-foreground mt-1">Crea il tuo piano finanziario personalizzato</p>
          </div>
        </div>
        <Card className="p-12 text-center border-dashed">
          <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Nessun piano finanziario ancora</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Inizia l&apos;onboarding &quot;Piano Generato&quot; per costruire il tuo primo piano in 5 passi:
            reddito, obiettivi di risparmio, goal, allocazione automatica.
          </p>
          <Button
            onClick={() => router.push('/onboarding/plan')}
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crea il tuo piano
          </Button>
        </Card>
      </div>
    );
  }

  const { plan, goals, allocations } = bundle;
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const totalCurrent = goals.reduce((s, g) => s + g.current, 0);
  const totalPct = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
  const allocationByGoalId = new Map(allocations.map((a) => [a.goalId, a]));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Obiettivi</h1>
          <p className="text-muted-foreground mt-1">Piano finanziario attivo</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/onboarding/plan?mode=edit')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Modifica piano
        </Button>
      </div>

      {/* Plan summary */}
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
                <p className="text-4xl font-bold">{totalPct.toFixed(0)}%</p>
                <p className="text-blue-100 text-sm">{goals.length} obiettivi attivi</p>
              </div>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, totalPct)}%` }}
                transition={{ delay: 0.5, duration: 1 }}
                className="h-full bg-white rounded-full"
              />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 text-xs text-blue-100">
              <div>
                <p>Reddito mensile</p>
                <p className="text-sm font-semibold text-white mt-1">
                  &euro;{plan.monthlyIncome.toLocaleString('it-IT')}
                </p>
              </div>
              <div>
                <p>Risparmio target</p>
                <p className="text-sm font-semibold text-white mt-1">
                  &euro;{plan.monthlySavingsTarget.toLocaleString('it-IT')}/mese
                </p>
              </div>
              <div>
                <p>Essenziali</p>
                <p className="text-sm font-semibold text-white mt-1">
                  {plan.essentialsPct.toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Goals grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal, i) => {
          const pct = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
          const colors = PRIORITY_COLOR[goal.priority];
          const remaining = Math.max(0, goal.target - goal.current);
          const allocation = allocationByGoalId.get(goal.id);

          // Days left calculation (null-safe)
          let daysLeft: number | null = null;
          if (goal.deadline) {
            const [dy, dm, dd] = goal.deadline.slice(0, 10).split('-').map(Number);
            const deadlineLocal = new Date(dy, (dm || 1) - 1, dd || 1).getTime();
            const todayLocal = new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              new Date().getDate(),
            ).getTime();
            daysLeft = Math.max(0, Math.ceil((deadlineLocal - todayLocal) / (1000 * 60 * 60 * 24)));
          }

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
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{goal.name}</h3>
                      <Badge variant="outline" className="text-xs mt-0.5">
                        {PRIORITY_LABEL_IT[goal.priority]} priorit&agrave;
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">
                      &euro;{goal.current.toLocaleString('it-IT')}
                    </span>
                    <span className="font-semibold text-foreground">
                      &euro;{goal.target.toLocaleString('it-IT')}
                    </span>
                  </div>
                  <Progress value={pct} className="h-2.5" />
                  <p className={`text-sm font-bold mt-1 ${colors.text}`}>{pct.toFixed(0)}%</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/50">
                  <div>
                    <p className="text-xs text-muted-foreground">Scadenza</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">
                        {daysLeft !== null ? `${daysLeft}g` : 'Nessuna'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Piano mensile</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">
                      &euro;{(allocation?.monthlyAmount ?? goal.monthlyAllocation).toFixed(0)}
                    </p>
                  </div>
                </div>

                {allocation && !allocation.deadlineFeasible && (
                  <div className="mt-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      &#9888; La scadenza potrebbe non essere fattibile con l&apos;allocation corrente
                    </p>
                  </div>
                )}

                {allocation?.reasoning && (
                  <details className="mt-3 text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      Perch&eacute; questo importo?
                    </summary>
                    <p className="mt-2 text-muted-foreground">{allocation.reasoning}</p>
                  </details>
                )}

                {remaining > 0 && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Mancano &euro;{remaining.toLocaleString('it-IT')} al target
                  </p>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
