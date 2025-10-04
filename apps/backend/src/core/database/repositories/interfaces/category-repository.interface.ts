import { Category, CategoryType, CategoryStatus } from '../../entities';
import { IBaseRepository } from './base-repository.interface';

/**
 * Category repository interface extending base repository with category-specific operations
 */
export interface ICategoryRepository extends IBaseRepository<Category> {
  /**
   * Find category by slug
   * @param slug - Category slug
   * @returns Promise<Category | null>
   */
  findBySlug(slug: string): Promise<Category | null>;

  /**
   * Find categories by type
   * @param type - Category type
   * @param includeInactive - Whether to include inactive categories
   * @returns Promise<Category[]>
   */
  findByType(type: CategoryType, includeInactive?: boolean): Promise<Category[]>;

  /**
   * Find categories by status
   * @param status - Category status
   * @returns Promise<Category[]>
   */
  findByStatus(status: CategoryStatus): Promise<Category[]>;

  /**
   * Find root categories (top-level categories without parent)
   * @param type - Optional category type filter
   * @returns Promise<Category[]>
   */
  findRootCategories(type?: CategoryType): Promise<Category[]>;

  /**
   * Find child categories by parent ID
   * @param parentId - Parent category ID
   * @param includeInactive - Whether to include inactive categories
   * @returns Promise<Category[]>
   */
  findChildCategories(parentId: string, includeInactive?: boolean): Promise<Category[]>;

  /**
   * Find category tree (parent with all descendants)
   * @param parentId - Parent category ID (optional, gets full tree if not provided)
   * @param maxDepth - Maximum depth to traverse
   * @returns Promise<Category[]>
   */
  findCategoryTree(parentId?: string, maxDepth?: number): Promise<Category[]>;

  /**
   * Find categories with rules for auto-categorization
   * @param type - Optional category type filter
   * @returns Promise<Category[]>
   */
  findCategoriesWithRules(type?: CategoryType): Promise<Category[]>;

  /**
   * Find default categories
   * @param type - Optional category type filter
   * @returns Promise<Category[]>
   */
  findDefaultCategories(type?: CategoryType): Promise<Category[]>;

  /**
   * Find system categories
   * @param type - Optional category type filter
   * @returns Promise<Category[]>
   */
  findSystemCategories(type?: CategoryType): Promise<Category[]>;

  /**
   * Search categories by name or description
   * @param searchTerm - Search term
   * @param type - Optional category type filter
   * @returns Promise<Category[]>
   */
  searchCategories(searchTerm: string, type?: CategoryType): Promise<Category[]>;

  /**
   * Check if slug is available
   * @param slug - Slug to check
   * @param excludeCategoryId - Category ID to exclude from check (for updates)
   * @returns Promise<boolean>
   */
  isSlugAvailable(slug: string, excludeCategoryId?: string): Promise<boolean>;

  /**
   * Update category status
   * @param categoryId - Category ID
   * @param status - New status
   * @returns Promise<Category | null>
   */
  updateStatus(categoryId: string, status: CategoryStatus): Promise<Category | null>;

  /**
   * Move category to new parent
   * @param categoryId - Category ID
   * @param newParentId - New parent ID (null for root level)
   * @returns Promise<Category | null>
   */
  moveCategory(categoryId: string, newParentId: string | null): Promise<Category | null>;

  /**
   * Update category sort order
   * @param categoryId - Category ID
   * @param sortOrder - New sort order
   * @returns Promise<Category | null>
   */
  updateSortOrder(categoryId: string, sortOrder: number): Promise<Category | null>;

  /**
   * Get category usage statistics
   * @param categoryId - Category ID
   * @returns Promise with usage stats
   */
  getCategoryUsageStats(categoryId: string): Promise<{
    transactionCount: number;
    totalAmount: number;
    lastUsedAt: Date | null;
    monthlyUsage: Array<{ month: string; count: number; amount: number }>;
  }>;

  /**
   * Find categories for auto-categorization matching
   * @param merchantName - Merchant name
   * @param description - Transaction description
   * @param amount - Transaction amount
   * @returns Promise<Category[]> - Ordered by confidence
   */
  findMatchingCategories(
    merchantName?: string,
    description?: string,
    amount?: number,
  ): Promise<Category[]>;

  /**
   * Archive category and reassign transactions
   * @param categoryId - Category ID
   * @param newCategoryId - New category ID for reassignment
   * @returns Promise<boolean>
   */
  archiveAndReassign(categoryId: string, newCategoryId: string): Promise<boolean>;

  /**
   * Create default categories for new users
   * @returns Promise<Category[]>
   */
  createDefaultCategories(): Promise<Category[]>;

  /**
   * Update category rules
   * @param categoryId - Category ID
   * @param rules - Category rules object
   * @returns Promise<Category | null>
   */
  updateRules(categoryId: string, rules: Category['rules']): Promise<Category | null>;

  /**
   * Update category metadata
   * @param categoryId - Category ID
   * @param metadata - Category metadata object
   * @returns Promise<Category | null>
   */
  updateMetadata(categoryId: string, metadata: Category['metadata']): Promise<Category | null>;

  /**
   * Reorder categories within parent
   * @param parentId - Parent category ID (null for root level)
   * @param categoryIds - Array of category IDs in new order
   * @returns Promise<boolean>
   */
  reorderCategories(parentId: string | null, categoryIds: string[]): Promise<boolean>;
}