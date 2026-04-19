/**
 * Sprint 1.5 — Onboarding Piano Generato
 * Allocation algorithm — Stream B implementation.
 *
 * DETERMINISM: output is deterministic given the same `(input, current date)`.
 * Time is captured once at function entry via `new Date()`. Tests should use
 * `vi.setSystemTime()` / `vi.useFakeTimers()` to freeze time.
 *
 * EMERGENCY FUND MODEL: the emergency goal receives `40% × savingsPool` as a
 * floor allocation and is then *excluded* from the priority-weighted pool.
 * Remaining budget is distributed among all other goals by priority weight.
 *
 * @module allocation
 */

import type {
  AllocationInput,
  AllocationResult,
  AllocationResultItem,
  AllocationGoalInput,
  PriorityRank,
} from '@/types/onboarding-plan';
import { PRIORITY_URGENCY_FACTOR } from '@/types/onboarding-plan';

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers (not exported)
// ─────────────────────────────────────────────────────────────────────────────

/** Emergency fund name patterns (case-insensitive). */
const _EMERGENCY_NAME_PATTERN = /emergenza|emergency/i;

/** Months threshold for "imminent deadline" urgency boost. */
const _URGENCY_MONTHS = 12;

/** Emergency override fraction of the available savings pool. */
const _EMERGENCY_OVERRIDE_FRACTION = 0.4;

/** Default emergency fund target in months (Sprint 1.5 fixed value). */
const _DEFAULT_EMERGENCY_MONTHS = 6;

/**
 * Returns the number of whole months between `from` and `to`.
 * Negative when `to` is in the past.
 */
function _monthsDiff(from: Date, to: Date): number {
  const yearDiff = to.getFullYear() - from.getFullYear();
  const monthDiff = to.getMonth() - from.getMonth();
  const dayAdjust = to.getDate() < from.getDate() ? -1 : 0;
  return yearDiff * 12 + monthDiff + dayAdjust;
}

/**
 * Parses `deadline` string (YYYY-MM-DD or ISO) to a LOCAL Date at midnight.
 * Returns null when the string is falsy or unparseable.
 *
 * Timezone-safe: `new Date('YYYY-MM-DD')` is parsed as UTC midnight, which
 * when read back via local getters (getMonth/getDate) can shift by one day
 * in non-UTC timezones. We parse explicitly as local-midnight instead to
 * align with `_monthsDiff`'s local-accessor usage. (Copilot review PR #455)
 */
function _parseDeadline(deadline: string | null): Date | null {
  if (!deadline) return null;
  const datePart = deadline.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) {
    // Fallback: non-date-only string, try generic parse (may be full ISO)
    const fallback = new Date(deadline);
    return isNaN(fallback.getTime()) ? null : fallback;
  }
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

/**
 * Returns true when the goal qualifies as the emergency fund goal.
 * Condition: name matches the emergency pattern OR
 * (priority=1 AND deadline is in the future AND ≤ 12 months away).
 *
 * Past deadlines (negative months) are explicitly excluded — a priority=1
 * goal with a deadline already passed should NOT trigger emergency override
 * (it'd steal budget from other actionable goals). (Copilot review PR #455)
 */
function _isEmergencyGoal(goal: AllocationGoalInput, now: Date): boolean {
  if (_EMERGENCY_NAME_PATTERN.test(goal.name)) return true;
  if (goal.priority === 1) {
    const deadlineDate = _parseDeadline(goal.deadline);
    if (deadlineDate !== null) {
      const months = _monthsDiff(now, deadlineDate);
      if (months >= 0 && months <= _URGENCY_MONTHS) return true;
    }
  }
  return false;
}

/**
 * Computes the effective weight for a goal considering urgency boost.
 * If `deadline` is within 12 months from `now`, weight is multiplied by 1.5.
 */
function _effectiveWeight(goal: AllocationGoalInput, now: Date): number {
  const base: number = PRIORITY_URGENCY_FACTOR[goal.priority as PriorityRank];
  const deadlineDate = _parseDeadline(goal.deadline);
  if (deadlineDate !== null) {
    const months = _monthsDiff(now, deadlineDate);
    if (months >= 0 && months <= _URGENCY_MONTHS) {
      return base * 1.5;
    }
  }
  return base;
}

/**
 * Builds a human-readable Italian reasoning string for a goal allocation.
 */
