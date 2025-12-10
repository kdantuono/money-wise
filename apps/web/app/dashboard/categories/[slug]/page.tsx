/**
 * Category Detail Page
 *
 * Displays detailed information about a specific category including:
 * - Category header with icon, name, and type
 * - Edit functionality
 * - Add subcategory functionality
 * - Child categories (if parent)
 * - Link to transactions filtered by this category
 *
 * URL: /dashboard/categories/[slug]
 * Example: /dashboard/categories/groceries
 *
 * @module app/dashboard/categories/[slug]/page
 */

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Folder,
  ExternalLink,
  Lock,
  Plus,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CategoryForm, CategoryTree } from '@/components/categories';
import type { CreateCategoryData, UpdateCategoryData } from '@/components/categories';
import { categoriesClient, type Category } from '@/services/categories.client';

// =============================================================================
// Helper Functions
// =============================================================================

function getIconComponent(iconName: string | null): LucideIcon {
  if (!iconName) return Folder;
  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  return icons[iconName] || Folder;
}

function formatCategoryType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

// =============================================================================
// Delete Confirmation Modal
// =============================================================================

interface DeleteModalProps {
  categoryName: string;
  isOpen: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmationModal({
  categoryName,
  isOpen,
  isLoading,
  onConfirm,
  onCancel,
}: DeleteModalProps) {
  if (!isOpen) return null;

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
            Are you sure you want to delete <strong>{categoryName}</strong>?
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

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const categorySlug = params.slug as string;

  // State
  const [category, setCategory] = useState<Category | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [showEditForm, setShowEditForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Add subcategory form state
  const [showAddSubcategoryForm, setShowAddSubcategoryForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get child categories
  const childCategories = useMemo(() => {
    if (!category) return [];
    return allCategories.filter((cat) => cat.parentId === category.id);
  }, [allCategories, category]);

  // Check if this category can have subcategories (must be a root category)
  const canHaveSubcategories = useMemo(() => {
    return category && !category.parentId;
  }, [category]);

  /**
   * Fetch category by slug
   */
  const fetchCategory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all categories and find by slug
      const categoriesData = await categoriesClient.getAll();
      setAllCategories(categoriesData);

      // Find the category matching the slug
      const foundCategory = categoriesData.find(
        (cat) => cat.slug === categorySlug
      );

      if (!foundCategory) {
        setError('Category not found');
        setCategory(null);
      } else {
        setCategory(foundCategory);
      }
    } catch (err) {
      console.error('Failed to fetch category:', err);
      setError(err instanceof Error ? err.message : 'Failed to load category');
    } finally {
      setIsLoading(false);
    }
  }, [categorySlug]);

