'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PRIORITY_LABEL_IT, type PriorityRank } from '@/types/onboarding-plan';
import type { Goal, GoalInput } from '@/services/goals.client';

// =============================================================================
// Types
// =============================================================================

export type GoalEditModalMode = 'add' | 'edit';

interface GoalEditModalProps {
  open: boolean;
  mode: GoalEditModalMode;
  goal?: Goal;
  onSave: (data: GoalInput) => void;
  onCancel: () => void;
}

// =============================================================================
// Initial draft helpers
// =============================================================================

const EMPTY_DRAFT: GoalInput = {
  name: '',
  target: 0,
  deadline: null,
  priority: 2,
  monthlyAllocation: 0,
};

function goalToInput(goal: Goal): GoalInput {
  return {
    name: goal.name,
    target: goal.target,
    deadline: goal.deadline,
    priority: goal.priority,
    monthlyAllocation: goal.monthlyAllocation,
  };
}

// =============================================================================
// GoalEditModal
// =============================================================================

export function GoalEditModal({ open, mode, goal, onSave, onCancel }: GoalEditModalProps) {
  const [draft, setDraft] = useState<GoalInput>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<{ name?: string; target?: string }>({});

  // Reset draft when modal opens
  useEffect(() => {
    if (open) {
      setDraft(mode === 'edit' && goal ? goalToInput(goal) : EMPTY_DRAFT);
      setErrors({});
    }
  }, [open, mode, goal]);

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!draft.name.trim()) next.name = 'Il nome è obbligatorio';
    if (draft.target <= 0) next.target = 'Il target deve essere > 0';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(draft);
  };

  const title = mode === 'add' ? 'Nuovo obiettivo' : 'Modifica obiettivo';

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          data-testid="goal-modal-overlay"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <Dialog.Content
          data-testid="goal-edit-modal"
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title
              data-testid="goal-modal-title"
              className="text-base font-semibold text-foreground"
            >
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="rounded-lg p-1.5 hover:bg-muted transition-colors"
                aria-label="Chiudi"
                data-testid="goal-modal-close"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="goal-edit-name"
                className="text-sm font-medium text-foreground block mb-1"
              >
                Nome
              </label>
              <input
                id="goal-edit-name"
                type="text"
                data-testid="goal-modal-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground"
                placeholder="es. Fondo Emergenza"
                autoFocus
              />
              {errors.name && (
                <p data-testid="goal-modal-name-error" className="text-xs text-red-500 mt-1">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Target + Deadline */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="goal-edit-target"
                  className="text-sm font-medium text-foreground block mb-1"
                >
                  Target (€)
                </label>
                <input
                  id="goal-edit-target"
                  type="number"
                  min={0}
                  data-testid="goal-modal-target"
                  value={draft.target || ''}
                  onChange={(e) => setDraft({ ...draft, target: Number(e.target.value) })}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground"
                  placeholder="5000"
                />
                {errors.target && (
                  <p data-testid="goal-modal-target-error" className="text-xs text-red-500 mt-1">
                    {errors.target}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="goal-edit-deadline"
                  className="text-sm font-medium text-foreground block mb-1"
                >
                  Scadenza
                </label>
                <input
                  id="goal-edit-deadline"
                  type="date"
                  data-testid="goal-modal-deadline"
                  value={draft.deadline ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, deadline: e.target.value || null })
                  }
                  className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>

            {/* Priority */}
            <div>
              <label
                htmlFor="goal-edit-priority"
                className="text-sm font-medium text-foreground block mb-1"
              >
                Priorità
              </label>
              <select
                id="goal-edit-priority"
                data-testid="goal-modal-priority"
                value={draft.priority}
                onChange={(e) =>
                  setDraft({ ...draft, priority: Number(e.target.value) as PriorityRank })
                }
                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground"
              >
                {([1, 2, 3] as PriorityRank[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL_IT[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 mt-6">
            <Dialog.Close asChild>
              <Button variant="outline" data-testid="goal-modal-cancel">
                Annulla
              </Button>
            </Dialog.Close>
            <Button
              onClick={handleSave}
              data-testid="goal-modal-save"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {mode === 'add' ? 'Aggiungi' : 'Salva'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
