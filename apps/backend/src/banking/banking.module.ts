import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SaltEdgeProvider } from './providers/saltedge.provider';
import { MockBankingProvider } from './providers/__mocks__/mock-banking.provider';
import { BankingService, BankingProviderFactory } from './services/banking.service';
import { BankingController } from './banking.controller';
import { WebhookController } from './controllers/webhook.controller';

/**
 * BankingModule - Handles all banking integrations
 *
 * Provides:
 * - Provider-agnostic banking service
 * - SaltEdge provider implementation (or Mock for tests)
 * - Provider factory for multi-provider support
 * - REST API controller for banking operations
 *
 * Environment Variables:
 * - USE_MOCK_BANKING=true - Use mock provider instead of SaltEdge (for tests)
 * - SALTEDGE_CLIENT_ID - SaltEdge API client ID (required for real provider)
 * - SALTEDGE_SECRET - SaltEdge API secret (required for real provider)
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
  controllers: [BankingController, WebhookController],
  providers: [
    // Conditional provider injection based on environment
    {
      provide: 'BANKING_PROVIDER',
      useFactory: (configService: ConfigService) => {
        const useMock = configService.get<string>('USE_MOCK_BANKING', 'false') === 'true';
        const isTest = process.env.NODE_ENV === 'test';

        if (useMock || isTest) {
          return new MockBankingProvider();
        }

        // Try to instantiate SaltEdge provider
        // If credentials are missing, it will throw an error
        try {
          return new SaltEdgeProvider(configService);
        } catch (error) {
          // Fallback to mock if SaltEdge credentials not configured
          console.warn('⚠️  SaltEdge credentials not configured, using MockBankingProvider');
          return new MockBankingProvider();
        }
      },
      inject: [ConfigService]
    },
    // Factory and service
    {
      provide: BankingProviderFactory,
      useFactory: (configService: ConfigService, provider: any) => {
        return new BankingProviderFactory(configService, provider);
      },
      inject: [ConfigService, 'BANKING_PROVIDER']
    },
    BankingService,
  ],
  exports: [BankingService, BankingProviderFactory],
})
export class BankingModule {}
