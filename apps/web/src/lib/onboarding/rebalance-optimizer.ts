/**
 * Sprint 1.5.4 WP-Q4: rebalance optimizer O(n log n).
 *
 * 3-phase algorithm:
 * - Phase 1: greedy waterfall per pool sorted by (priority ASC, requiredMonthly DESC)
 * - Phase 2: local improvement — donor→receiver transfers (equal/lower priority donors only)
 * - Phase 3: deadline extension suggestions for still-infeasible goals
 *
 * 3 criteria: 'feasibility' (default, max # feasible), 'time' (min extensions aggregate), 'equal' (pro-rata).
 *
 * Pure function, no I/O. Returns new allocations Map + optional extension suggestions.
 *
 * @module lib/onboarding/rebalance-optimizer
 */

import type { AllocationInput, AllocationGoalInput, SuggestionChip } from '@/types/onboarding-plan';
import { inferGoalType } from './inferGoalType';

/**
 * Sprint 1.5.4 Q4: supported rebalance strategies.
 * - 'feasibility' (default): maximize number of feasible goals via donor/receiver transfers
 * - 'equal': pro-rata distribution, capped at goal need (no priority ordering)
 *
 * Note: 'time' (minimize aggregate deadline extensions) was planned but removed
 * from public API in Copilot round 1 — was aliasing 'feasibility' without distinct
 * implementation, which misled users. Defer to Sprint 1.6 if business case.
 */
export type RebalanceCriterion = 'feasibility' | 'equal';

export interface RebalanceInput {
  input: AllocationInput;
  /** Current allocations snapshot — currently unused but reserved for future delta-aware variants. */
  currentAllocations?: Record<string, number>;
  /** Default 'feasibility'. */
  criterion?: RebalanceCriterion;
}

export interface RebalanceResult {
  feasible: boolean;
  newAllocations?: Record<string, number>;
  /** Deadline extension suggestions for goals still infeasible post Phase 2. */
  suggestions?: SuggestionChip[];
  /** Short message describing outcome (e.g. "2 goals still infeasible"). */
  reason?: string;
}

const EPSILON = 0.01;

function _round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function _parseDate(s: string | null): Date | null {
  if (!s) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function _monthsDiff(from: Date, to: Date): number {
  // Aligned with apps/web/src/lib/onboarding/allocation.ts::_monthsDiff — subtracts
  // 1 month when to-day < from-day to avoid counting a partial month. Ensures
  // requiredMonthly parity between rebalance and allocation near month boundaries.
  const yearDiff = to.getFullYear() - from.getFullYear();
  const monthDiff = to.getMonth() - from.getMonth();
  const dayAdjust = to.getDate() < from.getDate() ? -1 : 0;
  return yearDiff * 12 + monthDiff + dayAdjust;
}

function _addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

interface _GoalMeta {
  goal: AllocationGoalInput;
  need: number;
  monthsLeft: number | null;
  requiredMonthly: number;
}

function _computeMeta(goal: AllocationGoalInput, now: Date): _GoalMeta {
  const target = goal.target ?? 0;
  const need = Math.max(0, target - goal.current);
  const deadlineDate = _parseDate(goal.deadline);
  const monthsLeft = deadlineDate ? _monthsDiff(now, deadlineDate) : null;
  const requiredMonthly =
    monthsLeft !== null && monthsLeft > 0 ? need / monthsLeft : need;
  return { goal, need, monthsLeft, requiredMonthly };
}

function _routeGoals(input: AllocationInput): {
  savings: AllocationGoalInput[];
  investments: AllocationGoalInput[];
} {
  const savings: AllocationGoalInput[] = [];
  const investments: AllocationGoalInput[] = [];
  for (const g of input.goals) {
    const pool = inferGoalType({ name: g.name, presetId: g.presetId ?? null });
    if (pool === 'investments') investments.push(g);
    else savings.push(g);
  }
  return { savings, investments };
}

function _phase1Waterfall(
  goals: AllocationGoalInput[],
  poolBudget: number,
  now: Date,
): { allocations: Record<string, number>; infeasible: Set<string> } {
  const metasByOrigId = new Map(goals.map((g) => [g.id, _computeMeta(g, now)]));
  const sorted = [...goals].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const ra = metasByOrigId.get(a.id)!.requiredMonthly;
    const rb = metasByOrigId.get(b.id)!.requiredMonthly;
    return rb - ra; // requiredMonthly DESC
  });
  const allocations: Record<string, number> = {};
  const infeasible = new Set<string>();
  let remaining = poolBudget;
  for (const g of sorted) {
    const meta = metasByOrigId.get(g.id)!;
    const amount = Math.min(Math.max(0, remaining), meta.requiredMonthly);
    allocations[g.id] = _round2(amount);
    remaining = _round2(remaining - amount);
    if (amount + EPSILON < meta.requiredMonthly && meta.need > 0) {
      infeasible.add(g.id);
    }
  }
  return { allocations, infeasible };
}

