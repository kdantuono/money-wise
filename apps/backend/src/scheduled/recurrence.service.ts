import { Injectable } from '@nestjs/common';
import { RecurrenceFrequency } from '../../generated/prisma';

export interface RecurrenceRuleParams {
  frequency: RecurrenceFrequency;
  interval: number;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  endDate?: Date | null;
  endCount?: number | null;
  occurrenceCount?: number;
}

@Injectable()
export class RecurrenceService {
  /**
   * Calculate the next occurrence date based on recurrence rule
   * @param rule The recurrence rule parameters
   * @param fromDate The date to calculate from (usually current nextDueDate)
   * @returns The next occurrence date, or null if recurrence has ended
   */
  calculateNextOccurrence(
    rule: RecurrenceRuleParams,
    fromDate: Date,
  ): Date | null {
    // Check if recurrence has ended by count
    if (rule.endCount && (rule.occurrenceCount ?? 0) >= rule.endCount) {
      return null;
    }

    const nextDate = this.getNextDateByFrequency(rule, fromDate);

    // Check if next occurrence is past end date
    if (rule.endDate && nextDate > new Date(rule.endDate)) {
      return null;
    }

    return nextDate;
  }

  /**
   * Get all occurrence dates within a date range
   * @param rule The recurrence rule
   * @param startDate The start date of the current scheduled transaction
   * @param rangeStart Start of the range to find occurrences
   * @param rangeEnd End of the range to find occurrences
   * @param limit Maximum number of occurrences to return
   * @returns Array of occurrence dates within the range
   */
  getOccurrencesInRange(
    rule: RecurrenceRuleParams,
    startDate: Date,
    rangeStart: Date,
    rangeEnd: Date,
    limit: number = 100,
  ): Date[] {
    const occurrences: Date[] = [];
    let currentDate = new Date(startDate);
    let currentCount = 0;

    // If the start date is before range start, advance to first occurrence in range
    while (currentDate < rangeStart && occurrences.length === 0) {
      const nextDate = this.getNextDateByFrequency(rule, currentDate);
      if (nextDate >= rangeStart) {
        currentDate = nextDate;
        break;
      }
      currentDate = nextDate;
      currentCount++;

      // Check end conditions
      if (rule.endCount && currentCount >= rule.endCount) {
        return occurrences;
      }
      if (rule.endDate && currentDate > new Date(rule.endDate)) {
        return occurrences;
      }
    }

    // Add start date if it's within range
    if (currentDate >= rangeStart && currentDate <= rangeEnd) {
      occurrences.push(new Date(currentDate));
    }

    // Generate occurrences within range
    while (occurrences.length < limit) {
      currentCount++;

      // Check end by count
      if (rule.endCount && currentCount >= rule.endCount) {
        break;
      }

      const nextDate = this.getNextDateByFrequency(rule, currentDate);

      // Check end by date
      if (rule.endDate && nextDate > new Date(rule.endDate)) {
        break;
      }

      // Check if we've passed the range
      if (nextDate > rangeEnd) {
        break;
      }

      if (nextDate >= rangeStart) {
        occurrences.push(new Date(nextDate));
      }

      currentDate = nextDate;
    }

    return occurrences;
  }

  /**
   * Check if the recurrence has completed
   * @param rule The recurrence rule
   * @param currentOccurrenceCount Current number of occurrences executed
   * @returns True if recurrence is complete
   */
  isCompleted(rule: RecurrenceRuleParams, currentOccurrenceCount: number): boolean {
    if (rule.endCount && currentOccurrenceCount >= rule.endCount) {
      return true;
    }

    if (rule.endDate && new Date() > new Date(rule.endDate)) {
      return true;
    }

    return false;
  }

