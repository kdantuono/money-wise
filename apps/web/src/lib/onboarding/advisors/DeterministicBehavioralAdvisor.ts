/**
 * Sprint 1.5.2 — WP-E: DeterministicBehavioralAdvisor
 *
 * Implements AllocationAdvisor using:
 * - Existing β+γ waterfall from allocation.ts as the numeric core
 * - Behavioral intelligence layer: portfolio balance checks, tone-matched
 *   Italian warnings (amico-esperto + coach motivazionale style), suggestion chips
 *
 * All methods are pure (no side effects, no I/O).
 *
 * @module lib/onboarding/advisors/DeterministicBehavioralAdvisor
 */

import { computeAllocation } from '@/lib/onboarding/allocation';
import { inferGoalType } from '@/lib/onboarding/inferGoalType';
import type { AllocationAdvisor } from './AllocationAdvisor';
import type {
  AllocationInput,
  AllocationResult,
  BehavioralWarning,
  SuggestionChip,
  InfeasibleItem,
  UserAllocation,
} from '@/types/onboarding-plan';

// Sprint 1.6.6 #055 + #008: feature flag rimosso. Cross-validation Q7 attiva sempre
// (unified 3-pool model, niente più "legacy single-pool false-positive" da evitare).

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────

const LIFESTYLE_MIN_SOFT = 50; // €/month soft warning threshold
const LIFESTYLE_MIN_HARD = 100; // €/month hard recommendation
const DEBT_RATIO_WARN = 0.4; // 40% of disposable
const EMERGENCY_PATTERN = /emergenza|emergency/i;

// ─────────────────────────────────────────────────────────────────────────
// Warning message templates (IT, amico-esperto tone)
// ─────────────────────────────────────────────────────────────────────────

function _warnLifestyleZero(): BehavioralWarning {
  return {
    code: 'LIFESTYLE_TOO_LOW',
    severity: 'soft',
    message:
      'Ehi, zero budget lifestyle? Ti tengo d\'occhio eh! 👀 Senza una riserva per uscite e piccole spese rischi di pagare con carta di credito → interessi → debt spiral.',
    reasoning: `Ti consiglio minimo €${LIFESTYLE_MIN_HARD} per goderti pizza del sabato sera tranquillo. Lifestyle buffer protegge dal CC debt spiral.`,
  };
}

function _warnInvestZero(): BehavioralWarning {
  return {
    code: 'INVEST_ZERO_NO_DEBT',
    severity: 'soft',
    message:
      '🌱 Con zero investimenti il tuo patrimonio non cresce nel tempo. Anche €50/mese fa la differenza tra 10 anni.',
    reasoning:
      'Considera di destinare almeno il 10% del disponibile agli investimenti. Zero invest = zero wealth growth.',
  };
}

function _warnDebtRatioHigh(debtPct: number): BehavioralWarning {
  return {
    code: 'DEBT_RATIO_HIGH',
    severity: 'soft',
    message: `💳 Grosso focus sul debito — bene, ma attento: stai destinando più del ${Math.round(debtPct * 100)}% del disposable.`,
    reasoning:
      'OK se per 1-2 mesi, ma se prolungato rischi burnout finanziario. Valuta se bilanciare con emergency fund parallelo.',
  };
}

function _warnNoEmergency(): BehavioralWarning {
  return {
    code: 'NO_EMERGENCY_FUND',
    severity: 'soft',
    message:
      '🐷 Non hai un Fondo Emergenza attivo! Il primo passo di ogni piano finanziario solido è proteggerti da imprevisti.',
    reasoning:
      'Ti consiglio di aggiungerne uno con target 3-6 mesi di spese essenziali.',
  };
}

function _warnAllSamePriority(): BehavioralWarning {
  return {
    code: 'ALL_SAME_PRIORITY',
    severity: 'soft',
    message:
      '🎯 Tutti i tuoi goal hanno priorità ALTA. Significa tutto prioritario = nulla prioritario.',
    reasoning:
      'Considera di riordinare: 1-2 ALTA (essential, debt urgent), 2-3 MEDIA, resto BASSA.',
  };
}

function _encourageBalanced(): BehavioralWarning {
  return {
    code: 'PLAN_BALANCED',
    severity: 'soft',
    message:
      '🔥 Sei sulla strada giusta! Il tuo piano è bilanciato: emergency protetto, investimenti crescenti, debito controllato, lifestyle sostenibile.',
    reasoning: 'Ottimo lavoro!',
  };
}

