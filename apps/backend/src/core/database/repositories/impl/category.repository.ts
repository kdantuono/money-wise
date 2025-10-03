import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Category, CategoryType, CategoryStatus } from '../../entities';
import { ICategoryRepository } from '../interfaces/category-repository.interface';
import { BaseRepository } from './base.repository';

/**
 * Category repository implementation extending base repository with category-specific operations
 */
@Injectable()
export class CategoryRepository extends BaseRepository<Category> implements ICategoryRepository {
  constructor(dataSource: DataSource) {
    super(dataSource, Category);
  }

  async findBySlug(slug: string): Promise<Category | null> {
    try {
      this.logger.debug(`Finding category by slug: ${slug}`);

      const category = await this.repository.findOne({
        where: { slug },
      });

      this.logger.debug(`Found category by slug ${slug}: ${category ? 'success' : 'not found'}`);
      return category;
    } catch (error) {
      this.logger.error(`Error finding category by slug ${slug}:`, error);
      throw new Error(`Failed to find category by slug: ${error.message}`);
    }
  }

  async findByType(type: CategoryType, includeInactive = false): Promise<Category[]> {
    try {
      this.logger.debug(`Finding categories by type: ${type} (includeInactive: ${includeInactive})`);

      const queryBuilder = this.createQueryBuilder('category')
        .where('category.type = :type', { type })
        .orderBy('category.sortOrder', 'ASC')
        .addOrderBy('category.name', 'ASC');

      if (!includeInactive) {
        queryBuilder.andWhere('category.status = :activeStatus', { activeStatus: CategoryStatus.ACTIVE });
      }

      const categories = await queryBuilder.getMany();

      this.logger.debug(`Found ${categories.length} categories with type ${type}`);
      return categories;
    } catch (error) {
      this.logger.error(`Error finding categories by type ${type}:`, error);
      throw new Error(`Failed to find categories by type: ${error.message}`);
    }
  }

  async findByStatus(status: CategoryStatus): Promise<Category[]> {
    try {
      this.logger.debug(`Finding categories by status: ${status}`);

      const categories = await this.repository.find({
        where: { status },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });

      this.logger.debug(`Found ${categories.length} categories with status ${status}`);
      return categories;
    } catch (error) {
      this.logger.error(`Error finding categories by status ${status}:`, error);
      throw new Error(`Failed to find categories by status: ${error.message}`);
    }
  }

  async findRootCategories(type?: CategoryType): Promise<Category[]> {
    try {
      this.logger.debug(`Finding root categories (type: ${type})`);

      const queryBuilder = this.createQueryBuilder('category')
        .where('category.parentId IS NULL')
        .andWhere('category.status = :activeStatus', { activeStatus: CategoryStatus.ACTIVE })
        .orderBy('category.sortOrder', 'ASC')
        .addOrderBy('category.name', 'ASC');

      if (type) {
        queryBuilder.andWhere('category.type = :type', { type });
      }

      const categories = await queryBuilder.getMany();

      this.logger.debug(`Found ${categories.length} root categories`);
      return categories;
    } catch (error) {
      this.logger.error(`Error finding root categories:`, error);
      throw new Error(`Failed to find root categories: ${error.message}`);
    }
  }

  async findChildCategories(parentId: string, includeInactive = false): Promise<Category[]> {
    try {
      this.logger.debug(`Finding child categories for parent: ${parentId} (includeInactive: ${includeInactive})`);

      const queryBuilder = this.createQueryBuilder('category')
        .where('category.parentId = :parentId', { parentId })
        .orderBy('category.sortOrder', 'ASC')
        .addOrderBy('category.name', 'ASC');

      if (!includeInactive) {
        queryBuilder.andWhere('category.status = :activeStatus', { activeStatus: CategoryStatus.ACTIVE });
      }

      const categories = await queryBuilder.getMany();

      this.logger.debug(`Found ${categories.length} child categories for parent ${parentId}`);
      return categories;
    } catch (error) {
      this.logger.error(`Error finding child categories for parent ${parentId}:`, error);
      throw new Error(`Failed to find child categories: ${error.message}`);
    }
  }

