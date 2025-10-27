import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BankingProvider } from '../../../generated/prisma';

/**
 * Request DTO for initiating banking link
 *
 * Starts the OAuth flow with the specified banking provider.
 * If no provider is specified, defaults to SALTEDGE.
 *
 * @example
 * {
 *   "provider": "SALTEDGE"
 * }
 */
export class InitiateLinkRequestDto {
  @ApiPropertyOptional({
    enum: ['SALTEDGE', 'TINK', 'YAPILY'],
    default: 'SALTEDGE',
    description: 'Banking provider to use for linking',
  })
  @IsOptional()
  @IsEnum(BankingProvider)
  provider?: BankingProvider;
}

/**
 * Response DTO for initiating banking link
 *
 * Contains the OAuth redirect URL and connection ID to use later.
 *
 * @example
 * {
 *   "redirectUrl": "https://saltedge.com/oauth/authorize?connection_id=123456&...",
 *   "connectionId": "550e8400-e29b-41d4-a716-446655440000"
 * }
 */
export class InitiateLinkResponseDto {
  /**
   * URL to redirect user to for OAuth authorization
   *
   * User should be redirected to this URL to authorize the bank connection.
   * After authorization, they will be redirected back to the app.
   */
  redirectUrl: string;

  /**
   * MoneyWise connection ID
   *
   * Use this ID when calling complete-link endpoint after OAuth.
   * This is the internal ID, not the provider's connection ID.
   */
  connectionId: string;
}
