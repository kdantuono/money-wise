import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CategoryService } from '../core/database/prisma/services/category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CategorySpendingSummaryDto } from './dto/category-spending.dto';
import { CategoryType, CategoryStatus, Prisma } from '../../generated/prisma';

/**
 * Categories Controller
 * Manages category CRUD operations for transaction categorization
 *
 * All endpoints require authentication via JWT
 * Categories are scoped to user's family for multi-tenant support
 *
 * @phase MVP - Category Management
 */
@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoryService: CategoryService) { }

  /**
   * Create a new category
   * POST /api/categories
   */
  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Category created successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  async create(
    @Request() req,
    @Body() createDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    // Get family ID from user
    const familyId = req.user.familyId;

    const category = await this.categoryService.create({
      ...createDto,
      familyId,
    });

    return CategoryResponseDto.fromEntity(category);
  }

  /**
   * Get all categories for user's family
   * GET /api/categories?type=EXPENSE
   */
  @Get()
  @ApiOperation({ summary: "Get all categories for user's family" })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: CategoryType,
    description: 'Filter by category type (EXPENSE or INCOME)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories retrieved successfully',
    type: [CategoryResponseDto],
  })
  async findAll(
    @Request() req,
    @Query('type') type?: CategoryType,
  ): Promise<CategoryResponseDto[]> {
    const familyId = req.user.familyId;

    const categories = await this.categoryService.findByFamilyId(familyId,
      type ? { where: { type } } : undefined
    );

    return categories.map(cat => CategoryResponseDto.fromEntity(cat));
  }

  /**
   * Get spending by category
   * GET /api/categories/spending?startDate=X&endDate=Y&parentOnly=true
   *
   * Returns aggregated spending for each category within a date range.
   * When parentOnly=true (default), child category spending is rolled up to parents.
   */
  @Get('spending')
  @ApiOperation({ summary: 'Get spending aggregated by category' })
  @ApiQuery({
    name: 'startDate',
    required: true,
    type: String,
    description: 'Start date (ISO 8601 format)',
    example: '2025-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    type: String,
    description: 'End date (ISO 8601 format)',
    example: '2025-01-31',
  })
  @ApiQuery({
    name: 'parentOnly',
    required: false,
    type: Boolean,
    description: 'Roll up child spending to parent categories (default: true)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Spending data retrieved successfully',
    type: CategorySpendingSummaryDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid date format' })
  async getSpending(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('parentOnly') parentOnly?: string,
  ): Promise<CategorySpendingSummaryDto> {
    const familyId = req.user.familyId;

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format. Use ISO 8601 format (e.g., 2025-01-01)');
    }

    // Parse parentOnly (default true)
    const rollUp = parentOnly !== 'false';

    const spendingData = await this.categoryService.getSpendingByCategory(
      familyId,
      start,
      end,
      { parentOnly: rollUp }
    );

    // Calculate total spending
    const totalSpending = spendingData.reduce(
      (sum, cat) => sum + cat.totalAmount,
      0
    );

    return {
      categories: spendingData,
      totalSpending,
      startDate,
      endDate,
    };
  }

  /**
   * Get category by ID
   * GET /api/categories/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category retrieved successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  async findOne(
    @Request() req,
    @Param('id') id: string,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryService.findOneWithRelations(id);

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Verify category belongs to user's family
    if (category.familyId !== req.user.familyId) {
      throw new ForbiddenException('Access denied to this category');
    }

    return CategoryResponseDto.fromEntity(category);
  }

  /**
   * Update category
   * PUT /api/categories/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update category' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category updated successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    // Verify category belongs to user's family
    const existing = await this.categoryService.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    if (existing.familyId !== req.user.familyId) {
      throw new ForbiddenException('Access denied to this category');
    }

    // Cast DTO types to Prisma types for database layer
    const prismaUpdateDto: Partial<{
      name: string;
      slug: string;
      description: string;
      color: string;
      icon: string;
      status: CategoryStatus;
      parentId: string;
      rules: Prisma.JsonValue;
      metadata: Prisma.JsonValue;
      sortOrder: number;
    }> = {
      ...updateDto,
      rules: updateDto.rules as Prisma.JsonValue | undefined,
      metadata: updateDto.metadata as Prisma.JsonValue | undefined,
    };

    const category = await this.categoryService.update(id, prismaUpdateDto);

    return CategoryResponseDto.fromEntity(category);
  }

  /**
   * Delete category
   * DELETE /api/categories/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete category' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Category deleted successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot delete system category',
  })
  async remove(@Request() req, @Param('id') id: string): Promise<void> {
    // Verify category belongs to user's family
    const existing = await this.categoryService.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    if (existing.familyId !== req.user.familyId) {
      throw new ForbiddenException('Access denied to this category');
    }

    await this.categoryService.delete(id);
  }
}
