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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountResponseDto, AccountSummaryDto } from './dto/account-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../../generated/prisma';

@ApiTags('Accounts')
@Controller('accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({
    status: 201,
    description: 'Account created successfully',
    type: AccountResponseDto,
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
    @Body() createAccountDto: CreateAccountDto,
    @CurrentUser() user: User,
  ): Promise<AccountResponseDto> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.create(createAccountDto, user.id, undefined);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user accounts' })
  @ApiResponse({
    status: 200,
    description: 'List of user accounts',
    type: [AccountResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async findAll(@CurrentUser() user: User): Promise<AccountResponseDto[]> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.findAll(user.id, undefined);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get accounts summary' })
  @ApiResponse({
    status: 200,
    description: 'Accounts summary with totals and breakdown',
    type: AccountSummaryDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async getSummary(@CurrentUser() user: User): Promise<AccountSummaryDto> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.getSummary(user.id, undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account by ID' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({
    status: 200,
    description: 'Account found',
    type: AccountResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only access own accounts',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<AccountResponseDto> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.findOne(id, user.id, undefined, user.role as any);
  }

  @Get(':id/balance')
  @ApiOperation({ summary: 'Get account balance' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({
    status: 200,
    description: 'Account balance retrieved',
    schema: {
      type: 'object',
      properties: {
        currentBalance: { type: 'number', example: 1000.00 },
        availableBalance: { type: 'number', example: 950.00, nullable: true },
        currency: { type: 'string', example: 'USD' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only access own account balances',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async getBalance(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<{ currentBalance: number; availableBalance: number | null; currency: string }> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.getBalance(id, user.id, undefined, user.role as any);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update account' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({
    status: 200,
    description: 'Account updated successfully',
    type: AccountResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only update own accounts',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAccountDto: UpdateAccountDto,
    @CurrentUser() user: User,
  ): Promise<AccountResponseDto> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.update(id, updateAccountDto, user.id, undefined, user.role as any);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete account' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({
    status: 204,
    description: 'Account deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only delete own accounts',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.remove(id, user.id, undefined, user.role as any);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Sync account with Plaid' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({
    status: 200,
    description: 'Account synced successfully',
    type: AccountResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only sync own accounts or not a Plaid account',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async syncAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<AccountResponseDto> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.syncAccount(id, user.id, undefined, user.role as any);
  }
}
