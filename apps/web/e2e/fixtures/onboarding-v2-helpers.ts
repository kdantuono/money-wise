/**
 * Onboarding v2 helpers — Sprint 1.5.2 WP-J E2E scenarios
 *
 * Shared utilities for the 5 onboarding v2 Playwright suites:
 *  1. full-flow.spec.ts        — onboarding completo + skip/resume
 *  2. goals-crud.spec.ts       — dashboard CRUD + settings redo
 *  3. theme-ai-prefs.spec.ts   — persistence cross-reload
 *  4. behavioral-ai.spec.ts    — AI warnings in calibration
 *  5. integrity.spec.ts        — edge case hard-block + DB consistency
 *
 * Design constraints:
 * - Pool users (e2e-shard-N@moneywise.app) are persistent across runs, so
 *   every spec MUST run `resetUserState()` in beforeEach to force a clean
 *   starting point (no leftover plan, onboarded=false, no orphan goals).
 * - Shards 1, 2, 4, 5, 6 are dedicated to WP-J. Shards 0/3/7 are claimed by
 *   other specs (smoke, dashboard/categories, onboarding-plan). Do not reuse.
 * - The UI flow enters the wizard via either (a) fresh signup → OnboardingGate
 *   auto-redirect or (b) Settings → Rivedi piano → /onboarding/plan?mode=edit.
 *   Helpers encapsulate both.
 *
 * @module e2e/fixtures/onboarding-v2-helpers
 */

import type { Page, Locator } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TEST_IDS } from '../config/test-ids';

// ─────────────────────────────────────────────────────────────────────────────
// Shard assignment — do NOT reuse shards claimed by other WP-J specs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shard assignments per spec file. Each shard is isolated (dedicated pool
 * user) so specs can run in parallel without interfering.
 *
 * Occupied (not available):
 *   shard-0 → smoke.spec.ts
 *   shard-3 → dashboard.spec.ts + categories.spec.ts
 *   shard-7 → onboarding-plan.spec.ts
 */
export const WP_J_SHARDS = {
  fullFlow: 'e2e-shard-1@moneywise.app',
  goalsCrud: 'e2e-shard-2@moneywise.app',
  themeAiPrefs: 'e2e-shard-4@moneywise.app',
  behavioralAi: 'e2e-shard-5@moneywise.app',
  integrity: 'e2e-shard-6@moneywise.app',
} as const;

export const SHARD_PASSWORD = 'SecureTest#2025!';

// ─────────────────────────────────────────────────────────────────────────────
// Supabase admin helper (anon key via RLS-scoped signin)
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Create an authenticated Supabase anon client signed-in as the pool user.
 * Returns null if env vars are missing (local dev misconfigured).
 * Caller is responsible for calling client.auth.signOut() when done.
 */
export async function adminClientAs(
  email: string,
  password: string = SHARD_PASSWORD
): Promise<{ client: SupabaseClient; userId: string } | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) return null;
  return { client, userId: data.user.id };
}

/**
 * Reset pool-user state so the next UI flow starts clean.
 *
 * Strategy:
 *   - DELETE plans (cascade to goal_allocations via ON DELETE CASCADE)
 *   - DELETE goals (separate because FK is to profiles, not plans)
 *   - UPDATE profiles.onboarded = false (forces OnboardingGate redirect)
 *   - UPDATE profiles.preferences cleared of wizard-specific keys
 *
 * Silent on errors — best-effort cleanup. RLS ensures we only touch the
 * signed-in user's own data.
 */
export async function resetUserState(email: string): Promise<void> {
  const session = await adminClientAs(email);
  if (!session) return;
  const { client, userId } = session;
  try {
    await client.from('plans').delete().eq('user_id', userId);
    await client.from('goals').delete().eq('user_id', userId);
    await client.from('profiles').update({ onboarded: false }).eq('id', userId);
  } finally {
    await client.auth.signOut();
  }
}

/**
 * Mark pool user as onboarded (skipping the full wizard flow).
 * Used in specs that need a pre-onboarded starting point (goals CRUD, settings).
 */
export async function markUserOnboarded(email: string): Promise<void> {
  const session = await adminClientAs(email);
  if (!session) return;
  const { client, userId } = session;
  try {
    await client.from('profiles').update({ onboarded: true }).eq('id', userId);
  } finally {
    await client.auth.signOut();
  }
}