  /**
   * Generate a human-readable description of the recurrence pattern
   */
  getRecurrenceDescription(rule: RecurrenceRuleParams): string {
    const intervalText = rule.interval > 1 ? `every ${rule.interval} ` : 'every ';

    switch (rule.frequency) {
      case RecurrenceFrequency.DAILY:
        return rule.interval === 1 ? 'Daily' : `Every ${rule.interval} days`;

      case RecurrenceFrequency.WEEKLY:
        const dayName = rule.dayOfWeek !== null && rule.dayOfWeek !== undefined
          ? this.getDayName(rule.dayOfWeek)
          : '';
        return rule.interval === 1
          ? `Weekly${dayName ? ` on ${dayName}` : ''}`
          : `${intervalText}weeks${dayName ? ` on ${dayName}` : ''}`;

      case RecurrenceFrequency.BIWEEKLY:
        return 'Every 2 weeks';

      case RecurrenceFrequency.MONTHLY:
        const dayOfMonth = rule.dayOfMonth === -1
          ? 'last day'
          : rule.dayOfMonth
            ? `day ${rule.dayOfMonth}`
            : '';
        return rule.interval === 1
          ? `Monthly${dayOfMonth ? ` on ${dayOfMonth}` : ''}`
          : `${intervalText}months${dayOfMonth ? ` on ${dayOfMonth}` : ''}`;

      case RecurrenceFrequency.QUARTERLY:
        return 'Quarterly';

      case RecurrenceFrequency.YEARLY:
        return rule.interval === 1 ? 'Yearly' : `Every ${rule.interval} years`;

      default:
        return 'Custom recurrence';
    }
  }

  /**
   * Calculate the next date based on frequency
   */
  private getNextDateByFrequency(
    rule: RecurrenceRuleParams,
    fromDate: Date,
  ): Date {
    const next = new Date(fromDate);
    const interval = rule.interval || 1;

    switch (rule.frequency) {
      case RecurrenceFrequency.DAILY:
        next.setDate(next.getDate() + interval);
        break;

      case RecurrenceFrequency.WEEKLY:
        next.setDate(next.getDate() + 7 * interval);
        // Adjust to specific day of week if specified
        if (rule.dayOfWeek !== null && rule.dayOfWeek !== undefined) {
          const currentDay = next.getDay();
          const targetDay = rule.dayOfWeek;
          const diff = targetDay - currentDay;
          if (diff !== 0) {
            next.setDate(next.getDate() + diff);
          }
        }
        break;

      case RecurrenceFrequency.BIWEEKLY:
        next.setDate(next.getDate() + 14 * interval);
        break;

      case RecurrenceFrequency.MONTHLY:
        this.addMonths(next, interval);
        // Adjust to specific day of month if specified
        if (rule.dayOfMonth !== null && rule.dayOfMonth !== undefined) {
          this.setDayOfMonth(next, rule.dayOfMonth);
        }
        break;

      case RecurrenceFrequency.QUARTERLY:
        this.addMonths(next, 3 * interval);
        if (rule.dayOfMonth !== null && rule.dayOfMonth !== undefined) {
          this.setDayOfMonth(next, rule.dayOfMonth);
        }
        break;

      case RecurrenceFrequency.YEARLY:
        next.setFullYear(next.getFullYear() + interval);
        if (rule.dayOfMonth !== null && rule.dayOfMonth !== undefined) {
          this.setDayOfMonth(next, rule.dayOfMonth);
        }
        break;
    }

    return next;
  }

  /**
   * Add months to a date, handling month-end edge cases
   */
  private addMonths(date: Date, months: number): void {
    const originalDay = date.getDate();
    date.setMonth(date.getMonth() + months);

    // Handle cases where the day doesn't exist in the new month
    // (e.g., Jan 31 + 1 month = Feb 28/29)
    if (date.getDate() !== originalDay) {
      // Set to last day of previous month
      date.setDate(0);
    }
  }

  /**
   * Set the day of month, handling -1 for last day and invalid days
   */
  private setDayOfMonth(date: Date, dayOfMonth: number): void {
    if (dayOfMonth === -1) {
      // Last day of month
      date.setMonth(date.getMonth() + 1, 0);
    } else {
      // Get the maximum day of the current month
      const maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      date.setDate(Math.min(dayOfMonth, maxDay));
    }
  }

  /**
   * Get day name from day number (0 = Sunday)
   */
  private getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day] || '';
  }
}
