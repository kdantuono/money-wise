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

import { useState, useEffect } from 'react';
import { Target, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  BudgetList,
  BudgetForm,
  OverBudgetAlert,
  type CategoryOption,
} from '@/components/budgets';
import { useBudgets } from '@/hooks/useBudgets';
import { categoriesClient, type CategoryOption as ApiCategoryOption } from '@/services/categories.client';
import type { Budget, CreateBudgetData, UpdateBudgetData } from '@/services/budgets.client';

/**
 * Budgets Page Component
 */
export default function BudgetsPage() {
  // State for modal
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<Budget | null>(null);

  // Categories state - fetched from API
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [_categoriesLoading, setCategoriesLoading] = useState(true);
  const [_categoriesError, setCategoriesError] = useState<string | null>(null);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        setCategoriesError(null);
        // Fetch EXPENSE categories for budgets (budgets are typically for expenses)
        const apiCategories = await categoriesClient.getOptions('EXPENSE');
        // Map to the CategoryOption type expected by BudgetForm
        const mappedCategories: CategoryOption[] = apiCategories.map((cat: ApiCategoryOption) => ({
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
        }));
        setCategories(mappedCategories);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setCategoriesError('Failed to load categories. Please try again.');
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
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
    <div data-testid="budgets-container" className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            data-testid="budget-icon-container"
            className="p-2 bg-emerald-100 rounded-lg"
          >
            <Target className="h-6 w-6 text-emerald-600" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
            <p className="text-sm text-gray-500">
              Track your spending across categories
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            disabled={isLoading}
            aria-label="Refresh budgets"
            aria-busy={isLoading}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium
              transition-colors duration-200 border border-gray-300
              text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
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
      </div>

      {/* Error display */}
      {error && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
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

      {/* Summary stats */}
      {!isLoading && budgets.length > 0 && (
        <div
          data-testid="budget-stats-container"
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-600 font-medium">Total Budgets</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {summary.total}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-600 font-medium">Total Budgeted</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              ${summary.totalBudgeted.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-600 font-medium">Total Spent</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              ${summary.totalSpent.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-600 font-medium">Over Budget</p>
            <p className={`text-3xl font-bold mt-2 ${summary.overBudgetCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {summary.overBudgetCount}
            </p>
          </div>
        </div>
      )}

      {/* Over budget alert */}
      {overBudgetItems.length > 0 && (
        <OverBudgetAlert budgets={overBudgetItems} />
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
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
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

      {/* Budget list - wrapped in card when budgets exist */}
      {(isLoading || budgets.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              All Budgets
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage your spending limits by category
            </p>
          </div>
          <div className="p-4" data-testid="budgets-list">
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
      )}

      {/* Empty State */}
      {!isLoading && budgets.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            No budgets yet
          </h2>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Create your first budget to start tracking your spending by category.
          </p>
          <Button
            onClick={handleCreateClick}
            data-testid="budgets-list"
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
      )}
    </div>
  );
}
