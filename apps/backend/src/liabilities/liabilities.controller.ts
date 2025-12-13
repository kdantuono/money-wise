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
import { LiabilitiesService } from './liabilities.service';
import { CreateLiabilityDto } from './dto/create-liability.dto';
import { UpdateLiabilityDto } from './dto/update-liability.dto';
import { CreateInstallmentPlanDto } from './dto/create-installment-plan.dto';
import {
  LiabilityResponseDto,
  InstallmentPlanResponseDto,
  InstallmentResponseDto,
  UpcomingPaymentDto,
  BNPLDetectionResultDto,
  LiabilitiesSummaryDto,
} from './dto/liability-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserPayload } from '../auth/types/current-user.types';

@ApiTags('Liabilities')
@Controller('liabilities')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LiabilitiesController {
  constructor(private readonly liabilitiesService: LiabilitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new liability' })
  @ApiResponse({
    status: 201,
    description: 'Liability created successfully',
    type: LiabilityResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async create(
    @Body() createLiabilityDto: CreateLiabilityDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<LiabilityResponseDto> {
    return this.liabilitiesService.create(user.id, createLiabilityDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all liabilities for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of liabilities',
    type: [LiabilityResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<LiabilityResponseDto[]> {
    return this.liabilitiesService.findAll(user.id);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get liabilities summary statistics' })
  @ApiResponse({
    status: 200,
    description: 'Liabilities summary',
    type: LiabilitiesSummaryDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async getSummary(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<LiabilitiesSummaryDto> {
    return this.liabilitiesService.getSummary(user.id);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming payments' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to look ahead (default: 30)',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'List of upcoming payments',
    type: [UpcomingPaymentDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async getUpcomingPayments(
    @CurrentUser() user: CurrentUserPayload,
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ): Promise<UpcomingPaymentDto[]> {
    return this.liabilitiesService.getUpcomingPayments(user.id, days || 30);
  }

  @Post('detect-bnpl')
  @ApiOperation({ summary: 'Detect BNPL provider from transaction text' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        description: { type: 'string', example: 'Klarna Purchase at Store XYZ' },
        merchantName: { type: 'string', example: 'Store XYZ', required: ['false'] },
      },
      required: ['description'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'BNPL detection result (null if not detected)',
    type: BNPLDetectionResultDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async detectBNPL(
    @Body('description') description: string,
    @Body('merchantName') merchantName?: string,
  ): Promise<BNPLDetectionResultDto | null> {
    return this.liabilitiesService.detectBNPLFromTransaction(
      description,
      merchantName,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a liability by ID' })
  @ApiParam({ name: 'id', description: 'Liability UUID' })
  @ApiResponse({
    status: 200,
    description: 'Liability details',
    type: LiabilityResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Liability not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<LiabilityResponseDto> {
    return this.liabilitiesService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a liability' })
  @ApiParam({ name: 'id', description: 'Liability UUID' })
  @ApiResponse({
    status: 200,
    description: 'Liability updated successfully',
    type: LiabilityResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Liability not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLiabilityDto: UpdateLiabilityDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<LiabilityResponseDto> {
    return this.liabilitiesService.update(id, user.id, updateLiabilityDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a liability' })
  @ApiParam({ name: 'id', description: 'Liability UUID' })
  @ApiResponse({
    status: 204,
    description: 'Liability deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Liability not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<void> {
    return this.liabilitiesService.remove(id, user.id);
  }

  @Post(':id/installment-plan')
  @ApiOperation({ summary: 'Create an installment plan for a liability' })
  @ApiParam({ name: 'id', description: 'Liability UUID' })
  @ApiResponse({
    status: 201,
    description: 'Installment plan created successfully',
    type: InstallmentPlanResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Liability not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async createInstallmentPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createInstallmentPlanDto: CreateInstallmentPlanDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<InstallmentPlanResponseDto> {
    return this.liabilitiesService.createInstallmentPlan(
      id,
      user.id,
      createInstallmentPlanDto,
    );
  }

  @Patch(':id/installments/:installmentId/pay')
  @ApiOperation({ summary: 'Mark an installment as paid' })
  @ApiParam({ name: 'id', description: 'Liability UUID' })
  @ApiParam({ name: 'installmentId', description: 'Installment UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        transactionId: {
          type: 'string',
          format: 'uuid',
          description: 'Optional linked transaction ID',
          required: ['false'],
        },
      },
    },
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Installment marked as paid',
    type: InstallmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Installment already paid',
  })
  @ApiResponse({
    status: 404,
    description: 'Liability or installment not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async markInstallmentPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('installmentId', ParseUUIDPipe) installmentId: string,
    @Body('transactionId') transactionId: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<InstallmentResponseDto> {
    return this.liabilitiesService.markInstallmentPaid(
      id,
      installmentId,
      user.id,
      transactionId,
    );
  }
}
