import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto, UpdateBudgetDto } from './dto/budget.dto';

@ApiTags('budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new budget' })
  @ApiResponse({ status: 201, description: 'Budget created successfully' })
  async create(@Request() req, @Body() createBudgetDto: CreateBudgetDto) {
    return await this.budgetsService.create(req.user.id, createBudgetDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all budgets' })
  @ApiResponse({ status: 200, description: 'Budgets retrieved successfully' })
  async findAll(@Request() req) {
    return await this.budgetsService.findAll(req.user.id);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active budgets' })
  @ApiResponse({ status: 200, description: 'Active budgets retrieved successfully' })
  async getActiveBudgets(@Request() req) {
    return await this.budgetsService.getActiveBudgets(req.user.id);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get budget performance analytics' })
  @ApiResponse({ status: 200, description: 'Budget performance retrieved successfully' })
  async getBudgetPerformance(@Request() req) {
    return await this.budgetsService.getBudgetPerformance(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a budget by ID' })
  @ApiResponse({ status: 200, description: 'Budget retrieved successfully' })
  async findOne(@Request() req, @Param('id') id: string) {
    return await this.budgetsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a budget' })
  @ApiResponse({ status: 200, description: 'Budget updated successfully' })
  async update(@Request() req, @Param('id') id: string, @Body() updateBudgetDto: UpdateBudgetDto) {
    return await this.budgetsService.update(req.user.id, id, updateBudgetDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a budget' })
  @ApiResponse({ status: 200, description: 'Budget deleted successfully' })
  async remove(@Request() req, @Param('id') id: string) {
    await this.budgetsService.remove(req.user.id, id);
    return { message: 'Budget deleted successfully' };
  }
}