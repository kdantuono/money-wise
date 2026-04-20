/**
 * Scenario 1 — Onboarding v2 full flow + skip/resume
 * Sprint 1.5.2 WP-J
 *
 * Covers the 5-step modal wizard (post-WP-A modalization):
 *   1. Welcome (salta button visible)
 *   2. Profilo (income + lifestyle + savings + investimenti)
 *   3. Obiettivi (preset + manual)
 *   4. Piano & calibrazione
 *   5. Preferenze AI + Crea piano
 *
 * Plus the skip/resume contract: Salta from Step 1 closes the modal, profile
 * stays onboarded=false, and navigating back to /dashboard triggers
 * OnboardingGate redirect → wizard reopens. (Spec mentions a "Completa
 * onboarding" banner — that banner is NOT yet built. The current behavior is
 * auto-redirect via OnboardingGate, which is what we verify.)
 */

import { test, expect } from '@playwright/test';
import {
  WP_J_SHARDS,
  loginPoolUser,
  resetUserState,
  fillStep2Profile,
  futureDeadline,
  fetchPlans,
  wizardRoot,
} from '../../fixtures/onboarding-v2-helpers';

const EMAIL = WP_J_SHARDS.fullFlow;

test.describe('WP-J #1 — Onboarding v2 full flow', () => {
  test.beforeEach(async () => {
    // Force clean starting state: no plan, onboarded=false, no orphan goals.
    await resetUserState(EMAIL);
  });

  test.afterEach(async () => {
    await resetUserState(EMAIL);
  });

  test('completes the 5-step wizard and persists plan + goal', async ({ page }) => {
    // Non-onboarded user → OnboardingGate auto-redirects login to /onboarding/plan.
    await loginPoolUser(page, EMAIL, /\/onboarding\/plan/);

    const dialog = wizardRoot(page);
    await expect(dialog).toBeVisible();

    // Step 1 — Welcome
    await expect(page.getByText(/^Ciao/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salta' })).toBeVisible();
    await expect(page.getByText('5 Agenti AI')).toBeVisible();
    await page.getByRole('button', { name: 'Avanti' }).click();

    // Step 2 — Profilo (4-budget model from WP-C)
    await expect(page.getByText(/il tuo profilo finanziario/i)).toBeVisible();
    await fillStep2Profile(page, {
      income: 3000,
      lifestyle: 300,
      savings: 500,
      investments: 200,
    });
    const avanti2 = page.getByRole('button', { name: 'Avanti' });
    await expect(avanti2).toBeEnabled();
    await avanti2.click();

    // Step 3 — Obiettivi: add Fondo Emergenza preset + 1 manual
    await expect(page.getByText(/i tuoi obiettivi/i)).toBeVisible();
    await page.getByRole('button', { name: /Aggiungi preset: Fondo Emergenza/ }).click();
    // Preset opens inline form pre-filled — confirm with Aggiungi.
    await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
    await expect(page.getByText(/Fondo Emergenza/).first()).toBeVisible();

    // Manual goal
    await page.getByRole('button', { name: 'Aggiungi manualmente' }).click();
    await page.fill('#goal-name', 'Vacanza Estate');
    await page.fill('#goal-target', '2500');
    await page.fill('#goal-deadline', futureDeadline(12));
    await page.selectOption('#goal-priority', '3'); // Bassa
    await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
    await expect(page.getByText('Vacanza Estate')).toBeVisible();

    await page.getByRole('button', { name: 'Avanti' }).click();

    // Step 4 — Piano & calibrazione (advisor renders summary bar)
    await expect(page.getByTestId('step-calibration')).toBeVisible();
    await expect(page.getByText(/post-essenziali/i)).toBeVisible();
    await expect(page.getByText(/allocato/i)).toBeVisible();
    await page.getByRole('button', { name: 'Avanti' }).click();

    // Step 5 — Preferenze AI + submit
    await expect(page.getByText(/Categorizzazione automatica/i)).toBeVisible();
    const submit = page.getByRole('button', { name: /Conferma e crea piano/i });
    await expect(submit).toBeEnabled({ timeout: 10_000 });
    await submit.click();

    // Post-submit redirect to /dashboard/goals (WP-G)
    await page.waitForURL(/\/dashboard\/goals/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /Obiettivi/i })).toBeVisible();
    await expect(page.getByText('Fondo Emergenza').first()).toBeVisible();
    await expect(page.getByText('Vacanza Estate')).toBeVisible();

    // DB consistency: plan persisted
    const plans = await fetchPlans(EMAIL);
    expect(plans.length).toBe(1);
  });

  test('Salta from Step 1 closes modal without creating a plan', async ({ page }) => {
    await loginPoolUser(page, EMAIL, /\/onboarding\/plan/);
    await expect(wizardRoot(page)).toBeVisible();

    // Click Salta — wizard store saves skipState, dialog closes, router.push
    // to invokerRoute (default /dashboard).
    await page.getByRole('button', { name: 'Salta' }).click();

    // OnboardingGate sees onboarded=false on /dashboard and redirects back
    // to /onboarding/plan — so the final URL lands on the wizard again.
    // This is the actual behavior (no "Completa onboarding" banner yet).
    await page.waitForURL(/\/onboarding\/plan/, { timeout: 10_000 });
    await expect(wizardRoot(page)).toBeVisible();

    // DB consistency: no plan was created.
    const plans = await fetchPlans(EMAIL);
    expect(plans.length).toBe(0);
  });

  test('Resume after skip — wizard re-opens on /onboarding/plan reload', async ({ page }) => {
    await loginPoolUser(page, EMAIL, /\/onboarding\/plan/);
    await page.getByRole('button', { name: 'Salta' }).click();
    await page.waitForURL(/\/onboarding\/plan/, { timeout: 10_000 });

    // Simulate full tab reload — session cookie persists, store re-hydrates.
    await page.reload();
    // Still non-onboarded, gate keeps wizard open.
    await expect(wizardRoot(page)).toBeVisible();
    // Welcome step still visible (modal remounted fresh, no mid-state leak).
    await expect(page.getByText(/^Ciao/)).toBeVisible();
  });
});
