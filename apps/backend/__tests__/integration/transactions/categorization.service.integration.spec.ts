import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CategorizationService, CategorizationInput } from '../../../src/transactions/services/categorization.service';
import { PrismaService } from '../../../src/core/database/prisma/prisma.service';
import { CategoryType, CategoryStatus } from '../../../generated/prisma';
import { CategoryFactory } from '../../utils/factories';
import { getTestDbConfig } from '../../../test/test-utils';

/**
 * Categorization Service Integration Tests
 *
 * Coverage Target: 80%+ (lines, statements, functions, branches)
 * Test Strategy: Integration tests with real Prisma operations
 *
 * Test Scenarios:
 * 1. Initialize - Load category rules into cache
 * 2. Categorize via SaltEdge enrichment matching
 * 3. Categorize via exact merchant matching
 * 4. Categorize via partial merchant matching
 * 5. Categorize via keyword matching
 * 6. Fallback to uncategorized
 * 7. Bulk categorization
 * 8. Learn from user choices
 * 9. Cache refresh
 */

describe('CategorizationService (Integration)', () => {
  let service: CategorizationService;
  let prisma: PrismaService;
  let testFamilyId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [getTestDbConfig],
        }),
      ],
      providers: [CategorizationService, PrismaService],
    }).compile();

    service = module.get<CategorizationService>(CategorizationService);
    prisma = module.get<PrismaService>(PrismaService);

    await prisma.$connect();
  });

  beforeEach(async () => {
    // Generate unique family ID for isolation
    testFamilyId = `test-family-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Clean up any existing test data
    await prisma.category.deleteMany({
      where: { familyId: { startsWith: 'test-family-' } },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.category.deleteMany({
      where: { familyId: { startsWith: 'test-family-' } },
    });

    await prisma.$disconnect();
  });

  describe('initialize', () => {
    it('should load category rules into cache', async () => {
      // Arrange: Create test categories with rules
      const categories = CategoryFactory.buildCategorySet(testFamilyId);

      for (const category of categories) {
        await prisma.category.create({ data: category });
      }

      // Act: Initialize service
      await service.initialize();

      // Assert: Verify cache is populated (indirect test via categorization)
      const input: CategorizationInput = {
        description: 'Whole Foods Market',
        merchantName: 'Whole Foods',
        type: 'DEBIT',
      };

      const result = await service.categorizeTransaction(input, testFamilyId);

      expect(result.categoryId).toBeTruthy();
      expect(result.matchedBy).toBe('merchant_exact');
    });

    it('should cache uncategorized category ID', async () => {
      // Arrange: Create uncategorized category
      const uncategorized = CategoryFactory.buildUncategorizedCategory(testFamilyId);
      await prisma.category.create({ data: uncategorized });

      // Act: Initialize service
      await service.initialize();

      // Assert: Verify uncategorized is cached (test via fallback)
      const input: CategorizationInput = {
        description: 'Unknown Transaction XYZ123',
        type: 'DEBIT',
      };

      const result = await service.categorizeTransaction(input, testFamilyId);

      expect(result.matchedBy).toBe('fallback');
      expect(result.categoryId).toBeTruthy();
    });

    it('should only load ACTIVE categories', async () => {
      // Arrange: Create active and inactive categories
      const activeCategory = CategoryFactory.buildGroceriesCategory(testFamilyId);
      const inactiveCategory = CategoryFactory.buildRestaurantsCategory(testFamilyId, {
        status: CategoryStatus.INACTIVE,
      });

      await prisma.category.createMany({ data: [activeCategory, inactiveCategory] });

      // Act: Initialize service
      await service.initialize();

      // Assert: Only active category should match
      const groceryInput: CategorizationInput = {
        description: 'Whole Foods',
        merchantName: 'Whole Foods',
        type: 'DEBIT',
      };

      const restaurantInput: CategorizationInput = {
        description: 'Starbucks Coffee',
        merchantName: 'Starbucks',
        type: 'DEBIT',
      };

      const groceryResult = await service.categorizeTransaction(groceryInput, testFamilyId);
      const restaurantResult = await service.categorizeTransaction(restaurantInput, testFamilyId);

      expect(groceryResult.matchedBy).toBe('merchant_exact');
      expect(restaurantResult.matchedBy).toBe('fallback'); // Inactive category shouldn't match
    });
  });

  describe('categorizeTransaction - SaltEdge Enrichment', () => {
    beforeEach(async () => {
      // Setup: Create categories
      const categories = CategoryFactory.buildCategorySet(testFamilyId);
      for (const category of categories) {
        await prisma.category.create({ data: category });
      }
      await service.initialize();
    });

    it('should match via SaltEdge category mapping - shopping', async () => {
      // Arrange: Input with SaltEdge category
      const input: CategorizationInput = {
        description: 'AMAZON.COM PURCHASE',
        metadata: {
          category: 'shopping', // SaltEdge category
        },
        type: 'DEBIT',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert: Should match via enrichment
      expect(result.matchedBy).toBe('enrichment');
      expect(result.confidence).toBe(85);
      expect(result.categoryId).toBeTruthy();
    });

    it('should match via SaltEdge category mapping - food_and_beverage', async () => {
      // Arrange: Input with food category
      const input: CategorizationInput = {
        description: 'KROGER SUPERMARKET',
        metadata: {
          category: 'food_and_beverage', // Maps to groceries
        },
        type: 'DEBIT',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert
      expect(result.matchedBy).toBe('enrichment');
      expect(result.confidence).toBe(85);
    });

    it('should match via SaltEdge category mapping - transportation', async () => {
      // Arrange: Input with transportation category
      const input: CategorizationInput = {
        description: 'SHELL GAS STATION',
        metadata: {
          category: 'transportation',
        },
        type: 'DEBIT',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert
      expect(result.matchedBy).toBe('enrichment');
      expect(result.confidence).toBe(85);
    });

    it('should match via SaltEdge category mapping - income', async () => {
      // Arrange: Income transaction
      const input: CategorizationInput = {
        description: 'PAYROLL DEPOSIT',
        metadata: {
          category: 'income',
        },
        type: 'CREDIT',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert
      expect(result.matchedBy).toBe('enrichment');
      expect(result.confidence).toBe(85);
    });

    it('should skip enrichment if SaltEdge category not mapped', async () => {
      // Arrange: Unknown SaltEdge category
      const input: CategorizationInput = {
        description: 'UNKNOWN TRANSACTION',
        metadata: {
          category: 'unknown_category_xyz',
        },
        type: 'DEBIT',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert: Should fall through to other strategies
      expect(result.matchedBy).not.toBe('enrichment');
    });
  });

  describe('categorizeTransaction - Merchant Exact Match', () => {
    beforeEach(async () => {
      const categories = CategoryFactory.buildCategorySet(testFamilyId);
      for (const category of categories) {
        await prisma.category.create({ data: category });
      }
      await service.initialize();
    });

    it('should match via exact merchant name (case-insensitive)', async () => {
      // Arrange: Exact match for Whole Foods
      const input: CategorizationInput = {
        description: 'POS Purchase',
        merchantName: 'WHOLE FOODS', // Case insensitive
        type: 'DEBIT',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert
      expect(result.matchedBy).toBe('merchant_exact');
      expect(result.confidence).toBe(90);
    });

    it('should match via merchant_name in metadata.extra', async () => {
      // Arrange: Merchant name in enrichment data
      const input: CategorizationInput = {
        description: 'TRANSACTION',
        metadata: {
          extra: {
            merchant_name: 'starbucks',
          },
        },
        type: 'DEBIT',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert
      expect(result.matchedBy).toBe('merchant_exact');
      expect(result.confidence).toBe(90);
    });

    it('should only match categories of correct type (DEBIT → EXPENSE)', async () => {
      // Arrange: DEBIT transaction should match EXPENSE category
      const input: CategorizationInput = {
        description: 'Purchase',
        merchantName: 'amazon', // Shopping (EXPENSE)
        type: 'DEBIT',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert
      expect(result.matchedBy).toBe('merchant_exact');
      const category = await prisma.category.findUnique({
        where: { id: result.categoryId! },
      });
      expect(category?.type).toBe(CategoryType.EXPENSE);
    });

    it('should only match categories of correct type (CREDIT → INCOME)', async () => {
      // Arrange: CREDIT transaction should match INCOME category
      const input: CategorizationInput = {
        description: 'Deposit',
        merchantName: 'adp', // Salary (INCOME)
        type: 'CREDIT',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert
      expect(result.matchedBy).toBe('merchant_exact');
      const category = await prisma.category.findUnique({
        where: { id: result.categoryId! },
      });
      expect(category?.type).toBe(CategoryType.INCOME);
    });

    it('should verify category belongs to correct family', async () => {
      // Arrange: Different family
      const otherFamilyId = `test-family-other-${Date.now()}`;
      const otherFamilyCategory = CategoryFactory.buildGroceriesCategory(otherFamilyId);
      await prisma.category.create({ data: otherFamilyCategory });

      const input: CategorizationInput = {
        description: 'Purchase',
        merchantName: 'whole foods',
        type: 'DEBIT',
      };

      // Act: Try to categorize with original family ID
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert: Should match own family's groceries category
      const category = await prisma.category.findUnique({
        where: { id: result.categoryId! },
      });
      expect(category?.familyId).toBe(testFamilyId);
    });
  });

  describe('categorizeTransaction - Merchant Partial Match', () => {
    beforeEach(async () => {
      const categories = CategoryFactory.buildCategorySet(testFamilyId);
      for (const category of categories) {
        await prisma.category.create({ data: category });
      }
      await service.initialize();
    });

    it('should match when merchant name contains pattern', async () => {
      // Arrange: Partial match
      const input: CategorizationInput = {
        description: 'Transaction',
        merchantName: 'THE SHELL GAS STATION #12345',
        type: 'DEBIT',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert
      expect(result.matchedBy).toBe('merchant_partial');
      expect(result.confidence).toBe(75);
    });

    it('should match when pattern contains merchant name', async () => {
      // Arrange: Pattern is broader than merchant name
      const input: CategorizationInput = {
        description: 'Transaction',
        merchantName: 'target', // Pattern is 'target' in shopping category
        type: 'DEBIT',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert
      expect(['merchant_exact', 'merchant_partial']).toContain(result.matchedBy);
      expect(result.categoryId).toBeTruthy();
    });

    it('should prefer exact match over partial match', async () => {
      // Arrange: Input that could match both
      const input: CategorizationInput = {
        description: 'Purchase',
        merchantName: 'amazon', // Exact match for Shopping category
        type: 'DEBIT',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert: Exact match should win (higher priority)
      expect(result.matchedBy).toBe('merchant_exact');
      expect(result.confidence).toBe(90);
    });
  });

  describe('categorizeTransaction - Keyword Match', () => {
    beforeEach(async () => {
      const categories = CategoryFactory.buildCategorySet(testFamilyId);
      for (const category of categories) {
        await prisma.category.create({ data: category });
      }
      await service.initialize();
    });

    it('should match via keyword in description', async () => {
      // Arrange: Description contains keyword
      const input: CategorizationInput = {
        description: 'GROCERY STORE PURCHASE #12345',
        type: 'DEBIT',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert
      expect(result.matchedBy).toBe('keyword');
      expect(result.confidence).toBe(60);
    });

    it('should match keywords case-insensitively', async () => {
      // Arrange: Uppercase keywords
      const input: CategorizationInput = {
        description: 'UBER TRIP TO AIRPORT',
        type: 'DEBIT',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert
      expect(result.matchedBy).toBe('keyword');
      expect(result.confidence).toBe(60);
    });

    it('should respect category type when matching keywords', async () => {
      // Arrange: Keyword in INCOME category
      const input: CategorizationInput = {
        description: 'PAYROLL DIRECT DEPOSIT',
        type: 'CREDIT', // Income transaction
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert
      expect(result.matchedBy).toBe('keyword');
      const category = await prisma.category.findUnique({
        where: { id: result.categoryId! },
      });
      expect(category?.type).toBe(CategoryType.INCOME);
    });
  });

  describe('categorizeTransaction - Fallback', () => {
    beforeEach(async () => {
      const categories = CategoryFactory.buildCategorySet(testFamilyId);
      for (const category of categories) {
        await prisma.category.create({ data: category });
      }
      await service.initialize();
    });

    it('should fallback to uncategorized when no match found', async () => {
      // Arrange: Unrecognizable transaction
      const input: CategorizationInput = {
        description: 'UNKNOWN VENDOR XYZ987654',
        type: 'DEBIT',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert
      expect(result.matchedBy).toBe('fallback');
      expect(result.confidence).toBe(0);
      expect(result.categoryId).toBeTruthy();

      const category = await prisma.category.findUnique({
        where: { id: result.categoryId! },
      });
      expect(category?.slug).toBe('uncategorized');
    });

    it('should return null categoryId if uncategorized category does not exist', async () => {
      // Arrange: Delete uncategorized category
      await prisma.category.deleteMany({
        where: { slug: 'uncategorized', familyId: testFamilyId },
      });
      await service.initialize();

      const input: CategorizationInput = {
        description: 'UNKNOWN TRANSACTION',
        type: 'DEBIT',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert
      expect(result.matchedBy).toBe('fallback');
      expect(result.categoryId).toBeNull();
    });
  });

  describe('categorizeBulk', () => {
    beforeEach(async () => {
      const categories = CategoryFactory.buildCategorySet(testFamilyId);
      for (const category of categories) {
        await prisma.category.create({ data: category });
      }
      await service.initialize();
    });

    it('should categorize multiple transactions efficiently', async () => {
      // Arrange: Multiple transactions
      const inputs: CategorizationInput[] = [
        { description: 'Whole Foods', merchantName: 'Whole Foods', type: 'DEBIT' },
        { description: 'Starbucks', merchantName: 'Starbucks', type: 'DEBIT' },
        { description: 'Shell Gas', merchantName: 'Shell', type: 'DEBIT' },
        { description: 'Amazon Purchase', merchantName: 'Amazon', type: 'DEBIT' },
        { description: 'Payroll', metadata: { category: 'income' }, type: 'CREDIT' },
      ];

      // Act: Bulk categorize
      const results = await service.categorizeBulk(inputs, testFamilyId);

      // Assert: All categorized
      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.categoryId).toBeTruthy();
        expect(result.confidence).toBeGreaterThanOrEqual(0);
      });
    });

    it('should initialize cache if not already loaded', async () => {
      // Arrange: Create new service instance (no cache)
      const freshModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [getTestDbConfig],
          }),
        ],
        providers: [CategorizationService, PrismaService],
      }).compile();

      const freshService = freshModule.get<CategorizationService>(CategorizationService);

      const inputs: CategorizationInput[] = [
        { description: 'Whole Foods', merchantName: 'Whole Foods', type: 'DEBIT' },
      ];

      // Act: Categorize without manual initialization
      const results = await freshService.categorizeBulk(inputs, testFamilyId);

      // Assert: Should auto-initialize and categorize
      expect(results).toHaveLength(1);
      expect(results[0].categoryId).toBeTruthy();
    });

    it('should handle empty array', async () => {
      // Arrange: Empty input
      const inputs: CategorizationInput[] = [];

      // Act: Bulk categorize
      const results = await service.categorizeBulk(inputs, testFamilyId);

      // Assert
      expect(results).toHaveLength(0);
    });
  });

  describe('learnFromUserChoice', () => {
    let groceriesCategoryId: string;

    beforeEach(async () => {
      const categories = CategoryFactory.buildCategorySet(testFamilyId);
      for (const category of categories) {
        const created = await prisma.category.create({ data: category });
        if (category.slug === 'groceries') {
          groceriesCategoryId = created.id;
        }
      }
      await service.initialize();
    });

    it('should add merchant pattern to category rules', async () => {
      // Arrange: Initial category without "trader joe" pattern
      const initialCategory = await prisma.category.findUnique({
        where: { id: groceriesCategoryId },
      });

      expect(initialCategory?.rules).toBeTruthy();

      // Act: Learn from user choice
      await service.learnFromUserChoice(
        'transaction-uuid',
        groceriesCategoryId,
        'Trader Joes Market',
      );

      // Assert: Pattern added
      const updatedCategory = await prisma.category.findUnique({
        where: { id: groceriesCategoryId },
      });

      const rules = updatedCategory?.rules as any;
      expect(rules.merchantPatterns).toContain('trader joes market');
      expect(rules.autoAssign).toBe(true);
      expect(rules.confidence).toBe(90);
    });

    it('should update cache after learning', async () => {
      // Arrange: Learn new pattern
      await service.learnFromUserChoice(
        'transaction-uuid',
        groceriesCategoryId,
        'Aldi Supermarket',
      );

      // Act: Try to categorize transaction with new pattern
      const input: CategorizationInput = {
        description: 'Purchase',
        merchantName: 'Aldi Supermarket',
        type: 'DEBIT',
      };

      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert: New pattern should match
      expect(result.matchedBy).toBe('merchant_exact');
      expect(result.categoryId).toBe(groceriesCategoryId);
    });

    it('should not add duplicate merchant patterns', async () => {
      // Arrange: Add pattern twice
      await service.learnFromUserChoice(
        'transaction-uuid-1',
        groceriesCategoryId,
        'Whole Foods',
      );
      await service.learnFromUserChoice(
        'transaction-uuid-2',
        groceriesCategoryId,
        'whole foods', // Same, different case
      );

      // Assert: Pattern should only exist once
      const updatedCategory = await prisma.category.findUnique({
        where: { id: groceriesCategoryId },
      });

      const rules = updatedCategory?.rules as any;
      const wholeFoodsCount = rules.merchantPatterns.filter(
        (pattern: string) => pattern.toLowerCase() === 'whole foods',
      ).length;

      expect(wholeFoodsCount).toBe(1);
    });

    it('should handle null merchantName gracefully', async () => {
      // Act: Learn without merchant name
      await service.learnFromUserChoice('transaction-uuid', groceriesCategoryId, null);

      // Assert: Should not throw, category unchanged
      const category = await prisma.category.findUnique({
        where: { id: groceriesCategoryId },
      });

      expect(category).toBeTruthy();
    });

    it('should handle non-existent category gracefully', async () => {
      // Arrange: Non-existent category ID
      const fakeId = 'non-existent-uuid';

      // Act & Assert: Should not throw
      await expect(
        service.learnFromUserChoice('transaction-uuid', fakeId, 'Some Merchant'),
      ).resolves.not.toThrow();
    });

    it('should preserve existing rules when adding new pattern', async () => {
      // Arrange: Get initial rules
      const initialCategory = await prisma.category.findUnique({
        where: { id: groceriesCategoryId },
      });
      const initialRules = initialCategory?.rules as any;
      const initialKeywords = initialRules?.keywords || [];

      // Act: Add new merchant pattern
      await service.learnFromUserChoice(
        'transaction-uuid',
        groceriesCategoryId,
        'New Grocery Store',
      );

      // Assert: Existing keywords preserved
      const updatedCategory = await prisma.category.findUnique({
        where: { id: groceriesCategoryId },
      });
      const updatedRules = updatedCategory?.rules as any;

      expect(updatedRules.keywords).toEqual(initialKeywords);
    });
  });

  describe('refreshCache', () => {
    beforeEach(async () => {
      const categories = CategoryFactory.buildCategorySet(testFamilyId);
      for (const category of categories) {
        await prisma.category.create({ data: category });
      }
      await service.initialize();
    });

    it('should reload category rules from database', async () => {
      // Arrange: Manually add a new category directly to DB (bypassing service)
      const newCategory = CategoryFactory.buildWithRules(
        {
          keywords: ['test-keyword-refresh'],
          merchantPatterns: ['test-merchant-refresh'],
          autoAssign: true,
          confidence: 95,
        },
        {
          slug: 'test-refresh',
          name: 'Test Refresh Category',
          type: CategoryType.EXPENSE,
          familyId: testFamilyId,
          status: CategoryStatus.ACTIVE,
        },
      );
      await prisma.category.create({ data: newCategory });

      // Act: Refresh cache
      await service.refreshCache();

      // Assert: New category should now be used for categorization
      const input: CategorizationInput = {
        description: 'Transaction with test-keyword-refresh',
        type: 'DEBIT',
      };

      const result = await service.categorizeTransaction(input, testFamilyId);

      expect(result.matchedBy).toBe('keyword');
    });

    it('should remove deleted categories from cache', async () => {
      // Arrange: Get groceries category ID
      const groceriesCategory = await prisma.category.findFirst({
        where: { slug: 'groceries', familyId: testFamilyId },
      });

      expect(groceriesCategory).toBeTruthy();

      // Verify it matches before deletion
      const beforeInput: CategorizationInput = {
        description: 'Whole Foods Purchase',
        merchantName: 'Whole Foods',
        type: 'DEBIT',
      };
      const beforeResult = await service.categorizeTransaction(beforeInput, testFamilyId);
      expect(beforeResult.matchedBy).toBe('merchant_exact');

      // Delete category
      await prisma.category.delete({ where: { id: groceriesCategory!.id } });

      // Act: Refresh cache
      await service.refreshCache();

      // Assert: Should no longer match deleted category
      const afterResult = await service.categorizeTransaction(beforeInput, testFamilyId);
      expect(afterResult.matchedBy).not.toBe('merchant_exact');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      const categories = CategoryFactory.buildCategorySet(testFamilyId);
      for (const category of categories) {
        await prisma.category.create({ data: category });
      }
      await service.initialize();
    });

    it('should handle empty description', async () => {
      // Arrange: Empty description
      const input: CategorizationInput = {
        description: '',
        type: 'DEBIT',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert: Should fallback
      expect(result.matchedBy).toBe('fallback');
    });

    it('should handle missing type (defaults to DEBIT)', async () => {
      // Arrange: No type specified
      const input: CategorizationInput = {
        description: 'Amazon Purchase',
        merchantName: 'Amazon',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert: Should categorize as expense (DEBIT default)
      expect(result.categoryId).toBeTruthy();
      const category = await prisma.category.findUnique({
        where: { id: result.categoryId! },
      });
      expect(category?.type).toBe(CategoryType.EXPENSE);
    });

    it('should handle special characters in merchant name', async () => {
      // Arrange: Special characters
      const input: CategorizationInput = {
        description: 'Transaction',
        merchantName: "McDonald's Restaurant #1234 (USA)",
        type: 'DEBIT',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert: Should still categorize (partial match or fallback)
      expect(result.categoryId).toBeTruthy();
    });

    it('should handle very long descriptions', async () => {
      // Arrange: Very long description
      const longDescription = 'A'.repeat(1000) + ' grocery ' + 'B'.repeat(1000);
      const input: CategorizationInput = {
        description: longDescription,
        type: 'DEBIT',
      };

      // Act: Categorize
      const result = await service.categorizeTransaction(input, testFamilyId);

      // Assert: Should match via keyword despite length
      expect(result.matchedBy).toBe('keyword');
    });
  });
});
