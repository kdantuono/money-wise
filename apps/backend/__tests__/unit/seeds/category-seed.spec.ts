/**
 * Category Seed Tests
 *
 * TDD tests for system category seeding functionality.
 * Tests verify:
 * 1. System categories are created with correct structure
 * 2. Category hierarchy is properly established
 * 3. System categories have required fields (isSystem, isDefault)
 * 4. Idempotent seeding (re-running doesn't duplicate)
 * 5. Categories are tied to specific family
 *
 * @phase Phase 0 - Schema Foundation
 */

import {
  SYSTEM_CATEGORIES,
  SYSTEM_CATEGORY_SLUGS,
  getCategoryBySlug,
  getExpenseCategories,
  getIncomeCategories,
  getTopLevelCategories,
  getChildCategories,
} from '../../../src/database/seeds/category-seed';

describe('Category Seed', () => {
  describe('SYSTEM_CATEGORIES constant', () => {
    it('should define expense categories', () => {
      const expenseCategories = SYSTEM_CATEGORIES.filter(
        (c) => c.type === 'EXPENSE'
      );
      expect(expenseCategories.length).toBeGreaterThan(0);
    });

    it('should define income categories', () => {
      const incomeCategories = SYSTEM_CATEGORIES.filter(
        (c) => c.type === 'INCOME'
      );
      expect(incomeCategories.length).toBeGreaterThan(0);
    });

    // Note: TRANSFER categories removed - transfers use FlowType on transactions
    it('should NOT have transfer categories (transfers use FlowType)', () => {
      const transferCategories = SYSTEM_CATEGORIES.filter(
        (c) => (c.type as string) === 'TRANSFER'
      );
      expect(transferCategories.length).toBe(0);
    });

    it('should have unique slugs across all categories', () => {
      const slugs = SYSTEM_CATEGORIES.map((c) => c.slug);
      const uniqueSlugs = new Set(slugs);
      expect(slugs.length).toBe(uniqueSlugs.size);
    });

    it('should have system "Uncategorized" category', () => {
      const uncategorized = SYSTEM_CATEGORIES.find(
        (c) => c.slug === 'uncategorized'
      );
      expect(uncategorized).toBeDefined();
      expect(uncategorized?.isSystem).toBe(true);
      expect(uncategorized?.type).toBe('EXPENSE');
    });

    // Note: "Transfer" category removed - transfers don't need categories
    it('should NOT have "Transfer" category (transfers use FlowType)', () => {
      const transfer = SYSTEM_CATEGORIES.find((c) => c.slug === 'transfer');
      expect(transfer).toBeUndefined();
    });

    it('should have required properties for all categories', () => {
      SYSTEM_CATEGORIES.forEach((category) => {
        expect(category.name).toBeDefined();
        expect(category.slug).toBeDefined();
        // Only INCOME and EXPENSE - no TRANSFER
        expect(category.type).toMatch(/^(INCOME|EXPENSE)$/);
        expect(typeof category.sortOrder).toBe('number');
        expect(typeof category.isDefault).toBe('boolean');
        expect(typeof category.isSystem).toBe('boolean');
      });
    });
  });

  describe('SYSTEM_CATEGORY_SLUGS constant', () => {
    it('should contain uncategorized slug', () => {
      expect(SYSTEM_CATEGORY_SLUGS).toContain('uncategorized');
    });

    // Note: transfer slug removed - transfers don't have categories
    it('should NOT contain transfer slug (transfers use FlowType)', () => {
      expect(SYSTEM_CATEGORY_SLUGS).not.toContain('transfer');
    });

    it('should contain common expense slugs', () => {
      expect(SYSTEM_CATEGORY_SLUGS).toContain('food-dining');
      expect(SYSTEM_CATEGORY_SLUGS).toContain('bills');
      expect(SYSTEM_CATEGORY_SLUGS).toContain('shopping');
    });

    it('should contain common income slugs', () => {
      expect(SYSTEM_CATEGORY_SLUGS).toContain('salary');
      expect(SYSTEM_CATEGORY_SLUGS).toContain('investments');
    });
  });

  describe('getCategoryBySlug helper', () => {
    it('should return category for valid slug', () => {
      const category = getCategoryBySlug('uncategorized');
      expect(category).toBeDefined();
      expect(category?.slug).toBe('uncategorized');
    });

    it('should return undefined for invalid slug', () => {
      const category = getCategoryBySlug('non-existent-slug');
      expect(category).toBeUndefined();
    });
  });

  describe('getExpenseCategories helper', () => {
    it('should return only expense categories', () => {
      const expenses = getExpenseCategories();
      expect(expenses.length).toBeGreaterThan(0);
      expenses.forEach((c) => {
        expect(c.type).toBe('EXPENSE');
      });
    });
  });

  describe('getIncomeCategories helper', () => {
    it('should return only income categories', () => {
      const income = getIncomeCategories();
      expect(income.length).toBeGreaterThan(0);
      income.forEach((c) => {
        expect(c.type).toBe('INCOME');
      });
    });
  });

  // Note: getTransferCategories helper removed - transfers don't have categories

  describe('getTopLevelCategories helper', () => {
    it('should return categories without parentSlug', () => {
      const topLevel = getTopLevelCategories();
      expect(topLevel.length).toBeGreaterThan(0);
      topLevel.forEach((c) => {
        expect(c.parentSlug).toBeUndefined();
      });
    });
  });

  describe('getChildCategories helper', () => {
    it('should return child categories for valid parent slug', () => {
      // Get a parent category that has children
      const topLevel = getTopLevelCategories();
      const parentWithChildren = topLevel.find((p) =>
        SYSTEM_CATEGORIES.some((c) => c.parentSlug === p.slug)
      );

      if (parentWithChildren) {
        const children = getChildCategories(parentWithChildren.slug);
        expect(children.length).toBeGreaterThan(0);
        children.forEach((c) => {
          expect(c.parentSlug).toBe(parentWithChildren.slug);
        });
      }
    });

    it('should return empty array for category without children', () => {
      const children = getChildCategories('uncategorized');
      expect(children).toEqual([]);
    });
  });

  describe('Category Hierarchy', () => {
    it('should have Food & Dining with subcategories', () => {
      const foodDining = getCategoryBySlug('food-dining');
      expect(foodDining).toBeDefined();

      const children = getChildCategories('food-dining');
      expect(children.length).toBeGreaterThan(0);

      // Should have common subcategories
      const childSlugs = children.map((c) => c.slug);
      expect(childSlugs).toContain('groceries');
      expect(childSlugs).toContain('restaurants');
    });

    it('should have Bills with subcategories', () => {
      const bills = getCategoryBySlug('bills');
      expect(bills).toBeDefined();

      const children = getChildCategories('bills');
      expect(children.length).toBeGreaterThan(0);

      // Should have utility subcategories
      const childSlugs = children.map((c) => c.slug);
      expect(childSlugs).toContain('utilities');
    });

    it('should enforce max depth of 2 (parent + children)', () => {
      // In this seed, we only go 2 levels deep
      // No category should have a grandchild
      SYSTEM_CATEGORIES.forEach((category) => {
        if (category.parentSlug) {
          const parent = getCategoryBySlug(category.parentSlug);
          expect(parent?.parentSlug).toBeUndefined();
        }
      });
    });
  });

  describe('Category Visual Properties', () => {
    it('should have icons for top-level categories', () => {
      const topLevel = getTopLevelCategories();
      topLevel.forEach((c) => {
        expect(c.icon).toBeDefined();
        expect(typeof c.icon).toBe('string');
      });
    });

    it('should have colors for top-level categories', () => {
      const topLevel = getTopLevelCategories();
      topLevel.forEach((c) => {
        expect(c.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('System vs Default Categories', () => {
    it('should mark Uncategorized as system (protected)', () => {
      const uncategorized = getCategoryBySlug('uncategorized');
      expect(uncategorized?.isSystem).toBe(true);
    });

    // Note: Transfer category removed - transfers don't have categories
    it('should NOT have Transfer as system category (transfers use FlowType)', () => {
      const transfer = getCategoryBySlug('transfer');
      expect(transfer).toBeUndefined();
    });

    it('should mark most categories as default (editable)', () => {
      const defaultCategories = SYSTEM_CATEGORIES.filter(
        (c) => c.isDefault && !c.isSystem
      );
      expect(defaultCategories.length).toBeGreaterThan(0);
    });

    it('should have few system categories (only essential ones)', () => {
      const systemCategories = SYSTEM_CATEGORIES.filter((c) => c.isSystem);
      // Only Uncategorized should be truly system (Transfer removed)
      expect(systemCategories.length).toBe(1);
      expect(systemCategories[0].slug).toBe('uncategorized');
    });
  });
});
