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
 * - `profiles.onboarded` is reset to false in cleanup so each run starts
 *   from an un-onboarded state and the auto-redirect can be verified freshly.
 *   `profiles.family_id` is NOT NULL (schema constraint), so the profiles
 *   UPDATE RLS policy (WITH CHECK family_id = get_my_family_id()) always
 *   evaluates to TRUE for a valid user — the reset is safe via anon client.
 *
 * Routing tested
 * --------------
 * - A1 fix (Sprint 1.5.1): after login, a non-onboarded user is automatically
 *   redirected by OnboardingGate to /onboarding/plan (no explicit goto needed).
 * - After persistPlan success, router.push('/dashboard') lands on dashboard.
 *
 * Pattern source: apps/web/e2e/tests/dashboard/dashboard.spec.ts (same login
 * flow, waits on /api/auth/login BFF proxy).
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
 * UI login pattern — mirrors dashboard.spec.ts but waits for /onboarding/plan
 * instead of /dashboard, because shard-7 is not onboarded and OnboardingGate
 * auto-redirects non-onboarded users to the wizard (A1 routing fix).
 *
 * Waits for the /api/auth/login BFF proxy response before asserting URL.
 */
async function loginAndExpectWizard(page: Page): Promise<void> {
  await page.goto(ROUTES.AUTH.LOGIN);
  await page.waitForSelector(TEST_IDS.AUTH.LOGIN_FORM, { state: 'visible' });
  await page.fill(TEST_IDS.AUTH.EMAIL_INPUT, TEST_EMAIL);
  await page.fill(TEST_IDS.AUTH.PASSWORD_INPUT, TEST_PASSWORD);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/login')),
    page.click(TEST_IDS.AUTH.LOGIN_BUTTON),
  ]);
  // Non-onboarded user: OnboardingGate redirects to wizard automatically.
  await expect(page).toHaveURL(/\/onboarding\/plan/, { timeout: 10_000 });
}

/**
 * Cleanup test user's plan + goals + onboarded flag via Supabase Auth.
 * Called from beforeEach (defensive: prior run leftover) and afterEach.
 *
 * Strategy:
 *  - Sign in as the test user via anon client (same credentials as UI).
 *  - DELETE from plans WHERE user_id = self → cascades to goal_allocations.
 *  - DELETE from goals WHERE user_id = self → required separately (FK points
 *    to profiles, not plans).
 *  - UPDATE profiles SET onboarded = false — resets gate so next run triggers
 *    the auto-redirect again. Safe via anon client: profiles.family_id is NOT
 *    NULL per schema, so the WITH CHECK RLS condition always evaluates to TRUE.
 *
 * Silent on failures: cleanup is best-effort; RLS guarantees we only touch
 * data we own, so worst case a leftover row surfaces on the next run where
 * this same beforeEach re-deletes.
 */
async function cleanupTestUserData(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return;
  }
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authData, error: signInErr } = await client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (signInErr || !authData.user) {
    return;
  }
  const userId = authData.user.id;
  // plan → cascades to goal_allocations
  await client.from('plans').delete().eq('user_id', userId);
  // goals must be deleted explicitly (FK to profiles, not plans)
  await client.from('goals').delete().eq('user_id', userId);
  // Reset onboarded so the gate triggers the redirect on next test run.
  // profiles.family_id IS NOT NULL guarantees the WITH CHECK RLS passes.
  await client.from('profiles').update({ onboarded: false }).eq('id', userId);
  await client.auth.signOut();
}

test.describe('Onboarding — Piano Generato wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Defensive cleanup: prior run may have left a plan + onboarded=true.
    await cleanupTestUserData();
    // Login — for a non-onboarded user OnboardingGate auto-redirects to wizard.
    await loginAndExpectWizard(page);
  });

  test.afterEach(async () => {
    await cleanupTestUserData();
  });

  test('auto-redirects non-onboarded user to /onboarding/plan after login', async ({ page }) => {
    // loginAndExpectWizard in beforeEach already asserts the redirect.
    // This test makes it explicit and verifiable on its own.
    await expect(page).toHaveURL(/\/onboarding\/plan/);
    await expect(page.locator('h1')).toContainText('Piano Finanziario');
    await expect(page.getByText('Passo 1 di 5')).toBeVisible();
  });

  test('completes 5-step wizard and persists goal to /dashboard/goals', async ({ page }) => {
    // No explicit page.goto('/onboarding/plan') needed: loginAndExpectWizard
    // already landed us on the wizard via the OnboardingGate auto-redirect.
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
    // Step 3 — Goals
    // Empty state is shown before opening the form (preset cards + manual btn).
    // We use "Aggiungi manualmente" to open the form (not a preset).
    // TEST_GOAL_NAME is intentionally different from any preset name to avoid
    // selector collisions with the preset card text ("Fondo Emergenza" etc.).
    // -------------------------------------------------------------------------
    await expect(
      page.getByText('Nessun obiettivo ancora. Scegli un preset sopra o aggiungi manualmente.')
    ).toBeVisible();

    // "Aggiungi manualmente" opens the inline form.
    await page.getByRole('button', { name: 'Aggiungi manualmente' }).click();

    // Form fields (inline — not a modal).
    await page.fill('#goal-name', TEST_GOAL_NAME);
    await page.fill('#goal-target', '15000');
    await page.fill('#goal-deadline', futureDeadline());
    await page.selectOption('#goal-priority', '1'); // Alta

    // "Aggiungi" (exact) confirms the goal.
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

  test('preset card click populates form with defaults', async ({ page }) => {
    // Navigate to step 3 — fill steps 1 and 2 first.
    await page.fill('#monthly-income', '2500');
    await page.getByRole('button', { name: 'Avanti' }).click();
    await expect(page.getByText('Passo 2 di 5')).toBeVisible();
    await page.fill('#savings-target', '500');
    await page.getByRole('button', { name: 'Avanti' }).click();
    await expect(page.getByText('Passo 3 di 5')).toBeVisible();

    // Click the "Fondo Emergenza" preset card.
    await page.getByRole('button', { name: /Aggiungi preset: Fondo Emergenza/ }).click();

    // Form should be pre-filled with preset defaults.
    await expect(page.locator('#goal-name')).toHaveValue('Fondo Emergenza');
    await expect(page.locator('#goal-target')).toHaveValue('5000');
    // Deadline is set to ~12 months from today — just assert it's non-empty.
    const deadlineValue = await page.locator('#goal-deadline').inputValue();
    expect(deadlineValue).not.toBe('');
  });
});
