'use client';

import { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useOnboardingPlanStore } from '@/store/onboarding-plan.store';
import { PRIORITY_LABEL_IT, type PriorityRank, type WizardGoalDraft } from '@/types/onboarding-plan';
import { Button } from '@/components/ui/button';
import {
  Plus,
  X,
  Pencil,
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
  id: string;
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
    id: 'fondo-emergenza',
    name: 'Fondo Emergenza',
    icon: PiggyBank,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    defaultTarget: 5000,
    defaultDeadlineMonths: 12,
    priority: 1,
  },
  {
    id: 'comprare-casa',
    name: 'Comprare Casa',
    icon: Landmark,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
    defaultTarget: 50000,
    defaultDeadlineMonths: 60,
    priority: 2,
  },
  {
    id: 'iniziare-a-investire',
    name: 'Iniziare a Investire',
    icon: TrendingUp,
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
    defaultTarget: 10000,
    defaultDeadlineMonths: 24,
    priority: 2,
  },
  {
    id: 'eliminare-debiti',
    name: 'Eliminare Debiti',
    icon: CreditCard,
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
    defaultTarget: 3000,
    defaultDeadlineMonths: 12,
    priority: 1,
  },
  {
    id: 'risparmiare-di-piu',
    name: 'Risparmiare di Più',
    icon: Banknote,
    color: 'text-orange-600',
    bg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
    defaultTarget: 5000,
    defaultDeadlineMonths: 12,
    priority: 3,
  },
  {
    id: 'viaggi-vacanza',
    name: 'Viaggi / Vacanza',
    icon: Plane,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800',
    defaultTarget: 2000,
    defaultDeadlineMonths: 6,
    priority: 3,
  },
  {
    id: 'far-crescere-patrimonio',
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

interface DraftState {
  name: string;
  target: string;
  deadline: string;
  priority: PriorityRank;
}

const EMPTY_DRAFT: DraftState = {
  name: '',
  target: '',
  deadline: '',
  priority: 2,
};

// ---------------------------------------------------------------------------
// AddGoalModal — Radix Dialog with form (issue #463, extended WP-D edit mode)
// ---------------------------------------------------------------------------

interface AddGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetId: string | null;
  /** When set, modal is in edit mode and pre-fills from this goal. */
  editingGoal: WizardGoalDraft | null;
  onSubmit: (goal: { name: string; target: number; deadline: string | null; priority: PriorityRank }) => void;
}

function AddGoalModal({ open, onOpenChange, presetId, editingGoal, onSubmit }: AddGoalModalProps) {
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);

  const isEditMode = editingGoal !== null;

  // Pre-fill draft whenever the modal opens
  useEffect(() => {
    if (open) {
      if (isEditMode && editingGoal) {
        // Edit mode: pre-fill from existing goal
        setDraft({
          name: editingGoal.name,
          target: String(editingGoal.target),
          deadline: editingGoal.deadline ?? '',
          priority: editingGoal.priority,
        });
      } else if (presetId) {
        // Add mode via preset: pre-fill from preset defaults
        const preset = PRESET_GOALS.find((p) => p.id === presetId);
        if (preset) {
          setDraft({
            name: preset.name,
            target: String(preset.defaultTarget),
            deadline: addMonthsToToday(preset.defaultDeadlineMonths),
            priority: preset.priority,
          });
        }
      } else {
        // Add mode manual: empty form
        setDraft(EMPTY_DRAFT);
      }
    }
  }, [open, presetId, editingGoal, isEditMode]);

  const handleSubmit = () => {
    const target = Number(draft.target);
    if (!draft.name || target <= 0) return;
    onSubmit({
      name: draft.name,
      target,
      deadline: draft.deadline || null,
      priority: draft.priority,
    });
  };

  const title = isEditMode ? 'Modifica goal' : 'Aggiungi un obiettivo';
  const submitLabel = isEditMode ? 'Salva' : 'Aggiungi';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-6 shadow-lg focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-labelledby="add-goal-dialog-title"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title
              id="add-goal-dialog-title"
              className="text-base font-semibold text-foreground"
            >
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="rounded-lg p-1.5 hover:bg-muted transition-colors"
                aria-label="Chiudi"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-3">
            <div>
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
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
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
                />
              </div>
              <div>
                <label htmlFor="goal-deadline" className="text-sm font-medium text-foreground block mb-1">
                  Scadenza (opzionale)
                </label>
                <input
                  id="goal-deadline"
                  type="date"
                  value={draft.deadline}
                  onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>

            <div>
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
              >
                <option value={1}>Alta</option>
                <option value={2}>Media</option>
                <option value={3}>Bassa</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <Dialog.Close asChild>
              <Button variant="outline">Annulla</Button>
            </Dialog.Close>
            <Button onClick={handleSubmit}>{submitLabel}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// StepGoals