  /**
   * Handle save edit changes
   */
  const handleSaveEdit = async (data: UpdateCategoryData) => {
    if (!category) return;

    try {
      setIsSaving(true);
      await categoriesClient.update(category.id, data);
      setShowEditForm(false);

      // If slug changed, navigate to new URL
      if (data.slug && data.slug !== category.slug) {
        router.replace(`/dashboard/categories/${data.slug}`);
      } else {
        await fetchCategory();
      }
    } catch (err) {
      console.error('Failed to update category:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle create subcategory
   */
  const handleCreateSubcategory = async (data: CreateCategoryData | UpdateCategoryData) => {
    if (!category) return;

    try {
      setIsCreating(true);
      // Ensure parent is set to current category
      const createData: CreateCategoryData = {
        ...(data as CreateCategoryData),
        parentId: category.id,
        type: category.type, // Inherit type from parent
      };
      await categoriesClient.create(createData);
      setShowAddSubcategoryForm(false);
      await fetchCategory();
    } catch (err) {
      console.error('Failed to create subcategory:', err);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Handle delete
   */
  const handleDelete = async () => {
    if (!category) return;

    try {
      setIsDeleting(true);
      await categoriesClient.delete(category.id);
      router.push('/dashboard/categories');
    } catch (err) {
      console.error('Failed to delete category:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete category');
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    router.push('/dashboard/categories');
  };

  /**
   * Handle child category click
   */
  const handleChildClick = (childCategory: Category) => {
    router.push(`/dashboard/categories/${childCategory.slug}`);
  };

  // Fetch on mount
  useEffect(() => {
    fetchCategory();
  }, [fetchCategory]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading category...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !category) {
    return (
      <div className="space-y-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Categories
        </button>

        <div
          className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error || 'Category not found'}</p>
        </div>
      </div>
    );
  }

  const IconComponent = getIconComponent(category.icon);

  return (
    <div className="space-y-6" data-testid="category-detail-container">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Categories
      </button>

      {/* Category Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: category.color ? `${category.color}20` : '#f3f4f6',
              }}
            >
              <IconComponent
                className="h-8 w-8"
                style={{ color: category.color || '#6b7280' }}
              />
            </div>

            {/* Name and Type */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
                {category.isSystem && (
                  <Lock
                    className="h-4 w-4 text-gray-400"
                    aria-label="System category"
                  />
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span
                  className={`
                    px-2 py-1 text-xs font-medium rounded-full
                    ${category.type === 'EXPENSE' ? 'bg-red-100 text-red-700' : ''}
                    ${category.type === 'INCOME' ? 'bg-green-100 text-green-700' : ''}
                  `}
                >
                  {formatCategoryType(category.type)}
                </span>
                {category.color && (
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-xs text-gray-500">{category.color}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Add Subcategory Button - only for root categories */}
            {canHaveSubcategories && !category.isSystem && (
              <button
                onClick={() => setShowAddSubcategoryForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                  hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Subcategory
              </button>
            )}

            {!category.isSystem && (
              <>
                <button
                  onClick={() => setShowEditForm(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg
                    text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-red-300 rounded-lg
                    text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        {category.description && (
          <p className="mt-4 text-gray-600">{category.description}</p>
        )}

        {/* Metadata */}
        <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Slug
            </p>
            <p className="mt-1 text-sm text-gray-900 font-mono">{category.slug}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </p>
            <p className="mt-1 text-sm text-gray-900">{category.status}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </p>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(category.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Updated
            </p>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(category.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Child Categories */}
      {childCategories.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Subcategories ({childCategories.length})
            </h2>
            {canHaveSubcategories && !category.isSystem && (
              <button
                onClick={() => setShowAddSubcategoryForm(true)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            )}
          </div>
          <CategoryTree
            categories={childCategories}
            onSelect={handleChildClick}
          />
        </div>
      )}

      {/* Empty subcategories state */}
      {childCategories.length === 0 && canHaveSubcategories && !category.isSystem && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-center py-6">
            <p className="text-gray-500 mb-3">No subcategories yet</p>
            <button
              onClick={() => setShowAddSubcategoryForm(true)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mx-auto"
            >
              <Plus className="h-4 w-4" />
              Add Subcategory
            </button>
          </div>
        </div>
      )}

      {/* View Transactions Link */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <a
          href={`/dashboard/transactions?categoryId=${category.id}`}
          className="flex items-center justify-between p-4 rounded-lg border border-gray-200
            hover:border-blue-300 hover:bg-blue-50 transition-colors group"
        >
          <div>
            <h3 className="font-medium text-gray-900 group-hover:text-blue-600">
              View Transactions
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              See all transactions categorized as {category.name}
            </p>
          </div>
          <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
        </a>
      </div>

      {/* Edit Form Modal */}
      <CategoryForm
        category={category}
        categories={allCategories}
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSave={handleSaveEdit}
        isLoading={isSaving}
      />

      {/* Add Subcategory Form Modal */}
      <CategoryForm
        categories={allCategories}
        isOpen={showAddSubcategoryForm}
        onClose={() => setShowAddSubcategoryForm(false)}
        onSave={handleCreateSubcategory}
        isLoading={isCreating}
        defaultParentId={category.id}
        defaultType={category.type}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        categoryName={category.name}
        isOpen={showDeleteModal}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
