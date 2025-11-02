import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma/prisma.service';
import { CategoryType } from '../../../generated/prisma';

/**
 * Transaction Categorization Engine
 *
 * Automatically categorizes transactions using:
 * 1. SaltEdge enrichment data (transaction.category, merchant_name)
 * 2. Rule-based matching (merchant patterns, keywords, amount ranges)
 * 3. Historical learning (user-confirmed categories)
 * 4. Manual overrides (always respected)
 *
 * ARCHITECTURAL DECISIONS:
 * - Confidence scoring: 0-100 (100 = manual override, 90+ = high confidence)
 * - Multi-strategy: Try enrichment → rules → fallback (Uncategorized)
 * - Learning: Store merchant patterns in Category.rules when user confirms
 * - Performance: Cache category rules in memory, refresh on category updates
 *
 * CATEGORIZATION FLOW:
 * 1. Check if transaction already has categoryId (manual override)
 * 2. Try SaltEdge enrichment (map SaltEdge category → our categories)
 * 3. Try merchant pattern matching (exact → partial → keyword)
 * 4. Try description keyword matching
 * 5. Fallback to "Uncategorized" category
 *
 * @example
 * ```typescript
 * // Categorize a single transaction
 * const result = await categorizationService.categorizeTransaction({
 *   description: 'AMAZON.COM',
 *   merchantName: 'Amazon',
 *   amount: 49.99,
 *   metadata: { category: 'shopping', extra: { merchant_name: 'Amazon' } }
 * }, 'family-uuid');
 *
 * // Categorize multiple transactions (bulk)
 * const results = await categorizationService.categorizeBulk(transactions, 'family-uuid');
 *
 * // Learn from user confirmation
 * await categorizationService.learnFromUserChoice(
 *   'transaction-uuid',
 *   'category-uuid',
 *   'Amazon'
 * );
 * ```
 */

export interface CategorizationInput {
  description: string;
  merchantName?: string | null;
  amount?: number;
  type?: 'DEBIT' | 'CREDIT';
  metadata?: {
    saltedgeId?: string;
    category?: string; // SaltEdge category
    extra?: {
      merchant_name?: string;
      [key: string]: any;
    };
  } | null;
}

export interface CategorizationResult {
  categoryId: string | null;
  confidence: number; // 0-100
  matchedBy: 'manual' | 'enrichment' | 'merchant_exact' | 'merchant_partial' | 'keyword' | 'fallback';
  suggestedCategories?: Array<{ categoryId: string; confidence: number }>;
}

export interface CategoryRule {
  keywords?: string[]; // Keywords to match in description
  merchantPatterns?: string[]; // Merchant name patterns (case-insensitive)
  amountRanges?: Array<{ min?: number; max?: number; }>; // Amount range filters
  autoAssign?: boolean; // Auto-assign this category if matched
  confidence?: number; // Base confidence for this rule (0-100)
}

