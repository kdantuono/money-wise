/**
 * Onboarding "Piano Generato" Wizard — E2E
 *
 * Sprint 1.5 Task #21 Stream C (extended). Covers the 5-step wizard happy path:
 *   1. Reddito — monthly_income input
 *   2. Obiettivo di risparmio — savings target + essentials %
 *   3. I tuoi goal — add at least one goal (form → list)
 *   4. Piano proposto — allocation preview render
 *   5. Preferenze AI — submit → /dashboard redirect
 * Post-submit we verify the persisted goal surfaces on /dashboard/goals.
 *
 * Test isolation / data discipline
 * --------------------------------
 * - We pick `e2e-shard-7@moneywise.test` (unused by other specs at time of
 *   writing) so this test's residual plan cannot pollute dashboard.spec.ts or
 *   categories.spec.ts (both on shard-3).
 * - `plans.user_id` is UNIQUE (see 20260419160000_sprint_1_5_onboarding_plans.sql).
 *   A leftover plan from a prior run would break `persistPlan` INSERT. So
 *   cleanup runs BOTH in beforeEach (defensive) AND afterEach (hygiene).
 * - Cleanup uses the authenticated user's Supabase session via RLS — the
 *   "Users delete own plans" / "Users delete own goals" policies allow it.
 *   DELETE plan cascades to goal_allocations via ON DELETE CASCADE.
 *   Goals are deleted separately (FK points to profiles, not plans).
 *
 * Pattern source: apps/web/e2e/tests/dashboard/dashboard.spec.ts (same login
 * flow, waits on /api/auth/login BFF proxy, then asserts /dashboard URL).
 *
 * @module e2e/tests/onboarding-plan
 */

import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { ROUTES } from '../../config/routes';
import { TEST_IDS } from '../../config/test-ids';

// Dedicated shard to avoid polluting specs that rely on shard-3 having no plan.
const TEST_EMAIL = 'e2e-shard-7@moneywise.test';
const TEST_PASSWORD = 'SecureTest#2025!';
const TEST_GOAL_NAME = 'Fondo Emergenza Test E2E';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Produce a deadline ~18 months in the future as YYYY-MM-DD.
 * 18mo is enough for the allocation algorithm to consider the deadline
 * "feasible" for a 15k target at 500€/mo savings without warnings.
 */
function futureDeadline(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 18);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * UI login pattern — mirrors dashboard.spec.ts exactly.
 * Waits for the /api/auth/login BFF proxy response before asserting URL.
 */
async function login(page: Page): Promise<void> {
  await page.goto(ROUTES.AUTH.LOGIN);
  await page.waitForSelector(TEST_IDS.AUTH.LOGIN_FORM, { state: 'visible' });
  await page.fill(TEST_IDS.AUTH.EMAIL_INPUT, TEST_EMAIL);
  await page.fill(TEST_IDS.AUTH.PASSWORD_INPUT, TEST_PASSWORD);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/login')),
    page.click(TEST_IDS.AUTH.LOGIN_BUTTON),
  ]);
  await expect(page).toHaveURL(ROUTES.DASHBOARD);
}

/**
 * Cleanup test user's plan + goals via Supabase Auth.
 * Called from beforeEach (defensive: prior run leftover) and afterEach.
 *
 * Strategy:
 *  - Sign in as the test user via anon client (same credentials as UI).
 *  - DELETE from plans WHERE user_id = self → cascades to goal_allocations.
 *  - DELETE from goals WHERE user_id = self → required separately (FK points
 *    to profiles, not plans).
 *
 * Silent on failures: cleanup is best-effort; RLS guarantees we only touch
 * data we own, so worst case a leftover row surfaces on the next run where
 * this same beforeEach re-deletes.
 */
async function cleanupTestUserData(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Global setup already asserts these exist; this is a defense-in-depth
    // guard so the teardown never throws on misconfigured local runs.
    return;
  }
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authData, error: signInErr } = await client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (signInErr || !authData.user) {
    // Can't clean if we can't authenticate — global-setup normally
    // pre-creates the user, so this should not fire in CI.
    return;
  }
  const userId = authData.user.id;
  // plan → cascades to goal_allocations
  await client.from('plans').delete().eq('user_id', userId);
  // goals must be deleted explicitly (FK to profiles, not plans)
  await client.from('goals').delete().eq('user_id', userId);
  await client.auth.signOut();
}

