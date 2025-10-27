import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SaltEdgeProvider } from './providers/saltedge.provider';
import { BankingService, BankingProviderFactory } from './services/banking.service';
import { BankingController } from './banking.controller';

/**
 * BankingModule - Handles all banking integrations
 *
 * Provides:
 * - Provider-agnostic banking service
 * - SaltEdge provider implementation
 * - Provider factory for multi-provider support
 * - REST API controller for banking operations
 *
 * Upcoming:
 * - Tink provider (Phase 2)
 * - Yapily provider (Phase 3)
 * - TrueLayer provider (Phase 3)
 *
 * Usage:
 * ```typescript
 * import { BankingModule } from './banking/banking.module';
 *
 * @Module({
 *   imports: [BankingModule],
 * })
 * export class AppModule {}
 * ```
 *
 * Then inject BankingService where needed:
 * ```typescript
 * constructor(private bankingService: BankingService) {}
 * ```
 *
 * REST Endpoints:
 * - POST /api/banking/initiate-link - Start OAuth flow
 * - POST /api/banking/complete-link - Complete OAuth, store accounts
 * - GET /api/banking/accounts - List linked accounts
 * - POST /api/banking/sync/:accountId - Sync account
 * - DELETE /api/banking/revoke/:connectionId - Disconnect bank
 * - GET /api/banking/providers - List available providers
 */
@Module({
  imports: [ConfigModule],
  controllers: [BankingController],
  providers: [
    // Provider implementations
    SaltEdgeProvider,
    // Factory and service
    BankingProviderFactory,
    BankingService,
  ],
  exports: [BankingService, BankingProviderFactory],
})
export class BankingModule {}
