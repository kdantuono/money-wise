/**
 * Sprint 1.5 — Onboarding Piano Generato
 * Allocation algorithm — beta+gamma waterfall hybrid (issue #458 rewrite).
 *
 * beta: emergency goal gets min(savingsPool x 0.4, need) as safety-net floor
 * BEFORE waterfall runs.
 *
 * Waterfall: remaining pool distributed to non-emergency goals sorted ASC by
 * priority (ALTA=1 first). Each goal consumes min(remainingPool, requiredMonthly).
 *
 * gamma: when emergency floor impacts top non-emergency goal by >=5% of
 * savingsPool, surfaces Italian-language warning with pure-waterfall simulation.
 *
 * @module allocation
 */

import type {
  AllocationInput,
  AllocationResult,
  AllocationResultItem,
  AllocationGoalInput,
} from '@/types/onboarding-plan';

const _EMERGENCY_NAME_PATTERN = /emergenza|emergency/i;
const _EMERGENCY_OVERRIDE_FRACTION = 0.4;
/** Maximum months-to-deadline for a priority=1 goal to be treated as emergency. */
const _EMERGENCY_DEADLINE_MONTHS = 12;

function _fmtEur(amount: number): string {
  return `€${amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function _monthsDiff(from: Date, to: Date): number {
  const yearDiff = to.getFullYear() - from.getFullYear();
  const monthDiff = to.getMonth() - from.getMonth();
  const dayAdjust = to.getDate() < from.getDate() ? -1 : 0;
  return yearDiff * 12 + monthDiff + dayAdjust;
}

function _parseDeadline(deadline: string | null): Date | null {
  if (!deadline) return null;
  const datePart = deadline.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) {
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

function _isEmergencyGoal(goal: AllocationGoalInput, now: Date): boolean {
  // Openended goals never act as the emergency floor — they already receive
  // the residual pool. Requiring type='fixed' prevents a null target from
  // crashing emergencyNeed = goal.target - goal.current (issue #464).
  if (goal.type === 'openended') return false;
  if (_EMERGENCY_NAME_PATTERN.test(goal.name)) return true;
  if (goal.priority === 1) {
    const deadlineDate = _parseDeadline(goal.deadline);
    if (deadlineDate !== null) {
      const months = _monthsDiff(now, deadlineDate);
      if (months >= 0 && months <= _EMERGENCY_DEADLINE_MONTHS) return true;
    }
  }
  return false;
}

function _round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function _buildReasoning(
  goal: AllocationGoalInput,
  monthlyAmount: number,
  isEmergency: boolean,
  deadlinePassed: boolean,
  requiredMonthly: number,
  remainingPoolBefore: number,
): string {
  if (goal.type === 'openended') {
    return `Fondo aperto: riceve il residuo del pool mensile ${_fmtEur(monthlyAmount)} dopo allocazione degli obiettivi con target fisso.`;
  }
  if (goal.target === 0 || goal.target === null) return 'Target non specificato';
  if (isEmergency) {
    return `Fondo di emergenza: allocazione prioritaria del ${Math.round(_EMERGENCY_OVERRIDE_FRACTION * 100)}% del budget mensile disponibile come protezione finanziaria.`;
  }
  const priorityLabel = goal.priority === 1 ? 'alta' : goal.priority === 2 ? 'media' : 'bassa';
  const parts: string[] = [`Priorità ${priorityLabel}`];
  if (deadlinePassed) parts.push('scadenza già superata — allocazione mantenuta per completare il goal');
  const consumed = Math.min(remainingPoolBefore, _round2(requiredMonthly));
  parts.push(`waterfall: consumato ${_fmtEur(consumed)} su ${_fmtEur(remainingPoolBefore)} disponibili`);
  parts.push(`importo mensile: ${_fmtEur(monthlyAmount)}`);
  return parts.join(' — ');
}

function _formatDistribution(pairs: Array<{ name: string; amount: number }>): string {
  return pairs.map((p) => `${p.name} ${_fmtEur(p.amount)}`).join(', ');
}

interface _WaterfallEntry {
  goal: AllocationGoalInput;
  originalIndex: number;
  requiredMonthly: number;
  amount: number;
  /** Pool available BEFORE this entry consumed its share (for O(1) reasoning display). */
  remainingPoolBefore: number;
}

function _runWaterfall(
  sorted: Array<{ goal: AllocationGoalInput; originalIndex: number }>,
  pool: number,
  now: Date,
): _WaterfallEntry[] {
  let remainingPool = pool;
  const results: _WaterfallEntry[] = [];
  for (const { goal, originalIndex } of sorted) {
    // Openended goals must not enter waterfall — callers are responsible for
    // filtering them out. This guard is a safety-net against divergence.
    if (goal.type === 'openended') continue;
    const target = goal.target ?? 0;
    const need = Math.max(0, target - goal.current);
    const deadlineDate = _parseDeadline(goal.deadline);
    const monthsLeft = deadlineDate ? _monthsDiff(now, deadlineDate) : null;
    const requiredMonthly =
      monthsLeft !== null && monthsLeft > 0 ? need / monthsLeft : need;
    const remainingPoolBefore = remainingPool;
    const amount = _round2(Math.min(remainingPool, requiredMonthly));
    results.push({ goal, originalIndex, requiredMonthly, amount, remainingPoolBefore });
    remainingPool = _round2(remainingPool - amount);
  }
  return results;
}

export function computeAllocation(input: AllocationInput): AllocationResult {
  const now = new Date();
  const { monthlyIncome, monthlySavingsTarget, essentialsPct, goals } = input;

  const incomeAfterEssentials = _round2(monthlyIncome * (1 - essentialsPct / 100));
  const savingsPool = _round2(Math.min(monthlySavingsTarget, incomeAfterEssentials));
  const globalWarnings: string[] = [];

  if (monthlySavingsTarget > incomeAfterEssentials) {
    globalWarnings.push(
      `Il target di risparmio mensile (${_fmtEur(monthlySavingsTarget)}) supera il reddito disponibile dopo le spese essenziali (${_fmtEur(incomeAfterEssentials)}). Il piano è stato calcolato sul reddito disponibile effettivo.`,
    );
  }

  if (goals.length === 0) {
    globalWarnings.push('Nessun obiettivo definito. Il budget mensile disponibile rimane non allocato.');
    return { items: [], incomeAfterEssentials, totalAllocated: 0, unallocated: savingsPool, warnings: globalWarnings };
  }

  // Separate fixed vs openended goals upfront.
  // Openended goals (issue #464) receive the residual pool AFTER emergency floor
  // + waterfall on fixed goals. Emergency detection is gated to fixed goals only
  // (an openended "Fondo Emergenza" collects surplus — no 40% floor applied).
  const openendedGoalIndices = new Set<number>(
    goals.map((g, i) => ({ g, i }))
      .filter(({ g }) => g.type === 'openended')
      .map(({ i }) => i),
  );

  const emergencyIndex = goals.findIndex((g) => _isEmergencyGoal(g, now));

  let emergencyAmount = 0;
  let remainingPool = savingsPool;

  if (emergencyIndex >= 0) {
    const emergencyGoal = goals[emergencyIndex]!;
    // emergencyGoal.target is non-null here because _isEmergencyGoal gates on type='fixed'
    const emergencyTarget = emergencyGoal.target ?? 0;
    if (emergencyTarget > 0) {
      const emergencyNeed = Math.max(0, emergencyTarget - emergencyGoal.current);
      emergencyAmount = _round2(Math.min(savingsPool * _EMERGENCY_OVERRIDE_FRACTION, emergencyNeed));
      remainingPool = _round2(savingsPool - emergencyAmount);
    }
  }

  const otherFixedGoals: Array<{ goal: AllocationGoalInput; originalIndex: number }> = goals
    .map((goal, originalIndex) => ({ goal, originalIndex }))
    .filter(({ originalIndex, goal }) =>
      originalIndex !== emergencyIndex &&
      !openendedGoalIndices.has(originalIndex) &&
      (goal.target ?? 0) > 0,
    )
    .sort((a, b) => (a.goal.priority as number) - (b.goal.priority as number));

  const waterfallResults = _runWaterfall(otherFixedGoals, remainingPool, now);

  // Gamma warning: when emergency floor shifts ≥5% of pool from top non-emergency fixed goal.
  if (emergencyAmount > 0 && otherFixedGoals.length > 0 && savingsPool > 0) {
    const allNonZeroFixedGoals: Array<{ goal: AllocationGoalInput; originalIndex: number }> = goals
      .map((goal, originalIndex) => ({ goal, originalIndex }))
      .filter(({ goal }) => goal.type !== 'openended' && (goal.target ?? 0) > 0)
      .sort((a, b) => (a.goal.priority as number) - (b.goal.priority as number));

    const pureWaterfallResults = _runWaterfall(allNonZeroFixedGoals, savingsPool, now);
    const topGoalId = otherFixedGoals[0]!.goal.id;
    const actualTopAmount = waterfallResults[0]?.amount ?? 0;
    const pureTopEntry = pureWaterfallResults.find((e) => e.goal.id === topGoalId);
    const pureTopAmount = pureTopEntry?.amount ?? 0;
    const delta = Math.abs(pureTopAmount - actualTopAmount) / savingsPool;

    if (delta >= 0.05) {
      const simPairs = pureWaterfallResults.map((e) => ({ name: e.goal.name, amount: e.amount }));
      globalWarnings.push(
        `Con waterfall puro senza protezione emergenza, il budget andrebbe: ${_formatDistribution(simPairs)}`,
      );
    }
  }

  const waterfallConsumed = _round2(waterfallResults.reduce((sum, e) => sum + e.amount, 0));
  const postWaterfallResidual = _round2(remainingPool - waterfallConsumed);

  // Distribute residual equally among openended goals.
  const openendedGoalCount = openendedGoalIndices.size;
  const openendedShare = openendedGoalCount > 0
    ? _round2(postWaterfallResidual / openendedGoalCount)
    : 0;

  // If residual remains AND there are no openended goals to absorb it, surface warning.
  if (postWaterfallResidual > 0 && openendedGoalCount === 0) {
    globalWarnings.push(
      `Budget residuo di ${_fmtEur(postWaterfallResidual)} non allocato (tutti gli obiettivi sono stati finanziati per intero).`,
    );
  }

  const waterfallAmountMap = new Map<number, _WaterfallEntry>();
  for (const entry of waterfallResults) {
    waterfallAmountMap.set(entry.originalIndex, entry);
  }

  const items: AllocationResultItem[] = [];

  for (let i = 0; i < goals.length; i++) {
    const goal = goals[i]!;
    const isEmergency = i === emergencyIndex;
    const isOpenended = openendedGoalIndices.has(i);
    const itemWarnings: string[] = [];

    // ── Openended goal: receives equal share of post-waterfall residual (issue #464)
    if (isOpenended) {
      items.push({
        goalId: goal.id,
        monthlyAmount: openendedShare,
        deadlineFeasible: true, // vacuously true — no deadline/target constraint
        reasoning: _buildReasoning(goal, openendedShare, false, false, 0, postWaterfallResidual),
        warnings: openendedShare === 0
          ? ['Budget esaurito dagli obiettivi con target fisso: nessun residuo disponibile questo mese.']
          : [],
      });
      continue;
    }

    // ── Fixed goal: target=0 or null (legacy guard)
    if ((goal.target ?? 0) === 0) {
      items.push({
        goalId: goal.id, monthlyAmount: 0, deadlineFeasible: true,
        reasoning: 'Target non specificato',
        warnings: ['Target non specificato: il goal non riceverà allocazione.'],
      });
      continue;
    }

    // ── Emergency fixed goal
    if (isEmergency) {
      const target = goal.target!; // non-null: _isEmergencyGoal gates on type='fixed'
      const deadlineDate = _parseDeadline(goal.deadline);
      let deadlineFeasible = true;
      if (deadlineDate !== null) {
        const monthsLeft = _monthsDiff(now, deadlineDate);
        if (monthsLeft < 0) {
          deadlineFeasible = false;
          itemWarnings.push('La scadenza di questo goal è già trascorsa.');
        } else if (emergencyAmount > 0) {
          const remaining = Math.max(0, target - goal.current);
          const reqM = monthsLeft > 0 ? remaining / monthsLeft : Infinity;
          if (reqM > emergencyAmount) {
            deadlineFeasible = false;
            itemWarnings.push(`Con ${_fmtEur(emergencyAmount)}/mese non sarà possibile raggiungere l'obiettivo entro la scadenza (necessari ${_fmtEur(reqM)}/mese).`);
          }
        } else {
          const remaining = Math.max(0, target - goal.current);
          if (remaining > 0) {
            deadlineFeasible = false;
            itemWarnings.push('Nessun importo allocato: la scadenza non sarà rispettata.');
          }
        }
      }
      items.push({
        goalId: goal.id, monthlyAmount: emergencyAmount, deadlineFeasible,
        reasoning: _buildReasoning(goal, emergencyAmount, true, false, emergencyAmount, savingsPool),
        warnings: itemWarnings,
      });
      continue;
    }

    // ── Standard waterfall fixed goal
    const entry = waterfallAmountMap.get(i);
    if (entry === undefined) {
      // Invariant violation: every non-emergency fixed goal with target > 0 must
      // appear in waterfallAmountMap. If reached, filter/sort logic has diverged.
      throw new Error(
        `Invariant violation: missing waterfall allocation for fixed goal (goalId: ${goal.id}).`,
      );
    }

    const { amount, requiredMonthly, remainingPoolBefore } = entry;
    const target = goal.target!;

    const deadlineDate = _parseDeadline(goal.deadline);
    let deadlineFeasible = true;
    let deadlinePassed = false;

    if (deadlineDate !== null) {
      const monthsLeft = _monthsDiff(now, deadlineDate);
      if (monthsLeft < 0) {
        deadlineFeasible = false; deadlinePassed = true;
        itemWarnings.push('La scadenza di questo goal è già trascorsa.');
      } else if (amount > 0) {
        if (requiredMonthly > amount + 0.005) {
          deadlineFeasible = false;
          itemWarnings.push(`Budget insufficiente per raggiungere questo goal in tempo (necessari ${_fmtEur(requiredMonthly)}/mese, allocati ${_fmtEur(amount)}/mese).`);
        }
      } else {
        const remaining = Math.max(0, target - goal.current);
        if (remaining > 0) {
          deadlineFeasible = false;
          itemWarnings.push(`Budget insufficiente per raggiungere questo goal: importo allocato ${_fmtEur(0)}.`);
        }
      }
    } else {
      if (amount === 0) {
        const remaining = Math.max(0, target - goal.current);
        if (remaining > 0) itemWarnings.push('Budget esaurito: questo goal non riceverà allocazione in questo mese.');
      }
    }

    items.push({
      goalId: goal.id, monthlyAmount: amount, deadlineFeasible,
      reasoning: _buildReasoning(goal, amount, false, deadlinePassed, requiredMonthly, remainingPoolBefore),
      warnings: itemWarnings,
    });
  }

  const totalAllocated = _round2(items.reduce((sum, it) => sum + it.monthlyAmount, 0));
  const unallocated = _round2(savingsPool - totalAllocated);
  return { items, incomeAfterEssentials, totalAllocated, unallocated, warnings: globalWarnings };
}