function _buildReasoning(
  goal: AllocationGoalInput,
  monthlyAmount: number,
  isEmergency: boolean,
  urgencyBoosted: boolean,
  deadlinePassed: boolean,
): string {
  if (goal.target === 0) {
    return 'Target non specificato';
  }
  if (isEmergency) {
    return `Fondo di emergenza: allocazione prioritaria del ${Math.round(_EMERGENCY_OVERRIDE_FRACTION * 100)}% del budget mensile disponibile per garantire sicurezza finanziaria.`;
  }
  const priorityLabel =
    goal.priority === 1 ? 'alta' : goal.priority === 2 ? 'media' : 'bassa';
  const parts: string[] = [`Priorità ${priorityLabel}`];
  if (urgencyBoosted) {
    parts.push('scadenza ravvicinata → allocation aumentata del 50%');
  }
  if (deadlinePassed) {
    parts.push('scadenza già superata — allocation mantenuta per completare il goal');
  }
  parts.push(`importo mensile: €${monthlyAmount.toFixed(2)}`);
  return parts.join(' · ');
}

/**
 * Rounds a number to 2 decimal places (cents precision).
 */
function _round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes a deterministic monthly allocation plan from onboarding wizard input.
 *
 * The algorithm:
 * 1. Identifies the emergency fund goal (by name pattern or priority+deadline).
 * 2. Reserves up to 40% of the savings pool for the emergency fund (capped at need).
 * 3. Distributes the remainder among other goals weighted by priority × urgency.
 * 4. Produces one `AllocationResultItem` per input goal (including skipped ones).
 *
 * Deterministic per `(input, current date)`. Tests should freeze time with
 * `vi.setSystemTime()` to get fully reproducible results.
 *
 * @param input - Full allocation input from the onboarding wizard.
 * @returns `AllocationResult` with per-goal items, totals, and global warnings.
 */
