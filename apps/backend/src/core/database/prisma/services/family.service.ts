import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Family, User, Account } from '../../../../../generated/prisma';
import { Prisma } from '../../../../../generated/prisma';
import { PrismaService } from '../prisma.service';
import { CreateFamilyDto } from '../dto/create-family.dto';
import { UpdateFamilyDto } from '../dto/update-family.dto';
import { validateUuid } from '../../../../common/validators';

/**
 * Options for loading relations with Family entity
 */
export interface RelationOptions {
  users?: boolean;
  accounts?: boolean;
  categories?: boolean;
  budgets?: boolean;
}

/**
 * Options for findAll query
 */
export interface FindAllOptions {
  skip?: number;
  take?: number;
  orderBy?: {
    createdAt?: 'asc' | 'desc';
    name?: 'asc' | 'desc';
  };
}

/**
 * Family entity with optional relations
 */
export interface FamilyWithRelations extends Family {
  users?: User[];
  accounts?: Account[];
  categories?: unknown[];
  budgets?: unknown[];
}

/**
 * PrismaFamilyService - Family entity CRUD operations with Prisma
 *
 * ARCHITECTURAL DECISIONS:
 * - Uses Prisma ORM for type-safe database operations
 * - Validates UUIDs at service layer (not database layer)
 * - Trims whitespace from all string inputs
 * - Explicit error handling with domain-specific exceptions
 * - Supports selective relation loading for performance
 * - Follows NestJS dependency injection patterns
 *
 * ERROR HANDLING:
 * - BadRequestException: Invalid input (empty name, invalid UUID format)
 * - NotFoundException: Entity not found (P2025 Prisma error)
 * - InternalServerErrorException: Unexpected database errors
 *
 * VALIDATION:
 * - Name: 1-255 characters after trimming, no whitespace-only
 * - UUID: Standard RFC 4122 format validation
 * - DTOs: class-validator decorators enforce types and constraints
 *
 * CASCADING:
 * - Family deletion cascades to: Users, Accounts, Categories, Budgets
 * - Defined in Prisma schema, no service-level logic needed
 *
 * @example
 * ```typescript
 * // Create family
 * const family = await familyService.create({ name: 'Smith Family' });
 *
 * // Find with relations
 * const familyWithUsers = await familyService.findOneWithRelations(
 *   family.id,
 *   { users: true, accounts: true }
 * );
 *
 * // Paginated list
 * const families = await familyService.findAll({
 *   skip: 0,
 *   take: 10,
 *   orderBy: { createdAt: 'desc' }
 * });
 * ```
 */
