import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionQueryDto,
} from './dto/transaction.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  async create(
    @Request() req,
    @Body() createTransactionDto: CreateTransactionDto
  ) {
    return await this.transactionsService.create(
      req.user.id,
      createTransactionDto
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions' })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  async findAll(@Request() req, @Query() query: TransactionQueryDto) {
    return await this.transactionsService.findAll(req.user.id, query);
  }

  @Get('analytics/by-category')
  @ApiOperation({ summary: 'Get transactions grouped by category' })
  @ApiResponse({
    status: 200,
    description: 'Transaction analytics retrieved successfully',
  })
  async getByCategory(@Request() req, @Query('period') period?: string) {
    return await this.transactionsService.getTransactionsByCategory(
      req.user.id,
      period
    );
  }

  @Get('analytics/monthly-trends')
  @ApiOperation({ summary: 'Get monthly transaction trends' })
  @ApiResponse({
    status: 200,
    description: 'Monthly trends retrieved successfully',
  })
  async getMonthlyTrends(@Request() req, @Query('months') months?: number) {
    return await this.transactionsService.getMonthlyTrends(req.user.id, months);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction retrieved successfully',
  })
  async findOne(@Request() req, @Param('id') id: string) {
    return await this.transactionsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a transaction' })
  @ApiResponse({ status: 200, description: 'Transaction updated successfully' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto
  ) {
    return await this.transactionsService.update(
      req.user.id,
      id,
      updateTransactionDto
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transaction' })
  @ApiResponse({ status: 200, description: 'Transaction deleted successfully' })
  async remove(@Request() req, @Param('id') id: string) {
    await this.transactionsService.remove(req.user.id, id);
    return { message: 'Transaction deleted successfully' };
  }
}
