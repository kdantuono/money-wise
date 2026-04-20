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

function _isEmergencyGoal(goal: AllocationGoalInput, _now: Date): boolean {
  return _EMERGENCY_NAME_PATTERN.test(goal.name);
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
  if (goal.target === 0) return 'Target non specificato';
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
    const need = Math.max(0, goal.target - goal.current);
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

  const emergencyIndex = goals.findIndex((g) => _isEmergencyGoal(g, now));

  let emergencyAmount = 0;
  let remainingPool = savingsPool;

  if (emergencyIndex >= 0 && goals[emergencyIndex]!.target > 0) {
    const emergencyGoal = goals[emergencyIndex]!;
    const emergencyNeed = Math.max(0, emergencyGoal.target - emergencyGoal.current);
    emergencyAmount = _round2(Math.min(savingsPool * _EMERGENCY_OVERRIDE_FRACTION, emergencyNeed));
    remainingPool = _round2(savingsPool - emergencyAmount);
  }

  const otherGoals: Array<{ goal: AllocationGoalInput; originalIndex: number }> = goals
    .map((goal, originalIndex) => ({ goal, originalIndex }))
    .filter(({ originalIndex, goal }) => originalIndex !== emergencyIndex && goal.target > 0)
    .sort((a, b) => (a.goal.priority as number) - (b.goal.priority as number));

  const waterfallResults = _runWaterfall(otherGoals, remainingPool, now);

  if (emergencyAmount > 0 && otherGoals.length > 0 && savingsPool > 0) {
    const allNonZeroGoals: Array<{ goal: AllocationGoalInput; originalIndex: number }> = goals
      .map((goal, originalIndex) => ({ goal, originalIndex }))
      .filter(({ goal }) => goal.target > 0)
      .sort((a, b) => (a.goal.priority as number) - (b.goal.priority as number));

    const pureWaterfallResults = _runWaterfall(allNonZeroGoals, savingsPool, now);
    const topGoalId = otherGoals[0]!.goal.id;
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

  const waterfallAmountMap = new Map<number, _WaterfallEntry>();
  for (const entry of waterfallResults) {
    waterfallAmountMap.set(entry.originalIndex, entry);
  }

  const items: AllocationResultItem[] = [];

  for (let i = 0; i < goals.length; i++) {
    const goal = goals[i]!;
    const isEmergency = i === emergencyIndex;
    const itemWarnings: string[] = [];

    if (goal.target === 0) {
      items.push({
        goalId: goal.id, monthlyAmount: 0, deadlineFeasible: true,
        reasoning: 'Target non specificato',
        warnings: ['Target non specificato: il goal non riceverà allocazione.'],
      });
      continue;
    }

    if (isEmergency) {
      const deadlineDate = _parseDeadline(goal.deadline);
      let deadlineFeasible = true;
      if (deadlineDate !== null) {
        const monthsLeft = _monthsDiff(now, deadlineDate);
        if (monthsLeft < 0) {
          deadlineFeasible = false;
          itemWarnings.push('La scadenza di questo goal è già trascorsa.');
        } else if (emergencyAmount > 0) {
          const remaining = Math.max(0, goal.target - goal.current);
          const reqM = monthsLeft > 0 ? remaining / monthsLeft : Infinity;
          if (reqM > emergencyAmount) {
            deadlineFeasible = false;
            itemWarnings.push(`Con ${_fmtEur(emergencyAmount)}/mese non sarà possibile raggiungere l'obiettivo entro la scadenza (necessari ${_fmtEur(reqM)}/mese).`);
          }
        } else {
          const remaining = Math.max(0, goal.target - goal.current);
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

    const entry = waterfallAmountMap.get(i);
    if (entry === undefined) {
      // This branch is an invariant violation: every non-emergency goal with target > 0
      // is added to otherGoals and must appear in waterfallAmountMap. If reached,
      // the filter/sort logic has diverged from this loop.
      throw new Error(
        `Invariant violation: missing waterfall allocation for non-emergency goal with target > 0 (goalId: ${goal.id}).`,
      );
    }

    const { amount, requiredMonthly, remainingPoolBefore } = entry;

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
        const remaining = Math.max(0, goal.target - goal.current);
        if (remaining > 0) {
          deadlineFeasible = false;
          itemWarnings.push(`Budget insufficiente per raggiungere questo goal: importo allocato ${_fmtEur(0)}.`);
        }
      }
    } else {
      if (amount === 0) {
        const remaining = Math.max(0, goal.target - goal.current);
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

  if (unallocated > 0) {
    const hasInfeasibleItem = items.some((it) => it.deadlineFeasible === false);
    if (hasInfeasibleItem) {
      globalWarnings.push(
        `Budget residuo di ${_fmtEur(unallocated)} non allocato. Alcuni obiettivi hanno deadline non raggiungibile con l'allocation corrente — considera di estendere deadline o ridurre target.`,
      );
    } else {
      globalWarnings.push(
        `Budget residuo di ${_fmtEur(unallocated)} non allocato (tutti gli obiettivi sono stati finanziati per intero).`,
      );
    }
  }

  return { items, incomeAfterEssentials, totalAllocated, unallocated, warnings: globalWarnings };
}
