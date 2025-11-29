import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserPayload } from '../auth/types/current-user.types';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import {
  BudgetResponseDto,
  BudgetListResponseDto,
} from './dto/budget-response.dto';

/**
 * Budget Management Controller
 *
 * Handles CRUD operations for family budgets.
 * All operations are scoped to the authenticated user's family.
 *
 * Endpoints:
 * - POST /api/budgets - Create a new budget
 * - GET /api/budgets - List all budgets for the family
 * - GET /api/budgets/:id - Get a specific budget with progress
 * - PUT /api/budgets/:id - Update a budget
 * - DELETE /api/budgets/:id - Delete a budget
 *
 * @example
 * // Create a budget
 * POST /api/budgets
 * {
 *   "name": "Groceries",
 *   "categoryId": "uuid",
 *   "amount": 500,
 *   "period": "MONTHLY",
 *   "startDate": "2025-01-01",
 *   "endDate": "2025-01-31"
 * }
 */
@ApiTags('Budgets')
@Controller('budgets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BudgetsController {
  private readonly logger = new Logger(BudgetsController.name);

  constructor(private readonly budgetsService: BudgetsService) {}

  /**
   * Create a new budget
   *
   * Creates a budget tied to the authenticated user's family.
   * The budget tracks spending against a specific category.
   *
   * @param user - Current authenticated user
   * @param dto - Budget creation data
   * @returns Created budget with calculated fields
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new budget',
    description: 'Create a budget to track spending against a category',
  })
  @ApiBody({ type: CreateBudgetDto })
  @ApiCreatedResponse({
    type: BudgetResponseDto,
    description: 'Budget created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateBudgetDto,
  ): Promise<BudgetResponseDto> {
    if (!user.familyId) {
      throw new BadRequestException('User must belong to a family to create budgets');
    }

    this.logger.log(`Creating budget for user ${user.id} in family ${user.familyId}`);

    return await this.budgetsService.create(user.familyId, dto);
  }

  /**
   * Get all budgets for the user's family
   *
   * Returns all budgets with calculated spent amounts and progress.
   * Budgets are sorted by status (ACTIVE first) then by start date.
   *
   * @param user - Current authenticated user
   * @returns List of budgets with progress information
   */
  @Get()
  @ApiOperation({
    summary: 'Get all budgets',
    description: 'Retrieve all budgets for the user\'s family with spent amounts',
  })
  @ApiOkResponse({
    type: BudgetListResponseDto,
    description: 'List of budgets retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async findAll(@CurrentUser() user: CurrentUserPayload): Promise<BudgetListResponseDto> {
    if (!user.familyId) {
      throw new BadRequestException('User must belong to a family to view budgets');
    }

    this.logger.log(`Fetching budgets for user ${user.id} in family ${user.familyId}`);

    return await this.budgetsService.findAll(user.familyId);
  }

  /**
   * Get a specific budget by ID
   *
   * Returns the budget with calculated spent amount and progress.
   * The budget must belong to the user's family.
   *
   * @param user - Current authenticated user
   * @param id - Budget ID
   * @returns Budget with progress information
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a budget by ID',
    description: 'Retrieve a specific budget with spent amount and progress',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Budget ID',
  })
  @ApiOkResponse({
    type: BudgetResponseDto,
    description: 'Budget retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - budget belongs to a different family',
  })
  @ApiResponse({
    status: 404,
    description: 'Budget not found',
  })
  async findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<BudgetResponseDto> {
    if (!user.familyId) {
      throw new BadRequestException('User must belong to a family to view budgets');
    }

    this.logger.log(`Fetching budget ${id} for user ${user.id}`);

    return await this.budgetsService.findOne(user.familyId, id);
  }

  /**
   * Update a budget
   *
   * Updates the specified budget. Only provided fields are modified.
   * The budget must belong to the user's family.
   *
   * @param user - Current authenticated user
   * @param id - Budget ID
   * @param dto - Update data
   * @returns Updated budget with progress information
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update a budget',
    description: 'Update a budget\'s details. Only provided fields are modified.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Budget ID',
  })
  @ApiBody({ type: UpdateBudgetDto })
  @ApiOkResponse({
    type: BudgetResponseDto,
    description: 'Budget updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - budget belongs to a different family',
  })
  @ApiResponse({
    status: 404,
    description: 'Budget not found',
  })
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateBudgetDto,
  ): Promise<BudgetResponseDto> {
    if (!user.familyId) {
      throw new BadRequestException('User must belong to a family to update budgets');
    }

    this.logger.log(`Updating budget ${id} for user ${user.id}`);

    return await this.budgetsService.update(user.familyId, id, dto);
  }

  /**
   * Delete a budget
   *
   * Permanently deletes the specified budget.
   * The budget must belong to the user's family.
   *
   * @param user - Current authenticated user
   * @param id - Budget ID
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a budget',
    description: 'Permanently delete a budget',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Budget ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Budget deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - budget belongs to a different family',
  })
  @ApiResponse({
    status: 404,
    description: 'Budget not found',
  })
  async remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    if (!user.familyId) {
      throw new BadRequestException('User must belong to a family to delete budgets');
    }

    this.logger.log(`Deleting budget ${id} for user ${user.id}`);

    await this.budgetsService.remove(user.familyId, id);
  }
}