  async findCategoryTree(parentId?: string, maxDepth = 10): Promise<Category[]> {
    try {
      this.logger.debug(`Finding category tree (parent: ${parentId}, maxDepth: ${maxDepth})`);

      // Use recursive CTE to get the category tree
      let query = `
        WITH RECURSIVE category_tree AS (
          -- Base case: start with root categories or specific parent
          SELECT
            id, name, slug, description, type, status, color, icon,
            "isDefault", "isSystem", "sortOrder", rules, metadata,
            "createdAt", "updatedAt", "parentId",
            0 as depth,
            ARRAY[id] as path
          FROM categories
          WHERE 1=1
      `;

      const params: Record<string, string> = {};

      if (parentId) {
        query += ` AND "parentId" = $1`;
        params.parentId = parentId;
      } else {
        query += ` AND "parentId" IS NULL`;
      }

      query += `
          AND status = 'active'

          UNION ALL

          -- Recursive case: find children
          SELECT
            c.id, c.name, c.slug, c.description, c.type, c.status, c.color, c.icon,
            c."isDefault", c."isSystem", c."sortOrder", c.rules, c.metadata,
            c."createdAt", c."updatedAt", c."parentId",
            ct.depth + 1,
            ct.path || c.id
          FROM categories c
          INNER JOIN category_tree ct ON c."parentId" = ct.id
          WHERE ct.depth < $${parentId ? '2' : '1'} AND c.status = 'active'
        )
        SELECT * FROM category_tree
        ORDER BY depth, "sortOrder", name
      `;

      const queryParams = parentId ? [parentId, maxDepth] : [maxDepth];
      const result = await this.manager.query(query, queryParams);

      // Convert raw results to Category entities
      const categories = result.map((row: Record<string, unknown>) => {
        const category = new Category();
        Object.assign(category, row);
        return category;
      });

      this.logger.debug(`Found ${categories.length} categories in tree`);
      return categories;
    } catch (error) {
      this.logger.error(`Error finding category tree:`, error);
      throw new Error(`Failed to find category tree: ${error.message}`);
    }
  }

  async findCategoriesWithRules(type?: CategoryType): Promise<Category[]> {
    try {
      this.logger.debug(`Finding categories with rules (type: ${type})`);

      const queryBuilder = this.createQueryBuilder('category')
        .where('category.rules IS NOT NULL')
        .andWhere('category.status = :activeStatus', { activeStatus: CategoryStatus.ACTIVE })
        .orderBy('category.sortOrder', 'ASC');

      if (type) {
        queryBuilder.andWhere('category.type = :type', { type });
      }

      const categories = await queryBuilder.getMany();

      this.logger.debug(`Found ${categories.length} categories with rules`);
      return categories;
    } catch (error) {
      this.logger.error(`Error finding categories with rules:`, error);
      throw new Error(`Failed to find categories with rules: ${error.message}`);
    }
  }

  async findDefaultCategories(type?: CategoryType): Promise<Category[]> {
    try {
      this.logger.debug(`Finding default categories (type: ${type})`);

      const queryBuilder = this.createQueryBuilder('category')
        .where('category.isDefault = true')
        .andWhere('category.status = :activeStatus', { activeStatus: CategoryStatus.ACTIVE })
        .orderBy('category.sortOrder', 'ASC');

      if (type) {
        queryBuilder.andWhere('category.type = :type', { type });
      }

      const categories = await queryBuilder.getMany();

      this.logger.debug(`Found ${categories.length} default categories`);
      return categories;
    } catch (error) {
      this.logger.error(`Error finding default categories:`, error);
      throw new Error(`Failed to find default categories: ${error.message}`);
    }
  }