function _phase2LocalImprove(
  phase1: { allocations: Record<string, number>; infeasible: Set<string> },
  goals: AllocationGoalInput[],
  now: Date,
): { allocations: Record<string, number>; infeasible: Set<string> } {
  const { allocations, infeasible } = phase1;
  const goalById = new Map(goals.map((g) => [g.id, g]));
  const metasByOrigId = new Map(goals.map((g) => [g.id, _computeMeta(g, now)]));
  const infeasibleList = [...infeasible].sort((a, b) => {
    const ga = goalById.get(a)!;
    const gb = goalById.get(b)!;
    return ga.priority - gb.priority;
  });

  for (const gId of infeasibleList) {
    const meta = metasByOrigId.get(gId)!;
    const gap = meta.requiredMonthly - (allocations[gId] ?? 0);
    if (gap <= EPSILON) {
      infeasible.delete(gId);
      continue;
    }
    const receiver = goalById.get(gId)!;
    const candidates = goals
      .filter((d) => d.id !== gId)
      .filter((d) => d.priority >= receiver.priority && (allocations[d.id] ?? 0) > EPSILON)
      .sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority; // lower priority first
        return (allocations[b.id] ?? 0) - (allocations[a.id] ?? 0);
      });
    let needLeft = gap;
    for (const donor of candidates) {
      if (needLeft <= EPSILON) break;
      const donorAllocated = allocations[donor.id] ?? 0;
      const transfer = Math.min(needLeft, donorAllocated);
      if (transfer > EPSILON) {
        allocations[gId] = _round2((allocations[gId] ?? 0) + transfer);
        allocations[donor.id] = _round2(donorAllocated - transfer);
        needLeft = _round2(needLeft - transfer);
      }
    }
    if (needLeft <= EPSILON) infeasible.delete(gId);
  }
  return { allocations, infeasible };
}

function _phase3Suggestions(
  allocations: Record<string, number>,
  infeasible: Set<string>,
  goals: AllocationGoalInput[],
  now: Date,
): SuggestionChip[] {
  const suggestions: SuggestionChip[] = [];
  for (const gId of infeasible) {
    const goal = goals.find((g) => g.id === gId);
    if (!goal) continue;
    const meta = _computeMeta(goal, now);
    const allocated = allocations[gId] ?? 0;
    if (allocated <= EPSILON || meta.monthsLeft === null || meta.monthsLeft <= 0) continue;
    // extensionMonths ≈ (need - allocated*monthsLeft) / allocated per raggiungere target
    const extensionMonths = Math.ceil(
      (meta.need - allocated * meta.monthsLeft) / allocated,
    );
    if (extensionMonths > 0 && goal.deadline) {
      const deadlineDate = _parseDate(goal.deadline);
      if (!deadlineDate) continue;
      const newDeadline = _addMonths(deadlineDate, extensionMonths);
      suggestions.push({
        kind: 'extend_deadline',
        goalId: goal.id,
        delta: extensionMonths,
        newValue: newDeadline.toISOString().slice(0, 10),
        description: `Estendi deadline di ${extensionMonths} mesi`,
        reasoning: `Con allocation €${_round2(allocated)}/mese, servono ${extensionMonths} mesi in più per raggiungere il target di €${meta.need}.`,
      });
    }
  }
  return suggestions;
}

