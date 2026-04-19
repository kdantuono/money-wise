'use client';

import { useState } from 'react';
import { useOnboardingPlanStore } from '@/store/onboarding-plan.store';
import { PRIORITY_LABEL_IT, type PriorityRank } from '@/types/onboarding-plan';
import { Button } from '@/components/ui/button';
import {
  Plus,
  X,
  PiggyBank,
  Landmark,
  TrendingUp,
  CreditCard,
  Banknote,
  Plane,
  BarChart3,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Preset goals — 7 common financial objectives with Italian labels
// ---------------------------------------------------------------------------

interface PresetGoal {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  defaultTarget: number;
  defaultDeadlineMonths: number;
  priority: PriorityRank;
}

const PRESET_GOALS: PresetGoal[] = [
  {
    name: 'Fondo Emergenza',
    icon: PiggyBank,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    defaultTarget: 5000,
    defaultDeadlineMonths: 12,
    priority: 1,
  },
  {
    name: 'Comprare Casa',
    icon: Landmark,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
    defaultTarget: 50000,
    defaultDeadlineMonths: 60,
    priority: 2,
  },
  {
    name: 'Iniziare a Investire',
    icon: TrendingUp,
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
    defaultTarget: 10000,
    defaultDeadlineMonths: 24,
    priority: 2,
  },
  {
    name: 'Eliminare Debiti',
    icon: CreditCard,
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
    defaultTarget: 3000,
    defaultDeadlineMonths: 12,
    priority: 1,
  },
  {
    name: 'Risparmiare di Più',
    icon: Banknote,
    color: 'text-orange-600',
    bg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
    defaultTarget: 5000,
    defaultDeadlineMonths: 12,
    priority: 3,
  },
  {
    name: 'Viaggi / Vacanza',
    icon: Plane,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800',
    defaultTarget: 2000,
    defaultDeadlineMonths: 6,
    priority: 3,
  },
  {
    name: 'Far Crescere Patrimonio',
    icon: BarChart3,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    defaultTarget: 20000,
    defaultDeadlineMonths: 36,
    priority: 2,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addMonthsToToday(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepGoals() {
  const goals = useOnboardingPlanStore((s) => s.step3.goals);
  const addGoal = useOnboardingPlanStore((s) => s.addGoal);
  const removeGoal = useOnboardingPlanStore((s) => s.removeGoal);

  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({
    name: '',
    target: '',
    deadline: '',
    priority: 2 as PriorityRank,
  });

  const handleAdd = () => {
    const target = Number(draft.target);
    if (!draft.name || target <= 0) return;
    addGoal({
      name: draft.name,
      target,
      deadline: draft.deadline || null,
      priority: draft.priority,
    });
    setDraft({ name: '', target: '', deadline: '', priority: 2 });
    setShowAdd(false);
  };

  const handlePresetClick = (preset: PresetGoal) => {
    setDraft({
      name: preset.name,
      target: String(preset.defaultTarget),
      deadline: addMonthsToToday(preset.defaultDeadlineMonths),
      priority: preset.priority,
    });
    setShowAdd(true);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">I tuoi obiettivi finanziari</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Seleziona uno o più preset per iniziare rapidamente, oppure aggiungi un obiettivo
          personalizzato. Consigliamo di partire dal{' '}
          <strong>Fondo Emergenza</strong>.
        </p>
      </div>

      {/* Preset cards */}
      {!showAdd && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {PRESET_GOALS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all hover:scale-105 hover:shadow-sm active:scale-95 ${preset.bg}`}
                aria-label={`Aggiungi preset: ${preset.name}`}
              >
                <Icon className={`w-5 h-5 ${preset.color}`} />
                <span className="text-xs font-medium text-foreground leading-tight">
                  {preset.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  €{preset.defaultTarget.toLocaleString('it-IT')}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Added goals list */}
      {goals.length > 0 && (
        <ul className="space-y-2">
          {goals.map((g) => (
            <li
              key={g.tempId}
              className="flex items-center justify-between p-3 rounded-xl border border-border bg-card"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{g.name}</p>
                <p className="text-xs text-muted-foreground">
                  €{g.target.toLocaleString('it-IT')} — {PRIORITY_LABEL_IT[g.priority]} priorità
                  {g.deadline ? ` — entro ${g.deadline}` : ''}
                </p>
              </div>
              <button
                onClick={() => removeGoal(g.tempId)}
                className="p-2 rounded-lg hover:bg-muted"
                aria-label={`Rimuovi ${g.name}`}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {goals.length === 0 && !showAdd && (
        <div className="rounded-xl border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Nessun obiettivo ancora. Scegli un preset sopra o aggiungi manualmente.
          </p>
        </div>
      )}

      {/* Custom / pre-filled form */}
      {!showAdd && (
        <Button
          onClick={() => setShowAdd(true)}
          variant="outline"
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Aggiungi manualmente
        </Button>
      )}

      {showAdd && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4" suppressHydrationWarning>
          <div suppressHydrationWarning>
            <label htmlFor="goal-name" className="text-sm font-medium text-foreground block mb-1">
              Nome
            </label>
            <input
              id="goal-name"
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground"
              placeholder="es. Fondo Emergenza"
              suppressHydrationWarning
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div suppressHydrationWarning>
              <label htmlFor="goal-target" className="text-sm font-medium text-foreground block mb-1">
                Target (€)
              </label>
              <input
                id="goal-target"
                type="number"
                min={0}
                value={draft.target}
                onChange={(e) => setDraft({ ...draft, target: e.target.value })}
                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground"
                placeholder="15000"
                suppressHydrationWarning
              />
            </div>
            <div suppressHydrationWarning>
              <label htmlFor="goal-deadline" className="text-sm font-medium text-foreground block mb-1">
                Scadenza (opzionale)
              </label>
              <input
                id="goal-deadline"
                type="date"
                value={draft.deadline}
                onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground"
                suppressHydrationWarning
              />
            </div>
          </div>
          <div suppressHydrationWarning>
            <label htmlFor="goal-priority" className="text-sm font-medium text-foreground block mb-1">
              Priorità
            </label>
            <select
              id="goal-priority"
              value={draft.priority}
              onChange={(e) =>
                setDraft({ ...draft, priority: Number(e.target.value) as PriorityRank })
              }
              className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground"
              suppressHydrationWarning
            >
              <option value={1}>Alta</option>
              <option value={2}>Media</option>
              <option value={3}>Bassa</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAdd(false);
                setDraft({ name: '', target: '', deadline: '', priority: 2 });
              }}
            >
              Annulla
            </Button>
            <Button onClick={handleAdd}>Aggiungi</Button>
          </div>
        </div>
      )}
    </div>
  );
}
