'use client';

import { useState } from 'react';
import { useOnboardingPlanStore } from '@/store/onboarding-plan.store';
import { PRIORITY_LABEL_IT, type PriorityRank } from '@/types/onboarding-plan';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

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

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">I tuoi obiettivi finanziari</h2>
      <p className="text-sm text-muted-foreground">
        Aggiungi almeno un obiettivo. Il piano verrà generato su questi target. Consigliamo di iniziare
        con un <strong>Fondo Emergenza</strong> di priorità alta.
      </p>

      {goals.length === 0 && !showAdd && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Nessun obiettivo ancora. Aggiungi il primo.</p>
        </div>
      )}

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

      {!showAdd && (
        <Button onClick={() => setShowAdd(true)} variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Aggiungi obiettivo
        </Button>
      )}

      {showAdd && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
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
              onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) as PriorityRank })}
              className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground"
            >
              <option value={1}>Alta</option>
              <option value={2}>Media</option>
              <option value={3}>Bassa</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annulla</Button>
            <Button onClick={handleAdd}>Aggiungi</Button>
          </div>
        </div>
      )}
    </div>
  );
}
