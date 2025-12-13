/**
 * Budget Progress Color Utility
 * Determines budget status with color-coded feedback based on usage and time awareness
 */

/**
 * Budget progress status with color information
 */
export interface BudgetProgressStatus {
  /** Status level: safe, moderate, warning, critical, or over */
  status: 'safe' | 'moderate' | 'warning' | 'critical' | 'over';
  /** Foreground/bar color (hex) */
  color: string;
  /** Track background color (hex) */
  backgroundColor: string;
  /** Text color for percentage display (hex) */
  textColor: string;
  /** Whether to animate with pulse effect (true when over budget) */
  shouldPulse: boolean;
  /** True if status was escalated due to time-aware logic */
  timeAwareEscalated: boolean;
}

/**
 * Options for calculating budget progress status
 */
export interface BudgetProgressOptions {
  /** Percentage of budget used (0-100+) */
  percentage: number;
  /** Budget period start date (optional, required for time awareness) */
  startDate?: Date;
  /** Budget period end date (optional, required for time awareness) */
  endDate?: Date;
  /** Current date for time calculations (defaults to now, useful for testing) */
  currentDate?: Date;
}

/**
 * Color definitions for each status level
 */
const STATUS_COLORS = {
  safe: {
    color: '#22c55e', // green-500
    backgroundColor: '#dcfce7', // green-100
  },
  moderate: {
    color: '#eab308', // yellow-500
    backgroundColor: '#fef9c3', // yellow-100
  },
  warning: {
    color: '#f97316', // orange-500
    backgroundColor: '#ffedd5', // orange-100
  },
  critical: {
    color: '#ef4444', // red-500
    backgroundColor: '#fee2e2', // red-100
  },
  over: {
    color: '#991b1b', // red-800
    backgroundColor: '#fecaca', // red-200
  },
} as const;

/**
 * Threshold for escalating status based on pace
 * If spending is 20% ahead of time pace, escalate status
 */
const TIME_AWARENESS_THRESHOLD = 20;

/**
 * Get budget progress status with color-coded feedback
 *
 * @param options - Budget progress options
 * @returns Status with color information and animation flags
 *
 * @example
 * // Basic usage without time awareness
 * const status = getBudgetProgressStatus({ percentage: 75 });
 * // Returns: { status: 'moderate', color: '#eab308', ... }
 *
 * @example
 * // With time awareness
 * const status = getBudgetProgressStatus({
 *   percentage: 60,
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-01-31'),
 *   currentDate: new Date('2024-01-10'), // 30% through month
 * });
 * // Returns: { status: 'warning', timeAwareEscalated: true, ... }
 * // (60% spent but only 30% through period = escalated from moderate to warning)
 */
export function getBudgetProgressStatus(
  options: BudgetProgressOptions
): BudgetProgressStatus {
  const { percentage, startDate, endDate, currentDate } = options;

  // Determine base status from percentage thresholds
  let status: BudgetProgressStatus['status'];
  if (percentage < 60) {
    status = 'safe';
  } else if (percentage < 80) {
    status = 'moderate';
  } else if (percentage < 95) {
    status = 'warning';
  } else if (percentage <= 100) {
    status = 'critical';
  } else {
    status = 'over';
  }

  // Check if time-aware escalation should be applied
  let timeAwareEscalated = false;
  if (startDate && endDate && status !== 'over') {
    const now = currentDate || new Date();
    const periodStart = startDate.getTime();
    const periodEnd = endDate.getTime();
    const currentTime = now.getTime();

    // Only apply time awareness if we're within the budget period
    if (currentTime >= periodStart && currentTime <= periodEnd) {
      const totalPeriodDuration = periodEnd - periodStart;

      // Avoid division by zero for same-day periods
      if (totalPeriodDuration > 0) {
        const elapsedTime = currentTime - periodStart;
        const timeElapsedPercentage = (elapsedTime / totalPeriodDuration) * 100;

        // Calculate how far ahead spending is compared to time
        const paceAhead = percentage - timeElapsedPercentage;

        // If spending is significantly ahead of pace, escalate status
        if (paceAhead >= TIME_AWARENESS_THRESHOLD) {
          timeAwareEscalated = true;

          // Escalate status by one level
          switch (status) {
            case 'safe':
              status = 'moderate';
              break;
            case 'moderate':
              status = 'warning';
              break;
            case 'warning':
              status = 'critical';
              break;
            case 'critical':
              status = 'over';
              break;
            // 'over' stays as 'over'
          }
        }
      }
    }
  }

  // Get colors for current status
  const colors = STATUS_COLORS[status];

  // Pulse animation only for over-budget status (after escalation)
  const shouldPulse = status === 'over';

  return {
    status,
    color: colors.color,
    backgroundColor: colors.backgroundColor,
    textColor: colors.color, // Same as color for consistency
    shouldPulse,
    timeAwareEscalated,
  };
}
