import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma/prisma.service';
import { FlowType } from '../../../generated/prisma';

export enum ConfidenceLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface TransferSuggestion {
  transactionId: string;
  matchedTransactionId: string;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  reasons: string[];
  amount: number;
  matchedAmount: number;
  daysDifference: number;
}

@Injectable()
export class TransferDetectionService {
  private readonly BNPL_PATTERN = /pay.?in.?3|klarna|afterpay|satispay|affirm/i;
  private readonly MAX_DAY_DIFFERENCE = 3;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find potential transfer matches for a transaction
   */
  async findPotentialMatches(
    transactionId: string,
    familyId: string,
  ): Promise<TransferSuggestion[]> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, account: { familyId } },
      include: { account: true },
    });

    if (!transaction) return [];

    // Determine opposite flow type
    const oppositeFlowType =
      transaction.flowType === FlowType.INCOME ? FlowType.EXPENSE : FlowType.INCOME;

    // Date range for matching
    const startDate = new Date(transaction.date);
    startDate.setDate(startDate.getDate() - this.MAX_DAY_DIFFERENCE);
    const endDate = new Date(transaction.date);
    endDate.setDate(endDate.getDate() + this.MAX_DAY_DIFFERENCE);

    // Find potential matches
    const matches = await this.prisma.transaction.findMany({
      where: {
        account: { familyId },
        id: { not: transactionId },
        flowType: oppositeFlowType,
        transferGroupId: null,
        date: { gte: startDate, lte: endDate },
      },
      include: { account: true },
    });

    // Score and filter matches
    return matches
      .map((match) => this.scoreMatch(transaction, match))
      .filter((s) => s.confidenceScore >= 30)
      .sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * Calculate confidence score for a potential match
   */
  private scoreMatch(transaction: any, match: any): TransferSuggestion {
    let score = 0;
    const reasons: string[] = [];

    // Amount comparison (40 points max)
    const amountDiff = Math.abs(
      Number(transaction.amount) - Number(match.amount),
    );
    const amountRatio = amountDiff / Number(transaction.amount);

    if (amountDiff === 0) {
      score += 40;
      reasons.push('Exact amount match');
    } else if (amountRatio <= 0.01) {
      score += 35;
      reasons.push('Amount within 1%');
    } else if (amountRatio <= 0.05) {
      score += 25;
      reasons.push('Amount within 5%');
    }

    // Date proximity (30 points max)
    const daysDiff = Math.abs(
      (new Date(transaction.date).getTime() - new Date(match.date).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (daysDiff === 0) {
      score += 30;
      reasons.push('Same day');
    } else if (daysDiff <= 1) {
      score += 25;
      reasons.push('Within 1 day');
    } else if (daysDiff <= 2) {
      score += 15;
      reasons.push('Within 2 days');
    } else {
      score += 5;
      reasons.push('Within 3 days');
    }

    // Different accounts bonus (15 points)
    if (transaction.accountId !== match.accountId) {
      score += 15;
      reasons.push('Different accounts');
    }

    // BNPL detection (15 points)
    const desc = `${transaction.description || ''} ${match.description || ''}`;
    if (this.BNPL_PATTERN.test(desc)) {
      score += 15;
      reasons.push('BNPL pattern detected');
    }

    // Determine confidence level
    let confidence: ConfidenceLevel;
    if (score >= 80) {
      confidence = ConfidenceLevel.HIGH;
    } else if (score >= 50) {
      confidence = ConfidenceLevel.MEDIUM;
    } else {
      confidence = ConfidenceLevel.LOW;
    }

    return {
      transactionId: transaction.id,
      matchedTransactionId: match.id,
      confidence,
      confidenceScore: score,
      reasons,
      amount: Number(transaction.amount),
      matchedAmount: Number(match.amount),
      daysDifference: Math.round(daysDiff),
    };
  }

  /**
   * Get all transfer suggestions for a family
   */
  async getAllSuggestions(familyId: string): Promise<TransferSuggestion[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        account: { familyId },
        transferGroupId: null,
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    const suggestions: TransferSuggestion[] = [];
    const seen = new Set<string>();

    for (const tx of transactions) {
      const matches = await this.findPotentialMatches(tx.id, familyId);
      for (const match of matches) {
        const key = [tx.id, match.matchedTransactionId].sort().join('-');
        if (!seen.has(key) && match.confidenceScore >= 50) {
          seen.add(key);
          suggestions.push(match);
        }
      }
    }

    return suggestions.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }
}
