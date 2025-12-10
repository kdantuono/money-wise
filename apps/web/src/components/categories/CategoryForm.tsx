'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { IconPicker, CATEGORY_ICONS } from './IconPicker';
import { ColorPicker, CATEGORY_COLORS } from './ColorPicker';
import type { Category, CategoryType } from '@/services/categories.client';

// =============================================================================
// Type Definitions
// =============================================================================

export interface CreateCategoryData {
  name: string;
  slug: string;
  description?: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  parentId?: string;
}

export interface UpdateCategoryData {
  name?: string;
  slug?: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string | null;
}

export interface CategoryFormProps {
  /** Existing category for editing (undefined = create mode) */
  category?: Category;
  /** All available categories (for parent selection) */
  categories?: Category[];
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when form is submitted */
  onSave: (data: CreateCategoryData | UpdateCategoryData) => Promise<void>;
  /** Loading state */
  isLoading?: boolean;
  /** Default parent ID for creating subcategories */
  defaultParentId?: string;
  /** Default type for creating subcategories */
  defaultType?: CategoryType;
}

interface FormData {
  name: string;
  type: CategoryType;
  description: string;
  color: string;
  icon: string;
  parentId: string;
}

interface FormErrors {
  name?: string;
  type?: string;
  general?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a URL-friendly slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Get initial form data from category or defaults
 */
function getInitialFormData(
  category?: Category,
  defaultParentId?: string,
  defaultType?: CategoryType
): FormData {
  return {
    name: category?.name || '',
    type: category?.type || defaultType || 'EXPENSE',
    description: category?.description || '',
    color: category?.color || CATEGORY_COLORS[0],
    icon: category?.icon || CATEGORY_ICONS[0],
    parentId: category?.parentId || defaultParentId || '',
  };
}

/**
 * Check if a category is a descendant of another category
 */
function isDescendant(
  categories: Category[],
  categoryId: string,
  potentialAncestorId: string
): boolean {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  let current = categoryMap.get(categoryId);
  while (current?.parentId) {
    if (current.parentId === potentialAncestorId) {
      return true;
    }
    current = categoryMap.get(current.parentId);
  }
  return false;
}

// =============================================================================
// Component Implementation
// =============================================================================

export function CategoryForm({
  category,
  categories = [],
  isOpen,
  onClose,
  onSave,
  isLoading = false,
  defaultParentId,
  defaultType,
}: CategoryFormProps) {
  const isEditMode = !!category;
  const isSubcategoryMode = !!defaultParentId;
  const [formData, setFormData] = useState<FormData>(() =>
    getInitialFormData(category, defaultParentId, defaultType)
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [activeSection, setActiveSection] = useState<'details' | 'appearance'>('details');

  // Reset form when category changes or when opening in subcategory mode
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData(category, defaultParentId, defaultType));
      setErrors({});
      setActiveSection('details');
    }
  }, [category, isOpen, defaultParentId, defaultType]);

  // Filter parent options: same type, not self, not descendants
  const parentOptions = useMemo(() => {
    return categories.filter((cat) => {
      // Must be same type
      if (cat.type !== formData.type) return false;
      // Cannot be self
      if (category && cat.id === category.id) return false;
      // Cannot be a descendant of the category being edited
      if (category && isDescendant(categories, cat.id, category.id)) return false;
      // Only show root-level categories as potential parents
      // (to limit hierarchy depth to 2 levels)
      if (cat.parentId) return false;
      return true;
    });
  }, [categories, formData.type, category]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be 100 characters or less';
    }

    if (!isEditMode && !formData.type) {
      newErrors.type = 'Type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isEditMode]);

  // Handle field change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    // Reset parentId if type changes
    if (name === 'type') {
      setFormData((prev) => ({ ...prev, parentId: '' }));
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (isEditMode) {
        // Update mode
        const updateData: UpdateCategoryData = {};
        if (formData.name !== category?.name) {
          updateData.name = formData.name.trim();
          updateData.slug = generateSlug(formData.name);
        }
        if (formData.description !== (category?.description || '')) {
          updateData.description = formData.description.trim() || undefined;
        }
        if (formData.color !== category?.color) {
          updateData.color = formData.color;
        }
        if (formData.icon !== category?.icon) {
          updateData.icon = formData.icon;
        }
        if (formData.parentId !== (category?.parentId || '')) {
          updateData.parentId = formData.parentId || null;
        }
        await onSave(updateData);
      } else {
        // Create mode
        const createData: CreateCategoryData = {
          name: formData.name.trim(),
          slug: generateSlug(formData.name),
          type: formData.type,
          color: formData.color,
          icon: formData.icon,
        };
        if (formData.description.trim()) {
          createData.description = formData.description.trim();
        }
        if (formData.parentId) {
          createData.parentId = formData.parentId;
        }
        await onSave(createData);
      }
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : 'Failed to save category',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Category' : isSubcategoryMode ? 'Add Subcategory' : 'Create Category'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100
                disabled:opacity-50 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Section Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveSection('details')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors
                ${activeSection === 'details'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('appearance')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors
                ${activeSection === 'appearance'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Appearance
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* General Error */}
              {errors.general && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{errors.general}</span>
                </div>
              )}

              {/* Details Section */}
              {activeSection === 'details' && (
                <>
                  {/* Name */}
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g., Groceries"
                      disabled={isLoading}
                      className={`w-full border rounded-lg px-3 py-2
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        disabled:bg-gray-100 disabled:opacity-50
                        ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  {/* Type (only for create mode, hidden in subcategory mode) */}
                  {!isEditMode && !isSubcategoryMode && (
                    <div>
                      <label
                        htmlFor="type"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        disabled={isLoading}
                        className={`w-full border rounded-lg px-3 py-2
                          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                          disabled:bg-gray-100 disabled:opacity-50
                          ${errors.type ? 'border-red-500' : 'border-gray-300'}`}
                      >
                        <option value="EXPENSE">Expense</option>
                        <option value="INCOME">Income</option>
                      </select>
                      {errors.type && (
                        <p className="mt-1 text-sm text-red-600">{errors.type}</p>
                      )}
                    </div>
                  )}

                  {/* Parent Category (hidden in subcategory mode) */}
                  {!isSubcategoryMode && (
                    <div>
                      <label
                        htmlFor="parentId"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Parent Category
                      </label>
                      <select
                        id="parentId"
                        name="parentId"
                        value={formData.parentId}
                        onChange={handleChange}
                        disabled={isLoading || parentOptions.length === 0}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2
                          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                          disabled:bg-gray-100 disabled:opacity-50"
                      >
                        <option value="">None (Top-level category)</option>
                        {parentOptions.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      {parentOptions.length === 0 && !isEditMode && (
                        <p className="mt-1 text-xs text-gray-500">
                          No parent categories available for this type
                        </p>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Optional description..."
                      rows={3}
                      disabled={isLoading}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        disabled:bg-gray-100 disabled:opacity-50 resize-none"
                    />
                  </div>
                </>
              )}

              {/* Appearance Section */}
              {activeSection === 'appearance' && (
                <>
                  {/* Color Picker */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color
                    </label>
                    <ColorPicker
                      value={formData.color}
                      onChange={(color) =>
                        setFormData((prev) => ({ ...prev, color }))
                      }
                      disabled={isLoading}
                    />
                  </div>

                  {/* Icon Picker */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icon
                    </label>
                    <IconPicker
                      value={formData.icon}
                      onChange={(icon) =>
                        setFormData((prev) => ({ ...prev, icon }))
                      }
                      disabled={isLoading}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700
                  hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                  hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditMode ? 'Save Changes' : isSubcategoryMode ? 'Add Subcategory' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CategoryForm;