@Injectable()
export class PrismaFamilyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new Family
   *
   * VALIDATION:
   * - Trims whitespace from name
   * - Rejects empty or whitespace-only names
   * - Enforces 255 character limit
   *
   * PRISMA BEHAVIOR:
   * - Generates UUID automatically (default(uuid()) in schema)
   * - Sets createdAt and updatedAt timestamps automatically
   *
   * @param dto - CreateFamilyDto with validated name
   * @returns Created Family entity with timestamps
   * @throws BadRequestException if name is invalid
   * @throws InternalServerErrorException if database operation fails
   */
  async create(dto: CreateFamilyDto): Promise<Family> {
    // Trim whitespace and validate
    const trimmedName = dto.name.trim();

    if (trimmedName.length === 0) {
      throw new BadRequestException('Family name cannot be empty or whitespace-only');
    }

    if (trimmedName.length > 255) {
      throw new BadRequestException('Family name cannot exceed 255 characters');
    }

    const family = await this.prisma.family.create({
      data: {
        name: trimmedName,
      },
    });

    return family;
  }

  /**
   * Find a Family by ID (without relations)
   *
   * VALIDATION:
   * - Validates UUID format before database query
   * - Returns null for non-existent IDs (not an error)
   *
   * PERFORMANCE:
   * - No relations loaded by default (use findOneWithRelations for that)
   * - Single query with primary key lookup
   *
   * @param id - Family UUID
   * @returns Family entity or null if not found
   * @throws BadRequestException if UUID format is invalid
   */
  async findOne(id: string): Promise<Family | null> {
    validateUuid(id);

    const family = await this.prisma.family.findUnique({
      where: { id },
    });

    return family;
  }

  /**
   * Find a Family by ID with optional relations
   *
   * RELATION OPTIONS:
   * - users: Load all users in family
   * - accounts: Load all family-owned accounts
   * - categories: Load all family categories
   * - budgets: Load all family budgets
   *
   * PERFORMANCE:
   * - Only specified relations are loaded (opt-in)
   * - Single query with JOINs for requested relations
   * - Use sparingly for relations with many records (N+1 risk)
   *
   * @param id - Family UUID
   * @param relations - Optional relations to load
   * @returns FamilyWithRelations or null if not found
   * @throws BadRequestException if UUID format is invalid
   */
  async findOneWithRelations(
    id: string,
    relations?: RelationOptions,
  ): Promise<FamilyWithRelations | null> {
    validateUuid(id);

    const family = await this.prisma.family.findUnique({
      where: { id },
      include: {
        users: relations?.users ?? false,
        accounts: relations?.accounts ?? false,
        categories: relations?.categories ?? false,
        budgets: relations?.budgets ?? false,
      },
    });

    return family as FamilyWithRelations | null;
  }

  /**
   * Find all Families with optional pagination and ordering
   *
   * PAGINATION:
   * - skip: Number of records to skip (for offset pagination)
   * - take: Number of records to return (page size)
   *
   * ORDERING:
   * - createdAt: Sort by creation date (asc/desc)
   * - name: Sort alphabetically (asc/desc)
   * - Only one order field supported per query
   *
   * DEFAULT BEHAVIOR:
   * - No pagination (returns all families)
   * - No specific order (database default)
   * - No relations loaded
   *
   * @param options - Optional pagination and ordering
   * @returns Array of Family entities (empty if none exist)
   */
  async findAll(options?: FindAllOptions): Promise<Family[]> {
    const families = await this.prisma.family.findMany({
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy,
    });

    return families;
  }

  /**
   * Update a Family by ID
   *
   * VALIDATION:
   * - Validates UUID format
   * - Trims whitespace from name
   * - Rejects empty or whitespace-only names
   * - Empty DTO is valid (no-op update)
   *
   * PRISMA BEHAVIOR:
   * - updatedAt automatically updated
   * - createdAt remains unchanged
   * - Returns updated entity
   *
   * @param id - Family UUID
   * @param dto - UpdateFamilyDto with optional fields
   * @returns Updated Family entity
   * @throws BadRequestException if UUID or name is invalid
   * @throws NotFoundException if family doesn't exist (P2025)
   */
  async update(id: string, dto: UpdateFamilyDto): Promise<Family> {
    validateUuid(id);

    // Validate name if provided
    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();

      if (trimmedName.length === 0) {
        throw new BadRequestException('Family name cannot be empty or whitespace-only');
      }

      if (trimmedName.length > 255) {
        throw new BadRequestException('Family name cannot exceed 255 characters');
      }

      // Update dto with trimmed name
      dto = { ...dto, name: trimmedName };
    }

    try {
      const family = await this.prisma.family.update({
        where: { id },
        data: dto,
      });

      return family;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Record to update not found');
        }
      }
      throw error;
    }
  }

  /**
   * Delete a Family by ID
   *
   * CASCADE BEHAVIOR (defined in Prisma schema):
   * - Related Users are CASCADE deleted
   * - Related Accounts are CASCADE deleted
   * - Related Categories are CASCADE deleted
   * - Related Budgets are CASCADE deleted
   * - Transitive cascades: Account → Transactions
   *
   * WARNING:
   * - This is a destructive operation with cascading effects
   * - Consider soft-delete (status field) for production use
   * - Export data before deletion for audit trails
   *
   * @param id - Family UUID
   * @returns void
   * @throws BadRequestException if UUID format is invalid
   * @throws NotFoundException if family doesn't exist (P2025)
   */
  async delete(id: string): Promise<void> {
    validateUuid(id);

    try {
      await this.prisma.family.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Record to delete does not exist');
        }
      }
      throw error;
    }
  }

  /**
   * Check if a Family exists by ID
   *
   * PERFORMANCE:
   * - Uses findUnique (efficient primary key lookup)
   * - Returns boolean (lighter than full entity)
   *
   * @param id - Family UUID
   * @returns true if exists, false otherwise
   * @throws BadRequestException if UUID format is invalid
   */
  async exists(id: string): Promise<boolean> {
    validateUuid(id);

    const family = await this.prisma.family.findUnique({
      where: { id },
      select: { id: true }, // Only select id for minimal data transfer
    });

    return family !== null;
  }

}
