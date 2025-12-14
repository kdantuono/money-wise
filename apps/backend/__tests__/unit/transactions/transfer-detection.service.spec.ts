/**
 * TransferDetectionService Unit Tests
 *
 * Tests the transfer detection service with confidence scoring,
 * BNPL pattern matching, and match filtering.
 *
 * Coverage:
 * - Confidence scoring algorithm (amount, date, account comparison)
 * - BNPL pattern detection
 * - Match filtering and sorting
 * - Edge cases for boundary conditions
 *
 * @phase STORY-1.5.7 - Phase 2 Transaction Enhancement
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  TransferDetectionService,
  ConfidenceLevel,
  TransferSuggestion,
} from '../../../src/transactions/services/transfer-detection.service';
import { PrismaService } from '../../../src/core/database/prisma/prisma.service';
import { FlowType } from '../../../generated/prisma';

describe('TransferDetectionService', () => {
  let service: TransferDetectionService;
  let prismaService: jest.Mocked<PrismaService>;

  // Mock transaction factory
  const createMockTransaction = (overrides: Partial<{
    id: string;
    accountId: string;
    amount: number;
    date: Date;
    flowType: FlowType;
    description: string;
    transferGroupId: string | null;
    account: { familyId: string };
  }> = {}) => ({
    id: 'tx-1',
    accountId: 'account-1',
    amount: 100,
    date: new Date('2024-01-15'),
    flowType: FlowType.EXPENSE,
    description: 'Test transaction',
    transferGroupId: null,
    account: { familyId: 'family-1' },
    ...overrides,
  });

  beforeEach(async () => {
    const mockPrismaService = {
      transaction: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferDetectionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TransferDetectionService>(TransferDetectionService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findPotentialMatches', () => {
    it('should return empty array when transaction not found', async () => {
      prismaService.transaction.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.findPotentialMatches('tx-1', 'family-1');

      expect(result).toEqual([]);
    });

    it('should find matches with opposite flow type', async () => {
      const sourceTransaction = createMockTransaction({
        id: 'tx-1',
        flowType: FlowType.EXPENSE,
        amount: 100,
        date: new Date('2024-01-15'),
      });

      const matchingTransaction = createMockTransaction({
        id: 'tx-2',
        accountId: 'account-2',
        flowType: FlowType.INCOME,
        amount: 100,
        date: new Date('2024-01-15'),
      });

      prismaService.transaction.findFirst = jest.fn().mockResolvedValue(sourceTransaction);
      prismaService.transaction.findMany = jest.fn().mockResolvedValue([matchingTransaction]);

      const result = await service.findPotentialMatches('tx-1', 'family-1');

      expect(result).toHaveLength(1);
      expect(result[0].matchedTransactionId).toBe('tx-2');
      expect(result[0].confidence).toBe(ConfidenceLevel.HIGH);
    });

    it('should filter matches with score below 30', async () => {
      const sourceTransaction = createMockTransaction({
        id: 'tx-1',
        flowType: FlowType.EXPENSE,
        amount: 100,
        date: new Date('2024-01-15'),
      });

      // Match with very different amount and same account (low score)
      const poorMatch = createMockTransaction({
        id: 'tx-2',
        accountId: 'account-1', // Same account, no bonus
        flowType: FlowType.INCOME,
        amount: 500, // Very different amount
        date: new Date('2024-01-18'), // 3 days apart
      });

      prismaService.transaction.findFirst = jest.fn().mockResolvedValue(sourceTransaction);
      prismaService.transaction.findMany = jest.fn().mockResolvedValue([poorMatch]);

      const result = await service.findPotentialMatches('tx-1', 'family-1');

      // Should be filtered out due to low score
      expect(result).toHaveLength(0);
    });

    it('should exclude transactions already in a transfer group', async () => {
      const sourceTransaction = createMockTransaction({
        id: 'tx-1',
        flowType: FlowType.EXPENSE,
      });

      prismaService.transaction.findFirst = jest.fn().mockResolvedValue(sourceTransaction);
      prismaService.transaction.findMany = jest.fn().mockResolvedValue([]);

      await service.findPotentialMatches('tx-1', 'family-1');

      // Verify the query excludes transactions with transferGroupId
      expect(prismaService.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            transferGroupId: null,
          }),
        }),
      );
    });

    it('should sort results by confidence score descending', async () => {
      const sourceTransaction = createMockTransaction({
        id: 'tx-1',
        flowType: FlowType.EXPENSE,
        amount: 100,
        date: new Date('2024-01-15'),
      });

      const highMatch = createMockTransaction({
        id: 'tx-high',
        accountId: 'account-2',
        flowType: FlowType.INCOME,
        amount: 100, // Exact match
        date: new Date('2024-01-15'), // Same day
      });

      const mediumMatch = createMockTransaction({
        id: 'tx-medium',
        accountId: 'account-3',
        flowType: FlowType.INCOME,
        amount: 102, // Within 5%
        date: new Date('2024-01-16'), // 1 day apart
      });

      prismaService.transaction.findFirst = jest.fn().mockResolvedValue(sourceTransaction);
      prismaService.transaction.findMany = jest.fn().mockResolvedValue([mediumMatch, highMatch]);

      const result = await service.findPotentialMatches('tx-1', 'family-1');

      expect(result).toHaveLength(2);
      expect(result[0].matchedTransactionId).toBe('tx-high');
      expect(result[1].matchedTransactionId).toBe('tx-medium');
      expect(result[0].confidenceScore).toBeGreaterThan(result[1].confidenceScore);
    });
  });

  describe('Confidence Scoring Algorithm', () => {
    const setupScoring = (sourceOverrides: any, matchOverrides: any) => {
      const sourceTransaction = createMockTransaction(sourceOverrides);
      const matchTransaction = createMockTransaction(matchOverrides);

      prismaService.transaction.findFirst = jest.fn().mockResolvedValue(sourceTransaction);
      prismaService.transaction.findMany = jest.fn().mockResolvedValue([matchTransaction]);

      return service.findPotentialMatches('tx-1', 'family-1');
    };

    describe('Amount Scoring (40 points max)', () => {
      it('should give 40 points for exact amount match', async () => {
        const result = await setupScoring(
          { id: 'tx-1', flowType: FlowType.EXPENSE, amount: 100, date: new Date('2024-01-15'), accountId: 'account-1' },
          { id: 'tx-2', flowType: FlowType.INCOME, amount: 100, date: new Date('2024-01-18'), accountId: 'account-1' },
        );

        expect(result[0].reasons).toContain('Exact amount match');
        // Score: 40 (exact amount) + 5 (within 3 days) = 45
        expect(result[0].confidenceScore).toBeGreaterThanOrEqual(40);
      });

      it('should give 35 points for amount within 1%', async () => {
        const result = await setupScoring(
          { id: 'tx-1', flowType: FlowType.EXPENSE, amount: 100, date: new Date('2024-01-15'), accountId: 'account-1' },
          { id: 'tx-2', flowType: FlowType.INCOME, amount: 100.5, date: new Date('2024-01-18'), accountId: 'account-1' },
        );

        expect(result[0].reasons).toContain('Amount within 1%');
      });

      it('should give 25 points for amount within 5%', async () => {
        const result = await setupScoring(
          { id: 'tx-1', flowType: FlowType.EXPENSE, amount: 100, date: new Date('2024-01-15'), accountId: 'account-1' },
          { id: 'tx-2', flowType: FlowType.INCOME, amount: 103, date: new Date('2024-01-18'), accountId: 'account-1' },
        );

        expect(result[0].reasons).toContain('Amount within 5%');
      });
    });

    describe('Date Proximity Scoring (30 points max)', () => {
      it('should give 30 points for same day', async () => {
        const result = await setupScoring(
          { id: 'tx-1', flowType: FlowType.EXPENSE, amount: 100, date: new Date('2024-01-15'), accountId: 'account-1' },
          { id: 'tx-2', flowType: FlowType.INCOME, amount: 200, date: new Date('2024-01-15'), accountId: 'account-1' },
        );

        expect(result[0].reasons).toContain('Same day');
      });

      it('should give 25 points for within 1 day', async () => {
        // Use different accounts (+15) to pass the 30 threshold: 25 + 15 = 40 >= 30
        const result = await setupScoring(
          { id: 'tx-1', flowType: FlowType.EXPENSE, amount: 100, date: new Date('2024-01-15'), accountId: 'account-1' },
          { id: 'tx-2', flowType: FlowType.INCOME, amount: 200, date: new Date('2024-01-16'), accountId: 'account-2' },
        );

        expect(result[0].reasons).toContain('Within 1 day');
      });

      it('should give 15 points for within 2 days', async () => {
        // Use different accounts (+15) to pass the 30 threshold: 15 + 15 = 30 >= 30
        const result = await setupScoring(
          { id: 'tx-1', flowType: FlowType.EXPENSE, amount: 100, date: new Date('2024-01-15'), accountId: 'account-1' },
          { id: 'tx-2', flowType: FlowType.INCOME, amount: 200, date: new Date('2024-01-17'), accountId: 'account-2' },
        );

        expect(result[0].reasons).toContain('Within 2 days');
      });

      it('should give 5 points for within 3 days', async () => {
        // Use exact amount (+40) to pass the 30 threshold: 5 + 40 = 45 >= 30
        const result = await setupScoring(
          { id: 'tx-1', flowType: FlowType.EXPENSE, amount: 100, date: new Date('2024-01-15'), accountId: 'account-1' },
          { id: 'tx-2', flowType: FlowType.INCOME, amount: 100, date: new Date('2024-01-18'), accountId: 'account-1' },
        );

        expect(result[0].reasons).toContain('Within 3 days');
      });
    });

    describe('Different Accounts Scoring (15 points)', () => {
      it('should give 15 points bonus for different accounts', async () => {
        const result = await setupScoring(
          { id: 'tx-1', flowType: FlowType.EXPENSE, amount: 100, date: new Date('2024-01-15'), accountId: 'account-1' },
          { id: 'tx-2', flowType: FlowType.INCOME, amount: 100, date: new Date('2024-01-18'), accountId: 'account-2' },
        );

        expect(result[0].reasons).toContain('Different accounts');
        // Score should include 15 point bonus
        expect(result[0].confidenceScore).toBeGreaterThanOrEqual(55); // 40 + 5 + 15 = 60
      });

      it('should not give bonus for same account', async () => {
        const result = await setupScoring(
          { id: 'tx-1', flowType: FlowType.EXPENSE, amount: 100, date: new Date('2024-01-15'), accountId: 'account-1' },
          { id: 'tx-2', flowType: FlowType.INCOME, amount: 100, date: new Date('2024-01-18'), accountId: 'account-1' },
        );

        expect(result[0].reasons).not.toContain('Different accounts');
      });
    });

    describe('Confidence Level Classification', () => {
      it('should classify as HIGH for score >= 80', async () => {
        const result = await setupScoring(
          { id: 'tx-1', flowType: FlowType.EXPENSE, amount: 100, date: new Date('2024-01-15'), accountId: 'account-1' },
          { id: 'tx-2', flowType: FlowType.INCOME, amount: 100, date: new Date('2024-01-15'), accountId: 'account-2' },
        );

        // Score: 40 (exact) + 30 (same day) + 15 (diff accounts) = 85
        expect(result[0].confidence).toBe(ConfidenceLevel.HIGH);
        expect(result[0].confidenceScore).toBeGreaterThanOrEqual(80);
      });

      it('should classify as MEDIUM for score 50-79', async () => {
        const result = await setupScoring(
          { id: 'tx-1', flowType: FlowType.EXPENSE, amount: 100, date: new Date('2024-01-15'), accountId: 'account-1' },
          { id: 'tx-2', flowType: FlowType.INCOME, amount: 100, date: new Date('2024-01-17'), accountId: 'account-2' },
        );

        // Score: 40 (exact) + 15 (2 days) + 15 (diff accounts) = 70
        expect(result[0].confidence).toBe(ConfidenceLevel.MEDIUM);
        expect(result[0].confidenceScore).toBeGreaterThanOrEqual(50);
        expect(result[0].confidenceScore).toBeLessThan(80);
      });

      it('should classify as LOW for score 30-49', async () => {
        const result = await setupScoring(
          { id: 'tx-1', flowType: FlowType.EXPENSE, amount: 100, date: new Date('2024-01-15'), accountId: 'account-1' },
          { id: 'tx-2', flowType: FlowType.INCOME, amount: 100, date: new Date('2024-01-18'), accountId: 'account-1' },
        );

        // Score: 40 (exact) + 5 (3 days) = 45 - LOW
        expect(result[0].confidence).toBe(ConfidenceLevel.LOW);
        expect(result[0].confidenceScore).toBeLessThan(50);
        expect(result[0].confidenceScore).toBeGreaterThanOrEqual(30);
      });
    });
  });

  describe('BNPL Pattern Detection', () => {
    const setupBNPLTest = (sourceDesc: string, matchDesc: string) => {
      const sourceTransaction = createMockTransaction({
        id: 'tx-1',
        flowType: FlowType.EXPENSE,
        amount: 100,
        date: new Date('2024-01-15'),
        description: sourceDesc,
        accountId: 'account-1',
      });

      const matchTransaction = createMockTransaction({
        id: 'tx-2',
        flowType: FlowType.INCOME,
        amount: 100,
        date: new Date('2024-01-15'),
        description: matchDesc,
        accountId: 'account-1',
      });

      prismaService.transaction.findFirst = jest.fn().mockResolvedValue(sourceTransaction);
      prismaService.transaction.findMany = jest.fn().mockResolvedValue([matchTransaction]);

      return service.findPotentialMatches('tx-1', 'family-1');
    };

    it('should detect "Klarna" BNPL pattern', async () => {
      const result = await setupBNPLTest('Klarna payment', 'Regular transaction');

      expect(result[0].reasons).toContain('BNPL pattern detected');
    });

    it('should detect "Afterpay" BNPL pattern', async () => {
      const result = await setupBNPLTest('Afterpay installment', 'Something');

      expect(result[0].reasons).toContain('BNPL pattern detected');
    });

    it('should detect "Affirm" BNPL pattern', async () => {
      const result = await setupBNPLTest('Payment to Affirm', 'Other');

      expect(result[0].reasons).toContain('BNPL pattern detected');
    });

    it('should detect "pay in 3" pattern (case insensitive)', async () => {
      const result = await setupBNPLTest('Pay in 3 installment', 'Regular');

      expect(result[0].reasons).toContain('BNPL pattern detected');
    });

    it('should detect "PayIn3" pattern (no spaces)', async () => {
      const result = await setupBNPLTest('PayIn3 purchase', 'Regular');

      expect(result[0].reasons).toContain('BNPL pattern detected');
    });

    it('should detect "Satispay" BNPL pattern', async () => {
      const result = await setupBNPLTest('Satispay transfer', 'Regular');

      expect(result[0].reasons).toContain('BNPL pattern detected');
    });

    it('should detect BNPL in matched transaction description', async () => {
      const result = await setupBNPLTest('Regular payment', 'Klarna refund');

      expect(result[0].reasons).toContain('BNPL pattern detected');
    });

    it('should give 15 points bonus for BNPL detection', async () => {
      const withBNPL = await setupBNPLTest('Klarna payment', 'Regular');
      const withoutBNPL = await setupBNPLTest('Regular payment', 'Other regular');

      expect(withBNPL[0].confidenceScore).toBeGreaterThan(withoutBNPL[0].confidenceScore);
      expect(withBNPL[0].confidenceScore - withoutBNPL[0].confidenceScore).toBe(15);
    });
  });

  describe('getAllSuggestions', () => {
    it('should return deduplicated suggestions', async () => {
      const tx1 = createMockTransaction({
        id: 'tx-1',
        flowType: FlowType.EXPENSE,
        amount: 100,
        date: new Date('2024-01-15'),
        accountId: 'account-1',
      });

      const tx2 = createMockTransaction({
        id: 'tx-2',
        flowType: FlowType.INCOME,
        amount: 100,
        date: new Date('2024-01-15'),
        accountId: 'account-2',
      });

      // First call returns both transactions
      prismaService.transaction.findMany = jest.fn()
        .mockResolvedValueOnce([tx1, tx2])
        .mockResolvedValueOnce([tx2]) // Matches for tx1
        .mockResolvedValueOnce([tx1]); // Matches for tx2

      prismaService.transaction.findFirst = jest.fn()
        .mockResolvedValueOnce(tx1)
        .mockResolvedValueOnce(tx2);

      const result = await service.getAllSuggestions('family-1');

      // Should deduplicate: tx1-tx2 pair should appear only once
      const pairKeys = result.map(s =>
        [s.transactionId, s.matchedTransactionId].sort().join('-')
      );
      const uniqueKeys = [...new Set(pairKeys)];
      expect(pairKeys.length).toBe(uniqueKeys.length);
    });

    it('should filter suggestions with score below 50', async () => {
      const tx1 = createMockTransaction({
        id: 'tx-1',
        flowType: FlowType.EXPENSE,
        amount: 100,
        date: new Date('2024-01-15'),
        accountId: 'account-1',
      });

      // Low-score match (different amount, 3 days apart, same account)
      const lowScoreMatch = createMockTransaction({
        id: 'tx-2',
        flowType: FlowType.INCOME,
        amount: 100,
        date: new Date('2024-01-18'),
        accountId: 'account-1',
      });

      prismaService.transaction.findMany = jest.fn()
        .mockResolvedValueOnce([tx1])
        .mockResolvedValueOnce([lowScoreMatch]);

      prismaService.transaction.findFirst = jest.fn()
        .mockResolvedValue(tx1);

      const result = await service.getAllSuggestions('family-1');

      // Score would be 40 (exact) + 5 (3 days) = 45 < 50, filtered
      expect(result).toHaveLength(0);
    });

    it('should sort suggestions by confidence score', async () => {
      const highScoreTx = createMockTransaction({
        id: 'tx-1',
        flowType: FlowType.EXPENSE,
        amount: 100,
        date: new Date('2024-01-15'),
        accountId: 'account-1',
      });

      const highScoreMatch = createMockTransaction({
        id: 'tx-2',
        flowType: FlowType.INCOME,
        amount: 100,
        date: new Date('2024-01-15'),
        accountId: 'account-2',
      });

      prismaService.transaction.findMany = jest.fn()
        .mockResolvedValueOnce([highScoreTx])
        .mockResolvedValueOnce([highScoreMatch]);

      prismaService.transaction.findFirst = jest.fn()
        .mockResolvedValue(highScoreTx);

      const result = await service.getAllSuggestions('family-1');

      // Verify sorted by confidence score
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].confidenceScore).toBeGreaterThanOrEqual(result[i].confidenceScore);
      }
    });

    it('should limit to 100 transactions for performance', async () => {
      prismaService.transaction.findMany = jest.fn().mockResolvedValue([]);

      await service.getAllSuggestions('family-1');

      expect(prismaService.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle null descriptions gracefully', async () => {
      const sourceTransaction = createMockTransaction({
        id: 'tx-1',
        flowType: FlowType.EXPENSE,
        amount: 100,
        date: new Date('2024-01-15'),
        description: undefined as any,
      });

      const matchTransaction = createMockTransaction({
        id: 'tx-2',
        flowType: FlowType.INCOME,
        amount: 100,
        date: new Date('2024-01-15'),
        description: undefined as any,
        accountId: 'account-2',
      });

      prismaService.transaction.findFirst = jest.fn().mockResolvedValue(sourceTransaction);
      prismaService.transaction.findMany = jest.fn().mockResolvedValue([matchTransaction]);

      // Should not throw
      const result = await service.findPotentialMatches('tx-1', 'family-1');
      expect(result).toHaveLength(1);
    });

    it('should handle zero amount transactions', async () => {
      const sourceTransaction = createMockTransaction({
        id: 'tx-1',
        flowType: FlowType.EXPENSE,
        amount: 0,
        date: new Date('2024-01-15'),
      });

      const matchTransaction = createMockTransaction({
        id: 'tx-2',
        flowType: FlowType.INCOME,
        amount: 0,
        date: new Date('2024-01-15'),
        accountId: 'account-2',
      });

      prismaService.transaction.findFirst = jest.fn().mockResolvedValue(sourceTransaction);
      prismaService.transaction.findMany = jest.fn().mockResolvedValue([matchTransaction]);

      const result = await service.findPotentialMatches('tx-1', 'family-1');
      expect(result[0].reasons).toContain('Exact amount match');
    });

    it('should correctly calculate days difference across months', async () => {
      const sourceTransaction = createMockTransaction({
        id: 'tx-1',
        flowType: FlowType.EXPENSE,
        amount: 100,
        date: new Date('2024-01-31'),
        accountId: 'account-1',
      });

      const matchTransaction = createMockTransaction({
        id: 'tx-2',
        flowType: FlowType.INCOME,
        amount: 100,
        date: new Date('2024-02-02'),
        accountId: 'account-1',
      });

      prismaService.transaction.findFirst = jest.fn().mockResolvedValue(sourceTransaction);
      prismaService.transaction.findMany = jest.fn().mockResolvedValue([matchTransaction]);

      const result = await service.findPotentialMatches('tx-1', 'family-1');

      expect(result[0].daysDifference).toBe(2);
      expect(result[0].reasons).toContain('Within 2 days');
    });
  });
});
