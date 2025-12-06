import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
  Logger,
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
import { BankingService } from './services/banking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserPayload } from '../auth/types/current-user.types';
import { BankingProvider } from '../../generated/prisma';
import {
  InitiateLinkRequestDto,
  InitiateLinkResponseDto,
  CompleteLinkRequestDto,
  CompleteLinkResponseDto,
  SyncResponseDto,
  GetLinkedAccountsResponseDto,
  GetProvidersResponseDto,
} from './dto';

/**
 * Banking Integration Controller
 *
 * Handles banking provider connections, account linking, syncing, and management.
 *
 * Flow:
 * 1. User calls POST /api/banking/initiate-link → Gets OAuth URL
 * 2. User authorizes at bank → Redirected back to app
 * 3. Frontend calls POST /api/banking/complete-link → Stores linked accounts
 * 4. User can view accounts with GET /api/banking/accounts
 * 5. User can sync accounts with POST /api/banking/sync/:accountId
 * 6. User can disconnect with DELETE /api/banking/revoke/:connectionId
 *
 * @example
 * // Initiate banking link
 * POST /api/banking/initiate-link
 * {}
 *
 * // Complete link after OAuth
 * POST /api/banking/complete-link
 * { "connectionId": "uuid" }
 *
 * // Get linked accounts
 * GET /api/banking/accounts
 *
 * // Sync account
 * POST /api/banking/sync/:accountId
 *
 * // Disconnect bank
 * DELETE /api/banking/revoke/:connectionId
 *
 * // Get available providers
 * GET /api/banking/providers
 */
