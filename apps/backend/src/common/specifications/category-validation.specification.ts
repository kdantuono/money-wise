/**
 * Category Validation Specifications
 *
 * Implements the Specification Pattern for composable category validation rules.
 * These specifications can be used independently or combined using AND/OR/NOT operations.
 *
 * Specifications:
 * - CategoryExistsSpecification: Verifies category exists in database
 * - CategoryBelongsToFamilySpecification: Verifies category belongs to user's family
 * - CategoryTypeMatchesFlowTypeSpecification: Verifies category type matches transaction flow
 * - TransactionCategorySpecification: Composite specification for full validation
 *
 * @pattern Specification Pattern (Domain-Driven Design)
 * @see https://martinfowler.com/apsupp/spec.pdf
 */

import { PrismaService } from '@/core/database/prisma/prisma.service';
import { Category, CategoryType, FlowType } from '../../../generated/prisma';
import {
  Specification,
  SpecificationResult,
} from './specification.interface';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Candidate object for category validation
 * Contains all data needed to validate a category assignment
 */
export interface CategoryValidationCandidate {
  /** Category ID to validate (null/undefined = no category) */
  categoryId: string | null | undefined;
  /** Family ID the category must belong to */
  familyId: string;
  /** Transaction flow type for type matching */
  flowType?: FlowType;
  /** Cached category from database (populated by CategoryExistsSpecification) */
  category?: Category;
}

// =============================================================================
// CategoryExistsSpecification
// =============================================================================

/**
 * Specification that verifies a category exists in the database.
 *
 * - Returns satisfied if categoryId is null/undefined (optional category)
 * - Returns satisfied if category exists
 * - Returns not satisfied if category doesn't exist
 * - Caches the found category on the candidate for subsequent specifications
 */
export class CategoryExistsSpecification extends Specification<CategoryValidationCandidate> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isSatisfiedBy(candidate: CategoryValidationCandidate): Promise<SpecificationResult> {
    // Null/undefined categoryId means no category - this is valid
    if (candidate.categoryId === null || candidate.categoryId === undefined) {
      return { isSatisfied: true };
    }

    // Look up the category
    const category = await this.prisma.category.findUnique({
      where: { id: candidate.categoryId },
    });

    if (!category) {
      return {
        isSatisfied: false,
        errorMessage: `Category with ID '${candidate.categoryId}' does not exist`,
        errorCode: 'CATEGORY_NOT_FOUND',
      };
    }

    // Cache the category for subsequent specifications
    candidate.category = category;

    return { isSatisfied: true };
  }
}

// =============================================================================
// CategoryBelongsToFamilySpecification
// =============================================================================

/**
 * Specification that verifies a category belongs to the user's family.
 *
 * - Returns satisfied if categoryId is null/undefined
 * - Returns not satisfied if category is not loaded (must run CategoryExistsSpecification first)
 * - Returns satisfied if category's familyId matches the candidate's familyId
 * - Returns not satisfied if family IDs don't match
 */
export class CategoryBelongsToFamilySpecification extends Specification<CategoryValidationCandidate> {
  async isSatisfiedBy(candidate: CategoryValidationCandidate): Promise<SpecificationResult> {
    // Null/undefined categoryId means no category - this is valid
    if (candidate.categoryId === null || candidate.categoryId === undefined) {
      return { isSatisfied: true };
    }

    // Category must be loaded (from CategoryExistsSpecification)
    if (!candidate.category) {
      return {
        isSatisfied: false,
        errorMessage: 'Category was not loaded. Run CategoryExistsSpecification first.',
        errorCode: 'CATEGORY_NOT_LOADED',
      };
    }

    // Check family ownership
    if (candidate.category.familyId !== candidate.familyId) {
      return {
        isSatisfied: false,
        errorMessage: `Category '${candidate.category.name}' does not belong to your family`,
        errorCode: 'CATEGORY_WRONG_FAMILY',
      };
    }

    return { isSatisfied: true };
  }
}