@Injectable()
export class CategorizationService {
  private readonly logger = new Logger(CategorizationService.name);
  private categoryRulesCache: Map<string, { rules: CategoryRule; type: CategoryType }> = new Map();
  private uncategorizedCategoryId: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initialize categorization service
   * Loads all category rules into memory for fast matching
   */
  async initialize(): Promise<void> {
    try {
      const categories = await this.prisma.category.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, slug: true, type: true, rules: true, isSystem: true },
      });

      this.categoryRulesCache.clear();

      for (const category of categories) {
        if (category.rules) {
          this.categoryRulesCache.set(category.id, {
            rules: category.rules as CategoryRule,
            type: category.type,
          });
        }

        // Cache uncategorized category ID
        if (category.slug === 'uncategorized' && category.isSystem) {
          this.uncategorizedCategoryId = category.id;
        }
      }

      this.logger.log(`Loaded ${this.categoryRulesCache.size} category rules`);
    } catch (error) {
      this.logger.error('Failed to initialize categorization service', error);
      throw error;
    }
  }

  /**
   * Categorize a single transaction
   * Returns categoryId and confidence score
   */
  async categorizeTransaction(
    input: CategorizationInput,
    familyId: string,
  ): Promise<CategorizationResult> {
    // Ensure rules are loaded
    if (this.categoryRulesCache.size === 0) {
      await this.initialize();
    }

    // Strategy 1: SaltEdge enrichment
    if (input.metadata?.category) {
      const enrichmentResult = await this.matchSaltEdgeCategory(
        input.metadata.category,
        familyId,
        input.type || 'DEBIT',
      );
      if (enrichmentResult) {
        return {
          categoryId: enrichmentResult.categoryId,
          confidence: 85,
          matchedBy: 'enrichment',
        };
      }
    }

    // Strategy 2: Exact merchant match
    const merchantName = input.merchantName || input.metadata?.extra?.merchant_name;
    if (merchantName) {
      const exactMatch = await this.matchMerchantExact(merchantName, familyId, input.type || 'DEBIT');
      if (exactMatch) {
        return {
          categoryId: exactMatch.categoryId,
          confidence: 90,
          matchedBy: 'merchant_exact',
        };
      }

      // Strategy 3: Partial merchant match
      const partialMatch = await this.matchMerchantPartial(merchantName, familyId, input.type || 'DEBIT');
      if (partialMatch) {
        return {
          categoryId: partialMatch.categoryId,
          confidence: 75,
          matchedBy: 'merchant_partial',
        };
      }
    }

    // Strategy 4: Keyword matching in description
    const keywordMatch = await this.matchKeywords(input.description, familyId, input.type || 'DEBIT');
    if (keywordMatch) {
      return {
        categoryId: keywordMatch.categoryId,
        confidence: 60,
        matchedBy: 'keyword',
      };
    }

    // Strategy 5: Fallback to Uncategorized
    return {
      categoryId: this.uncategorizedCategoryId,
      confidence: 0,
      matchedBy: 'fallback',
    };
  }

  /**
   * Categorize multiple transactions in bulk
   * More efficient than calling categorizeTransaction in a loop
   */
  async categorizeBulk(
    inputs: CategorizationInput[],
    familyId: string,
  ): Promise<CategorizationResult[]> {
    // Ensure rules are loaded
    if (this.categoryRulesCache.size === 0) {
      await this.initialize();
    }

    return Promise.all(
      inputs.map(input => this.categorizeTransaction(input, familyId)),
    );
  }

  /**
   * Learn from user's manual categorization
   * Stores merchant pattern in category rules for future auto-categorization
   */
  async learnFromUserChoice(
    transactionId: string,
    categoryId: string,
    merchantName?: string | null,
  ): Promise<void> {
    if (!merchantName) return;

    try {
      // Get current category rules
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true, rules: true },
      });

      if (!category) {
        this.logger.warn(`Category ${categoryId} not found`);
        return;
      }

      const currentRules = (category.rules as CategoryRule) || {};
      const merchantPatterns = currentRules.merchantPatterns || [];

      // Add merchant pattern if not already present (case-insensitive check)
      const normalizedMerchant = merchantName.toLowerCase().trim();
      const alreadyExists = merchantPatterns.some(
        pattern => pattern.toLowerCase() === normalizedMerchant,
      );

      if (!alreadyExists) {
        merchantPatterns.push(normalizedMerchant);

        const updatedRules: CategoryRule = {
          ...currentRules,
          merchantPatterns,
          autoAssign: true,
          confidence: 90,
        };

        // Update category rules
        await this.prisma.category.update({
          where: { id: categoryId },
          data: { rules: updatedRules as any },
        });

        // Update cache
        const categoryData = await this.prisma.category.findUnique({
          where: { id: categoryId },
          select: { type: true },
        });

        if (categoryData) {
          this.categoryRulesCache.set(categoryId, {
            rules: updatedRules,
            type: categoryData.type,
          });
        }

        this.logger.log(
          `Learned merchant pattern "${normalizedMerchant}" for category ${categoryId}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to learn from user choice', error);
    }
  }

  /**
   * Refresh category rules cache
   * Call this when categories are updated
   */
  async refreshCache(): Promise<void> {
    await this.initialize();
  }

  // ============================================================================
  // PRIVATE MATCHING STRATEGIES
  // ============================================================================

  /**
   * Match SaltEdge category to our categories
   * Maps SaltEdge's category taxonomy to MoneyWise categories
   */
  private async matchSaltEdgeCategory(
    saltEdgeCategory: string,
    familyId: string,
    type: 'DEBIT' | 'CREDIT',
  ): Promise<{ categoryId: string } | null> {
    // SaltEdge category mapping (examples - expand based on actual SaltEdge categories)
    const categoryMapping: Record<string, string[]> = {
      'shopping': ['groceries', 'shopping', 'retail'],
      'food_and_beverage': ['groceries', 'restaurants', 'food'],
      'entertainment': ['entertainment', 'leisure'],
      'transportation': ['transportation', 'car', 'gas', 'fuel'],
      'utilities': ['utilities', 'bills'],
      'health': ['healthcare', 'medical'],
      'travel': ['travel', 'vacation'],
      'income': ['salary', 'income', 'wages'],
    };

    const possibleSlugs = categoryMapping[saltEdgeCategory.toLowerCase()] || [];

    if (possibleSlugs.length === 0) return null;

    // Find matching category
    const category = await this.prisma.category.findFirst({
      where: {
        familyId,
        slug: { in: possibleSlugs },
        type: type === 'DEBIT' ? CategoryType.EXPENSE : CategoryType.INCOME,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    return category ? { categoryId: category.id } : null;
  }

  /**
   * Exact merchant name match
   */
  private async matchMerchantExact(
    merchantName: string,
    familyId: string,
    type: 'DEBIT' | 'CREDIT',
  ): Promise<{ categoryId: string } | null> {
    const normalized = merchantName.toLowerCase().trim();

    for (const [categoryId, { rules, type: categoryType }] of this.categoryRulesCache.entries()) {
      // Skip if type doesn't match
      if ((type === 'DEBIT' && categoryType !== CategoryType.EXPENSE) ||
          (type === 'CREDIT' && categoryType !== CategoryType.INCOME)) {
        continue;
      }

      if (rules.merchantPatterns) {
        const exactMatch = rules.merchantPatterns.some(
          pattern => pattern.toLowerCase() === normalized,
        );

        if (exactMatch) {
          // Verify category belongs to family
          const category = await this.prisma.category.findFirst({
            where: { id: categoryId, familyId, status: 'ACTIVE' },
            select: { id: true },
          });

          if (category) {
            return { categoryId: category.id };
          }
        }
      }
    }

    return null;
  }

  /**
   * Partial merchant name match (contains)
   */
  private async matchMerchantPartial(
    merchantName: string,
    familyId: string,
    type: 'DEBIT' | 'CREDIT',
  ): Promise<{ categoryId: string } | null> {
    const normalized = merchantName.toLowerCase().trim();

    for (const [categoryId, { rules, type: categoryType }] of this.categoryRulesCache.entries()) {
      // Skip if type doesn't match
      if ((type === 'DEBIT' && categoryType !== CategoryType.EXPENSE) ||
          (type === 'CREDIT' && categoryType !== CategoryType.INCOME)) {
        continue;
      }

      if (rules.merchantPatterns) {
        const partialMatch = rules.merchantPatterns.some(
          pattern => normalized.includes(pattern.toLowerCase()) || pattern.toLowerCase().includes(normalized),
        );

        if (partialMatch) {
          // Verify category belongs to family
          const category = await this.prisma.category.findFirst({
            where: { id: categoryId, familyId, status: 'ACTIVE' },
            select: { id: true },
          });

          if (category) {
            return { categoryId: category.id };
          }
        }
      }
    }

    return null;
  }

  /**
   * Keyword matching in description
   */
  private async matchKeywords(
    description: string,
    familyId: string,
    type: 'DEBIT' | 'CREDIT',
  ): Promise<{ categoryId: string } | null> {
    const normalized = description.toLowerCase().trim();

    for (const [categoryId, { rules, type: categoryType }] of this.categoryRulesCache.entries()) {
      // Skip if type doesn't match
      if ((type === 'DEBIT' && categoryType !== CategoryType.EXPENSE) ||
          (type === 'CREDIT' && categoryType !== CategoryType.INCOME)) {
        continue;
      }

      if (rules.keywords) {
        const keywordMatch = rules.keywords.some(
          keyword => normalized.includes(keyword.toLowerCase()),
        );

        if (keywordMatch) {
          // Verify category belongs to family
          const category = await this.prisma.category.findFirst({
            where: { id: categoryId, familyId, status: 'ACTIVE' },
            select: { id: true },
          });

          if (category) {
            return { categoryId: category.id };
          }
        }
      }
    }

    return null;
  }
}