@ApiTags('Banking')
@Controller('banking')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BankingController {
  private readonly logger = new Logger(BankingController.name);

  constructor(private readonly bankingService: BankingService) {}

  /**
   * Initiate banking link
   *
   * Starts the OAuth flow to link a bank account.
   * Returns a redirect URL that the user should navigate to.
   *
   * @param user Current authenticated user
   * @param provider Banking provider (defaults to SALTEDGE)
   * @returns Redirect URL and connection ID
   *
   * @example
   * POST /api/banking/initiate-link
   * Authorization: Bearer {token}
   * Content-Type: application/json
   * {}
   *
   * Response:
   * {
   *   "redirectUrl": "https://saltedge.com/oauth/...",
   *   "connectionId": "550e8400-e29b-41d4-a716-446655440000"
   * }
   */
  @Post('initiate-link')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Initiate banking link',
    description: 'Start OAuth flow to connect a bank account',
  })
  @ApiBody({
    type: InitiateLinkRequestDto,
  })
  @ApiCreatedResponse({
    type: InitiateLinkResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Banking integration not enabled or provider error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async initiateBankingLink(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body?: InitiateLinkRequestDto,
  ): Promise<InitiateLinkResponseDto> {
    this.logger.log(
      `Initiating banking link for user ${user.id} with provider ${body?.provider || 'SALTEDGE'}`,
    );

    try {
      const result = await this.bankingService.initiateBankingLink(
        user.id,
        body?.provider || BankingProvider.SALTEDGE,
        {
          providerCode: body?.providerCode,
          countryCode: body?.countryCode,
          returnTo: body?.returnTo,
        },
      );
      return result;
    } catch (error) {
      this.logger.error('Failed to initiate banking link', error);
      throw error;
    }
  }

  /**
   * Complete banking link
   *
   * Called after user completes OAuth authorization.
   * Fetches the linked accounts and stores them in the database.
   *
   * @param user Current authenticated user
   * @param connectionId The connection ID from initiate-link response
   * @returns Array of linked accounts
   *
   * @example
   * POST /api/banking/complete-link
   * Authorization: Bearer {token}
   * Content-Type: application/json
   * {
   *   "connectionId": "550e8400-e29b-41d4-a716-446655440000"
   * }
   *
   * Response:
   * {
   *   "accounts": [
   *     {
   *       "id": "account-123",
   *       "name": "Conto Corrente",
   *       "iban": "IT60X0542811101000000123456",
   *       "balance": 5000.50,
   *       "currency": "EUR",
   *       "bankName": "Intesa Sanpaolo"
   *     }
   *   ]
   * }
   */
  @Post('complete-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete banking link',
    description: 'Finish OAuth flow and fetch linked accounts',
  })
  @ApiBody({
    type: CompleteLinkRequestDto,
  })
  @ApiOkResponse({
    type: CompleteLinkResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Connection not found, not authorized, or OAuth failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async completeBankingLink(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: CompleteLinkRequestDto,
  ): Promise<CompleteLinkResponseDto> {
    if (!body.connectionId) {
      throw new BadRequestException('connectionId is required');
    }

    this.logger.log(
      `Completing banking link for user ${user.id}, connection ${body.connectionId}, saltEdge: ${body.saltEdgeConnectionId || 'not provided'}`,
    );

    try {
      const result = await this.bankingService.completeBankingLink(
        user.id,
        body.connectionId,
        body.saltEdgeConnectionId,
      );

      // Store the accounts with the saltEdgeConnectionId to ensure it's properly saved
      await this.bankingService.storeLinkedAccounts(
        user.id,
        body.connectionId,
        result.accounts,
        result.saltEdgeConnectionId,
      );

      return { accounts: result.accounts };
    } catch (error) {
      this.logger.error('Failed to complete banking link', error);
      throw error;
    }
  }

  /**
   * Get linked accounts
   *
   * Retrieves all banking accounts linked by the user.
   *
   * @param user Current authenticated user
   * @returns Array of linked accounts with sync status
   *
   * @example
   * GET /api/banking/accounts
   * Authorization: Bearer {token}
   *
   * Response:
   * {
   *   "accounts": [
   *     {
   *       "id": "acc-123",
   *       "name": "Conto Corrente",
   *       "bankName": "Intesa Sanpaolo",
   *       "balance": 5000.50,
   *       "currency": "EUR",
   *       "syncStatus": "SYNCED",
   *       "lastSynced": "2025-10-25T12:30:00Z",
   *       "linkedAt": "2025-10-24T10:15:00Z"
   *     }
   *   ]
   * }
   */
  @Get('accounts')
  @ApiOperation({
    summary: 'Get linked banking accounts',
    description: 'Retrieve all accounts linked to user from banking providers',
  })
  @ApiOkResponse({
    type: GetLinkedAccountsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async getLinkedAccounts(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<GetLinkedAccountsResponseDto> {
    this.logger.log(`Fetching linked accounts for user ${user.id}`);

    try {
      const accounts = await this.bankingService.getLinkedAccounts(user.id);
      return { accounts };
    } catch (error) {
      this.logger.error('Failed to fetch linked accounts', error);
      throw error;
    }
  }

  /**
   * Sync banking account
   *
   * Triggers a synchronization of transactions and balance for a specific account.
   * This operation may take a few moments as it fetches data from the banking provider.
   *
   * @param user Current authenticated user
   * @param accountId The account ID to sync
   * @returns Sync result with transaction count and balance update status
   *
   * @example
   * POST /api/banking/sync/acc-123
   * Authorization: Bearer {token}
   * Content-Type: application/json
   * {}
   *
   * Response:
   * {
   *   "syncLogId": "sync-456",
   *   "status": "SYNCED",
   *   "transactionsSynced": 42,
   *   "balanceUpdated": true,
   *   "error": null
   * }
   */
  @Post('sync/:accountId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync banking account',
    description: 'Fetch latest transactions and balance for an account',
  })
  @ApiParam({
    name: 'accountId',
    type: 'string',
    format: 'uuid',
    description: 'Account ID to sync',
  })
  @ApiOkResponse({
    type: SyncResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Account not found, not authorized, or not a linked banking account',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async syncAccount(
    @CurrentUser() user: CurrentUserPayload,
    @Param('accountId', new ParseUUIDPipe()) accountId: string,
  ): Promise<SyncResponseDto> {
    this.logger.log(`Syncing account ${accountId} for user ${user.id}`);

    try {
      const result = await this.bankingService.syncAccount(user.id, accountId);
      return result;
    } catch (error) {
      this.logger.error('Failed to sync account', error);
      throw error;
    }
  }

  /**
   * Revoke banking connection
   *
   * Disconnects a banking provider connection and marks all associated accounts
   * as disconnected. The user will need to re-authorize to link accounts again.
   *
   * @param user Current authenticated user
   * @param connectionId The connection ID to revoke
   * @returns Success response
   *
   * @example
   * DELETE /api/banking/revoke/conn-789
   * Authorization: Bearer {token}
   *
   * Response: 204 No Content
   */
  @Delete('revoke/:connectionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke banking connection',
    description: 'Disconnect a banking provider and remove linked accounts',
  })
  @ApiParam({
    name: 'connectionId',
    type: 'string',
    format: 'uuid',
    description: 'Banking connection ID to revoke',
  })
  @ApiResponse({
    status: 204,
    description: 'Connection revoked successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Connection not found or revoke operation failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async revokeBankingConnection(
    @CurrentUser() user: CurrentUserPayload,
    @Param('connectionId', new ParseUUIDPipe()) connectionId: string,
  ): Promise<void> {
    this.logger.log(
      `Revoking banking connection ${connectionId} for user ${user.id}`,
    );

    try {
      await this.bankingService.revokeBankingConnection(user.id, connectionId);
    } catch (error) {
      this.logger.error('Failed to revoke banking connection', error);
      throw error;
    }
  }

  /**
   * Get available banking providers
   *
   * Retrieve a list of banking providers currently available in the system.
   * This helps the frontend know which providers are supported.
   *
   * @returns Array of available provider types
   *
   * @example
   * GET /api/banking/providers
   * Authorization: Bearer {token}
   *
   * Response:
   * {
   *   "providers": ["SALTEDGE"]
   * }
   */
  @Get('providers')
  @ApiOperation({
    summary: 'Get available banking providers',
    description: 'List all banking providers currently enabled',
  })
  @ApiOkResponse({
    type: GetProvidersResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async getAvailableProviders(): Promise<GetProvidersResponseDto> {
    this.logger.log('Fetching available banking providers');

    try {
      const providers = this.bankingService.getAvailableProviders();
      const enabled = this.bankingService.isBankingEnabled();

      return {
        providers,
        enabled,
      };
    } catch (error) {
      this.logger.error('Failed to fetch available providers', error);
      throw error;
    }
  }

  /**
   * Revoke banking connection by account ID
   *
   * Alternative endpoint that accepts an Account ID instead of BankingConnection ID.
   * Looks up the BankingConnection via the account's saltEdgeConnectionId and revokes it.
   * This is useful when the frontend only has access to the Account ID.
   *
   * @param user Current authenticated user
   * @param accountId The account ID whose banking connection to revoke
   * @returns Success response
   *
   * @example
   * DELETE /api/banking/revoke-by-account/acc-123
   * Authorization: Bearer {token}
   *
   * Response: 204 No Content
   */
  @Delete('revoke-by-account/:accountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke banking connection by account ID',
    description: 'Disconnect a banking provider using the linked account ID instead of connection ID',
  })
  @ApiParam({
    name: 'accountId',
    type: 'string',
    format: 'uuid',
    description: 'Account ID whose banking connection to revoke',
  })
  @ApiResponse({
    status: 204,
    description: 'Connection revoked successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Account not linked to banking or revoke operation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async revokeBankingConnectionByAccountId(
    @CurrentUser() user: CurrentUserPayload,
    @Param('accountId', new ParseUUIDPipe()) accountId: string,
  ): Promise<void> {
    this.logger.log(
      `Revoking banking connection for account ${accountId}, user ${user.id}`,
    );

    try {
      await this.bankingService.revokeBankingConnectionByAccountId(user.id, accountId);
    } catch (error) {
      this.logger.error('Failed to revoke banking connection by account ID', error);
      throw error;
    }
  }

  /**
   * Get fake providers for testing
   *
   * Returns a list of fake banking providers (country code XF) for testing.
   * These providers simulate real banks with test credentials:
   * - username: "username"
   * - password: "secret"
   *
   * @example
   * GET /api/banking/fake-providers
   * Authorization: Bearer {token}
   *
   * Response:
   * [
   *   { "code": "fakebank_simple_xf", "name": "Fake Bank Simple" },
   *   { "code": "fakebank_oauth_xf", "name": "Fake Bank OAuth" }
   * ]
   */
  @Get('fake-providers')
  @ApiOperation({
    summary: 'Get fake providers for testing',
    description: 'List fake banking providers (country XF) for development testing',
  })
  @ApiResponse({
    status: 200,
    description: 'List of fake providers',
  })
  @ApiResponse({
    status: 400,
    description: 'Banking integration not enabled',
  })
  async getFakeProviders(): Promise<unknown[]> {
    this.logger.log('Fetching fake providers for testing');

    try {
      return await this.bankingService.getFakeProviders();
    } catch (error) {
      this.logger.error('Failed to fetch fake providers', error);
      throw error;
    }
  }
}