  async findSystemCategories(type?: CategoryType): Promise<Category[]> {
    try {
      this.logger.debug(`Finding system categories (type: ${type})`);

      const queryBuilder = this.createQueryBuilder('category')
        .where('category.isSystem = true')
        .orderBy('category.sortOrder', 'ASC');

      if (type) {
        queryBuilder.andWhere('category.type = :type', { type });
      }

      const categories = await queryBuilder.getMany();

      this.logger.debug(`Found ${categories.length} system categories`);
      return categories;
    } catch (error) {
      this.logger.error(`Error finding system categories:`, error);
      throw new Error(`Failed to find system categories: ${error.message}`);
    }
  }

  async searchCategories(searchTerm: string, type?: CategoryType): Promise<Category[]> {
    try {
      this.logger.debug(`Searching categories: "${searchTerm}" (type: ${type})`);

      const queryBuilder = this.createQueryBuilder('category')
        .where('(LOWER(category.name) LIKE LOWER(:searchTerm) OR LOWER(category.description) LIKE LOWER(:searchTerm))',
               { searchTerm: `%${searchTerm}%` })
        .andWhere('category.status = :activeStatus', { activeStatus: CategoryStatus.ACTIVE })
        .orderBy('category.sortOrder', 'ASC')
        .addOrderBy('category.name', 'ASC');

      if (type) {
        queryBuilder.andWhere('category.type = :type', { type });
      }

      const categories = await queryBuilder.getMany();

      this.logger.debug(`Found ${categories.length} categories matching "${searchTerm}"`);
      return categories;
    } catch (error) {
      this.logger.error(`Error searching categories with term "${searchTerm}":`, error);
      throw new Error(`Failed to search categories: ${error.message}`);
    }
  }

  async isSlugAvailable(slug: string, excludeCategoryId?: string): Promise<boolean> {
    try {
      this.logger.debug(`Checking if slug is available: ${slug} (excluding: ${excludeCategoryId})`);

      const queryBuilder = this.createQueryBuilder('category')
        .where('category.slug = :slug', { slug });

      if (excludeCategoryId) {
        queryBuilder.andWhere('category.id != :excludeCategoryId', { excludeCategoryId });
      }

      const count = await queryBuilder.getCount();
      const isAvailable = count === 0;

      this.logger.debug(`Slug ${slug} is available: ${isAvailable}`);
      return isAvailable;
    } catch (error) {
      this.logger.error(`Error checking slug availability ${slug}:`, error);
      throw new Error(`Failed to check slug availability: ${error.message}`);
    }
  }

  async updateStatus(categoryId: string, status: CategoryStatus): Promise<Category | null> {
    try {
      this.logger.debug(`Updating status for category ${categoryId} to: ${status}`);

      await this.repository.update(categoryId, { status });
      const category = await this.findById(categoryId);

      this.logger.debug(`Updated status for category ${categoryId}: ${category ? 'success' : 'not found'}`);
      return category;
    } catch (error) {
      this.logger.error(`Error updating status for category ${categoryId}:`, error);
      throw new Error(`Failed to update category status: ${error.message}`);
    }
  }

  async moveCategory(categoryId: string, newParentId: string | null): Promise<Category | null> {
    try {
      this.logger.debug(`Moving category ${categoryId} to parent: ${newParentId}`);

      await this.repository.update(categoryId, { parentId: newParentId });
      const category = await this.findById(categoryId);

      this.logger.debug(`Moved category ${categoryId}: ${category ? 'success' : 'not found'}`);
      return category;
    } catch (error) {
      this.logger.error(`Error moving category ${categoryId}:`, error);
      throw new Error(`Failed to move category: ${error.message}`);
    }
  }

  async updateSortOrder(categoryId: string, sortOrder: number): Promise<Category | null> {
    try {
      this.logger.debug(`Updating sort order for category ${categoryId} to: ${sortOrder}`);

      await this.repository.update(categoryId, { sortOrder });
      const category = await this.findById(categoryId);

      this.logger.debug(`Updated sort order for category ${categoryId}: ${category ? 'success' : 'not found'}`);
      return category;
    } catch (error) {
      this.logger.error(`Error updating sort order for category ${categoryId}:`, error);
      throw new Error(`Failed to update category sort order: ${error.message}`);
    }
  }

