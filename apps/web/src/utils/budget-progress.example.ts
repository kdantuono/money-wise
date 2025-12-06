/**
 * Budget Progress Utility - Usage Examples
 *
 * This file demonstrates how to use the getBudgetProgressStatus utility
 * for color-coded budget progress feedback.
 */

import { getBudgetProgressStatus } from './budget-progress';

// =============================================================================
// Example 1: Basic Usage Without Time Awareness
// =============================================================================

// Safe status (0-60%)
const safe = getBudgetProgressStatus({ percentage: 45 });
console.log(safe);
// Output: {
//   status: 'safe',
//   color: '#22c55e',
//   backgroundColor: '#dcfce7',
//   textColor: '#22c55e',
//   shouldPulse: false,
//   timeAwareEscalated: false
// }

// Moderate status (60-80%)
const moderate = getBudgetProgressStatus({ percentage: 70 });
console.log(moderate);
// Output: {
//   status: 'moderate',
//   color: '#eab308',
//   backgroundColor: '#fef9c3',
//   textColor: '#eab308',
//   shouldPulse: false,
//   timeAwareEscalated: false
// }

// Warning status (80-95%)
const warning = getBudgetProgressStatus({ percentage: 85 });
console.log(warning);
// Output: {
//   status: 'warning',
//   color: '#f97316',
//   backgroundColor: '#ffedd5',
//   textColor: '#f97316',
//   shouldPulse: false,
//   timeAwareEscalated: false
// }

// Critical status (95-100%)
const critical = getBudgetProgressStatus({ percentage: 97 });
console.log(critical);
// Output: {
//   status: 'critical',
//   color: '#ef4444',
//   backgroundColor: '#fee2e2',
//   textColor: '#ef4444',
//   shouldPulse: false,
//   timeAwareEscalated: false
// }

// Over budget (>100%) with pulse animation
const overBudget = getBudgetProgressStatus({ percentage: 105 });
console.log(overBudget);
// Output: {
//   status: 'over',
//   color: '#991b1b',
//   backgroundColor: '#fecaca',
//   textColor: '#991b1b',
//   shouldPulse: true,  // <-- Animation enabled!
//   timeAwareEscalated: false
// }

// =============================================================================
// Example 2: Time-Aware Budget Progress
// =============================================================================

// Scenario: It's January 10th (30% through the month), but 60% of budget is spent
// This should escalate from 'moderate' to 'warning' due to overspending pace
const earlyMonthOverspending = getBudgetProgressStatus({
  percentage: 60,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  currentDate: new Date('2024-01-10'), // 30% through month
});
console.log(earlyMonthOverspending);
// Output: {
//   status: 'warning',         // <-- Escalated from 'moderate'!
//   color: '#f97316',
//   backgroundColor: '#ffedd5',
//   textColor: '#f97316',
//   shouldPulse: false,
//   timeAwareEscalated: true   // <-- Indicates escalation occurred
// }

// Scenario: Conservative spending (40% spent, 50% through month)
// No escalation - spending is on track
const conservativeSpending = getBudgetProgressStatus({
  percentage: 40,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  currentDate: new Date('2024-01-16'), // 50% through month
});
console.log(conservativeSpending);
// Output: {
//   status: 'safe',            // <-- No escalation
//   color: '#22c55e',
//   backgroundColor: '#dcfce7',
//   textColor: '#22c55e',
//   shouldPulse: false,
//   timeAwareEscalated: false  // <-- No escalation needed
// }

// Scenario: Heavy spending early in period can escalate to 'over'
// 96% spent but only 60% through period
const severeOverspending = getBudgetProgressStatus({
  percentage: 96,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  currentDate: new Date('2024-01-19'), // 60% through month
});
console.log(severeOverspending);
// Output: {
//   status: 'over',            // <-- Escalated from 'critical'!
//   color: '#991b1b',
//   backgroundColor: '#fecaca',
//   textColor: '#991b1b',
//   shouldPulse: true,         // <-- Animation enabled!
//   timeAwareEscalated: true   // <-- Indicates escalation occurred
// }

// =============================================================================
// Example 3: React Component Usage
// =============================================================================

/*
import { getBudgetProgressStatus } from '@/utils/budget-progress';

function BudgetProgressBar({ spent, limit, startDate, endDate }) {
  const percentage = (spent / limit) * 100;

  const status = getBudgetProgressStatus({
    percentage,
    startDate,
    endDate,
    // currentDate defaults to now if not provided
  });

  return (
    <div className="w-full">
      <div
        className="h-2 rounded-full transition-colors"
        style={{ backgroundColor: status.backgroundColor }}
      >
        <div
          className={`h-full rounded-full transition-all ${
            status.shouldPulse ? 'animate-pulse' : ''
          }`}
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: status.color
          }}
        />
      </div>

      <div className="mt-2 flex justify-between items-center">
        <span style={{ color: status.textColor }} className="font-semibold">
          {percentage.toFixed(0)}%
        </span>

        {status.timeAwareEscalated && (
          <span className="text-xs text-orange-600">
            ⚠️ Ahead of pace
          </span>
        )}
      </div>

      <div className="text-sm text-gray-600 mt-1">
        ${spent.toFixed(2)} / ${limit.toFixed(2)}
      </div>
    </div>
  );
}
*/

// =============================================================================
// Example 4: Edge Cases
// =============================================================================

// Handle budget not yet started
const futurebudget = getBudgetProgressStatus({
  percentage: 10,
  startDate: new Date('2024-02-01'),
  endDate: new Date('2024-02-29'),
  currentDate: new Date('2024-01-15'),
});
console.log(futurebudget);
// Output: No time-aware escalation (period hasn't started)

// Handle budget already ended
const pastbudget = getBudgetProgressStatus({
  percentage: 80,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  currentDate: new Date('2024-02-15'),
});
console.log(pastbudget);
// Output: No time-aware escalation (period has ended)

// Handle same start and end date (0-day period)
const sameDaybudget = getBudgetProgressStatus({
  percentage: 50,
  startDate: new Date('2024-01-15'),
  endDate: new Date('2024-01-15'),
  currentDate: new Date('2024-01-15'),
});
console.log(sameDaybudget);
// Output: No time-aware escalation (0-day period)
