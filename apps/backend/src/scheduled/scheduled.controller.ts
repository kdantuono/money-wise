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
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ScheduledService } from './scheduled.service';
import { CreateScheduledTransactionDto } from './dto/create-scheduled-transaction.dto';
import { UpdateScheduledTransactionDto } from './dto/update-scheduled-transaction.dto';
import {
  ScheduledTransactionResponseDto,
  UpcomingScheduledDto,
  CalendarEventDto,
  PaginatedScheduledResponseDto,
} from './dto/scheduled-transaction-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserPayload } from '../auth/types/current-user.types';
import {
  ScheduledTransactionStatus,
  TransactionType,
  FlowType,
} from '../../generated/prisma';

@ApiTags('Scheduled Transactions')
@Controller('scheduled')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ScheduledController {
  constructor(private readonly scheduledService: ScheduledService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new scheduled transaction' })
  @ApiResponse({
    status: 201,
    description: 'Scheduled transaction created successfully',
    type: ScheduledTransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Account or category not found' })
  async create(
    @Body() dto: CreateScheduledTransactionDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ScheduledTransactionResponseDto> {
    return this.scheduledService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all scheduled transactions' })
  @ApiQuery({ name: 'status', required: false, enum: ScheduledTransactionStatus })
  @ApiQuery({ name: 'type', required: false, enum: TransactionType })
  @ApiQuery({ name: 'flowType', required: false, enum: FlowType })
  @ApiQuery({ name: 'accountId', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of scheduled transactions',
    type: [ScheduledTransactionResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: ScheduledTransactionStatus,
    @Query('type') type?: TransactionType,
    @Query('flowType') flowType?: FlowType,
    @Query('accountId') accountId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ): Promise<ScheduledTransactionResponseDto[] | PaginatedScheduledResponseDto> {
    return this.scheduledService.findAll(user.id, {
      status,
      type,
      flowType,
      accountId,
      categoryId,
      skip,
      take,
    });
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming scheduled transactions' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to look ahead (default: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of upcoming scheduled transactions',
    type: [UpcomingScheduledDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUpcoming(
    @CurrentUser() user: CurrentUserPayload,
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ): Promise<UpcomingScheduledDto[]> {
    return this.scheduledService.getUpcoming(user.id, days ?? 30);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get calendar events for scheduled transactions' })
  @ApiQuery({
    name: 'startDate',
    required: true,
    type: String,
    description: 'Start date (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    type: String,
    description: 'End date (ISO format)',
  })
  @ApiResponse({
    status: 200,
    description: 'Calendar events',
    type: [CalendarEventDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCalendarEvents(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<CalendarEventDto[]> {
    return this.scheduledService.getCalendarEvents(
      user.id,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a scheduled transaction by ID' })
  @ApiParam({ name: 'id', description: 'Scheduled transaction UUID' })
  @ApiResponse({
    status: 200,
    description: 'Scheduled transaction details',
    type: ScheduledTransactionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ScheduledTransactionResponseDto> {
    return this.scheduledService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a scheduled transaction' })
  @ApiParam({ name: 'id', description: 'Scheduled transaction UUID' })
  @ApiResponse({
    status: 200,
    description: 'Scheduled transaction updated',
    type: ScheduledTransactionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduledTransactionDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ScheduledTransactionResponseDto> {
    return this.scheduledService.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a scheduled transaction' })
  @ApiParam({ name: 'id', description: 'Scheduled transaction UUID' })
  @ApiResponse({ status: 204, description: 'Deleted successfully' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<void> {
    return this.scheduledService.remove(id, user.id);
  }

  @Post(':id/skip')
  @ApiOperation({ summary: 'Skip the next occurrence' })
  @ApiParam({ name: 'id', description: 'Scheduled transaction UUID' })
  @ApiResponse({
    status: 200,
    description: 'Next occurrence skipped',
    type: ScheduledTransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Cannot skip (not recurring or not active)' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async skipNext(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ScheduledTransactionResponseDto> {
    return this.scheduledService.skipNextOccurrence(id, user.id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark current occurrence as completed' })
  @ApiParam({ name: 'id', description: 'Scheduled transaction UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        transactionId: {
          type: 'string',
          format: 'uuid',
          description: 'Optional linked transaction ID',
        },
      },
    },
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Occurrence completed',
    type: ScheduledTransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Not active' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markCompleted(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('transactionId') transactionId: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ScheduledTransactionResponseDto> {
    return this.scheduledService.markCompleted(id, user.id, transactionId);
  }

  @Post('generate-from-liabilities')
  @ApiOperation({ summary: 'Auto-generate scheduled transactions from liabilities' })
  @ApiResponse({
    status: 201,
    description: 'Scheduled transactions generated',
    type: [ScheduledTransactionResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateFromLiabilities(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ScheduledTransactionResponseDto[]> {
    return this.scheduledService.generateFromLiabilities(user.id);
  }
}