function _equalDistribute(
  goals: AllocationGoalInput[],
  poolBudget: number,
  now: Date,
): Record<string, number> {
  const allocations: Record<string, number> = {};
  if (goals.length === 0 || poolBudget <= 0) {
    for (const g of goals) allocations[g.id] = 0;
    return allocations;
  }
  const perGoal = poolBudget / goals.length;
  for (const g of goals) {
    if (g.type === 'openended') {
      // Openended goals non hanno cap (target=null, need=0 spurious)
      allocations[g.id] = _round2(perGoal);
      continue;
    }
    const meta = _computeMeta(g, now);
    // Cap at need (completed goals don't take more)
    allocations[g.id] = _round2(Math.min(perGoal, Math.max(0, meta.need)));
  }
  return allocations;
}

/**
 * Sprint 1.5.5 Bug #1: dopo waterfall + local improve, il residual del pool
 * (budget - allocations fixed) viene splittato equamente tra openended goals
 * del pool. Risolve caso Fondo Emergenza openended che riceve 0 perché
 * _computeMeta(target=null).need = 0 → requiredMonthly = 0 → Phase 1 alloca 0.
 */
function _residualSplitOpenended(
  allocations: Record<string, number>,
  goals: AllocationGoalInput[],
  poolBudget: number,
): Record<string, number> {
  const totalAllocated = Object.values(allocations).reduce((a, b) => a + b, 0);
  const residual = _round2(poolBudget - totalAllocated);
  if (residual <= EPSILON) return allocations;
  const openended = goals.filter((g) => g.type === 'openended');
  if (openended.length === 0) return allocations;
  const perGoal = _round2(residual / openended.length);
  const result = { ...allocations };
  for (const g of openended) {
    result[g.id] = _round2((result[g.id] ?? 0) + perGoal);
  }
  return result;
}

export function rebalanceOptimizer(args: RebalanceInput): RebalanceResult {
  const { input, criterion = 'feasibility' } = args;
  const now = new Date();

  if (input.goals.length === 0) {
    return { feasible: true, newAllocations: {}, reason: 'Nessun obiettivo da rebalancer.' };
  }

  // Precondition: all fixed goals already completed → no-op
  const allComplete = input.goals.every((g) => {
    if (g.type === 'openended') return false; // openended never "complete"
    const need = Math.max(0, (g.target ?? 0) - g.current);
    return need <= 0;
  });
  if (allComplete) {
    return {
      feasible: true,
      newAllocations: Object.fromEntries(input.goals.map((g) => [g.id, 0])),
      reason: 'Tutti i goal fixed sono già completati.',
    };
  }

  const routed = _routeGoals(input);
  const savingsBudget = input.monthlySavingsTarget;
  const investBudget = input.investmentsTarget ?? 0;

  let savingsAlloc: Record<string, number>;
  let investAlloc: Record<string, number>;
  let infeasibleSet = new Set<string>();

  if (criterion === 'equal') {
    savingsAlloc = _equalDistribute(routed.savings, savingsBudget, now);
    investAlloc = _equalDistribute(routed.investments, investBudget, now);
  } else {
    const s1 = _phase1Waterfall(routed.savings, savingsBudget, now);
    const i1 = _phase1Waterfall(routed.investments, investBudget, now);
    const s2 = _phase2LocalImprove(s1, routed.savings, now);
    const i2 = _phase2LocalImprove(i1, routed.investments, now);
    savingsAlloc = _residualSplitOpenended(s2.allocations, routed.savings, savingsBudget);
    investAlloc = _residualSplitOpenended(i2.allocations, routed.investments, investBudget);
    infeasibleSet = new Set([...s2.infeasible, ...i2.infeasible]);
  }

  const newAllocations: Record<string, number> = { ...savingsAlloc, ...investAlloc };

  // Boundary guard
  const savingsTotal = Object.values(savingsAlloc).reduce((a, b) => a + b, 0);
  const investTotal = Object.values(investAlloc).reduce((a, b) => a + b, 0);
  if (savingsTotal > savingsBudget + EPSILON) {
    return { feasible: false, reason: 'Internal error: savings pool budget overflow.' };
  }
  if (investTotal > investBudget + EPSILON) {
    return { feasible: false, reason: 'Internal error: investments pool budget overflow.' };
  }

  const suggestions =
    criterion === 'equal'
      ? []
      : _phase3Suggestions(newAllocations, infeasibleSet, input.goals, now);

  return {
    feasible: infeasibleSet.size === 0,
    newAllocations,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    reason:
      infeasibleSet.size > 0
        ? `${infeasibleSet.size} goal ancora non feasible — vedi suggerimenti estensione deadline.`
        : undefined,
  };
}
