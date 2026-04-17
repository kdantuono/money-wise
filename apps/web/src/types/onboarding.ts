/**
 * Onboarding — Shared Types
 *
 * Schema for the `profiles.preferences.onboarding` JSON slice, persisted by
 * the OnboardingWizard on first-access completion. Standalone from the
 * broader user-preferences type on purpose: the wizard flow is orthogonal to
 * settings/preferences and may ship before that type system lands on main.
 *
 * @module types/onboarding
 */

export interface OnboardingData {
  /**
   * Income bracket picked in the wizard, free-form token (e.g. "under-1500",
   * "1500-3000", "3000-5000", "5000-plus"). No amount validation here — the
   * wizard owns the bracket vocabulary.
   */
  incomeRange: string;
  /**
   * Savings goal bracket token (e.g. "emergency-fund", "house", "travel").
   */
  savingsGoal: string;
  /** Free-form list of goal tokens chosen in step 3. */
  goals: string[];
  /** AI feature opt-ins (e.g. ["auto-categorize", "monthly-insights"]). */
  aiPreferences: string[];
}

/**
 * What we actually persist under `profiles.preferences.onboarding`:
 * the OnboardingData plus a completion timestamp for audit/retention.
 */
export interface OnboardingPayload extends OnboardingData {
  completedAt: string;
}

// =============================================================================
// Parse helpers
// =============================================================================

function parseStringField(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

/**
 * Parse a raw `preferences.onboarding` JSON value into the canonical shape.
 * Returns `null` if the payload is absent or unrecognizable — callers treat
 * that as "not onboarded yet" regardless of the DB flag.
 */
export function parseOnboardingPayload(raw: unknown): OnboardingPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;

  const incomeRange = parseStringField(source.incomeRange, '');
  const savingsGoal = parseStringField(source.savingsGoal, '');
  const goals = parseStringArray(source.goals);
  const aiPreferences = parseStringArray(source.aiPreferences);
  const completedAt = parseStringField(source.completedAt, '');

  // Minimum viable payload: at least one meaningful choice + completedAt.
  if (!completedAt) return null;

  return {
    incomeRange,
    savingsGoal,
    goals,
    aiPreferences,
    completedAt,
  };
}