  async getCategoryUsageStats(categoryId: string): Promise<{
    transactionCount: number;
    totalAmount: number;
    lastUsedAt: Date | null;
    monthlyUsage: Array<{ month: string; count: number; amount: number }>;
  }> {
    try {
      this.logger.debug(`Getting usage stats for category: ${categoryId}`);

      // Get basic stats
      const basicStats = await this.manager.query(`
        SELECT
          COUNT(*) as transaction_count,
          COALESCE(SUM(ABS(amount)), 0) as total_amount,
          MAX(date) as last_used_at
        FROM transactions
        WHERE "categoryId" = $1 AND status = 'posted'
      `, [categoryId]);

      // Get monthly usage for the last 12 months
      const monthlyStats = await this.manager.query(`
        SELECT
          TO_CHAR(date, 'YYYY-MM') as month,
          COUNT(*) as count,
          COALESCE(SUM(ABS(amount)), 0) as amount
        FROM transactions
        WHERE "categoryId" = $1
          AND status = 'posted'
          AND date >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(date, 'YYYY-MM')
        ORDER BY month DESC
      `, [categoryId]);

      const stats = {
        transactionCount: parseInt(basicStats[0]?.transaction_count || '0'),
        totalAmount: parseFloat(basicStats[0]?.total_amount || '0'),
        lastUsedAt: basicStats[0]?.last_used_at || null,
        monthlyUsage: monthlyStats.map((stat: { month: string; count: string; amount: string }) => ({
          month: stat.month,
          count: parseInt(stat.count),
          amount: parseFloat(stat.amount),
        })),
      };

      this.logger.debug(`Got usage stats for category ${categoryId}:`, stats);
      return stats;
    } catch (error) {
      this.logger.error(`Error getting usage stats for category ${categoryId}:`, error);
      throw new Error(`Failed to get category usage stats: ${error.message}`);
    }
  }

  async findMatchingCategories(merchantName?: string, description?: string, amount?: number): Promise<Category[]> {
    try {
      this.logger.debug(`Finding matching categories for auto-categorization`);

      // This is a simplified implementation. In practice, you'd want more sophisticated
      // matching logic based on the rules defined in each category
      const categories = await this.createQueryBuilder('category')
        .where('category.rules IS NOT NULL')
        .andWhere('category.status = :activeStatus', { activeStatus: CategoryStatus.ACTIVE })
        .getMany();

      const matchingCategories: Category[] = [];

      for (const category of categories) {
        if (!category.rules) continue;

        let score = 0;
        const rules = category.rules;

        // Check keyword matches
        if (rules.keywords && rules.keywords.length > 0 && (merchantName || description)) {
          const searchText = `${merchantName || ''} ${description || ''}`.toLowerCase();
          const keywordMatches = rules.keywords.filter(keyword =>
            searchText.includes(keyword.toLowerCase())
          );
          if (keywordMatches.length > 0) {
            score += keywordMatches.length * 10;
          }
        }

        // Check merchant pattern matches
        if (rules.merchantPatterns && rules.merchantPatterns.length > 0 && merchantName) {
          const merchantMatches = rules.merchantPatterns.filter(pattern => {
            try {
              const regex = new RegExp(pattern, 'i');
              return regex.test(merchantName);
            } catch {
              return merchantName.toLowerCase().includes(pattern.toLowerCase());
            }
          });
          if (merchantMatches.length > 0) {
            score += merchantMatches.length * 15;
          }
        }

        // Check amount ranges
        if (rules.amountRanges && rules.amountRanges.length > 0 && amount !== undefined) {
          const amountMatches = rules.amountRanges.some(range => {
            const min = range.min || 0;
            const max = range.max || Infinity;
            return amount >= min && amount <= max;
          });
          if (amountMatches) {
            score += 5;
          }
        }

        if (score > 0) {
          // Store score for sorting (simplified - in real implementation you'd want proper scoring)
          (category as Category & { _matchScore?: number })._matchScore = score;
          matchingCategories.push(category);
        }
      }

      // Sort by match score (highest first)
      matchingCategories.sort((a, b) =>
        ((b as Category & { _matchScore?: number })._matchScore || 0) -
        ((a as Category & { _matchScore?: number })._matchScore || 0)
      );

      this.logger.debug(`Found ${matchingCategories.length} matching categories`);
      return matchingCategories;
    } catch (error) {
      this.logger.error(`Error finding matching categories:`, error);
      throw new Error(`Failed to find matching categories: ${error.message}`);
    }
  }

