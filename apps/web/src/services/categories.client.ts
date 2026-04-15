/**
 * Categories Client — Supabase
 *
 * Direct Supabase queries replacing BFF fetch calls.
 * RLS policies handle family/user isolation automatically.
 *
 * @module services/categories.client
 *
 * @example
 * ```typescript
 * // Get all categories
 * const categories = await categoriesClient.getAll();
 *
 * // Get expense categories only
 * const expenses = await categoriesClient.getAll('EXPENSE');
 *
 * // Get a specific category
 * const category = await categoriesClient.getOne('category-id');
 * ```
 */

import { createClient } from '@/utils/supabase/client'
import type { Database, Json } from '@/utils/supabase/database.types'

type CategoryRow = Database['public']['Tables']['categories']['Row']
type CategoryInsert = Database['public']['Tables']['categories']['Insert']
type CategoryUpdate = Database['public']['Tables']['categories']['Update']

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Category type for filtering
 * Note: TRANSFER is handled via FlowType on transactions, not as a category type
 */
export type CategoryType = 'EXPENSE' | 'INCOME';

/**
 * Category status
 */
export type CategoryStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

/**
 * Category rule for auto-categorization
 */
export interface CategoryRule {
  keywords?: string[];
  merchantPatterns?: string[];
  autoAssign?: boolean;
  confidence?: number;
}

/**
 * Category metadata
 */
export interface CategoryMetadata {
  budgetEnabled?: boolean;
  monthlyLimit?: number;
  taxDeductible?: boolean;
}

/**
 * Category entity from API
 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: CategoryType;
  status: CategoryStatus;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
  isSystem: boolean;
  sortOrder: number;
  depth: number;
  parentId: string | null;
  familyId: string;
  rules: CategoryRule | null;
  metadata: CategoryMetadata | null;
  createdAt: string;
  updatedAt: string;
  children?: Category[];
  parent?: Category | null;
}

/**
 * Simplified category for dropdowns and selectors
 */
export interface CategoryOption {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  parentId: string | null;
  isSystem: boolean;
}

/**
 * Request data for creating a new category
 */
export interface CreateCategoryRequest {
  name: string;
  slug: string;
  type: CategoryType;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
  isDefault?: boolean;
  sortOrder?: number;
  rules?: CategoryRule;
  metadata?: CategoryMetadata;
}

/**
 * Request data for updating an existing category
 */
export interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string | null;
  status?: CategoryStatus;
  sortOrder?: number;
  rules?: CategoryRule;
  metadata?: CategoryMetadata;
}

/**
 * Spending data for a single category
 */
export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  icon: string | null;
  color: string | null;
  totalAmount: number;
  transactionCount: number;
}

/**
 * Spending summary response
 */
export interface CategorySpendingSummary {
  categories: CategorySpending[];
  totalSpending: number;
  startDate: string;
  endDate: string;
}

/**
 * HTTP error response structure
 */
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp?: string;
  path?: string;
}

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Base error class for categories API errors
 */