/**
 * Query plans for a given pool user (via RLS-scoped client).
 * Returns empty array on missing session / error.
 */
export async function fetchPlans(email: string): Promise<Array<{ id: string; user_id: string }>> {
  const session = await adminClientAs(email);
  if (!session) return [];
  const { client, userId } = session;
  try {
    const { data } = await client.from('plans').select('id, user_id').eq('user_id', userId);
    return (data ?? []) as Array<{ id: string; user_id: string }>;
  } finally {
    await client.auth.signOut();
  }
}

/**
 * Query goals for a given pool user (via RLS-scoped client).
 */
export async function fetchGoals(email: string): Promise<Array<{ id: string; name: string }>> {
  const session = await adminClientAs(email);
  if (!session) return [];
  const { client, userId } = session;
  try {
    const { data } = await client.from('goals').select('id, name').eq('user_id', userId);
    return (data ?? []) as Array<{ id: string; name: string }>;
  } finally {
    await client.auth.signOut();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers — wizard entry + navigation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log in via the UI as a pool user. Waits for the BFF login response + target
 * URL match (wizard for non-onboarded, dashboard for onboarded).
 *
 * @param page Playwright page
 * @param email pool user email (from WP_J_SHARDS)
 * @param expectedUrlGlob wait pattern after login — wizard or dashboard
 */
export async function loginPoolUser(
  page: Page,
  email: string,
  expectedUrlGlob: string | RegExp
): Promise<void> {
  await page.goto('/auth/login');
  await page.waitForSelector(TEST_IDS.AUTH.LOGIN_FORM, { state: 'visible' });
  await page.fill(TEST_IDS.AUTH.EMAIL_INPUT, email);
  await page.fill(TEST_IDS.AUTH.PASSWORD_INPUT, SHARD_PASSWORD);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/login')),
    page.click(TEST_IDS.AUTH.LOGIN_BUTTON),
  ]);
  await page.waitForURL(expectedUrlGlob, { timeout: 15_000 });
}

/**
 * ~18-month future deadline in YYYY-MM-DD (avoids "deadline non fattibile"
 * warning for 15k target at 500€/mo). Deterministic across runs.
 */
export function futureDeadline(months = 18): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/**
 * Return the wizard Dialog.Content locator — the modal root. Prefer this over
 * page.locator('[role="dialog"]') because Radix also opens nested goal modals
 * that match the same role.
 */
export function wizardRoot(page: Page): Locator {
  return page.getByRole('dialog', { name: /piano finanziario|modifica il tuo piano/i });
}

/**
 * Fill Step 2 (Profilo) with a valid 4-budget configuration.
 *
 * Defaults produce a feasible plan:
 *  income 3000, essentials 50% (1500), lifestyle 300, savings 500, invest 200
 *  sum = 2500 < 3000 (residual 500 OK)
 *
 * @param page Playwright page (wizard modal open, currently on Step 2)
 * @param overrides partial override of default values
 */
export async function fillStep2Profile(
  page: Page,
  overrides: Partial<{
    income: number;
    lifestyle: number;
    savings: number;
    investments: number;
  }> = {}
): Promise<void> {
  const income = overrides.income ?? 3000;
  const lifestyle = overrides.lifestyle ?? 300;
  const savings = overrides.savings ?? 500;
  const investments = overrides.investments ?? 200;

  await page.getByLabel(/reddito netto mensile/i).fill(String(income));
  // Tab blur so the income validator fires + auto-default wires lifestyle.
  // We override lifestyle after, so the default wiring is overwritten.
  await page.getByLabel(/reddito netto mensile/i).blur();
  // Allow Step2 auto-effects to settle (lifestyle auto-default on income change).
  await page.waitForTimeout(100);

  await page.getByLabel(/lifestyle buffer/i).fill(String(lifestyle));
  await page.getByLabel(/risparmio mensile target/i).fill(String(savings));
  await page.getByLabel(/investimenti mensili/i).fill(String(investments));
}

/**
 * Navigate from any step forward by N clicks of "Avanti".
 * Requires the button to be enabled; fails fast if disabled (= step invalid).
 */
export async function clickAvantiTimes(page: Page, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    const btn = page.getByRole('button', { name: 'Avanti', exact: false });
    await btn.click();
    // Small settle between step transitions (framer-motion ~200ms)
    await page.waitForTimeout(250);
  }
}