export function computeAllocation(input: AllocationInput): AllocationResult {
  const now = new Date();

  const {
    monthlyIncome,
    monthlySavingsTarget,
    essentialsPct,
    goals,
  } = input;

  // ── Derived totals ──────────────────────────────────────────────────────
  const incomeAfterEssentials = _round2(monthlyIncome * (1 - essentialsPct / 100));
  const savingsPool = _round2(Math.min(monthlySavingsTarget, incomeAfterEssentials));

  const globalWarnings: string[] = [];

  if (monthlySavingsTarget > incomeAfterEssentials) {
    globalWarnings.push(
      `Il target di risparmio mensile (€${monthlySavingsTarget.toFixed(2)}) supera il reddito disponibile dopo le spese essenziali (€${incomeAfterEssentials.toFixed(2)}). Il piano è stato calcolato sul reddito disponibile effettivo.`,
    );
  }

  // ── Empty goals edge case ───────────────────────────────────────────────
  if (goals.length === 0) {
    globalWarnings.push('Nessun obiettivo definito. Il budget mensile disponibile rimane non allocato.');
    return {
      items: [],
      incomeAfterEssentials,
      totalAllocated: 0,
      unallocated: savingsPool,
      warnings: globalWarnings,
    };
  }

  // ── Identify emergency goal (first match wins) ──────────────────────────
  const emergencyIndex = goals.findIndex((g) => _isEmergencyGoal(g, now));

  // ── Priority-weighted distribution including emergency goal ─────────────
  // Emergency is NOT excluded from the pool — instead it gets max(priority-share, 40% floor)
  // capped at remaining need. If floor applies, other goals are scaled down pro-rata.
  const eligibleForPool = goals
    .map((g, idx) => ({ g, idx }))
    .filter(({ g }) => g.target > 0);

  // Compute effective weights
  const weightMap = new Map<number, number>(); // index → weight
  let totalWeight = 0;
  for (const { g, idx } of eligibleForPool) {
    const w = _effectiveWeight(g, now);
    weightMap.set(idx, w);
    totalWeight += w;
  }

  // Raw priority-weighted shares (includes emergency)
  const rawShares = new Map<number, number>(); // index → amount
  for (const { idx } of eligibleForPool) {
    const w = weightMap.get(idx) ?? 0;
    const share = totalWeight > 0 ? savingsPool * (w / totalWeight) : 0;
    rawShares.set(idx, share);
  }

  // Emergency override: if priority-share < 40% floor, bump emergency up and scale
  // other goals down proportionally to preserve sum = savingsPool.
  if (emergencyIndex >= 0 && goals[emergencyIndex]!.target > 0) {
    const emergencyGoal = goals[emergencyIndex]!;
    const emergencyNeed = Math.max(0, emergencyGoal.target - emergencyGoal.current);
    const emergencyFloor = savingsPool * _EMERGENCY_OVERRIDE_FRACTION;
    const prioShare = rawShares.get(emergencyIndex) ?? 0;
    // Target: max(priority-share, 40% floor), capped at remaining need
    const desired = Math.min(Math.max(prioShare, emergencyFloor), emergencyNeed);

    if (desired > prioShare) {
      // Bump emergency, scale others pro-rata down
      const deficit = desired - prioShare;
      const othersTotal = savingsPool - prioShare;
      if (othersTotal > 0) {
        const scaleFactor = 1 - deficit / othersTotal;
        for (const { idx } of eligibleForPool) {
          if (idx === emergencyIndex) continue;
          const s = rawShares.get(idx) ?? 0;
          rawShares.set(idx, Math.max(0, s * scaleFactor));
        }
      }
      rawShares.set(emergencyIndex, desired);
    } else if (desired < prioShare) {
      // Priority share > need: cap at need, redistribute surplus to others pro-rata
      const surplus = prioShare - desired;
      const othersTotal = savingsPool - prioShare;
      if (othersTotal > 0) {
        const scaleFactor = 1 + surplus / othersTotal;
        for (const { idx } of eligibleForPool) {
          if (idx === emergencyIndex) continue;
          const s = rawShares.get(idx) ?? 0;
          rawShares.set(idx, s * scaleFactor);
        }
      }
      rawShares.set(emergencyIndex, desired);
    }
  }

  // Round all shares and compute residual
  const rawAllocations = new Map<number, number>();
  let rawTotal = 0;
  for (const { idx } of eligibleForPool) {
    const rounded = _round2(rawShares.get(idx) ?? 0);
    rawAllocations.set(idx, rounded);
    rawTotal += rounded;
  }

  // Fix rounding residual: assign to highest-priority eligible goal (stable input order)
  const roundingResidual = _round2(savingsPool - rawTotal);
  if (roundingResidual !== 0 && eligibleForPool.length > 0) {
    const highestPriorityEntry = eligibleForPool.reduce((best, curr) =>
      curr.g.priority < best.g.priority ? curr : best,
    );
    const existing = rawAllocations.get(highestPriorityEntry.idx) ?? 0;
    rawAllocations.set(highestPriorityEntry.idx, _round2(existing + roundingResidual));
  }

  // ── Build per-goal result items (preserve input order) ────────────────
  const items: AllocationResultItem[] = [];

  for (let i = 0; i < goals.length; i++) {
    const goal = goals[i]!;
    const isEmergency = i === emergencyIndex;
    const itemWarnings: string[] = [];

    // ── Skip: target=0 ────────────────────────────────────────────────
    if (goal.target === 0) {
      items.push({
        goalId: goal.id,
        monthlyAmount: 0,
        deadlineFeasible: true, // vacuous truth
        reasoning: 'Target non specificato',
        warnings: ['Target non specificato: il goal non riceverà allocazione.'],
      });
      continue;
    }

    // ── Compute monthlyAmount ─────────────────────────────────────────
    const monthlyAmount: number = rawAllocations.get(i) ?? 0;

    // ── Deadline feasibility ──────────────────────────────────────────
    const deadlineDate = _parseDeadline(goal.deadline);
    let deadlineFeasible = true;
    const urgencyBoosted = !isEmergency && (() => {
      if (!deadlineDate) return false;
      const months = _monthsDiff(now, deadlineDate);
      return months >= 0 && months <= _URGENCY_MONTHS;
    })();

    let deadlinePassed = false;
    if (deadlineDate !== null) {
      const monthsLeft = _monthsDiff(now, deadlineDate);
      if (monthsLeft < 0) {
        // Deadline already passed
        deadlineFeasible = false;
        deadlinePassed = true;
        itemWarnings.push('La scadenza di questo goal è già trascorsa.');
      } else if (monthlyAmount > 0) {
        // Check if montly contribution covers what's needed
        const remaining = Math.max(0, goal.target - goal.current);
        const requiredMonthly = monthsLeft > 0 ? remaining / monthsLeft : Infinity;
        if (requiredMonthly > monthlyAmount) {
          deadlineFeasible = false;
          itemWarnings.push(
            `Con €${monthlyAmount.toFixed(2)}/mese non sarà possibile raggiungere l'obiettivo entro la scadenza (necessari €${requiredMonthly.toFixed(2)}/mese).`,
          );
        }
      } else {
        // No allocation and a future deadline
        const remaining = Math.max(0, goal.target - goal.current);
        if (remaining > 0) {
          deadlineFeasible = false;
          itemWarnings.push('Nessun importo allocato: la scadenza non sarà rispettata.');
        }
      }
    }

    // ── Reasoning ────────────────────────────────────────────────────
    const reasoning = _buildReasoning(
      goal,
      monthlyAmount,
      isEmergency,
      urgencyBoosted,
      deadlinePassed,
    );

    items.push({
      goalId: goal.id,
      monthlyAmount,
      deadlineFeasible,
      reasoning,
      warnings: itemWarnings,
    });
  }

  // ── Aggregate totals ──────────────────────────────────────────────────
  const totalAllocated = _round2(items.reduce((sum, it) => sum + it.monthlyAmount, 0));
  const unallocated = _round2(savingsPool - totalAllocated);

  return {
    items,
    incomeAfterEssentials,
    totalAllocated,
    unallocated,
    warnings: globalWarnings,
  };
}