test.describe('Onboarding — Piano Generato wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Defensive cleanup: prior run may have left a plan on this user.
    // `plans.user_id` is UNIQUE — leftover rows break the persist INSERT.
    await cleanupTestUserData();
    await login(page);
  });

  test.afterEach(async () => {
    await cleanupTestUserData();
  });

  test('completes 5-step wizard and persists goal to /dashboard/goals', async ({ page }) => {
    // -------------------------------------------------------------------------
    // Navigate to wizard
    // -------------------------------------------------------------------------
    await page.goto('/onboarding/plan');
    await expect(page.locator('h1')).toContainText('Piano Finanziario');
    await expect(page.getByText('Passo 1 di 5')).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 1 — Reddito
    // -------------------------------------------------------------------------
    await page.fill('#monthly-income', '2500');
    await page.getByRole('button', { name: 'Avanti' }).click();
    await expect(page.getByText('Passo 2 di 5')).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 2 — Obiettivo di risparmio (leave essentialsPct default = 50)
    // -------------------------------------------------------------------------
    await page.fill('#savings-target', '500');
    await page.getByRole('button', { name: 'Avanti' }).click();
    await expect(page.getByText('Passo 3 di 5')).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 3 — Goals (open form, fill, confirm "Aggiungi", verify list)
    // -------------------------------------------------------------------------
    // Empty state copy is visible before opening the form.
    await expect(page.getByText('Nessun obiettivo ancora. Aggiungi il primo.')).toBeVisible();

    // "Aggiungi obiettivo" opens the inline form.
    await page.getByRole('button', { name: 'Aggiungi obiettivo' }).click();

    // Form fields (inline — not a modal).
    await page.fill('#goal-name', TEST_GOAL_NAME);
    await page.fill('#goal-target', '15000');
    await page.fill('#goal-deadline', futureDeadline());
    await page.selectOption('#goal-priority', '1'); // Alta

    // "Aggiungi" (exact) confirms the goal — `exact: true` prevents matching
    // the outer "Aggiungi obiettivo" button.
    await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();

    // Goal appears in the list.
    await expect(page.getByText(TEST_GOAL_NAME)).toBeVisible();
    await expect(page.getByText(/€15\.000/)).toBeVisible();

    await page.getByRole('button', { name: 'Avanti' }).click();
    await expect(page.getByText('Passo 4 di 5')).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 4 — Piano proposto (allocation computed via useEffect)
    // -------------------------------------------------------------------------
    // Wait for allocation to render. The summary grid labels are static; the
    // goal name only appears inside the allocation list, which only renders
    // when allocationPreview is non-null — this is our stability signal.
    await expect(page.getByText('Reddito mensile')).toBeVisible();
    await expect(page.getByText('Post-essenziali')).toBeVisible();
    // Goal name rendered inside the allocation list confirms preview is ready.
    await expect(page.getByText(TEST_GOAL_NAME)).toBeVisible();

    await page.getByRole('button', { name: 'Avanti' }).click();
    await expect(page.getByText('Passo 5 di 5')).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 5 — Preferenze AI (verify checkboxes, submit)
    // -------------------------------------------------------------------------
    await expect(page.getByText('Categorizzazione automatica')).toBeVisible();
    await expect(page.getByText('Insight personalizzati')).toBeVisible();

    // Button is gated on auth store hydration (userId) + allocation preview +
    // at least 1 goal. All should be true by now but assert enabled to avoid
    // a race on slow hydration.
    const submitBtn = page.getByRole('button', { name: /Conferma e crea piano/ });
    await expect(submitBtn).toBeEnabled({ timeout: 10_000 });
    await submitBtn.click();

    // -------------------------------------------------------------------------
    // Post-submit — redirect to /dashboard
    // -------------------------------------------------------------------------
    // No `role="alert"` should have surfaced (persistence error would render it).
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
    await page.waitForURL('**/dashboard', { timeout: 10_000 });

    // -------------------------------------------------------------------------
    // Navigate to /dashboard/goals — verify persisted goal
    // -------------------------------------------------------------------------
    await page.goto('/dashboard/goals');
    await expect(page.locator('h1')).toContainText('Obiettivi');
    // Goal card rendered from DB (not from client store) — confirms persistence.
    await expect(page.getByText(TEST_GOAL_NAME)).toBeVisible({ timeout: 10_000 });
  });
});
