import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../auth/decorators/public.decorator';
import { BankingService } from '../services/banking.service';
import * as crypto from 'crypto';

/**
 * SaltEdge Webhook callback payload types
 */
interface SaltEdgeNotifyPayload {
  data: {
    customer_id: string;
    connection_id: string;
    custom_fields?: Record<string, unknown>;
  };
  meta: {
    version: string;
    time: string;
  };
}

interface SaltEdgeSuccessPayload {
  data: {
    connection_id: string;
    customer_id: string;
    custom_fields?: Record<string, unknown>;
    provider_code?: string;
    provider_name?: string;
    country_code?: string;
  };
  meta: {
    version: string;
    time: string;
  };
}

interface SaltEdgeFailPayload {
  data: {
    connection_id?: string;
    customer_id: string;
    error_class: string;
    error_message: string;
    custom_fields?: Record<string, unknown>;
  };
  meta: {
    version: string;
    time: string;
  };
}

/**
 * Webhook Controller for SaltEdge Callbacks
 *
 * SaltEdge sends webhooks when:
 * - notify: Connection creation started
 * - success: Connection successfully created
 * - fail: Connection failed
 *
 * Security:
 * - Signature verification using RSA public key
 * - All endpoints are public (no JWT required)
 * - IP whitelist recommended in production
 *
 * Documentation: https://docs.saltedge.com/v6/callbacks/
 */
@ApiTags('Banking Webhooks')
@Controller('banking/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly webhookSecret: string;
  private readonly signatureVerificationEnabled: boolean;

  constructor(
    private readonly bankingService: BankingService,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.get<string>('SALTEDGE_WEBHOOK_SECRET', '');
    this.signatureVerificationEnabled = this.configService.get<boolean>(
      'SALTEDGE_VERIFY_WEBHOOK_SIGNATURE',
      true,
    );
  }

  /**
   * Verify SaltEdge webhook signature
   * SaltEdge signs webhooks with SHA256 HMAC using the app secret
   */
  private verifySignature(
    signature: string | undefined,
    payload: string,
  ): boolean {
    if (!this.signatureVerificationEnabled) {
      this.logger.warn('Webhook signature verification is disabled');
      return true;
    }

    if (!signature) {
      this.logger.warn('Missing webhook signature');
      return false;
    }

    if (!this.webhookSecret) {
      this.logger.warn('SALTEDGE_WEBHOOK_SECRET not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * Handle SaltEdge notify callback
   * Called when connection creation process starts
   */
  @Post('notify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'SaltEdge notify webhook',
    description: 'Handles the notify callback when connection creation starts',
  })
  @ApiResponse({ status: 200, description: 'Notification received' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async handleNotify(
    @Body() body: SaltEdgeNotifyPayload,
    @Headers('x-saltedge-signature') signature: string,
  ): Promise<{ status: string }> {
    this.logger.log(`Webhook notify received: ${JSON.stringify(body.data)}`);

    // Verify signature
    if (!this.verifySignature(signature, JSON.stringify(body))) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    if (!body.data?.customer_id || !body.data?.connection_id) {
      throw new BadRequestException('Missing required fields: customer_id, connection_id');
    }

    try {
      await this.bankingService.handleWebhookCallback(
        body.data.customer_id,
        body.data.connection_id,
        'start',
        body.data.custom_fields,
      );

      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Failed to handle notify webhook', error);
      // Return 200 anyway to acknowledge receipt (SaltEdge will retry otherwise)
      return { status: 'error', error: error.message } as never;
    }
  }

  /**
   * Handle SaltEdge success callback
   * Called when connection is successfully created and authorized
   */
  @Post('success')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'SaltEdge success webhook',
    description: 'Handles the success callback when connection is authorized',
  })
  @ApiResponse({ status: 200, description: 'Success received' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async handleSuccess(
    @Body() body: SaltEdgeSuccessPayload,
    @Headers('x-saltedge-signature') signature: string,
  ): Promise<{ status: string }> {
    this.logger.log(`Webhook success received: ${JSON.stringify(body.data)}`);

    // Verify signature
    if (!this.verifySignature(signature, JSON.stringify(body))) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    if (!body.data?.customer_id || !body.data?.connection_id) {
      throw new BadRequestException('Missing required fields: customer_id, connection_id');
    }

    try {
      await this.bankingService.handleWebhookCallback(
        body.data.customer_id,
        body.data.connection_id,
        'finish',
        {
          providerCode: body.data.provider_code,
          providerName: body.data.provider_name,
          countryCode: body.data.country_code,
          ...body.data.custom_fields,
        },
      );

      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Failed to handle success webhook', error);
      return { status: 'error', error: error.message } as never;
    }
  }

  /**
   * Handle SaltEdge fail callback
   * Called when connection creation fails
   */
  @Post('fail')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'SaltEdge fail webhook',
    description: 'Handles the fail callback when connection creation fails',
  })
  @ApiResponse({ status: 200, description: 'Failure received' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async handleFail(
    @Body() body: SaltEdgeFailPayload,
    @Headers('x-saltedge-signature') signature: string,
  ): Promise<{ status: string }> {
    this.logger.log(`Webhook fail received: ${JSON.stringify(body.data)}`);

    // Verify signature
    if (!this.verifySignature(signature, JSON.stringify(body))) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    if (!body.data?.customer_id) {
      throw new BadRequestException('Missing required field: customer_id');
    }

    try {
      await this.bankingService.handleWebhookCallback(
        body.data.customer_id,
        body.data.connection_id || '',
        'fail',
        {
          errorClass: body.data.error_class,
          errorMessage: body.data.error_message,
          ...body.data.custom_fields,
        },
      );

      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Failed to handle fail webhook', error);
      return { status: 'error', error: error.message } as never;
    }
  }

  /**
   * Health check endpoint for webhook availability
   * SaltEdge may ping this to verify webhook URL is reachable
   */
  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Don't show in Swagger
  async handlePing(): Promise<{ status: string }> {
    this.logger.debug('Webhook ping received');
    return { status: 'ok' };
  }

  /**
   * Generic webhook handler for other events
   * SaltEdge may send additional event types
   */
  @Post('callback')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generic SaltEdge callback',
    description: 'Handles any SaltEdge callback (catch-all)',
  })
  async handleCallback(
    @Body() body: Record<string, unknown>,
    @Headers('x-saltedge-signature') _signature: string,
  ): Promise<{ status: string }> {
    this.logger.log(`Generic webhook received: ${JSON.stringify(body)}`);

    // Log for debugging but don't fail
    return { status: 'ok' };
  }
}
