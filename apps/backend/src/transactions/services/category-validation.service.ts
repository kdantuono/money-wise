/**
 * Category Validation Service
 *
 * Service layer wrapper for category validation specifications.
 * Provides a clean interface for validating category assignments on transactions.
 *
 * Uses the Specification Pattern internally to compose validation rules:
 * 1. Category must exist (if provided)
 * 2. Category must belong to the user's family
 * 3. Category type must match the transaction's flow type
 *
 * @pattern Specification Pattern (Domain-Driven Design)
 */

import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma/prisma.service';
import { FlowType } from '../../../generated/prisma';
import {
  TransactionCategorySpecification,
  CategoryValidationCandidate,
} from '@/common/specifications/category-validation.specification';

/**
 * Input for category validation
 */
export interface ValidateCategoryInput {
  /** Category ID to validate (null/undefined = no category) */
  categoryId: string | null | undefined;
  /** Family ID the category must belong to */
  familyId: string;
  /** Transaction flow type for type matching */
  flowType?: FlowType | null;
}

/**
 * Category Validation Service
 *
 * Validates category assignments for transactions using the Specification Pattern.
 */
@Injectable()
export class CategoryValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate a category assignment for a transaction
   *
   * @param input - Validation input containing categoryId, familyId, and optional flowType
   * @throws BadRequestException - If category doesn't exist or type mismatch
   * @throws ForbiddenException - If category belongs to different family
   */
  async validateCategory(input: ValidateCategoryInput): Promise<void> {
    const { categoryId, familyId, flowType } = input;

    // Skip validation if no category provided
    if (categoryId === null || categoryId === undefined) {
      return;
    }

    // Build the validation candidate
    const candidate: CategoryValidationCandidate = {
      categoryId,
      familyId,
      flowType: flowType ?? undefined,
    };

    // Create the composite specification
    const specification = new TransactionCategorySpecification(this.prisma);

    // Run validation
    const result = await specification.isSatisfiedBy(candidate);

    // Handle validation failure
    if (!result.isSatisfied) {
      this.throwValidationError(result.errorCode, result.errorMessage);
    }
  }

  /**
   * Throw appropriate exception based on error code
   * @private
   */
  private throwValidationError(
    errorCode: string | undefined,
    errorMessage: string | undefined,
  ): never {
    const message = errorMessage || 'Category validation failed';

    switch (errorCode) {
      case 'CATEGORY_NOT_FOUND':
        throw new BadRequestException(message);
      case 'CATEGORY_WRONG_FAMILY':
        throw new ForbiddenException(message);
      case 'CATEGORY_TYPE_MISMATCH':
        throw new BadRequestException(message);
      case 'TRANSFER_CANNOT_HAVE_CATEGORY':
        throw new BadRequestException(message);
      case 'CATEGORY_NOT_LOADED':
        // Internal error - should not happen in normal flow
        throw new BadRequestException('Category validation error');
      default:
        throw new BadRequestException(message);
    }
  }
}
