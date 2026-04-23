'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Target, Loader2, Archive, ArchiveRestore, ChevronDown, ChevronUp } from 'lucide-react';
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
// GoalsPage — #058 archive/completed flow
// =============================================================================

export default function GoalsPage() {
  const userId = useAuthStore((s) => s.user?.id);

  // Goals data — ora include COMPLETED oltre a ACTIVE
  const [goals, setGoals] = useState<Goal[]>([]);
  const [archivedGoals, setArchivedGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // #058 view toggles
  const [showArchived, setShowArchived] = useState(false);
  const [showCompletedSection, setShowCompletedSection] = useState(true);

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

  // #058 bulk archive confirm
  const [bulkArchiveConfirmOpen, setBulkArchiveConfirmOpen] = useState(false);
  const [isBulkArchiving, setIsBulkArchiving] = useState(false);

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
      // #058: fetch ACTIVE + COMPLETED together per view unificata
      const data = await goalsClient.loadGoals(userId, { statuses: ['ACTIVE', 'COMPLETED'] });
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

  const loadArchived = useCallback(async () => {
    if (!userId) return;
    setIsLoadingArchived(true);
    try {
      const data = await goalsClient.loadGoals(userId, { statuses: ['ARCHIVED'] });
      setArchivedGoals(data);
    } catch (err) {
      console.error('Failed to load archived goals:', err);
    } finally {
      setIsLoadingArchived(false);
    }
  }, [userId]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Lazy-load archived quando user attiva toggle
  useEffect(() => {
    if (showArchived) {
      loadArchived();
    }
  }, [showArchived, loadArchived]);

  // ---------------------------------------------------------------------------
  // Split goals by status
  // ---------------------------------------------------------------------------

  const activeGoals = useMemo(() => goals.filter((g) => g.status === 'ACTIVE'), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.status === 'COMPLETED'), [goals]);

  const filteredActiveGoals =
    selectedType === 'all'
      ? activeGoals
      : activeGoals.filter((g) => inferGoalType(g.name) === selectedType);

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
      setArchivedGoals((prev) => prev.filter((g) => g.id !== deletingGoalId));
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

  // #058 archive single goal
  const handleArchiveClick = async (goalId: string) => {
    try {
      await goalsClient.archiveGoal(goalId);
      // Move goal da active/completed list → archived (se visible)
      const archivedGoal = goals.find((g) => g.id === goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      if (showArchived && archivedGoal) {
        setArchivedGoals((prev) => [{ ...archivedGoal, status: 'ARCHIVED' }, ...prev]);
      }
    } catch (err) {
      setError(
        err instanceof GoalsApiError || err instanceof Error
          ? err.message
          : 'Errore durante l\'archiviazione',
      );
    }
  };

  // #058 reactivate archived goal
  const handleReactivateClick = async (goalId: string) => {
    try {
      await goalsClient.reactivateGoal(goalId);
      const reactivatedGoal = archivedGoals.find((g) => g.id === goalId);
      setArchivedGoals((prev) => prev.filter((g) => g.id !== goalId));
      if (reactivatedGoal) {
        setGoals((prev) => [...prev, { ...reactivatedGoal, status: 'ACTIVE' }]);
      }
    } catch (err) {
      setError(
        err instanceof GoalsApiError || err instanceof Error
          ? err.message
          : 'Errore durante la riattivazione',
      );
    }
  };

  // #058 bulk archive all completed
  const handleBulkArchive = async () => {
    if (!userId) return;
    setIsBulkArchiving(true);
    try {
      await goalsClient.archiveAllCompleted(userId);
      // Remove completed goals from state
      setGoals((prev) => prev.filter((g) => g.status !== 'COMPLETED'));
    } catch (err) {
      setError(
        err instanceof GoalsApiError || err instanceof Error
          ? err.message
          : 'Errore durante l\'archiviazione bulk',
      );
    } finally {
      setIsBulkArchiving(false);
      setBulkArchiveConfirmOpen(false);
    }
  };

  const deletingGoalName = [...goals, ...archivedGoals].find((g) => g.id === deletingGoalId)?.name ?? 'questo obiettivo';

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

  if (error && goals.length === 0) {
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
            {activeGoals.length > 0
              ? `${activeGoals.length} obiettiv${activeGoals.length === 1 ? 'o attivo' : 'i attivi'}${
                  completedGoals.length > 0
                    ? ` · ${completedGoals.length} completat${completedGoals.length === 1 ? 'o' : 'i'}`
                    : ''
                }`
              : 'Crea il tuo primo obiettivo finanziario'}
          </p>
        </div>
        {/* #058 archived toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowArchived((v) => !v)}
          data-testid="goals-archived-toggle"
        >
          <Archive className="w-4 h-4 mr-2" />
          {showArchived ? 'Nascondi archiviati' : 'Mostra archiviati'}
        </Button>
      </div>

      {/* Error banner (non-blocking) */}
      {error && goals.length > 0 && (
        <Card className="p-4 border-l-4 border-l-red-500">
          <p className="text-sm text-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setError(null)}>
            Chiudi
          </Button>
        </Card>
      )}

      {/* Filter chips (solo goal attivi) */}
      {activeGoals.length > 0 && (
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
          {/* Active goals grid */}
          {filteredActiveGoals.length === 0 && activeGoals.length > 0 && (
            <p
              data-testid="goals-filter-empty"
              className="text-sm text-muted-foreground py-6 text-center"
            >
              Nessun obiettivo per questo filtro.
            </p>
          )}

          {activeGoals.length > 0 && (
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              data-testid="goals-grid"
            >
              {filteredActiveGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEditClick={handleEditClick}
                  onDeleteClick={handleDeleteClick}
                />
              ))}
            </div>
          )}

          {/* #058: Completed section (collapsible) */}
          {completedGoals.length > 0 && (
            <section className="space-y-3 pt-4 border-t border-border" data-testid="goals-completed-section">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowCompletedSection((v) => !v)}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-muted-foreground transition-colors"
                  data-testid="goals-completed-toggle"
                >
                  {showCompletedSection ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  Obiettivi completati ({completedGoals.length})
                </button>
                {showCompletedSection && completedGoals.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkArchiveConfirmOpen(true)}
                    data-testid="goals-bulk-archive-btn"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Archivia tutti
                  </Button>
                )}
              </div>

              {showCompletedSection && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="goals-completed-grid">
                  {completedGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onEditClick={handleEditClick}
                      onDeleteClick={handleDeleteClick}
                      onArchiveClick={handleArchiveClick}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* #058: Archived section (toggle-gated) */}
          {showArchived && (
            <section className="space-y-3 pt-4 border-t border-border" data-testid="goals-archived-section">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Archive className="w-4 h-4" />
                Obiettivi archiviati ({archivedGoals.length})
              </h2>
              {isLoadingArchived ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : archivedGoals.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nessun obiettivo archiviato.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="goals-archived-grid">
                  {archivedGoals.map((goal) => (
                    <Card
                      key={goal.id}
                      className="p-5 opacity-70 hover:opacity-100 transition-opacity"
                      data-testid={`archived-goal-card-${goal.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-foreground truncate">{goal.name}</h3>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReactivateClick(goal.id)}
                          data-testid={`goal-reactivate-${goal.id}`}
                        >
                          <ArchiveRestore className="w-4 h-4 mr-1.5" />
                          Riattiva
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {goal.target !== null && goal.target > 0
                          ? `€${goal.current.toLocaleString('it-IT')} / €${goal.target.toLocaleString('it-IT')}`
                          : 'Obiettivo aperto'}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          )}
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

      {/* #058 Bulk Archive Confirm Dialog */}
      <Dialog.Root open={bulkArchiveConfirmOpen} onOpenChange={setBulkArchiveConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content
            data-testid="bulk-archive-confirm-dialog"
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out"
            aria-describedby={undefined}
          >
            <Dialog.Title className="text-base font-semibold text-foreground mb-2">
              Archivia tutti i completati
            </Dialog.Title>
            <p className="text-sm text-muted-foreground mb-5">
              Archivia {completedGoals.length} obiettiv{completedGoals.length === 1 ? 'o' : 'i'} completat{completedGoals.length === 1 ? 'o' : 'i'}. Potrai sempre riattivarl{completedGoals.length === 1 ? 'o' : 'i'} dalla vista Archiviati.
            </p>
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="outline" disabled={isBulkArchiving}>
                  Annulla
                </Button>
              </Dialog.Close>
              <Button
                onClick={handleBulkArchive}
                data-testid="bulk-archive-confirm-ok"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isBulkArchiving}
              >
                {isBulkArchiving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Archivia tutti
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
