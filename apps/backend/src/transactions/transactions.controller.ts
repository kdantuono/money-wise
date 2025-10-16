import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, TransactionType } from '../../generated/prisma';

/**
 * Transactions REST API Controller
 *
 * Provides HTTP endpoints for transaction management.
 * All endpoints require JWT authentication.
 *
 * @phase STORY-1.5.7 - TDD Transaction API Implementation (GREEN phase)
 */
@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({
    status: 201,
    description: 'Transaction created successfully',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only create transactions for own accounts',
  })
  async create(
    @Body() createTransactionDto: CreateTransactionDto,
    @CurrentUser() user: User,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.create(createTransactionDto, user.id, user.role as any);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user transactions' })
  @ApiQuery({ name: 'accountId', required: false, description: 'Filter by account ID' })
  @ApiQuery({ name: 'type', required: false, enum: TransactionType, description: 'Filter by transaction type' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in description and merchant name' })
  @ApiResponse({
    status: 200,
    description: 'List of user transactions',
    type: [TransactionResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async findAll(
    @CurrentUser() user: User,
    @Query('accountId') accountId?: string,
    @Query('type') type?: TransactionType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ): Promise<TransactionResponseDto[]> {
    return this.transactionsService.findAll(user.id, user.role as any, {
      accountId,
      type,
      startDate,
      endDate,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({ name: 'id', description: 'Transaction UUID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction found',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only access own transactions',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.findOne(id, user.id, user.role as any);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update transaction (partial update)' })
  @ApiParam({ name: 'id', description: 'Transaction UUID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction updated successfully',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only update own transactions',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
    @CurrentUser() user: User,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.update(id, updateTransactionDto, user.id, user.role as any);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete transaction' })
  @ApiParam({ name: 'id', description: 'Transaction UUID' })
  @ApiResponse({
    status: 204,
    description: 'Transaction deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only delete own transactions',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.transactionsService.remove(id, user.id, user.role as any);
  }
}
