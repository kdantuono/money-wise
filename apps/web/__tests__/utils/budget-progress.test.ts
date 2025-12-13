/**
 * Budget Progress Color Utility Tests
 * TDD approach: Tests written before implementation
 */

import { describe, it, expect } from 'vitest';
import { getBudgetProgressStatus } from '@/utils/budget-progress';

// =============================================================================
// Test Suite
// =============================================================================

describe('budget-progress', () => {
  describe('getBudgetProgressStatus', () => {
    // =========================================================================
    // Basic Percentage Thresholds (No Time Awareness)
    // =========================================================================

    describe('basic percentage thresholds', () => {
      it('should return safe status for 0% usage', () => {
        const result = getBudgetProgressStatus({ percentage: 0 });

        expect(result.status).toBe('safe');
        expect(result.color).toBe('#22c55e');
        expect(result.backgroundColor).toBe('#dcfce7');
        expect(result.textColor).toBe('#22c55e');
        expect(result.shouldPulse).toBe(false);
        expect(result.timeAwareEscalated).toBe(false);
      });

      it('should return safe status for 30% usage', () => {
        const result = getBudgetProgressStatus({ percentage: 30 });

        expect(result.status).toBe('safe');
        expect(result.color).toBe('#22c55e');
        expect(result.backgroundColor).toBe('#dcfce7');
        expect(result.shouldPulse).toBe(false);
      });

      it('should return safe status for 59% usage', () => {
        const result = getBudgetProgressStatus({ percentage: 59 });

        expect(result.status).toBe('safe');
        expect(result.color).toBe('#22c55e');
      });

      it('should return moderate status for 60% usage (edge case)', () => {
        const result = getBudgetProgressStatus({ percentage: 60 });

        expect(result.status).toBe('moderate');
        expect(result.color).toBe('#eab308');
        expect(result.backgroundColor).toBe('#fef9c3');
        expect(result.textColor).toBe('#eab308');
        expect(result.shouldPulse).toBe(false);
      });

      it('should return moderate status for 70% usage', () => {
        const result = getBudgetProgressStatus({ percentage: 70 });

        expect(result.status).toBe('moderate');
        expect(result.color).toBe('#eab308');
      });

      it('should return moderate status for 79% usage', () => {
        const result = getBudgetProgressStatus({ percentage: 79 });

        expect(result.status).toBe('moderate');
        expect(result.color).toBe('#eab308');
      });

      it('should return warning status for 80% usage (edge case)', () => {
        const result = getBudgetProgressStatus({ percentage: 80 });

        expect(result.status).toBe('warning');
        expect(result.color).toBe('#f97316');
        expect(result.backgroundColor).toBe('#ffedd5');
        expect(result.textColor).toBe('#f97316');
        expect(result.shouldPulse).toBe(false);
      });

      it('should return warning status for 90% usage', () => {
        const result = getBudgetProgressStatus({ percentage: 90 });

        expect(result.status).toBe('warning');
        expect(result.color).toBe('#f97316');
      });

      it('should return warning status for 94% usage', () => {
        const result = getBudgetProgressStatus({ percentage: 94 });

        expect(result.status).toBe('warning');
        expect(result.color).toBe('#f97316');
      });

      it('should return critical status for 95% usage (edge case)', () => {
        const result = getBudgetProgressStatus({ percentage: 95 });

        expect(result.status).toBe('critical');
        expect(result.color).toBe('#ef4444');
        expect(result.backgroundColor).toBe('#fee2e2');
        expect(result.textColor).toBe('#ef4444');
        expect(result.shouldPulse).toBe(false);
      });

      it('should return critical status for 98% usage', () => {
        const result = getBudgetProgressStatus({ percentage: 98 });

        expect(result.status).toBe('critical');
        expect(result.color).toBe('#ef4444');
      });

      it('should return critical status for exactly 100% usage', () => {
        const result = getBudgetProgressStatus({ percentage: 100 });

        expect(result.status).toBe('critical');
        expect(result.color).toBe('#ef4444');
        expect(result.shouldPulse).toBe(false);
      });

      it('should return over status for 101% usage', () => {
        const result = getBudgetProgressStatus({ percentage: 101 });

        expect(result.status).toBe('over');
        expect(result.color).toBe('#991b1b');
        expect(result.backgroundColor).toBe('#fecaca');
        expect(result.textColor).toBe('#991b1b');
        expect(result.shouldPulse).toBe(true);
      });

      it('should return over status for 150% usage', () => {
        const result = getBudgetProgressStatus({ percentage: 150 });

        expect(result.status).toBe('over');
        expect(result.color).toBe('#991b1b');
        expect(result.shouldPulse).toBe(true);
      });

      it('should return over status for 200% usage', () => {
        const result = getBudgetProgressStatus({ percentage: 200 });

        expect(result.status).toBe('over');
        expect(result.color).toBe('#991b1b');
        expect(result.shouldPulse).toBe(true);
      });
    });

    // =========================================================================
    // shouldPulse Animation
    // =========================================================================

    describe('shouldPulse animation', () => {
      it('should NOT pulse for 0% usage', () => {
        const result = getBudgetProgressStatus({ percentage: 0 });
        expect(result.shouldPulse).toBe(false);
      });

      it('should NOT pulse for 60% usage', () => {
        const result = getBudgetProgressStatus({ percentage: 60 });
        expect(result.shouldPulse).toBe(false);
      });

      it('should NOT pulse for 80% usage', () => {
        const result = getBudgetProgressStatus({ percentage: 80 });
        expect(result.shouldPulse).toBe(false);
      });

      it('should NOT pulse for 95% usage', () => {
        const result = getBudgetProgressStatus({ percentage: 95 });
        expect(result.shouldPulse).toBe(false);
      });

      it('should NOT pulse for exactly 100% usage', () => {
        const result = getBudgetProgressStatus({ percentage: 100 });
        expect(result.shouldPulse).toBe(false);
      });

      it('should pulse for 101% usage', () => {
        const result = getBudgetProgressStatus({ percentage: 101 });
        expect(result.shouldPulse).toBe(true);
      });

      it('should pulse for 150% usage', () => {
        const result = getBudgetProgressStatus({ percentage: 150 });
        expect(result.shouldPulse).toBe(true);
      });
    });

    // =========================================================================
    // Time-Aware Logic
    // =========================================================================

    describe('time-aware escalation', () => {
      it('should NOT escalate when spending pace matches time pace', () => {
        // 50% spent, 50% through period
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31'); // 30 day period
        const currentDate = new Date('2024-01-16'); // 15 days through (50%)

        const result = getBudgetProgressStatus({
          percentage: 50,
          startDate,
          endDate,
          currentDate,
        });

        expect(result.status).toBe('safe');
        expect(result.timeAwareEscalated).toBe(false);
      });

      it('should NOT escalate when spending pace is slightly ahead but within tolerance', () => {
        // 55% spent, 50% through period (5% ahead, within tolerance)
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        const currentDate = new Date('2024-01-16'); // 50% through

        const result = getBudgetProgressStatus({
          percentage: 55,
          startDate,
          endDate,
          currentDate,
        });

        expect(result.status).toBe('safe');
        expect(result.timeAwareEscalated).toBe(false);
      });

      it('should escalate from safe to moderate when significantly ahead of pace', () => {
        // 50% spent, only 25% through period (25% ahead)
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        const currentDate = new Date('2024-01-08'); // 25% through

        const result = getBudgetProgressStatus({
          percentage: 50,
          startDate,
          endDate,
          currentDate,
        });

        expect(result.status).toBe('moderate');
        expect(result.timeAwareEscalated).toBe(true);
      });

      it('should escalate from moderate to warning when significantly ahead', () => {
        // 70% spent, only 40% through period (30% ahead)
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        const currentDate = new Date('2024-01-13'); // ~40% through

        const result = getBudgetProgressStatus({
          percentage: 70,
          startDate,
          endDate,
          currentDate,
        });

        expect(result.status).toBe('warning');
        expect(result.timeAwareEscalated).toBe(true);
      });

      it('should escalate from warning to critical when significantly ahead', () => {
        // 85% spent, only 50% through period (35% ahead)
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        const currentDate = new Date('2024-01-16'); // 50% through

        const result = getBudgetProgressStatus({
          percentage: 85,
          startDate,
          endDate,
          currentDate,
        });

        expect(result.status).toBe('critical');
        expect(result.timeAwareEscalated).toBe(true);
      });

      it('should escalate from critical to over when significantly ahead', () => {
        // 96% spent, only 60% through period (36% ahead)
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        const currentDate = new Date('2024-01-19'); // ~60% through

        const result = getBudgetProgressStatus({
          percentage: 96,
          startDate,
          endDate,
          currentDate,
        });

        expect(result.status).toBe('over');
        expect(result.timeAwareEscalated).toBe(true);
        expect(result.shouldPulse).toBe(true);
      });

      it('should NOT escalate over status (already at max)', () => {
        // 110% spent, 50% through period
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        const currentDate = new Date('2024-01-16');

        const result = getBudgetProgressStatus({
          percentage: 110,
          startDate,
          endDate,
          currentDate,
        });

        expect(result.status).toBe('over');
        expect(result.timeAwareEscalated).toBe(false); // Already over, not escalated
      });

      it('should NOT escalate when spending is behind pace', () => {
        // 20% spent, 50% through period (30% behind)
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        const currentDate = new Date('2024-01-16'); // 50% through

        const result = getBudgetProgressStatus({
          percentage: 20,
          startDate,
          endDate,
          currentDate,
        });

        expect(result.status).toBe('safe');
        expect(result.timeAwareEscalated).toBe(false);
      });

      it('should handle budget period not started yet', () => {
        // Budget starts in the future
        const startDate = new Date('2024-02-01');
        const endDate = new Date('2024-02-29');
        const currentDate = new Date('2024-01-15');

        const result = getBudgetProgressStatus({
          percentage: 10,
          startDate,
          endDate,
          currentDate,
        });

        // No escalation for periods not started
        expect(result.status).toBe('safe');
        expect(result.timeAwareEscalated).toBe(false);
      });

      it('should handle budget period already ended', () => {
        // Budget ended in the past
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        const currentDate = new Date('2024-02-15');

        const result = getBudgetProgressStatus({
          percentage: 80,
          startDate,
          endDate,
          currentDate,
        });

        // No escalation for periods already ended
        expect(result.status).toBe('warning');
        expect(result.timeAwareEscalated).toBe(false);
      });

      it('should NOT escalate when only startDate provided', () => {
        // Missing endDate, can't calculate time awareness
        const startDate = new Date('2024-01-01');

        const result = getBudgetProgressStatus({
          percentage: 50,
          startDate,
        });

        expect(result.status).toBe('safe');
        expect(result.timeAwareEscalated).toBe(false);
      });

      it('should NOT escalate when only endDate provided', () => {
        // Missing startDate, can't calculate time awareness
        const endDate = new Date('2024-01-31');

        const result = getBudgetProgressStatus({
          percentage: 50,
          endDate,
        });

        expect(result.status).toBe('safe');
        expect(result.timeAwareEscalated).toBe(false);
      });

      it('should use current date when currentDate not provided', () => {
        // Test with real dates in the past to ensure stable test
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        // Not providing currentDate - will use Date.now()

        const result = getBudgetProgressStatus({
          percentage: 50,
          startDate,
          endDate,
        });

        // Since period is in the past, no escalation
        expect(result.status).toBe('safe');
        expect(result.timeAwareEscalated).toBe(false);
      });
    });

    // =========================================================================
    // Edge Cases
    // =========================================================================

    describe('edge cases', () => {
      it('should handle negative percentage', () => {
        const result = getBudgetProgressStatus({ percentage: -10 });

        expect(result.status).toBe('safe');
        expect(result.shouldPulse).toBe(false);
      });

      it('should handle very large percentage', () => {
        const result = getBudgetProgressStatus({ percentage: 9999 });

        expect(result.status).toBe('over');
        expect(result.shouldPulse).toBe(true);
      });

      it('should handle decimal percentages', () => {
        const result = getBudgetProgressStatus({ percentage: 59.9 });

        expect(result.status).toBe('safe');
      });

      it('should handle decimal at boundary', () => {
        const result = getBudgetProgressStatus({ percentage: 60.1 });

        expect(result.status).toBe('moderate');
      });

      it('should handle same start and end date', () => {
        const date = new Date('2024-01-15');

        const result = getBudgetProgressStatus({
          percentage: 50,
          startDate: date,
          endDate: date,
          currentDate: date,
        });

        // No time awareness when period is 0 days
        expect(result.status).toBe('safe');
        expect(result.timeAwareEscalated).toBe(false);
      });

      it('should handle endDate before startDate', () => {
        const startDate = new Date('2024-01-31');
        const endDate = new Date('2024-01-01');
        const currentDate = new Date('2024-01-15');

        const result = getBudgetProgressStatus({
          percentage: 50,
          startDate,
          endDate,
          currentDate,
        });

        // Invalid period, no time awareness
        expect(result.status).toBe('safe');
        expect(result.timeAwareEscalated).toBe(false);
      });
    });

    // =========================================================================
    // Integration Tests (Multiple Scenarios)
    // =========================================================================

    describe('integration scenarios', () => {
      it('should handle early month overspending correctly', () => {
        // It's the 10th of the month, 60% spent (bad pace)
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        const currentDate = new Date('2024-01-10'); // ~30% through month

        const result = getBudgetProgressStatus({
          percentage: 60,
          startDate,
          endDate,
          currentDate,
        });

        // 60% is normally moderate, but 30% ahead of pace escalates to warning
        expect(result.status).toBe('warning');
        expect(result.timeAwareEscalated).toBe(true);
        expect(result.shouldPulse).toBe(false);
      });

      it('should show safe status for conservative spending', () => {
        // It's mid-month, only 40% spent (good pace)
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        const currentDate = new Date('2024-01-16'); // 50% through month

        const result = getBudgetProgressStatus({
          percentage: 40,
          startDate,
          endDate,
          currentDate,
        });

        expect(result.status).toBe('safe');
        expect(result.timeAwareEscalated).toBe(false);
        expect(result.shouldPulse).toBe(false);
      });

      it('should show critical status at month end with high spending', () => {
        // Last day of month, 97% spent
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        const currentDate = new Date('2024-01-31'); // 100% through month

        const result = getBudgetProgressStatus({
          percentage: 97,
          startDate,
          endDate,
          currentDate,
        });

        expect(result.status).toBe('critical');
        expect(result.timeAwareEscalated).toBe(false); // On pace, no escalation
        expect(result.shouldPulse).toBe(false);
      });
    });
  });
});