  async archiveAndReassign(categoryId: string, newCategoryId: string): Promise<boolean> {
    try {
      this.logger.debug(`Archiving category ${categoryId} and reassigning to ${newCategoryId}`);

      await this.manager.transaction(async (transactionalEntityManager) => {
        // Update all transactions to use the new category
        await transactionalEntityManager.query(
          'UPDATE transactions SET "categoryId" = $1 WHERE "categoryId" = $2',
          [newCategoryId, categoryId]
        );

        // Archive the category
        await transactionalEntityManager.update(Category, categoryId, {
          status: CategoryStatus.ARCHIVED,
        });
      });

      this.logger.debug(`Archived category ${categoryId} and reassigned transactions`);
      return true;
    } catch (error) {
      this.logger.error(`Error archiving category ${categoryId}:`, error);
      throw new Error(`Failed to archive and reassign category: ${error.message}`);
    }
  }

  async createDefaultCategories(): Promise<Category[]> {
    try {
      this.logger.debug(`Creating default categories`);

      const defaultCategoriesData = Category.getDefaultCategories();
      const categories = await this.createBulk(defaultCategoriesData);

      this.logger.debug(`Created ${categories.length} default categories`);
      return categories;
    } catch (error) {
      this.logger.error(`Error creating default categories:`, error);
      throw new Error(`Failed to create default categories: ${error.message}`);
    }
  }

  async updateRules(categoryId: string, rules: Category['rules']): Promise<Category | null> {
    try {
      this.logger.debug(`Updating rules for category: ${categoryId}`);

      await this.repository.update(categoryId, { rules });
      const category = await this.findById(categoryId);

      this.logger.debug(`Updated rules for category ${categoryId}: ${category ? 'success' : 'not found'}`);
      return category;
    } catch (error) {
      this.logger.error(`Error updating rules for category ${categoryId}:`, error);
      throw new Error(`Failed to update category rules: ${error.message}`);
    }
  }

  async updateMetadata(categoryId: string, metadata: Category['metadata']): Promise<Category | null> {
    try {
      this.logger.debug(`Updating metadata for category: ${categoryId}`);

      await this.repository.update(categoryId, { metadata });
      const category = await this.findById(categoryId);

      this.logger.debug(`Updated metadata for category ${categoryId}: ${category ? 'success' : 'not found'}`);
      return category;
    } catch (error) {
      this.logger.error(`Error updating metadata for category ${categoryId}:`, error);
      throw new Error(`Failed to update category metadata: ${error.message}`);
    }
  }

  async reorderCategories(parentId: string | null, categoryIds: string[]): Promise<boolean> {
    try {
      this.logger.debug(`Reordering categories under parent ${parentId}: ${categoryIds.length} categories`);

      await this.manager.transaction(async (transactionalEntityManager) => {
        for (let i = 0; i < categoryIds.length; i++) {
          await transactionalEntityManager.update(Category, categoryIds[i], {
            sortOrder: i + 1,
            parentId,
          });
        }
      });

      this.logger.debug(`Reordered ${categoryIds.length} categories`);
      return true;
    } catch (error) {
      this.logger.error(`Error reordering categories:`, error);
      throw new Error(`Failed to reorder categories: ${error.message}`);
    }
  }
}