function _warnNegativeDisposable(): BehavioralWarning {
  return {
    code: 'NEGATIVE_DISPOSABLE',
    severity: 'hard',
    message:
      '🔴 Il totale allocato supera il reddito disponibile. Configurazione impossibile.',
    reasoning:
      'Riduci il target di risparmio o aumenta il reddito per procedere.',
  };
}

function _warnAllInfeasible(): BehavioralWarning {
  return {
    code: 'ALL_INFEASIBLE',
    severity: 'hard',
    message:
      '🔴 Configurazione impossibile: tutti gli obiettivi hanno deadline non raggiungibile con l\'allocation corrente.',
    reasoning:
      'Riduci i target, estendi le scadenze o aumenta il budget di risparmio mensile.',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function _hasDebtGoals(input: AllocationInput): boolean {
  return input.goals.some(
    (g) =>
      /debito|debt|mutuo|mortgage|prestito|loan|bnpl|rata/i.test(g.name),
  );
}

function _hasEmergencyGoal(input: AllocationInput): boolean {
  return input.goals.some((g) => EMERGENCY_PATTERN.test(g.name));
}

function _allSamePriority(input: AllocationInput): boolean {
  if (input.goals.length < 2) return false;
  const first = input.goals[0]!.priority;
  return input.goals.every((g) => g.priority === first);
}

function _computeDebtRatio(
  input: AllocationInput,
  result: AllocationResult,
): number {
  const disposable = result.incomeAfterEssentials;
  if (disposable <= 0) return 0;
  const debtGoalIds = new Set(
    input.goals
      .filter((g) => /debito|debt|mutuo|mortgage|prestito|loan|bnpl|rata/i.test(g.name))
      .map((g) => g.id),
  );
  const debtAllocated = result.items
    .filter((it) => debtGoalIds.has(it.goalId))
    .reduce((sum, it) => sum + it.monthlyAmount, 0);
  return debtAllocated / disposable;
}

/**
 * Parse an ISO date string (YYYY-MM-DD) into a Date. Returns null on invalid.
 */
function _parseDate(s: string | null): Date | null {
  if (!s) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function _monthsFromNow(deadline: string | null): number | null {
  const d = _parseDate(deadline);
  if (!d) return null;
  const now = new Date();
  return (
    (d.getFullYear() - now.getFullYear()) * 12 +
    (d.getMonth() - now.getMonth())
  );
}

// ─────────────────────────────────────────────────────────────────────────
// DeterministicBehavioralAdvisor class
// ─────────────────────────────────────────────────────────────────────────

export class DeterministicBehavioralAdvisor implements AllocationAdvisor {
  /**
   * Compute allocation using β+γ waterfall, then layer behavioral warnings.
   */
  proposeAllocation(input: AllocationInput): AllocationResult {
    const base = computeAllocation(input);

    const behavioralWarnings = this._analyzePortfolio(input, base);

    // Hard-block detection
    let hardBlock: AllocationResult['hardBlock'] = null;

    const allGoalsWithTarget = input.goals.filter((g) => g.target > 0);
    const allInfeasible =
      allGoalsWithTarget.length > 0 &&
      base.items
        .filter((it) => {
          const goal = input.goals.find((g) => g.id === it.goalId);
          return goal && goal.target > 0;
        })
        .every((it) => !it.deadlineFeasible && it.monthlyAmount === 0);

    if (base.incomeAfterEssentials < 0) {
      hardBlock = {
        reason:
          'Il reddito disponibile dopo le spese essenziali è negativo. Impossibile procedere.',
      };
    } else if (
      (input.lifestyleBuffer ?? 0) + (input.investmentsTarget ?? 0) + input.monthlySavingsTarget >
      base.incomeAfterEssentials
    ) {
      hardBlock = {
        reason:
          'La somma di lifestyle + investimenti + risparmio supera il reddito disponibile.',
      };
    } else if (allInfeasible && allGoalsWithTarget.length > 0) {
      hardBlock = {
        reason:
          'Configurazione impossibile: tutti gli obiettivi hanno deadline non raggiungibile. Riduci i target, estendi le scadenze o aumenta il budget mensile.',
      };
    }

    const infeasibleItems: InfeasibleItem[] = base.items
      .filter((it) => !it.deadlineFeasible)
      .map((it) => {
        const goal = input.goals.find((g) => g.id === it.goalId)!;
        const need = Math.max(0, goal.target - goal.current);
        const months = _monthsFromNow(goal.deadline);
        const requiredMonthly =
          months !== null && months > 0 ? need / months : need;
        return {
          goalId: it.goalId,
          name: goal.name,
          shortfall: Math.max(0, requiredMonthly - it.monthlyAmount),
          deadline: goal.deadline,
          currentMonthly: it.monthlyAmount,
          requiredMonthly,
        };
      });

    const suggestions = this.generateSuggestions(infeasibleItems);

    return {
      ...base,
      behavioralWarnings,
      hardBlock,
      suggestions,
    };
  }

  /**
   * Analyse user overrides against base input.
   * Returns warnings triggered by the current override configuration.
   */
  analyzeUserOverride(
    userOverride: UserAllocation,
    baseInput: AllocationInput,
  ): BehavioralWarning[] {
    // Build a modified input reflecting overrides as the savings pool distribution.
    // For behavioral analysis we care about the totals, not exact waterfall.
    const overrideSum = Object.values(userOverride).reduce(
      (s, v) => s + (v || 0),
      0,
    );
    const patchedInput: AllocationInput = {
      ...baseInput,
      monthlySavingsTarget: overrideSum || baseInput.monthlySavingsTarget,
      userOverrides: userOverride,
    };

    // Compute base allocation (ignoring override waterfall details — just need pool info)
    const base = computeAllocation({
      ...baseInput,
      monthlySavingsTarget: baseInput.monthlySavingsTarget,
    });

    // Patch items with user overrides for behavioral analysis
    const patchedResult: AllocationResult = {
      ...base,
      items: base.items.map((it) => ({
        ...it,
        monthlyAmount:
          userOverride[it.goalId] !== undefined
            ? userOverride[it.goalId]!
            : it.monthlyAmount,
      })),
    };

    return this._analyzePortfolio(patchedInput, patchedResult);
  }

  /**
   * Generate suggestion chips for infeasible goals.
   */
  generateSuggestions(infeasible: InfeasibleItem[]): SuggestionChip[] {
    const chips: SuggestionChip[] = [];

    for (const item of infeasible) {
      // Suggestion 1: extend deadline
      const months = _monthsFromNow(item.deadline);
      if (months !== null && months >= 0 && item.shortfall > 0) {
        // How many extra months needed to cover with current monthly?
        const extraMonths =
          item.currentMonthly > 0
            ? Math.ceil(item.shortfall / item.currentMonthly)
            : 6; // fallback
        const newDate = _parseDate(item.deadline);
        if (newDate) {
          newDate.setMonth(newDate.getMonth() + extraMonths);
          const newDeadline = newDate.toISOString().slice(0, 10);
          chips.push({
            kind: 'extend_deadline',
            goalId: item.goalId,
            delta: extraMonths,
            newValue: newDeadline,
            description: `Estendi deadline di +${extraMonths} mesi`,
            reasoning: `Con l'allocation corrente di €${item.currentMonthly.toFixed(0)}/mese raggiungi il target senza stressare altri goal.`,
          });
        }
      }

      // Suggestion 2: increase monthly (if there is budget room)
      if (item.shortfall > 0 && item.shortfall <= 500) {
        chips.push({
          kind: 'increase_monthly',
          goalId: item.goalId,
          delta: Math.ceil(item.shortfall),
          newValue: Math.ceil(item.currentMonthly + item.shortfall),
          description: `Aumenta risparmio mensile di +€${Math.ceil(item.shortfall)}`,
          reasoning: `Così il target "${item.name}" diventa raggiungibile entro la scadenza.`,
        });
      }

      // Suggestion 3: reduce target by shortfall * months
      const mons = _monthsFromNow(item.deadline);
      if (mons !== null && mons > 0 && item.shortfall > 0) {
        const reduction = Math.ceil(item.shortfall * mons);
        chips.push({
          kind: 'reduce_target',
          goalId: item.goalId,
          delta: reduction,
          newValue: reduction,
          description: `Riduci target di -€${reduction.toLocaleString('it-IT')}`,
          reasoning: `Adatta il target alla capacità di risparmio corrente.`,
        });
      }
    }

    // Suggestion 4: rebalance portfolio if multiple infeasible
    if (infeasible.length > 1) {
      chips.push({
        kind: 'rebalance_portfolio',
        goalId: null,
        delta: 0,
        newValue: 'balanced',
        description: 'Ribilancia il portafoglio',
        reasoning:
          'Redistribuisci il budget in modo proporzionale tra tutti i goal per avanzare su tutti i fronti.',
      });
    }

    return chips;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Private: portfolio analysis
  // ─────────────────────────────────────────────────────────────────────

  private _analyzePortfolio(
    input: AllocationInput,
    result: AllocationResult,
  ): BehavioralWarning[] {
    const warnings: BehavioralWarning[] = [];

    const lifestyle = input.lifestyleBuffer ?? 0;
    const invest = input.investmentsTarget ?? 0;
    const hasDebt = _hasDebtGoals(input);
    const hasEmergency = _hasEmergencyGoal(input);
    const allSamePriority = _allSamePriority(input);

    // 1. Lifestyle too low
    if (lifestyle < LIFESTYLE_MIN_SOFT) {
      warnings.push(_warnLifestyleZero());
    }

    // 2. Zero invest (and no debt goals to justify it)
    if (invest === 0 && !hasDebt) {
      warnings.push(_warnInvestZero());
    }

    // 3. Debt ratio > 40%
    if (hasDebt) {
      const ratio = _computeDebtRatio(input, result);
      if (ratio > DEBT_RATIO_WARN) {
        warnings.push(_warnDebtRatioHigh(ratio));
      }
    }

    // 4. No emergency fund
    if (!hasEmergency) {
      warnings.push(_warnNoEmergency());
    }

    // 5. All goals same priority
    if (allSamePriority) {
      warnings.push(_warnAllSamePriority());
    }

    // Hard blocks
    if (result.incomeAfterEssentials < 0) {
      warnings.push(_warnNegativeDisposable());
    }

    const allGoalsWithTarget = input.goals.filter((g) => g.target > 0);
    if (allGoalsWithTarget.length > 0) {
      const allInfeasible = result.items
        .filter((it) => {
          const goal = input.goals.find((g) => g.id === it.goalId);
          return goal && goal.target > 0;
        })
        .every((it) => !it.deadlineFeasible && it.monthlyAmount === 0);
      if (allInfeasible) {
        warnings.push(_warnAllInfeasible());
      }
    }

    // Sprint 1.5.4 Q7 / Sprint 1.6.6 #008: cross-validation budget-vs-goals mismatch
    // sempre attivo (flag 3-pool rimosso, model unified).
    const q7Warnings = _analyzeCrossPoolMismatch(input);
    warnings.push(...q7Warnings);

    // Encouragement: no warnings except possible encouragement
    if (
      warnings.length === 0 &&
      result.items.every((it) => it.deadlineFeasible)
    ) {
      warnings.push(_encourageBalanced());
    }

    return warnings;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Sprint 1.5.4 Q7: cross-pool mismatch warnings
// ─────────────────────────────────────────────────────────────────────────

function _investGoalsList(input: AllocationInput) {
  return input.goals.filter(
    (g) => inferGoalType({ name: g.name, presetId: g.presetId ?? null }) === 'investments',
  );
}

function _savingsGoalsList(input: AllocationInput) {
  return input.goals.filter(
    (g) => inferGoalType({ name: g.name, presetId: g.presetId ?? null }) === 'savings',
  );
}

function _warnOrphanInvestBudget(input: AllocationInput): BehavioralWarning | null {
  const amount = input.investmentsTarget ?? 0;
  if (amount <= 0) return null;
  if (_investGoalsList(input).length > 0) return null;
  return {
    code: 'ORPHAN_INVEST_BUDGET',
    severity: 'soft',
    message: `💭 Hai destinato €${amount}/mese agli investimenti ma nessun goal invest.`,
    reasoning:
      'Il budget invest resta non allocato. Aggiungi un goal invest (es. "Iniziare a Investire", "ETF") o sposta il budget a savings.',
    actions: [
      {
        kind: 'navigate',
        goalId: null,
        delta: 0,
        newValue: 3,
        description: 'Aggiungi goal invest',
        reasoning: 'Vai a Step 3 per scegliere preset invest o aggiungerne uno custom.',
      },
      {
        kind: 'budget_transfer',
        goalId: null,
        delta: amount,
        newValue: amount,
        from: 'investments',
        to: 'savings',
        description: `Sposta €${amount} a savings`,
        reasoning: 'Trasferisce il budget invest al pool savings (goals savings/debt/emergency).',
      },
      {
        kind: 'dismiss',
        goalId: null,
        delta: 0,
        newValue: 'ORPHAN_INVEST_BUDGET',
        description: 'Mantieni come riserva',
        reasoning: 'Conserva il budget invest come riserva non allocata, nascondi il warning.',
      },
    ],
  };
}

function _warnOrphanSavingsBudget(input: AllocationInput): BehavioralWarning | null {
  const amount = input.monthlySavingsTarget;
  if (amount <= 0) return null;
  if (_savingsGoalsList(input).length > 0) return null;
  return {
    code: 'ORPHAN_SAVINGS_BUDGET',
    severity: 'soft',
    message: `💭 Hai destinato €${amount}/mese ai risparmi ma nessun goal savings/emergency/debt.`,
    reasoning:
      'Il budget savings resta non allocato. Aggiungi un goal savings (es. Fondo Emergenza, Casa, Debiti) o sposta a invest.',
    actions: [
      {
        kind: 'navigate',
        goalId: null,
        delta: 0,
        newValue: 3,
        description: 'Aggiungi goal savings',
        reasoning: 'Vai a Step 3 per scegliere preset savings/emergency/debt.',
      },
      {
        kind: 'budget_transfer',
        goalId: null,
        delta: amount,
        newValue: amount,
        from: 'savings',
        to: 'investments',
        description: `Sposta €${amount} a investimenti`,
        reasoning: 'Trasferisce il budget savings al pool investments.',
      },
      {
        kind: 'dismiss',
        goalId: null,
        delta: 0,
        newValue: 'ORPHAN_SAVINGS_BUDGET',
        description: 'Mantieni come riserva',
        reasoning: 'Conserva il budget savings come riserva non allocata, nascondi il warning.',
      },
    ],
  };
}

function _warnInvestGoalsNoBudget(input: AllocationInput): BehavioralWarning | null {
  if ((input.investmentsTarget ?? 0) > 0) return null;
  const investGoals = _investGoalsList(input);
  if (investGoals.length === 0) return null;
  return {
    code: 'INVEST_GOALS_NO_BUDGET',
    severity: 'hard',
    message: `⛔ Hai ${investGoals.length} goal di investimento ma budget invest è €0.`,
    reasoning:
      'Torna a Step 2 per dedicare una quota agli investimenti, oppure rimuovi questi goal. Senza budget, i goal invest non ricevono allocazione.',
    actions: [
      {
        kind: 'navigate',
        goalId: null,
        delta: 0,
        newValue: 2,
        description: 'Torna a Step 2',
        reasoning: 'Imposta investmentsTarget > 0 per finanziare i goal invest.',
      },
      {
        kind: 'bulk_remove_goals',
        goalId: null,
        delta: investGoals.length,
        newValue: investGoals.length,
        goalIds: investGoals.map((g) => g.id),
        description: `Rimuovi ${investGoals.length} goal invest`,
        reasoning: 'Elimina i goal invest non compatibili col budget corrente.',
      },
    ],
  };
}

function _warnSavingsGoalsNoBudget(input: AllocationInput): BehavioralWarning | null {
  if (input.monthlySavingsTarget > 0) return null;
  const savingsGoals = _savingsGoalsList(input);
  if (savingsGoals.length === 0) return null;
  return {
    code: 'SAVINGS_GOALS_NO_BUDGET',
    severity: 'hard',
    message: `⛔ Hai ${savingsGoals.length} goal savings/emergency/debt ma budget savings è €0.`,
    reasoning:
      'Torna a Step 2 per dedicare una quota ai risparmi, oppure rimuovi questi goal.',
    actions: [
      {
        kind: 'navigate',
        goalId: null,
        delta: 0,
        newValue: 2,
        description: 'Torna a Step 2',
        reasoning: 'Imposta monthlySavingsTarget > 0 per finanziare i goal savings.',
      },
      {
        kind: 'bulk_remove_goals',
        goalId: null,
        delta: savingsGoals.length,
        newValue: savingsGoals.length,
        goalIds: savingsGoals.map((g) => g.id),
        description: `Rimuovi ${savingsGoals.length} goal savings`,
        reasoning: 'Elimina i goal savings non compatibili col budget corrente.',
      },
    ],
  };
}

function _analyzeCrossPoolMismatch(input: AllocationInput): BehavioralWarning[] {
  const warnings: BehavioralWarning[] = [];
  const w1 = _warnOrphanInvestBudget(input);
  if (w1) warnings.push(w1);
  const w2 = _warnOrphanSavingsBudget(input);
  if (w2) warnings.push(w2);
  const w3 = _warnInvestGoalsNoBudget(input);
  if (w3) warnings.push(w3);
  const w4 = _warnSavingsGoalsNoBudget(input);
  if (w4) warnings.push(w4);
  return warnings;
}
