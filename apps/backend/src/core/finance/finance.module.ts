/**
 * FinanceModule - Core financial calculation services
 *
 * This module provides financial calculation services that can be
 * imported by other modules (Accounts, Analytics, Dashboard).
 *
 * Exports:
 * - BalanceNormalizerService: Normalize account balances for consistent display
 *
 * @phase Phase 0 - Schema Foundation
 */

import { Module } from '@nestjs/common';
import { BalanceNormalizerService } from './balance-normalizer.service';

@Module({
  providers: [BalanceNormalizerService],
  exports: [BalanceNormalizerService],
})
export class FinanceModule {}
