'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PiggyBank,
  Plus,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Target,
  RefreshCw,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  BudgetForm,
  OverBudgetAlert,
  type CategoryOption,
} from '@/components/budgets';
import { useBudgets } from '@/hooks/useBudgets';
import { categoriesClient, type CategoryOption as ApiCategoryOption } from '@/services/categories.client';
import type { Budget, CreateBudgetData, UpdateBudgetData } from '@/services/budgets.client';

// ---------------------------------------------------------------------------
// Chart tooltip — Figma style
// ---------------------------------------------------------------------------

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey?: string; value?: number; fill?: string }>; label?: string }) {
  if (!active || !payload) return null;
  const allocated = payload.find(p => p.dataKey === 'allocated');
  const spent = payload.find(p => p.dataKey === 'spent');
  const pct = allocated?.value && spent?.value ? ((spent.value / allocated.value) * 100).toFixed(1) : '0';
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-blue-500" />
          <span className="text-muted-foreground">Budget:</span>
          <span className="font-medium text-foreground">€{allocated?.value?.toFixed(0)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: spent?.fill || '#ef4444' }} />
          <span className="text-muted-foreground">Speso:</span>
          <span className="font-medium text-foreground">€{spent?.value?.toFixed(0)}</span>
        </div>
        <div className="pt-1 border-t border-border">
          <span className="text-muted-foreground">Utilizzo: </span>
          <span className={`font-semibold ${Number(pct) >= 90 ? 'text-red-500' : Number(pct) >= 70 ? 'text-yellow-500' : 'text-green-500'}`}>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

function getBarColor(percentage: number) {
  if (percentage >= 95) return '#ef4444';
  if (percentage >= 80) return '#f59e0b';
  return '#10b981';
}

// ---------------------------------------------------------------------------
// Budget Page — 1:1 Figma layout + real Supabase data
// ---------------------------------------------------------------------------