// =============================================================================
// CategoryTypeMatchesFlowTypeSpecification
// =============================================================================

/**
 * Specification that verifies category type matches the transaction's flow type.
 *
 * Rules:
 * - TRANSFER: Cannot have a category (must be null)
 * - LIABILITY_PAYMENT: No category required
 * - EXPENSE: Can have EXPENSE category or null
 * - INCOME: Can have INCOME category or null
 * - REFUND: Can have EXPENSE category (refund for a purchase) or null
 */
export class CategoryTypeMatchesFlowTypeSpecification extends Specification<CategoryValidationCandidate> {
  async isSatisfiedBy(candidate: CategoryValidationCandidate): Promise<SpecificationResult> {
    const { categoryId, flowType, category } = candidate;

    // If no flowType provided, skip this check
    if (!flowType) {
      return { isSatisfied: true };
    }

    // TRANSFER cannot have a category
    if (flowType === FlowType.TRANSFER) {
      if (categoryId !== null && categoryId !== undefined) {
        return {
          isSatisfied: false,
          errorMessage: 'Transfer transactions cannot have a category assigned',
          errorCode: 'TRANSFER_CANNOT_HAVE_CATEGORY',
        };
      }
      return { isSatisfied: true };
    }

    // LIABILITY_PAYMENT doesn't require a category
    if (flowType === FlowType.LIABILITY_PAYMENT) {
      return { isSatisfied: true };
    }

    // If no category assigned, that's valid for EXPENSE/INCOME/REFUND
    if (categoryId === null || categoryId === undefined) {
      return { isSatisfied: true };
    }

    // Category must be loaded at this point
    if (!category) {
      return {
        isSatisfied: false,
        errorMessage: 'Category was not loaded. Run CategoryExistsSpecification first.',
        errorCode: 'CATEGORY_NOT_LOADED',
      };
    }

    // REFUND can use EXPENSE category (refund for a purchase)
    if (flowType === FlowType.REFUND) {
      if (category.type === CategoryType.EXPENSE) {
        return { isSatisfied: true };
      }
    }

    // Check type matching for EXPENSE and INCOME
    if (flowType === FlowType.EXPENSE && category.type !== CategoryType.EXPENSE) {
      return {
        isSatisfied: false,
        errorMessage: `Cannot use ${category.type} category for EXPENSE transaction`,
        errorCode: 'CATEGORY_TYPE_MISMATCH',
      };
    }

    if (flowType === FlowType.INCOME && category.type !== CategoryType.INCOME) {
      return {
        isSatisfied: false,
        errorMessage: `Cannot use ${category.type} category for INCOME transaction`,
        errorCode: 'CATEGORY_TYPE_MISMATCH',
      };
    }

    return { isSatisfied: true };
  }
}

// =============================================================================
// TransactionCategorySpecification (Composite)
// =============================================================================

/**
 * Composite specification that combines all category validation rules.
 *
 * Validation order (fail-fast):
 * 1. CategoryExistsSpecification - Verify category exists (and cache it)
 * 2. CategoryBelongsToFamilySpecification - Verify family ownership
 * 3. CategoryTypeMatchesFlowTypeSpecification - Verify type compatibility
 */
export class TransactionCategorySpecification extends Specification<CategoryValidationCandidate> {
  private readonly compositeSpec: Specification<CategoryValidationCandidate>;

  constructor(prisma: PrismaService) {
    super();

    // Build the composite specification using AND composition
    const existsSpec = new CategoryExistsSpecification(prisma);
    const belongsSpec = new CategoryBelongsToFamilySpecification();
    const typeMatchSpec = new CategoryTypeMatchesFlowTypeSpecification();

    // Chain specifications: exists AND belongs AND typeMatch
    this.compositeSpec = existsSpec.and(belongsSpec).and(typeMatchSpec) as Specification<CategoryValidationCandidate>;
  }

  async isSatisfiedBy(candidate: CategoryValidationCandidate): Promise<SpecificationResult> {
    return this.compositeSpec.isSatisfiedBy(candidate);
  }
}