export class CategoriesApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'CategoriesApiError';
    Object.setPrototypeOf(this, CategoriesApiError.prototype);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends CategoriesApiError {
  constructor(message: string = 'Authentication failed. Please log in again.') {
    super(message, 401, 'AuthenticationError');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends CategoriesApiError {
  constructor(
    message: string = 'You do not have permission to perform this action.'
  ) {
    super(message, 403, 'AuthorizationError');
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends CategoriesApiError {
  constructor(message: string = 'Category not found.') {
    super(message, 404, 'NotFoundError');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends CategoriesApiError {
  constructor(message: string = 'Invalid request data.', details?: unknown) {
    super(message, 400, 'ValidationError', details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Server error (500)
 */
export class ServerError extends CategoriesApiError {
  constructor(
    message: string = 'Internal server error. Please try again later.'
  ) {
    super(message, 500, 'ServerError');
    this.name = 'ServerError';
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

// =============================================================================
// Row → Client Type Mapper
// =============================================================================

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    type: row.type as CategoryType,
    status: row.status as CategoryStatus,
    color: row.color,
    icon: row.icon,
    isDefault: row.is_default,
    isSystem: row.is_system,
    sortOrder: row.sort_order,
    depth: row.depth,
    parentId: row.parent_id,
    familyId: row.family_id,
    rules: row.rules as CategoryRule | null,
    metadata: row.metadata as CategoryMetadata | null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// =============================================================================
// Categories API Client
// =============================================================================

/**
 * Categories API Client
 *
 * Provides methods for interacting with categories via Supabase.
 * RLS policies handle family isolation automatically.
 */
export const categoriesClient = {
  /**
   * Get all categories for the user's family
   *
   * @param type - Optional filter by category type (EXPENSE, INCOME)
   * @returns List of categories
   * @throws {CategoriesApiError} If query fails
   *
   * @example
   * ```typescript
   * // Get all categories
   * const categories = await categoriesClient.getAll();
   *
   * // Get expense categories only
   * const expenses = await categoriesClient.getAll('EXPENSE');
   * ```
   */
  async getAll(type?: CategoryType): Promise<Category[]> {
    const supabase = createClient()
    let query = supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query
    if (error) throw new CategoriesApiError(error.message, 500)
    return (data ?? []).map(rowToCategory)
  },

  /**
   * Get a specific category by ID
   *
   * @param id - Category ID
   * @returns Category with optional children
   * @throws {NotFoundError} If category not found
   * @throws {CategoriesApiError} If query fails
   *
   * @example
   * ```typescript
   * const category = await categoriesClient.getOne('category-id');
   * console.log(`${category.name} (${category.type})`);
   * ```
   */
  async getOne(id: string): Promise<Category> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw new NotFoundError()
    const category = rowToCategory(data)

    // Fetch children for this category
    const { data: childRows } = await supabase
      .from('categories')
      .select('*')
      .eq('parent_id', id)
      .order('sort_order', { ascending: true })

    if (childRows && childRows.length > 0) {
      category.children = childRows.map(rowToCategory)
    }

    return category
  },

  /**
   * Get categories as options for dropdown/selector
   * Returns simplified category data sorted by type and name
   *
   * @param type - Optional filter by category type
   * @returns List of category options
   *
   * @example
   * ```typescript
   * const options = await categoriesClient.getOptions('EXPENSE');
   * // Use in a <select> or dropdown component
   * ```
   */
  async getOptions(type?: CategoryType): Promise<CategoryOption[]> {
    const categories = await this.getAll(type);

    // Filter to active categories only and map to options
    return categories
      .filter(cat => cat.status === 'ACTIVE')
      .sort((a, b) => {
        // Sort by type first (EXPENSE, INCOME)
        if (a.type !== b.type) {
          const typeOrder: Record<CategoryType, number> = { EXPENSE: 0, INCOME: 1 };
          return typeOrder[a.type] - typeOrder[b.type];
        }
        // Then by sortOrder
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        // Finally by name
        return a.name.localeCompare(b.name);
      })
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        parentId: cat.parentId,
        isSystem: cat.isSystem,
      }));
  },

  /**
   * Create a new category
   *
   * @param data - Category creation data
   * @returns Created category
   * @throws {AuthenticationError} If not authenticated
   * @throws {ValidationError} If data is invalid
   * @throws {CategoriesApiError} If query fails
   *
   * @example
   * ```typescript
   * const category = await categoriesClient.create({
   *   name: 'Groceries',
   *   slug: 'groceries',
   *   type: 'EXPENSE',
   *   color: '#22C55E',
   *   icon: 'ShoppingCart',
   * });
   * ```
   */
  async create(data: CreateCategoryRequest): Promise<Category> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AuthenticationError()

    // Look up the user's family_id from their profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new CategoriesApiError('Could not determine family. Profile not found.', 500)
    }

    // Determine depth based on parent
    let depth = 0
    if (data.parentId) {
      const { data: parent } = await supabase
        .from('categories')
        .select('depth')
        .eq('id', data.parentId)
        .single()
      if (parent) {
        depth = parent.depth + 1
      }
    }

    const insert: CategoryInsert = {
      name: data.name,
      slug: data.slug,
      type: data.type as Database['public']['Enums']['category_type'],
      description: data.description ?? null,
      color: data.color ?? null,
      icon: data.icon ?? null,
      parent_id: data.parentId ?? null,
      is_default: data.isDefault ?? false,
      sort_order: data.sortOrder ?? 0,
      rules: (data.rules ?? null) as Json,
      metadata: (data.metadata ?? null) as Json,
      family_id: profile.family_id,
      depth,
    }

    const { data: row, error } = await supabase
      .from('categories')
      .insert(insert)
      .select()
      .single()

    if (error) throw new CategoriesApiError(error.message, 400)
    return rowToCategory(row)
  },

  /**
   * Update an existing category
   *
   * @param id - Category ID to update
   * @param data - Category update data
   * @returns Updated category
   * @throws {NotFoundError} If category not found
   * @throws {ValidationError} If data is invalid
   * @throws {CategoriesApiError} If query fails
   *
   * @example
   * ```typescript
   * const category = await categoriesClient.update('category-id', {
   *   name: 'Food & Groceries',
   *   color: '#10B981',
   * });
   * ```
   */
  async update(id: string, data: UpdateCategoryRequest): Promise<Category> {
    const supabase = createClient()
    const update: CategoryUpdate = {}

    if (data.name !== undefined) update.name = data.name
    if (data.slug !== undefined) update.slug = data.slug
    if (data.description !== undefined) update.description = data.description ?? null
    if (data.color !== undefined) update.color = data.color ?? null
    if (data.icon !== undefined) update.icon = data.icon ?? null
    if (data.parentId !== undefined) update.parent_id = data.parentId
    if (data.status !== undefined) update.status = data.status as Database['public']['Enums']['category_status']
    if (data.sortOrder !== undefined) update.sort_order = data.sortOrder
    if (data.rules !== undefined) update.rules = (data.rules ?? null) as Json
    if (data.metadata !== undefined) update.metadata = (data.metadata ?? null) as Json

    const { data: row, error } = await supabase
      .from('categories')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new CategoriesApiError(error.message, 400)
    return rowToCategory(row)
  },

  /**
   * Delete a category
   *
   * @param id - Category ID to delete
   * @throws {CategoriesApiError} If query fails
   *
   * @example
   * ```typescript
   * await categoriesClient.delete('category-id');
   * ```
   */
  async delete(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) throw new CategoriesApiError(error.message, 400)
  },

  /**
   * Get spending aggregated by category for a date range
   * Uses the get_category_spending RPC for server-side aggregation.
   *
   * @param startDate - Start of date range (ISO format)
   * @param endDate - End of date range (ISO format)
   * @param parentOnly - Roll up child spending to parents (default: true)
   * @returns Spending summary with categories and totals
   * @throws {CategoriesApiError} If query fails
   *
   * @example
   * ```typescript
   * const spending = await categoriesClient.getSpending('2025-01-01', '2025-01-31');
   * console.log(`Total: $${spending.totalSpending}`);
   * ```
   */
  async getSpending(
    startDate: string,
    endDate: string,
    parentOnly: boolean = true
  ): Promise<CategorySpendingSummary> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('get_category_spending', {
      date_from: startDate,
      date_to: endDate,
      parent_only: parentOnly,
    })

    if (error) throw new CategoriesApiError(error.message, 500)

    const categories: CategorySpending[] = (data ?? []).map((row) => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      icon: row.category_icon,
      color: row.category_color,
      totalAmount: Number(row.total_amount),
      transactionCount: Number(row.transaction_count),
    }))

    const totalSpending = categories.reduce((sum, cat) => sum + cat.totalAmount, 0)

    return {
      categories,
      totalSpending,
      startDate,
      endDate,
    }
  },
};

// =============================================================================
// Exports
// =============================================================================

export default categoriesClient;
