import { faker } from '@faker-js/faker';
import { CategoryType, CategoryStatus } from '../../../generated/prisma';
import { CategoryRule } from '../../../src/common/types/domain-types';

/**
 * CategoryFactory - Test data factory for Category entities
 *
 * Purpose: Generate realistic category test data with rules for categorization testing
 * Pattern: Builder pattern with faker.js integration
 *
 * Usage:
 *   const category = CategoryFactory.build(); // Full entity
 *   const expense = CategoryFactory.buildExpenseCategory(); // Expense category
 *   const withRules = CategoryFactory.buildWithRules({ merchantPatterns: ['Amazon'] });
 */
export class CategoryFactory {
  /**
   * Build a complete Category entity (as returned from database)
   */
  static build(overrides: Partial<any> = {}): any {
    const slug = faker.helpers.slugify(faker.commerce.department()).toLowerCase();

    return {
      id: faker.string.uuid(),
      slug,
      name: faker.commerce.department(),
      type: CategoryType.EXPENSE,
      status: CategoryStatus.ACTIVE,
      icon: faker.helpers.arrayElement(['🛒', '🍔', '🚗', '🏠', '💼', '🎬', '✈️']),
      color: faker.internet.color(),
      description: faker.lorem.sentence(),
      isSystem: false,
      parentCategoryId: null,
      familyId: faker.string.uuid(),
      rules: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Build expense category
   */
  static buildExpenseCategory(overrides: Partial<any> = {}): any {
    return this.build({
      type: CategoryType.EXPENSE,
      name: faker.helpers.arrayElement(['Groceries', 'Restaurants', 'Transportation', 'Shopping', 'Utilities']),
      ...overrides,
    });
  }

  /**
   * Build income category
   */
  static buildIncomeCategory(overrides: Partial<any> = {}): any {
    return this.build({
      type: CategoryType.INCOME,
      name: faker.helpers.arrayElement(['Salary', 'Freelance', 'Investments', 'Gifts', 'Bonus']),
      ...overrides,
    });
  }

  /**
   * Build category with categorization rules
   */
  static buildWithRules(rules: Partial<CategoryRule>, overrides: Partial<any> = {}): any {
    const categoryRules: CategoryRule = {
      keywords: [],
      merchantPatterns: [],
      autoAssign: true,
      confidence: 90,
      ...rules,
    };

    return this.build({
      rules: categoryRules,
      ...overrides,
    });
  }

  /**
   * Build Groceries category with typical rules
   */
  static buildGroceriesCategory(familyId: string, overrides: Partial<any> = {}): any {
    return this.buildWithRules(
      {
        keywords: ['grocery', 'supermarket', 'food'],
        merchantPatterns: ['whole foods', 'kroger', 'safeway', 'trader joe'],
        autoAssign: true,
        confidence: 90,
      },
      {
        slug: 'groceries',
        name: 'Groceries',
        type: CategoryType.EXPENSE,
        familyId,
        status: CategoryStatus.ACTIVE,
        ...overrides,
      },
    );
  }

  /**
   * Build Restaurants category with typical rules
   */
  static buildRestaurantsCategory(familyId: string, overrides: Partial<any> = {}): any {
    return this.buildWithRules(
      {
        keywords: ['restaurant', 'cafe', 'bistro', 'dining'],
        merchantPatterns: ['mcdonalds', 'starbucks', 'chipotle', 'subway'],
        autoAssign: true,
        confidence: 85,
      },
      {
        slug: 'restaurants',
        name: 'Restaurants',
        type: CategoryType.EXPENSE,
        familyId,
        status: CategoryStatus.ACTIVE,
        ...overrides,
      },
    );
  }

  /**
   * Build Transportation category with typical rules
   */
  static buildTransportationCategory(familyId: string, overrides: Partial<any> = {}): any {
    return this.buildWithRules(
      {
        keywords: ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'parking'],
        merchantPatterns: ['shell', 'chevron', 'bp', 'exxon'],
        autoAssign: true,
        confidence: 90,
      },
      {
        slug: 'transportation',
        name: 'Transportation',
        type: CategoryType.EXPENSE,
        familyId,
        status: CategoryStatus.ACTIVE,
        ...overrides,
      },
    );
  }

  /**
   * Build Shopping category with typical rules
   */
  static buildShoppingCategory(familyId: string, overrides: Partial<any> = {}): any {
    return this.buildWithRules(
      {
        keywords: ['amazon', 'shopping', 'retail'],
        merchantPatterns: ['amazon', 'walmart', 'target', 'costco'],
        autoAssign: true,
        confidence: 80,
      },
      {
        slug: 'shopping',
        name: 'Shopping',
        type: CategoryType.EXPENSE,
        familyId,
        status: CategoryStatus.ACTIVE,
        ...overrides,
      },
    );
  }

  /**
   * Build Salary/Income category with typical rules
   */
  static buildSalaryCategory(familyId: string, overrides: Partial<any> = {}): any {
    return this.buildWithRules(
      {
        keywords: ['payroll', 'salary', 'wages', 'direct deposit'],
        merchantPatterns: ['adp', 'payroll'],
        autoAssign: true,
        confidence: 95,
      },
      {
        slug: 'salary',
        name: 'Salary',
        type: CategoryType.INCOME,
        familyId,
        status: CategoryStatus.ACTIVE,
        ...overrides,
      },
    );
  }

  /**
   * Build system Uncategorized category
   */
  static buildUncategorizedCategory(familyId: string, overrides: Partial<any> = {}): any {
    return this.build({
      slug: 'uncategorized',
      name: 'Uncategorized',
      type: CategoryType.EXPENSE,
      familyId,
      isSystem: true,
      status: CategoryStatus.ACTIVE,
      rules: null,
      ...overrides,
    });
  }

  /**
   * Build inactive category
   */
  static buildInactiveCategory(overrides: Partial<any> = {}): any {
    return this.build({
      status: CategoryStatus.INACTIVE,
      ...overrides,
    });
  }

  /**
   * Build parent category
   */
  static buildParentCategory(overrides: Partial<any> = {}): any {
    return this.build({
      parentCategoryId: null,
      ...overrides,
    });
  }

  /**
   * Build child category
   */
  static buildChildCategory(parentId: string, overrides: Partial<any> = {}): any {
    return this.build({
      parentCategoryId: parentId,
      ...overrides,
    });
  }

  /**
   * Build category for specific family
   */
  static buildForFamily(familyId: string, overrides: Partial<any> = {}): any {
    return this.build({
      familyId,
      ...overrides,
    });
  }

  /**
   * Build array of multiple categories
   */
  static buildMany(count: number, overrides: Partial<any> = {}): any[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  /**
   * Build complete category set for testing categorization engine
   */
  static buildCategorySet(familyId: string): any[] {
    return [
      this.buildGroceriesCategory(familyId),
      this.buildRestaurantsCategory(familyId),
      this.buildTransportationCategory(familyId),
      this.buildShoppingCategory(familyId),
      this.buildSalaryCategory(familyId),
      this.buildUncategorizedCategory(familyId),
    ];
  }
}
