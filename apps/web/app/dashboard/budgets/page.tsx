'use client';

/**
 * Budgets Page
 *
 * Main page for budget management.
 * Displays budget list with progress, over-budget alerts,
 * and forms for creating/editing budgets.
 *
 * @module app/budgets/page
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  BudgetList,
  BudgetForm,
  OverBudgetAlert,
  type CategoryOption,
} from '@/components/budgets';
import { useBudgets } from '@/hooks/useBudgets';
import type { Budget, CreateBudgetData, UpdateBudgetData } from '@/services/budgets.client';

/**
 * Mock categories for development
 * TODO: Replace with actual category fetch from API
 */
const MOCK_CATEGORIES: CategoryOption[] = [
  { id: '1', name: 'Groceries', icon: 'shopping-cart', color: '#4CAF50' },
  { id: '2', name: 'Dining Out', icon: 'utensils', color: '#FF9800' },
  { id: '3', name: 'Transportation', icon: 'car', color: '#2196F3' },
  { id: '4', name: 'Entertainment', icon: 'film', color: '#9C27B0' },
  { id: '5', name: 'Utilities', icon: 'bolt', color: '#607D8B' },
  { id: '6', name: 'Shopping', icon: 'shopping-bag', color: '#E91E63' },
  { id: '7', name: 'Healthcare', icon: 'heart', color: '#F44336' },
  { id: '8', name: 'Education', icon: 'book', color: '#00BCD4' },
];

/**
 * Budgets Page Component
 */
export default function BudgetsPage() {
  // State for modal
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<Budget | null>(null);

  // Categories state (would come from API)
  const [categories] = useState<CategoryOption[]>(MOCK_CATEGORIES);

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
    onCreateSuccess: () => {
      setShowForm(false);
      setEditingBudget(undefined);
    },
    onUpdateSuccess: () => {
      setShowForm(false);
      setEditingBudget(undefined);
    },
    onDeleteSuccess: () => {
      setDeleteConfirm(null);
    },
  });

  // Get updating/deleting IDs for list
  const updatingIds = budgets
    .filter((b) => isBudgetUpdating(b.id))
    .map((b) => b.id);
  const deletingIds = budgets
    .filter((b) => isBudgetDeleting(b.id))
    .map((b) => b.id);

  // Handle create button click
  const handleCreateClick = () => {
    setEditingBudget(undefined);
    setShowForm(true);
    clearErrors();
  };

  // Handle edit button click
  const handleEditClick = (budget: Budget) => {
    setEditingBudget(budget);
    setShowForm(true);
    clearErrors();
  };

  // Handle delete button click
  const handleDeleteClick = (budget: Budget) => {
    setDeleteConfirm(budget);
  };

  // Handle form cancel
  const handleFormCancel = () => {
    setShowForm(false);
    setEditingBudget(undefined);
    clearErrors();
  };

  // Handle form submit
  const handleFormSubmit = async (data: CreateBudgetData | UpdateBudgetData) => {
    if (editingBudget) {
      await updateBudget(editingBudget.id, data as UpdateBudgetData);
    } else {
      await createBudget(data as CreateBudgetData);
    }
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (deleteConfirm) {
      await deleteBudget(deleteConfirm.id);
    }
  };

  // Handle delete cancel
  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  return (
    <div data-testid="budgets-container" className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track your spending across categories
          </p>
        </div>
        <Button
          onClick={handleCreateClick}
          disabled={showForm}
          data-testid="create-budget-button"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Budget
        </Button>
      </div>

      {/* Summary stats */}
      {!isLoading && budgets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Budgets</p>
            <p className="text-2xl font-bold">{summary.total}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Budgeted</p>
            <p className="text-2xl font-bold">
              ${summary.totalBudgeted.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Spent</p>
            <p className="text-2xl font-bold">
              ${summary.totalSpent.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Over Budget</p>
            <p className={`text-2xl font-bold ${summary.overBudgetCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {summary.overBudgetCount}
            </p>
          </div>
        </div>
      )}

      {/* Over budget alert */}
      {overBudgetItems.length > 0 && (
        <div className="mb-6">
          <OverBudgetAlert budgets={overBudgetItems} />
        </div>
      )}

      {/* Error display */}
      {error && (
        <div
          className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
          role="alert"
        >
          {error}
          <Button
            variant="ghost"
            size="sm"
            className="ml-4"
            onClick={refresh}
          >
            Retry
          </Button>
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

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Delete Budget
            </h3>
            <p className="text-gray-500 mb-4">
              Are you sure you want to delete &ldquo;{deleteConfirm.name}&rdquo;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                disabled={isBudgetDeleting(deleteConfirm.id)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isBudgetDeleting(deleteConfirm.id)}
              >
                {isBudgetDeleting(deleteConfirm.id) ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Budget list */}
      <div data-testid="budgets-list">
        <BudgetList
          budgets={budgets}
          isLoading={isLoading}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          updatingIds={updatingIds}
          deletingIds={deletingIds}
        />
      </div>
    </div>
  );
}
