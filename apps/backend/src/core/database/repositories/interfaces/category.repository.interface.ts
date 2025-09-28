/**
 * Category Repository Interface for MoneyWise Application
 * Extends base repository with Category-specific operations
 */

import { Category, CategoryType } from '../entities/category.entity';
import { IBaseRepository } from './base.repository.interface';

export interface ICategoryRepository extends IBaseRepository<Category> {
  /**
   * Find categories by user ID
   */
  findByUserId(userId: string): Promise<Category[]>;

  /**
   * Find categories by type
   */
  findByType(type: CategoryType, userId?: string): Promise<Category[]>;

  /**
   * Find root categories (no parent)
   */
  findRootCategories(userId: string): Promise<Category[]>;

  /**
   * Find child categories by parent ID
   */
  findByParentId(parentId: string): Promise<Category[]>;

  /**
   * Get full category tree for user
   */
  findCategoryTree(userId: string, parentId?: string, maxDepth?: number): Promise<Category[]>;

  /**
   * Find category by name and user
   */
  findByName(name: string, userId: string, parentId?: string): Promise<Category | null>;

  /**
   * Check if category name exists for user
   */
  isNameTaken(name: string, userId: string, parentId?: string, excludeCategoryId?: string): Promise<boolean>;

  /**
   * Get category with all descendants
   */
  findWithDescendants(categoryId: string): Promise<Category[]>;

  /**
   * Get category with parent hierarchy
   */
  findWithAncestors(categoryId: string): Promise<Category[]>;

  /**
   * Find categories with transaction count
   */
  findWithTransactionCounts(userId: string): Promise<(Category & { transactionCount: number })[]>;

  /**
   * Get spending by category for date range
   */
  getSpendingByCategory(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    category: Category;
    totalAmount: number;
    transactionCount: number;
  }[]>;

  /**
   * Find categories matching patterns for auto-categorization
   */
  findMatchingCategories(merchantName: string, description: string, userId: string): Promise<Category[]>;

  /**
   * Get category usage statistics
   */
  getCategoryUsageStats(userId: string): Promise<{
    categoryId: string;
    categoryName: string;
    usageCount: number;
    totalAmount: number;
    avgAmount: number;
    lastUsed: Date;
  }[]>;

  /**
   * Find unused categories
   */
  findUnusedCategories(userId: string, daysSinceLastUse?: number): Promise<Category[]>;

  /**
   * Update category hierarchy order
   */
  updateDisplayOrder(categoryId: string, newOrder: number): Promise<boolean>;

  /**
   * Move category to different parent
   */
  moveToParent(categoryId: string, newParentId: string | null): Promise<boolean>;

  /**
   * Merge categories (move all transactions from source to target)
   */
  mergeCategories(sourceId: string, targetId: string): Promise<boolean>;

  /**
   * Get category path (breadcrumb)
   */
  getCategoryPath(categoryId: string): Promise<string[]>;

  /**
   * Find categories by color
   */
  findByColor(color: string, userId: string): Promise<Category[]>;

  /**
   * Get most used categories for user
   */
  getMostUsedCategories(userId: string, limit?: number): Promise<Category[]>;
}