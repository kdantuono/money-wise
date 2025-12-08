/**
 * Dashboard Categories Page
 *
 * Main page for managing transaction categories.
 * Features hierarchical tree view, filtering by type, and CRUD operations.
 *
 * @module app/dashboard/categories/page
 */

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Plus, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import { CategoryTree, CategoryForm } from '@/components/categories';
import type { CreateCategoryData, UpdateCategoryData } from '@/components/categories';
import {
  categoriesClient,
  type Category,
  type CategoryType,
} from '@/services/categories.client';

// =============================================================================
// Type Definitions
// =============================================================================

type TabType = 'ALL' | CategoryType;

interface TabConfig {
  id: TabType;
  label: string;
}

const TABS: TabConfig[] = [
  { id: 'ALL', label: 'All' },
  { id: 'EXPENSE', label: 'Expenses' },
  { id: 'INCOME', label: 'Income' },
  { id: 'TRANSFER', label: 'Transfers' },
];

// =============================================================================
// Delete Confirmation Modal
// =============================================================================

interface DeleteModalProps {
  category: Category | null;
  isOpen: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmationModal({
  category,
  isOpen,
  isLoading,
  onConfirm,
  onCancel,
}: DeleteModalProps) {
  if (!isOpen || !category) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Delete Category
            </h3>
          </div>

          <p className="text-gray-600 mb-6">
            Are you sure you want to delete <strong>{category.name}</strong>?
            This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700
                hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg
                hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function CategoriesPage() {
  const router = useRouter();

  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('ALL');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  // Delete state
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter categories by active tab
  const filteredCategories = useMemo(() => {
    if (activeTab === 'ALL') {
      return categories;
    }
    return categories.filter((cat) => cat.type === activeTab);
  }, [categories, activeTab]);

  // Count categories by type
  const categoryCounts = useMemo(() => {
    return {
      ALL: categories.length,
      EXPENSE: categories.filter((c) => c.type === 'EXPENSE').length,
      INCOME: categories.filter((c) => c.type === 'INCOME').length,
      TRANSFER: categories.filter((c) => c.type === 'TRANSFER').length,
    };
  }, [categories]);

  /**
   * Fetch all categories
   */
  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await categoriesClient.getAll();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh categories
   */
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const data = await categoriesClient.getAll();
      setCategories(data);
    } catch (err) {
      console.error('Failed to refresh categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh categories');
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Handle category click - navigate to detail page
   */
  const handleCategoryClick = useCallback(
    (category: Category) => {
      router.push(`/dashboard/categories/${category.slug}`);
    },
    [router]
  );

  /**
   * Handle edit button click
   */
  const handleEdit = useCallback((category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  }, []);

  /**
   * Handle add new category
   */
  const handleAddNew = () => {
    setEditingCategory(undefined);
    setShowForm(true);
  };

  /**
   * Handle form close
   */
  const handleFormClose = () => {
    setShowForm(false);
    setEditingCategory(undefined);
  };

  /**
   * Handle form save
   */
  const handleSave = async (data: CreateCategoryData | UpdateCategoryData) => {
    try {
      setIsSaving(true);

      if (editingCategory) {
        // Update existing category
        await categoriesClient.update(editingCategory.id, data as UpdateCategoryData);
      } else {
        // Create new category
        await categoriesClient.create(data as CreateCategoryData);
      }

      setShowForm(false);
      setEditingCategory(undefined);
      await fetchCategories();
    } catch (err) {
      console.error('Failed to save category:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle delete category
   */
  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;

    try {
      setIsDeleting(true);
      await categoriesClient.delete(deletingCategory.id);
      setDeletingCategory(null);
      await fetchCategories();
    } catch (err) {
      console.error('Failed to delete category:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Dismiss error
   */
  const handleDismissError = () => {
    setError(null);
  };

  // Fetch on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <div className="space-y-6" data-testid="categories-container">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Tag className="h-6 w-6 text-purple-600" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
            <p className="text-sm text-gray-500">
              Organize your transactions with custom categories
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            aria-label="Refresh categories"
            aria-busy={isRefreshing}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium
              transition-colors duration-200 border border-gray-300
              text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          {/* Add Category Button */}
          <button
            onClick={handleAddNew}
            disabled={isLoading}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium
              transition-colors duration-200 bg-blue-600 text-white
              hover:bg-blue-700 active:bg-blue-800
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Add Category
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button
            onClick={handleDismissError}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4" aria-label="Category type tabs">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = categoryCounts[tab.id];

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium
                  border-b-2 transition-colors duration-200
                  ${isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
                <span
                  className={`
                    px-2 py-0.5 text-xs font-medium rounded-full
                    ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}
                  `}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Category Tree */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <CategoryTree
          categories={filteredCategories}
          onSelect={handleCategoryClick}
          onEdit={handleEdit}
          isLoading={isLoading}
        />
      </div>

      {/* Create/Edit Form Modal */}
      <CategoryForm
        category={editingCategory}
        categories={categories}
        isOpen={showForm}
        onClose={handleFormClose}
        onSave={handleSave}
        isLoading={isSaving}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        category={deletingCategory}
        isOpen={!!deletingCategory}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingCategory(null)}
      />
    </div>
  );
}