// ---------------------------------------------------------------------------

export function StepGoals() {
  const goals = useOnboardingPlanStore((s) => s.step3.goals);
  const addGoal = useOnboardingPlanStore((s) => s.addGoal);
  const updateGoal = useOnboardingPlanStore((s) => s.updateGoal);
  const removeGoal = useOnboardingPlanStore((s) => s.removeGoal);
  const isAddGoalModalOpen = useOnboardingPlanStore((s) => s.isAddGoalModalOpen);
  const editingPresetId = useOnboardingPlanStore((s) => s.editingPresetId);
  const editingGoalId = useOnboardingPlanStore((s) => s.editingGoalId);
  const setAddGoalModalOpen = useOnboardingPlanStore((s) => s.setAddGoalModalOpen);
  const setEditingPresetId = useOnboardingPlanStore((s) => s.setEditingPresetId);
  const setEditingGoal = useOnboardingPlanStore((s) => s.setEditingGoal);

  // Ref map for scrollIntoView on edit open
  const goalRefs = useRef<Record<string, HTMLLIElement | null>>({});

  // Scroll to the goal being edited when editingGoalId changes
  useEffect(() => {
    const el = editingGoalId ? goalRefs.current[editingGoalId] : null;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [editingGoalId]);

  // Derive the WizardGoalDraft being edited (null when in add mode)
  const editingGoalDraft = editingGoalId
    ? (goals.find((g) => g.tempId === editingGoalId) ?? null)
    : null;

  const openModalForPreset = (presetId: string | null = null) => {
    setEditingGoal(null);
    setEditingPresetId(presetId);
    setAddGoalModalOpen(true);
  };

  const openModalForEdit = (goal: WizardGoalDraft) => {
    setEditingPresetId(null);
    setEditingGoal(goal.tempId);
    setAddGoalModalOpen(true);
  };

  const closeModal = (open: boolean) => {
    if (!open) {
      setAddGoalModalOpen(false);
      setEditingPresetId(null);
      setEditingGoal(null);
    }
  };

  const handleSubmit = (goal: { name: string; target: number; deadline: string | null; priority: PriorityRank }) => {
    if (editingGoalId) {
      updateGoal(editingGoalId, goal);
    } else {
      addGoal(goal);
    }
    setAddGoalModalOpen(false);
    setEditingPresetId(null);
    setEditingGoal(null);
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

      {/* Preset cards — always visible */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {PRESET_GOALS.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => openModalForPreset(preset.id)}
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

      {/* Added goals list */}
      {goals.length > 0 && (
        <ul className="space-y-2">
          {goals.map((g) => (
            <li
              key={g.tempId}
              ref={(el) => { goalRefs.current[g.tempId] = el; }}
              className="flex items-center justify-between p-3 rounded-xl border border-border bg-card"
            >
              {/* Clickable goal info area */}
              <div
                role="button"
                tabIndex={0}
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => openModalForEdit(g)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openModalForEdit(g);
                  }
                }}
                aria-label={`Apri dettagli ${g.name}`}
              >
                <p className="text-sm font-medium text-foreground">{g.name}</p>
                <p className="text-xs text-muted-foreground">
                  €{g.target.toLocaleString('it-IT')} — {PRIORITY_LABEL_IT[g.priority]} priorità
                  {g.deadline ? ` — entro ${g.deadline}` : ''}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openModalForEdit(g);
                  }}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label={`Modifica ${g.name}`}
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeGoal(g.tempId);
                  }}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label={`Rimuovi ${g.name}`}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {goals.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Nessun obiettivo ancora. Scegli un preset sopra o aggiungi manualmente.
          </p>
        </div>
      )}

      {/* Manual add trigger */}
      <Button
        onClick={() => openModalForPreset(null)}
        variant="outline"
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Aggiungi manualmente
      </Button>

      {/* Radix Dialog modal */}
      <AddGoalModal
        open={isAddGoalModalOpen}
        onOpenChange={closeModal}
        presetId={editingPresetId}
        editingGoal={editingGoalDraft}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
