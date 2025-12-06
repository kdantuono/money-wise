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
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountResponseDto, AccountSummaryDto, FinancialSummaryDto } from './dto/account-response.dto';
import { DeletionEligibilityResponseDto, DeletionBlockedErrorDto } from './dto/deletion-eligibility.dto';
import { RestoreEligibilityResponseDto, RestoreRequiresRelinkErrorDto } from './dto/restore-eligibility.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserPayload } from '../auth/types/current-user.types';

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
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<AccountResponseDto> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.create(createAccountDto, user.id, undefined);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user accounts' })
  @ApiQuery({
    name: 'includeHidden',
    required: false,
    type: Boolean,
    description: 'Include hidden accounts in results (default: false)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user accounts',
    type: [AccountResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('includeHidden') includeHidden?: string,
  ): Promise<AccountResponseDto[]> {
    // Parse boolean from query string ('true' -> true, anything else -> false)
    const includeHiddenBool = includeHidden === 'true';
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.findAll(user.id, undefined, includeHiddenBool);
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
  async getSummary(@CurrentUser() user: CurrentUserPayload): Promise<AccountSummaryDto> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.getSummary(user.id, undefined);
  }

  @Get('financial-summary')
  @ApiOperation({
    summary: 'Get financial summary with normalized balances',
    description:
      'Returns a comprehensive financial overview with properly normalized balances. ' +
      'Credit card balances are shown as positive (amount owed), asset accounts show available balance. ' +
      'Net worth is calculated as total assets minus total liabilities.',
  })
  @ApiResponse({
    status: 200,
    description: 'Financial summary with normalized balances for all accounts',
    type: FinancialSummaryDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async getFinancialSummary(@CurrentUser() user: CurrentUserPayload): Promise<FinancialSummaryDto> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.getFinancialSummary(user.id, undefined);
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
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<AccountResponseDto> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.findOne(id, user.id, undefined, user.role);
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
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ currentBalance: number; availableBalance: number | null; currency: string }> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.getBalance(id, user.id, undefined, user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update account (partial update)' })
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
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<AccountResponseDto> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.update(id, updateAccountDto, user.id, undefined, user.role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete account',
    description:
      'Permanently deletes an account. Blocked if account has linked transfers to other accounts. ' +
      'Use /accounts/:id/deletion-eligibility to check before deleting. ' +
      'Consider using /accounts/:id/hide for soft delete instead.',
  })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({
    status: 204,
    description: 'Account deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete - account has linked transfers',
    type: DeletionBlockedErrorDto,
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
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<void> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.remove(id, user.id, undefined, user.role);
  }

  @Get(':id/deletion-eligibility')
  @ApiOperation({
    summary: 'Check if account can be deleted',
    description:
      'Returns deletion eligibility information including any linked transfers that would block deletion. ' +
      'Use this before attempting to delete an account to provide appropriate UI feedback.',
  })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({
    status: 200,
    description: 'Deletion eligibility check result',
    type: DeletionEligibilityResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only check own accounts',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async checkDeletionEligibility(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<DeletionEligibilityResponseDto> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.checkDeletionEligibility(id, user.id, undefined, user.role);
  }

  @Patch(':id/hide')
  @ApiOperation({
    summary: 'Hide account (soft delete)',
    description:
      'Sets account status to HIDDEN. Hidden accounts preserve all transactions and history ' +
      'but are excluded from active views. Can be restored later with /accounts/:id/restore. ' +
      'Use this instead of delete when account has linked transfers.',
  })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({
    status: 200,
    description: 'Account hidden successfully',
    type: AccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Account is already hidden',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only hide own accounts',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async hideAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<AccountResponseDto> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.hideAccount(id, user.id, undefined, user.role);
  }

  @Get(':id/restore-eligibility')
  @ApiOperation({
    summary: 'Check if hidden account can be restored',
    description:
      'Returns restore eligibility information for a hidden account. ' +
      'For manual accounts, simple restore is always possible. ' +
      'For banking accounts (SaltEdge/Plaid), checks if the connection is still valid. ' +
      'If the connection is revoked/failed, re-linking is required.',
  })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({
    status: 200,
    description: 'Restore eligibility check result',
    type: RestoreEligibilityResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Only hidden accounts can be checked',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only check own accounts',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async checkRestoreEligibility(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<RestoreEligibilityResponseDto> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.checkRestoreEligibility(id, user.id, undefined, user.role);
  }

  @Patch(':id/restore')
  @ApiOperation({
    summary: 'Restore hidden account',
    description:
      'Restores a hidden account by setting status back to ACTIVE. ' +
      'For banking accounts, checks if the connection is still valid. ' +
      'If the banking connection is revoked/failed, returns 409 requiring re-link. ' +
      'Use /accounts/:id/restore-eligibility first to check before attempting restore.',
  })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({
    status: 200,
    description: 'Account restored successfully',
    type: AccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Only hidden accounts can be restored',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only restore own accounts',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Banking connection is revoked - re-linking required',
    type: RestoreRequiresRelinkErrorDto,
  })
  async restoreAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<AccountResponseDto> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.restoreAccount(id, user.id, undefined, user.role);
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
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<AccountResponseDto> {
    // TODO: Add familyId support when User entity is migrated to Prisma
    return this.accountsService.syncAccount(id, user.id, undefined, user.role);
  }
}
