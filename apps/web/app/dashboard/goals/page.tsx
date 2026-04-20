'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Target, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import { goalsClient, GoalsApiError } from '@/services/goals.client';
import type { Goal, GoalInput } from '@/services/goals.client';
import { GoalCard, inferGoalType } from '@/components/goals/GoalCard';
import { GoalEditModal } from '@/components/goals/GoalEditModal';
import { GoalTypeFilter } from '@/components/goals/GoalTypeFilter';
import type { GoalType } from '@/components/goals/GoalTypeFilter';
import * as Dialog from '@radix-ui/react-dialog';

// =============================================================================
// GoalsPage
// =============================================================================

export default function GoalsPage() {
  const userId = useAuthStore((s) => s.user?.id);

  // Goals data
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter
  const [selectedType, setSelectedType] = useState<GoalType>('all');

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);

  // Delete confirm
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------

  const loadGoals = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await goalsClient.loadGoals(userId);
      setGoals(data);
    } catch (err) {
      setError(
        err instanceof GoalsApiError || err instanceof Error
          ? err.message
          : 'Errore caricamento obiettivi',
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // ---------------------------------------------------------------------------
  // Filtered goals
  // ---------------------------------------------------------------------------

  const filteredGoals =
    selectedType === 'all'
      ? goals
      : goals.filter((g) => inferGoalType(g.name) === selectedType);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleAddClick = () => {
    setEditMode('add');
    setEditingGoal(undefined);
    setEditModalOpen(true);
  };

  const handleEditClick = (goal: Goal) => {
    setEditMode('edit');
    setEditingGoal(goal);
    setEditModalOpen(true);
  };

  const handleModalSave = async (data: GoalInput) => {
    if (!userId) return;
    setEditModalOpen(false);
    try {
      if (editMode === 'add') {
        const newGoal = await goalsClient.addGoal(userId, data);
        setGoals((prev) => [...prev, newGoal]);
      } else if (editingGoal) {
        const updated = await goalsClient.updateGoal(editingGoal.id, data);
        setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      }
    } catch (err) {
      setError(
        err instanceof GoalsApiError || err instanceof Error
          ? err.message
          : 'Errore durante il salvataggio',
      );
    }
  };

  const handleModalCancel = () => {
    setEditModalOpen(false);
    setEditingGoal(undefined);
  };

  const handleDeleteClick = (goalId: string) => {
    setDeletingGoalId(goalId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingGoalId) return;
    setIsDeleting(true);
    try {
      await goalsClient.deleteGoal(deletingGoalId);
      setGoals((prev) => prev.filter((g) => g.id !== deletingGoalId));
    } catch (err) {
      setError(
        err instanceof GoalsApiError || err instanceof Error
          ? err.message
          : 'Errore durante l\'eliminazione',
      );
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setDeletingGoalId(null);
    }
  };

  const deletingGoalName = goals.find((g) => g.id === deletingGoalId)?.name ?? 'questo obiettivo';

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto" data-testid="goals-loading">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto" data-testid="goals-error">
        <Card className="p-6 border-l-4 border-l-red-500">
          <p className="text-sm font-semibold text-foreground">Errore caricamento obiettivi</p>
          <p className="text-sm text-muted-foreground mt-1" data-testid="goals-error-message">
            {error}
          </p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => { setError(null); loadGoals(); }}
          >
            Riprova
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="goals-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Obiettivi</h1>
          <p className="text-muted-foreground mt-1">
            {goals.length > 0
              ? `${goals.length} obiettiv${goals.length === 1 ? 'o attivo' : 'i attivi'}`
              : 'Crea il tuo primo obiettivo finanziario'}
          </p>
        </div>
      </div>

      {/* Filter chips */}
      {goals.length > 0 && (
        <GoalTypeFilter selected={selectedType} onTypeSelect={setSelectedType} />
      )}

      {/* Empty state */}
      {goals.length === 0 ? (
        <Card
          data-testid="goals-empty-state"
          className="p-12 text-center border-dashed"
        >
          <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground">
            Crea il tuo primo obiettivo
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Definisci i tuoi traguardi finanziari: risparmio, investimenti, fondo
            emergenza e molto altro.
          </p>
          <Button
            onClick={handleAddClick}
            data-testid="goals-empty-cta"
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Aggiungi obiettivo
          </Button>
        </Card>
      ) : (
        <>
          {/* Filtered empty */}
          {filteredGoals.length === 0 && (
            <p
              data-testid="goals-filter-empty"
              className="text-sm text-muted-foreground py-6 text-center"
            >
              Nessun obiettivo per questo filtro.
            </p>
          )}

          {/* Goals grid */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            data-testid="goals-grid"
          >
            {filteredGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEditClick={handleEditClick}
                onDeleteClick={handleDeleteClick}
              />
            ))}
          </div>
        </>
      )}

      {/* Floating add button */}
      <button
        type="button"
        onClick={handleAddClick}
        data-testid="goals-add-btn"
        className="fixed bottom-6 right-6 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-lg transition-colors z-40"
        aria-label="Aggiungi obiettivo"
      >
        <Plus className="w-5 h-5" />
        <span className="text-sm font-medium">Aggiungi</span>
      </button>

      {/* Edit/Add Modal */}
      <GoalEditModal
        open={editModalOpen}
        mode={editMode}
        goal={editingGoal}
        onSave={handleModalSave}
        onCancel={handleModalCancel}
      />

      {/* Delete Confirm Dialog */}
      <Dialog.Root open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content
            data-testid="delete-confirm-dialog"
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out"
            aria-describedby={undefined}
          >
            <Dialog.Title className="text-base font-semibold text-foreground mb-2">
              Elimina obiettivo
            </Dialog.Title>
            <p className="text-sm text-muted-foreground mb-5">
              Vuoi eliminare &ldquo;{deletingGoalName}&rdquo;? Le allocazioni associate
              verranno perse.
            </p>
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button
                  variant="outline"
                  data-testid="delete-confirm-cancel"
                  disabled={isDeleting}
                >
                  Annulla
                </Button>
              </Dialog.Close>
              <Button
                onClick={handleDeleteConfirm}
                data-testid="delete-confirm-ok"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Elimina
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
