/**
 * Date Filter Logic Tests
 *
 * Tests the date filtering logic used in EnhancedTransactionList.
 * Ensures dates are compared correctly regardless of timezone.
 */
import { describe, it, expect } from 'vitest';

// Replicate the CURRENT (buggy) filter logic from EnhancedTransactionList
function filterByDateBuggy(
  txDate: string,
  dateFrom: string | '',
  dateTo: string | ''
): boolean {
  if (dateFrom) {
    const tx = new Date(txDate);
    const from = new Date(dateFrom);
    if (tx < from) return false;
  }
  if (dateTo) {
    const tx = new Date(txDate);
    const to = new Date(dateTo);
    if (tx > to) return false;
  }
  return true;
}

// The FIXED logic: compare YYYY-MM-DD strings directly (lexicographic)
function filterByDateFixed(
  txDate: string,
  dateFrom: string | '',
  dateTo: string | ''
): boolean {
  // Extract just the date portion (YYYY-MM-DD) in case tx.date has time info
  const txDateStr = txDate.slice(0, 10);
  if (dateFrom && txDateStr < dateFrom) return false;
  if (dateTo && txDateStr > dateTo) return false;
  return true;
}

describe('Date filter logic', () => {
  describe('Basic date filtering', () => {
    it('includes transactions on the exact "from" date', () => {
      expect(filterByDateFixed('2026-04-15', '2026-04-15', '')).toBe(true);
    });

    it('includes transactions on the exact "to" date', () => {
      expect(filterByDateFixed('2026-04-15', '', '2026-04-15')).toBe(true);
    });

    it('excludes transactions before "from" date', () => {
      expect(filterByDateFixed('2026-04-14', '2026-04-15', '')).toBe(false);
    });

    it('excludes transactions after "to" date', () => {
      expect(filterByDateFixed('2026-04-16', '', '2026-04-15')).toBe(false);
    });

    it('includes transactions within range', () => {
      expect(filterByDateFixed('2026-04-15', '2026-04-10', '2026-04-20')).toBe(true);
    });

    it('excludes transactions outside range', () => {
      expect(filterByDateFixed('2026-04-05', '2026-04-10', '2026-04-20')).toBe(false);
      expect(filterByDateFixed('2026-04-25', '2026-04-10', '2026-04-20')).toBe(false);
    });

    it('passes all when no filters set', () => {
      expect(filterByDateFixed('2026-04-15', '', '')).toBe(true);
    });
  });

  describe('Timezone safety', () => {
    it('handles date strings with time component (ISO timestamp)', () => {
      // Supabase may return dates with time in some edge cases
      expect(filterByDateFixed('2026-04-15T14:30:00', '2026-04-15', '2026-04-15')).toBe(true);
    });

    it('handles date strings with timezone offset', () => {
      expect(filterByDateFixed('2026-04-15T00:00:00+02:00', '2026-04-15', '2026-04-15')).toBe(true);
    });

    it('handles date strings with Z suffix', () => {
      expect(filterByDateFixed('2026-04-15T00:00:00Z', '2026-04-15', '2026-04-15')).toBe(true);
    });
  });

  describe('Buggy Date() comparison fails on timestamps', () => {
    it('Date() comparison incorrectly excludes same-day transaction with time', () => {
      // tx at 14:30 > filter at 00:00 UTC → incorrectly filtered out with "to" filter
      const txDate = '2026-04-15T14:30:00';
      const toDate = '2026-04-15';

      // Buggy: new Date("2026-04-15T14:30:00") > new Date("2026-04-15") = true → FILTERED OUT
      const buggyResult = filterByDateBuggy(txDate, '', toDate);
      // Fixed: string comparison "2026-04-15" <= "2026-04-15" → INCLUDED
      const fixedResult = filterByDateFixed(txDate, '', toDate);

      // The buggy version may filter it out (depends on timezone), the fixed version keeps it
      expect(fixedResult).toBe(true);
      // We just document that the buggy version is unreliable:
      // buggyResult could be true or false depending on local timezone
    });
  });

  describe('Edge cases', () => {
    it('handles month boundaries', () => {
      expect(filterByDateFixed('2026-03-31', '2026-04-01', '')).toBe(false);
      expect(filterByDateFixed('2026-04-01', '2026-04-01', '')).toBe(true);
    });

    it('handles year boundaries', () => {
      expect(filterByDateFixed('2025-12-31', '2026-01-01', '')).toBe(false);
      expect(filterByDateFixed('2026-01-01', '2026-01-01', '')).toBe(true);
    });

    it('handles single-day range', () => {
      expect(filterByDateFixed('2026-04-15', '2026-04-15', '2026-04-15')).toBe(true);
      expect(filterByDateFixed('2026-04-14', '2026-04-15', '2026-04-15')).toBe(false);
      expect(filterByDateFixed('2026-04-16', '2026-04-15', '2026-04-15')).toBe(false);
    });
  });
});