export default function BudgetsPage() {
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<Budget | null>(null);

  // Categories
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    categoriesClient.getOptions('EXPENSE')
      .then((cats: ApiCategoryOption[]) => setCategories(cats.map(c => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }))))
      .catch(console.error);
  }, []);

  // Budget hook
  const {
    budgets,
    isLoading,
    isCreating,
    error,
    createError,
    overBudgetItems,
    summary,
    refresh,
    createBudget,
    updateBudget,
    deleteBudget,
    isBudgetUpdating,
    isBudgetDeleting,
    clearErrors,
  } = useBudgets({
    autoFetch: true,
    onCreateSuccess: () => { setShowForm(false); setEditingBudget(undefined); },
    onUpdateSuccess: () => { setShowForm(false); setEditingBudget(undefined); },
    onDeleteSuccess: () => { setDeleteConfirm(null); },
  });

  // Computed
  const totalAllocated = summary.totalBudgeted;
  const totalSpent = summary.totalSpent;
  const totalRemaining = totalAllocated - totalSpent;
  const overallPercentage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
  const warningBudgets = budgets.filter(b => b.percentage >= 90);

  // Chart data from real budgets
  const chartData = budgets.map(b => ({
    name: b.category?.name || b.name,
    allocated: b.amount,
    spent: b.spent,
    percentage: b.percentage,
  }));

  // Handlers
  const handleCreateClick = () => { setEditingBudget(undefined); setShowForm(true); clearErrors(); };
  const handleEdit = (budget: Budget) => { setEditingBudget(budget); setShowForm(true); clearErrors(); };
  const handleDelete = (budget: Budget) => setDeleteConfirm(budget);
  const handleFormCancel = () => { setShowForm(false); setEditingBudget(undefined); clearErrors(); };
  const handleFormSubmit = async (data: CreateBudgetData | UpdateBudgetData) => {
    if (editingBudget) await updateBudget(editingBudget.id, data as UpdateBudgetData);
    else await createBudget(data as CreateBudgetData);
  };
  const handleDeleteConfirm = async () => { if (deleteConfirm) await deleteBudget(deleteConfirm.id); };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-40 bg-muted rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-2xl" />)}
          </div>
          <div className="h-80 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header — Figma style */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[32px] tracking-[-0.03em] text-foreground">Budget</h1>
          <p className="text-[13px] text-muted-foreground mt-1.5">Pianifica e monitora il tuo budget mensile</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-xl border-border/50 text-[13px]"
            onClick={refresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Aggiorna
          </Button>
          <Button
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20 border-0 rounded-xl px-5 py-2.5 text-[13px]"
            onClick={handleCreateClick}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuova Categoria
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/20 p-4 text-rose-700 dark:text-rose-300 text-sm" role="alert">
          {error}
          <Button variant="ghost" size="sm" className="ml-4" onClick={refresh}>Riprova</Button>
        </div>
      )}

      {/* Summary Cards — Figma gradient style */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-5 rounded-2xl border-0 shadow-sm bg-gradient-to-br from-blue-500/10 to-indigo-500/10 hover:shadow-md hover:scale-[1.02] transition-all group">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] text-muted-foreground">Budget Totale</p>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Target className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-[24px] tracking-[-0.03em] font-semibold text-foreground tabular-nums">€{totalAllocated.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-5 rounded-2xl border-0 shadow-sm bg-gradient-to-br from-rose-500/10 to-pink-500/10 hover:shadow-md hover:scale-[1.02] transition-all group">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] text-muted-foreground">Speso</p>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <TrendingDown className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-[24px] tracking-[-0.03em] font-semibold text-foreground tabular-nums">€{totalSpent.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
            <p className="text-[11px] text-muted-foreground mt-2">{overallPercentage.toFixed(1)}% del budget</p>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-5 rounded-2xl border-0 shadow-sm bg-gradient-to-br from-emerald-500/10 to-teal-500/10 hover:shadow-md hover:scale-[1.02] transition-all group">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] text-muted-foreground">Disponibile</p>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <PiggyBank className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-[24px] tracking-[-0.03em] font-semibold text-foreground tabular-nums">€{Math.max(0, totalRemaining).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
            {totalAllocated > 0 && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-2">
                {((Math.max(0, totalRemaining) / totalAllocated) * 100).toFixed(1)}% rimanente
              </p>
            )}
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-5 rounded-2xl border-0 shadow-sm bg-gradient-to-br from-amber-500/10 to-orange-500/10 hover:shadow-md hover:scale-[1.02] transition-all group">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] text-muted-foreground">Alert</p>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-[24px] tracking-[-0.03em] font-semibold text-foreground tabular-nums">{warningBudgets.length}</h3>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-2">Categorie oltre 90%</p>
          </Card>
        </motion.div>
      </div>

      {/* Overall Progress — Figma style */}
      {budgets.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="p-6 rounded-2xl border-0 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-medium text-foreground">Progresso Generale</h3>
              <span className={`text-[15px] font-semibold tabular-nums px-3 py-1.5 rounded-lg ${
                overallPercentage >= 95 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' :
                overallPercentage >= 80 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              }`}>
                {overallPercentage.toFixed(1)}%
              </span>
            </div>
            <Progress value={overallPercentage} className="h-2.5 rounded-full" />
            <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
              <span>€{totalSpent.toLocaleString('it-IT', { minimumFractionDigits: 2 })} spesi</span>
              <span>€{totalAllocated.toLocaleString('it-IT', { minimumFractionDigits: 2 })} totali</span>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Budget Chart — budget vs spent per category */}
      {chartData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="p-6 rounded-2xl border-0 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[16px] font-medium text-foreground">Budget vs Spesa per Categoria</h3>
                <p className="text-xs text-muted-foreground mt-1">Verde sotto 80%, arancione 80-95%, rosso oltre 95%</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500" /><span>Budget</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-500" /><span>&lt;80%</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-yellow-500" /><span>80-95%</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500" /><span>&gt;95%</span></div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} barGap={4} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground, #6b7280)' }} axisLine={{ stroke: 'var(--color-border, #e5e7eb)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted-foreground, #6b7280)' }} axisLine={{ stroke: 'var(--color-border, #e5e7eb)' }} tickFormatter={(v) => `€${v}`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-muted, #f3f4f6)', opacity: 0.3 }} />
                <Bar dataKey="allocated" fill="#3b82f6" name="Budget" radius={[4, 4, 0, 0]} opacity={0.35} />
                <Bar dataKey="spent" name="Speso" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.percentage)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      )}

      {/* Over budget alert */}
      {overBudgetItems.length > 0 && <OverBudgetAlert budgets={overBudgetItems} />}

      {/* Categories Detail — Figma two-column layout */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Warning Categories */}
          {warningBudgets.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="p-6 rounded-2xl border-0 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <h3 className="text-[16px] font-medium text-foreground">Categorie in Attenzione</h3>
                </div>
                <div className="space-y-4">
                  {warningBudgets.map((budget, index) => (
                    <motion.div
                      key={budget.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="p-4 bg-yellow-50/80 dark:bg-yellow-950/20 rounded-xl border border-yellow-200 dark:border-yellow-800/40"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-foreground">{budget.category?.name || budget.name}</h4>
                        <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{budget.percentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={budget.percentage} className="h-2 mb-2" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">€{budget.spent.toFixed(2)} di €{budget.amount.toFixed(2)}</span>
                        <span className={`font-medium ${budget.remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                          {budget.remaining < 0 ? 'Superato di ' : 'Restano '}€{Math.abs(budget.remaining).toFixed(2)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* All Categories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={warningBudgets.length > 0 ? '' : 'lg:col-span-2'}
          >
            <Card className="p-6 rounded-2xl border-0 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="text-[16px] font-medium text-foreground">Tutte le Categorie</h3>
              </div>
              <div className="space-y-4">
                {budgets.map((budget, index) => (
                  <motion.div
                    key={budget.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    className={`group p-4 rounded-xl border ${
                      budget.percentage >= 95
                        ? 'bg-red-50/80 dark:bg-red-950/20 border-red-200 dark:border-red-800/40'
                        : budget.percentage >= 80
                        ? 'bg-yellow-50/80 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800/40'
                        : 'bg-green-50/80 dark:bg-green-950/20 border-green-200 dark:border-green-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-foreground">{budget.category?.name || budget.name}</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(budget)} className="p-1 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted/50 transition-colors" aria-label="Modifica">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(budget)} className="p-1 rounded-lg text-muted-foreground/40 hover:text-rose-600 hover:bg-rose-500/10 transition-colors" aria-label="Elimina">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className={`text-sm font-bold ${
                        budget.percentage >= 95 ? 'text-red-600 dark:text-red-400' :
                        budget.percentage >= 80 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {budget.percentage.toFixed(1)}%
                      </span>
                      </div>
                    </div>
                    <Progress value={budget.percentage} className="h-2 mb-2" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">€{budget.spent.toFixed(2)} / €{budget.amount.toFixed(2)}</span>
                      <span className={`font-medium ${
                        budget.remaining < 0 ? 'text-red-600 dark:text-red-400' :
                        budget.percentage >= 80 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {budget.remaining < 0 ? '+' : ''}€{Math.abs(budget.remaining).toFixed(2)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] overflow-y-auto">
            <BudgetForm
              budget={editingBudget}
              categories={categories}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              isSubmitting={isCreating || (editingBudget ? isBudgetUpdating(editingBudget.id) : false)}
              error={createError}
            />
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-foreground mb-2">Elimina Budget</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Sei sicuro di voler eliminare &ldquo;{deleteConfirm.name}&rdquo;? Questa azione non può essere annullata.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" className="rounded-xl" onClick={() => setDeleteConfirm(null)} disabled={isBudgetDeleting(deleteConfirm.id)}>
                Annulla
              </Button>
              <Button className="rounded-xl bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteConfirm} disabled={isBudgetDeleting(deleteConfirm.id)}>
                {isBudgetDeleting(deleteConfirm.id) ? 'Eliminazione...' : 'Elimina'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && budgets.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-border/50 p-12 text-center">
          <PiggyBank className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-lg font-medium text-foreground mb-2">Nessun budget ancora</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
            Crea il tuo primo budget per iniziare a monitorare le spese per categoria.
          </p>
          <Button
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl px-5 py-2.5"
            onClick={handleCreateClick}
          >
            <Plus className="w-4 h-4 mr-2" />
            Crea Budget
          </Button>
        </div>
      )}
    </div>
  );
}
