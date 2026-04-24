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
  PoolAllocation,
} from '@/types/onboarding-plan';
import { inferGoalType } from './inferGoalType';

// Sprint 1.6.6 #055 + #008: feature flag NEXT_PUBLIC_ENABLE_3POOL_MODEL rimosso.
// 3-pool model è ora comportamento unico. Vedi ADR-005 + #054 invariants I2/I3
// (pool cap hard) e atomic #008 "flag removal" chiuso.

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

function _isOpenended(goal: AllocationGoalInput): boolean {
  return goal.type === 'openended';
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
  if (isEmergency) {
    return `Fondo di emergenza: allocazione prioritaria del ${Math.round(_EMERGENCY_OVERRIDE_FRACTION * 100)}% del budget mensile disponibile come protezione finanziaria.`;
  }
  if (goal.target === null || goal.target === 0) {
    if (_isOpenended(goal)) return 'Obiettivo aperto: quota mensile dal budget residuo.';
    return 'Target non specificato';
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


/**
 * Core per-pool allocation (extract of Sprint 1.5 algorithm).
 * Emergency 40% floor + waterfall + openended residual split + item warnings.
 *
 * `emitCapWarning` toggles the "savings target > income after essentials" warning,
 * which only applies in the legacy single-pool path (pre-Sprint-1.5.3). In 3-pool
 * mode the boundary check (lifestyle+savings+invest ≤ incomeAfterEssentials) is
 * enforced at the dispatcher level via hardBlock, so this warning is skipped.
 */
function _computeSinglePool(
  goals: AllocationGoalInput[],
  poolBudget: number,
  incomeAfterEssentials: number,
  emitCapWarning: boolean,
  now: Date,
  /** Sprint 1.6.4D #028: pool label per disambiguare warning text
   * (es. "Budget residuo Savings €X" invece di generico "Budget residuo €X"
   * che user confondeva con lifestyle budget quando coincidenza numerica). */
  poolLabel?: string,
): {
  items: AllocationResultItem[];
  totalAllocated: number;
  residual: number;
  warnings: string[];
} {
  const globalWarnings: string[] = [];

  if (emitCapWarning && poolBudget > incomeAfterEssentials) {
    globalWarnings.push(
      `Il target di risparmio mensile (${_fmtEur(poolBudget)}) supera il reddito disponibile dopo le spese essenziali (${_fmtEur(incomeAfterEssentials)}). Il piano è stato calcolato sul reddito disponibile effettivo.`,
    );
  }

  const savingsPool = emitCapWarning
    ? _round2(Math.min(poolBudget, incomeAfterEssentials))
    : _round2(poolBudget);

  if (goals.length === 0) {
    if (savingsPool > 0) {
      globalWarnings.push('Nessun obiettivo definito. Il budget mensile disponibile rimane non allocato.');
    }
    return {
      items: [],
      totalAllocated: 0,
      residual: savingsPool,
      warnings: globalWarnings,
    };
  }

  const emergencyIndex = goals.findIndex((g) => _isEmergencyGoal(g, now));

  let emergencyAmount = 0;
  let remainingPool = savingsPool;

  if (emergencyIndex >= 0) {
    const emergencyGoal = goals[emergencyIndex]!;
    // Openended emergency: null target = uncapped need → take full 40% floor
    const isOpenendedEmergency = _isOpenended(emergencyGoal);
    const effectiveTarget = emergencyGoal.target ?? 0;
    const emergencyNeed = isOpenendedEmergency
      ? savingsPool * _EMERGENCY_OVERRIDE_FRACTION // no cap for openended
      : Math.max(0, effectiveTarget - emergencyGoal.current);
    if (isOpenendedEmergency || effectiveTarget > 0) {
      emergencyAmount = _round2(Math.min(savingsPool * _EMERGENCY_OVERRIDE_FRACTION, emergencyNeed));
      remainingPool = _round2(savingsPool - emergencyAmount);
    }
  }

  // Non-emergency, non-openended goals with a real target go into the waterfall.
  // Openended goals (other than emergency) get the residual split after waterfall.
  const otherGoals: Array<{ goal: AllocationGoalInput; originalIndex: number }> = goals
    .map((goal, originalIndex) => ({ goal, originalIndex }))
    .filter(({ originalIndex, goal }) => {
      if (originalIndex === emergencyIndex) return false;
      if (_isOpenended(goal)) return false;
      return (goal.target ?? 0) > 0;
    })
    .sort((a, b) => (a.goal.priority as number) - (b.goal.priority as number));

  const openendedNonEmergencyGoals: Array<{ goal: AllocationGoalInput; originalIndex: number }> = goals
    .map((goal, originalIndex) => ({ goal, originalIndex }))
    .filter(({ originalIndex, goal }) => {
      if (originalIndex === emergencyIndex) return false;
      return _isOpenended(goal);
    });

  const waterfallResults = _runWaterfall(otherGoals, remainingPool, now);

  // Residual after waterfall → split equally among openended non-emergency goals.
  // To avoid leaving cent-level residuals unallocated due to floating-point rounding,
  // the last openended goal absorbs any remaining amount so the total matches the pool.
  const waterfallConsumed = _round2(waterfallResults.reduce((sum, e) => sum + e.amount, 0));
  const waterfallRemainder = _round2(remainingPool - waterfallConsumed);
  const openendedAmountMap = new Map<number, number>();
  if (openendedNonEmergencyGoals.length > 0 && waterfallRemainder > 0) {
    const perOpenended = _round2(waterfallRemainder / openendedNonEmergencyGoals.length);
    let allocatedToOpenended = 0;
    openendedNonEmergencyGoals.forEach(({ originalIndex }, index) => {
      const isLast = index === openendedNonEmergencyGoals.length - 1;
      const amount = isLast
        ? _round2(waterfallRemainder - allocatedToOpenended)
        : perOpenended;
      openendedAmountMap.set(originalIndex, amount);
      allocatedToOpenended = _round2(allocatedToOpenended + amount);
    });
  } else if (openendedNonEmergencyGoals.length > 0) {
    for (const { originalIndex } of openendedNonEmergencyGoals) {
      openendedAmountMap.set(originalIndex, 0);
    }
  }

  if (emergencyAmount > 0 && otherGoals.length > 0 && savingsPool > 0) {
    // Gamma warning: compare pure waterfall (no emergency floor) vs actual.
    // Only consider fixed goals for this comparison.
    const allNonZeroGoals: Array<{ goal: AllocationGoalInput; originalIndex: number }> = goals
      .map((goal, originalIndex) => ({ goal, originalIndex }))
      .filter(({ goal }) => !_isOpenended(goal) && (goal.target ?? 0) > 0)
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

    // Openended non-emergency: distribute from residual split
    if (!isEmergency && _isOpenended(goal)) {
      const openendedAmount = openendedAmountMap.get(i) ?? 0;
      if (openendedAmount === 0) {
        itemWarnings.push('Budget esaurito: obiettivo aperto non riceverà allocazione in questo mese.');
      }
      items.push({
        goalId: goal.id, monthlyAmount: openendedAmount, deadlineFeasible: true,
        reasoning: openendedAmount > 0
          ? `Obiettivo aperto: quota mensile dal budget residuo (${_fmtEur(openendedAmount)}).`
          : 'Obiettivo aperto: budget residuo esaurito.',
        warnings: itemWarnings,
      });
      continue;
    }

    // effectiveTarget: use 0 for null (openended or unspecified) for numeric ops below
    const effectiveTarget = goal.target ?? 0;

    // Fixed non-emergency with target=0: no allocation
    if (!isEmergency && !_isOpenended(goal) && effectiveTarget === 0) {
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
      // Openended emergency: no deadline feasibility check (no hard target)
      if (deadlineDate !== null && !_isOpenended(goal)) {
        const monthsLeft = _monthsDiff(now, deadlineDate);
        if (monthsLeft < 0) {
          deadlineFeasible = false;
          itemWarnings.push('La scadenza di questo goal è già trascorsa.');
        } else if (emergencyAmount > 0) {
          const remaining = Math.max(0, effectiveTarget - goal.current);
          const reqM = monthsLeft > 0 ? remaining / monthsLeft : Infinity;
          if (reqM > emergencyAmount) {
            deadlineFeasible = false;
            itemWarnings.push(`Con ${_fmtEur(emergencyAmount)}/mese non sarà possibile raggiungere l'obiettivo entro la scadenza (necessari ${_fmtEur(reqM)}/mese).`);
          }
        } else {
          const remaining = Math.max(0, effectiveTarget - goal.current);
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
        const remaining = Math.max(0, effectiveTarget - goal.current);
        if (remaining > 0) {
          deadlineFeasible = false;
          itemWarnings.push(`Budget insufficiente per raggiungere questo goal: importo allocato ${_fmtEur(0)}.`);
        }
      }
    } else {
      if (amount === 0) {
        const remaining = Math.max(0, effectiveTarget - goal.current);
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
    // Sprint 1.6.4D #028: pool label esplicito per evitare ambiguità con lifestyle budget
    const poolPrefix = poolLabel ? `Budget residuo pool ${poolLabel}` : 'Budget residuo';
    if (hasInfeasibleItem) {
      globalWarnings.push(
        `${poolPrefix} di ${_fmtEur(unallocated)} non allocato. Alcuni obiettivi hanno deadline non raggiungibile con l'allocation corrente — considera di estendere deadline o ridurre target.`,
      );
    } else {
      // Sprint 1.6.4D #028 Copilot round 1: nota "non va a lifestyle né altri pool"
      // sensata SOLO in 3-pool mode (poolLabel valorizzato). Legacy single-pool no.
      const extraNote = poolLabel
        ? ` Il budget ${poolLabel} non utilizzato non va a lifestyle né ad altri pool.`
        : '';
      globalWarnings.push(
        `${poolPrefix} di ${_fmtEur(unallocated)} non allocato (tutti gli obiettivi sono stati finanziati per intero).${extraNote}`,
      );
    }
  }

  return { items, totalAllocated, residual: unallocated, warnings: globalWarnings };
}

/**
 * Top-level dispatcher for Step 4 "Piano proposto" allocation.
 *
 * Sprint 1.6.6 #055: 3-pool allocation (unified post flag removal #008).
 * Routing: goal via `inferGoalType` → savings OR investments.
 * Pool cap enforcement: SUM(allocated per pool) ≤ Step2.pool (invariant I2 #054).
 * Hard block: `lifestyle + savings + invest > incomeAfterEssentials` → no allocation.
 */
export function computeAllocation(input: AllocationInput): AllocationResult {
  const now = new Date();
  const { monthlyIncome, monthlySavingsTarget, essentialsPct, goals } = input;
  const incomeAfterEssentials = _round2(monthlyIncome * (1 - essentialsPct / 100));

  // 3-pool path (sempre): lifestyle locked-info, savings + investments independent.
  const lifestyleBudget = input.lifestyleBuffer ?? 0;
  const savingsBudget = monthlySavingsTarget;
  const investBudget = input.investmentsTarget ?? 0;
  const totalBudget = _round2(lifestyleBudget + savingsBudget + investBudget);

  if (totalBudget > incomeAfterEssentials + 0.01) {
    return {
      items: [],
      incomeAfterEssentials,
      totalAllocated: 0,
      unallocated: 0,
      warnings: [],
      hardBlock: {
        reason: `Budget totale ${_fmtEur(totalBudget)} eccede il disponibile ${_fmtEur(incomeAfterEssentials)}. Riduci lifestyle/savings/invest in Step 2.`,
      },
      pools: {
        lifestyle: { budget: lifestyleBudget, locked: true },
        savings: { budget: savingsBudget, allocated: 0, residual: savingsBudget, items: [] },
        investments: { budget: investBudget, allocated: 0, residual: investBudget, items: [] },
      },
    };
  }

  // Route goals via inferGoalType (presetId exact match → name-heuristic fallback).
  const savingsGoals: AllocationGoalInput[] = [];
  const investGoals: AllocationGoalInput[] = [];
  for (const g of goals) {
    const pool = inferGoalType({ name: g.name, presetId: g.presetId ?? null });
    if (pool === 'investments') investGoals.push(g);
    else savingsGoals.push(g);
  }

  const savingsResult = _computeSinglePool(savingsGoals, savingsBudget, incomeAfterEssentials, false, now, 'Risparmi');
  const investResult = _computeSinglePool(investGoals, investBudget, incomeAfterEssentials, false, now, 'Investimenti');

  // Rebuild items[] preserving original goals[] order (cross-pool).
  const itemsById = new Map<string, AllocationResultItem>();
  for (const it of savingsResult.items) itemsById.set(it.goalId, it);
  for (const it of investResult.items) itemsById.set(it.goalId, it);
  const items: AllocationResultItem[] = goals.map((g) => {
    const existing = itemsById.get(g.id);
    return (
      existing ?? {
        goalId: g.id,
        monthlyAmount: 0,
        deadlineFeasible: true,
        reasoning: 'Goal non classificato (nessuna allocazione).',
        warnings: [],
      }
    );
  });

  const totalAllocated = _round2(savingsResult.totalAllocated + investResult.totalAllocated);
  const unallocated = _round2(savingsResult.residual + investResult.residual);

  const savingsPool: PoolAllocation = {
    budget: savingsBudget,
    allocated: savingsResult.totalAllocated,
    residual: savingsResult.residual,
    items: savingsResult.items,
  };
  const investmentsPool: PoolAllocation = {
    budget: investBudget,
    allocated: investResult.totalAllocated,
    residual: investResult.residual,
    items: investResult.items,
  };

  return {
    items,
    incomeAfterEssentials,
    totalAllocated,
    unallocated,
    warnings: [...savingsResult.warnings, ...investResult.warnings],
    pools: {
      lifestyle: { budget: lifestyleBudget, locked: true },
      savings: savingsPool,
      investments: investmentsPool,
    },
  };
}
