import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import {
  CreateLinkTokenDto,
  ExchangeTokenDto,
  SyncTransactionsDto,
  PlaidWebhookDto,
  PlaidAccountResponseDto,
  PlaidTransactionResponseDto,
  PlaidLinkResponseDto,
} from './dto/plaid.dto';
import { PlaidService } from './plaid.service';

@ApiTags('plaid')
@Controller('plaid')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PlaidController {
  private readonly logger = new Logger(PlaidController.name);

  constructor(private readonly plaidService: PlaidService) {}

  @Post('link-token')
  @ApiOperation({ summary: 'Create Plaid Link token for user authentication' })
  @ApiResponse({
    status: 201,
    description: 'Link token created successfully',
    type: PlaidLinkResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiBody({ type: CreateLinkTokenDto })
  async createLinkToken(@Request() req, @Body() dto: CreateLinkTokenDto) {
    try {
      this.logger.log(`Creating link token for user: ${req.user.id}`);

      const result = await this.plaidService.initializePlaidLink(req.user.id, {
        clientName: dto.clientName,
        language: dto.language,
        countryCodes: dto.countryCodes,
        products: dto.products,
      });

      this.logger.log(
        `Link token created successfully for user: ${req.user.id}`
      );
      return {
        success: true,
        data: result,
        message: 'Link token created successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to create link token for user ${req.user.id}:`,
        error
      );

      if (error.response?.data?.error_code) {
        const plaidError = await this.plaidService.handlePlaidError(
          error.response.data
        );
        throw new HttpException(plaidError, HttpStatus.BAD_REQUEST);
      }

      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to create link token',
        error: error.message,
      });
    }
  }

  @Post('exchange-public-token')
  @ApiOperation({
    summary:
      'Exchange public token for access token and create account connections',
  })
  @ApiResponse({
    status: 201,
    description: 'Token exchanged and accounts created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiBody({ type: ExchangeTokenDto })
  async exchangePublicToken(@Request() req, @Body() dto: ExchangeTokenDto) {
    try {
      this.logger.log(`Exchanging public token for user: ${req.user.id}`);

      if (!dto.publicToken) {
        throw new BadRequestException('Public token is required');
      }

      const result = await this.plaidService.exchangePublicToken(
        req.user.id,
        dto.publicToken,
        dto.metadata
      );

      this.logger.log(
        `Token exchanged successfully for user: ${req.user.id}, accounts: ${result.accounts.length}`
      );

      return {
        success: true,
        data: result,
        message: 'Token exchanged and accounts connected successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to exchange token for user ${req.user.id}:`,
        error
      );

      if (error.response?.data?.error_code) {
        const plaidError = await this.plaidService.handlePlaidError(
          error.response.data
        );
        throw new HttpException(plaidError, HttpStatus.BAD_REQUEST);
      }

      if (error.code === '23505') {
        // Duplicate key error
        throw new HttpException(
          {
            success: false,
            message: 'This account is already connected',
            code: 'ACCOUNT_ALREADY_CONNECTED',
          },
          HttpStatus.CONFLICT
        );
      }

      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to exchange token',
        error: error.message,
      });
    }
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Get all connected bank accounts for the user' })
  @ApiResponse({
    status: 200,
    description: 'Accounts retrieved successfully',
    type: [PlaidAccountResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getUserAccounts(@Request() req) {
    try {
      this.logger.log(`Fetching accounts for user: ${req.user.id}`);

      const accounts = await this.plaidService.getAccountsByUser(req.user.id);

      this.logger.log(
        `Retrieved ${accounts.length} accounts for user: ${req.user.id}`
      );

      return {
        success: true,
        data: accounts,
        message: 'Accounts retrieved successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch accounts for user ${req.user.id}:`,
        error
      );

      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to retrieve accounts',
        error: error.message,
      });
    }
  }

  @Post('sync-transactions')
  @ApiOperation({ summary: 'Sync transactions for a specific account' })
  @ApiResponse({ status: 200, description: 'Transactions synced successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiBody({ type: SyncTransactionsDto })
  async syncTransactions(@Request() req, @Body() dto: SyncTransactionsDto) {
    try {
      this.logger.log(
        `Syncing transactions for account: ${dto.plaidAccountId}, user: ${req.user.id}`
      );

      if (!dto.plaidAccountId) {
        throw new BadRequestException('Plaid account ID is required');
      }

      const options: any = {};
      if (dto.startDate) options.startDate = new Date(dto.startDate);
      if (dto.endDate) options.endDate = new Date(dto.endDate);
      if (dto.count) options.count = dto.count;

      const result = await this.plaidService.syncTransactions(
        dto.plaidAccountId,
        options
      );

      this.logger.log(
        `Transactions synced for account ${dto.plaidAccountId}: ${result.transactionsAdded} added, ${result.transactionsModified} modified, ${result.transactionsRemoved} removed`
      );

      return {
        success: true,
        data: result,
        message: 'Transactions synced successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to sync transactions for account ${dto.plaidAccountId}:`,
        error
      );

      if (error.status === 404) {
        throw error; // Re-throw NotFoundException as is
      }

      if (error.response?.data?.error_code) {
        const plaidError = await this.plaidService.handlePlaidError(
          error.response.data
        );
        throw new HttpException(plaidError, HttpStatus.BAD_REQUEST);
      }

      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to sync transactions',
        error: error.message,
      });
    }
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Plaid webhooks for MVP integration' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiBody({ type: PlaidWebhookDto })
  async handleWebhook(@Body() webhookPayload: PlaidWebhookDto) {
    try {
      this.logger.log(
        `Received webhook: ${webhookPayload.webhookType}:${webhookPayload.webhookCode} for item: ${webhookPayload.itemId}`
      );

      const result = await this.plaidService.handleWebhook(webhookPayload);

      this.logger.log(
        `Webhook processed: ${result.status} - ${result.message}`
      );

      return {
        success: true,
        data: result,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to process webhook:`, error);

      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to process webhook',
        error: error.message,
      });
    }
  }

  @Get('accounts/:accountId/transactions')
  @ApiOperation({ summary: 'Get transactions for a specific account' })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
    type: [PlaidTransactionResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAccountTransactions(
    @Request() req,
    @Param('accountId') accountId: string
  ) {
    try {
      this.logger.log(
        `Fetching transactions for account: ${accountId}, user: ${req.user.id}`
      );

      // Verify account belongs to user first
      const accounts = await this.plaidService.getAccountsByUser(req.user.id);
      const account = accounts.find(acc => acc.id === accountId);

      if (!account) {
        throw new HttpException(
          {
            success: false,
            message: 'Account not found or does not belong to user',
          },
          HttpStatus.NOT_FOUND
        );
      }

      // For now, we'll return a placeholder since we need to implement transaction fetching
      // In production, this would fetch from plaid_transactions table
      return {
        success: true,
        data: [],
        message: 'Transactions retrieved successfully',
      };
    } catch (error) {
      if (error.status) {
        throw error; // Re-throw HTTP exceptions as is
      }

      this.logger.error(
        `Failed to fetch transactions for account ${accountId}:`,
        error
      );

      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to retrieve transactions',
        error: error.message,
      });
    }
  }

  @Post('accounts/:accountId/disconnect')
  @ApiOperation({ summary: 'Disconnect a bank account' })
  @ApiResponse({
    status: 200,
    description: 'Account disconnected successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async disconnectAccount(
    @Request() req,
    @Param('accountId') accountId: string
  ) {
    try {
      this.logger.log(
        `Disconnecting account: ${accountId}, user: ${req.user.id}`
      );

      // Verify account belongs to user first
      const accounts = await this.plaidService.getAccountsByUser(req.user.id);
      const account = accounts.find(acc => acc.id === accountId);

      if (!account) {
        throw new HttpException(
          {
            success: false,
            message: 'Account not found or does not belong to user',
          },
          HttpStatus.NOT_FOUND
        );
      }

      await this.plaidService.disconnectBank(req.user.id, accountId);

      this.logger.log(`Account disconnected successfully: ${accountId}`);

      return {
        success: true,
        message: 'Account disconnected successfully',
      };
    } catch (error) {
      if (error.status) {
        throw error; // Re-throw HTTP exceptions as is
      }

      this.logger.error(`Failed to disconnect account ${accountId}:`, error);

      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to disconnect account',
        error: error.message,
      });
    }
  }
}
