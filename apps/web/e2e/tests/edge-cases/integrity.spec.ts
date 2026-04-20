/**
 * Scenario 5 — Edge case integrity
 * Sprint 1.5.2 WP-J
 *
 * Verifies the wizard rejects impossible configurations and that the DB
 * stays consistent (no plan persisted when UI blocks submission).
 *
 * The hard-block paths under test:
 *   - Step 2 sum(essentials + lifestyle + savings + invest) > income → inline
 *     error + Avanti disabled.
 *   - Once Avanti is disabled, user cannot reach Step 5 → no submit → no
 *     plans row in DB.
 */

import { test, expect } from '@playwright/test';
import {
  WP_J_SHARDS,
  loginPoolUser,
  resetUserState,
  fetchPlans,
  wizardRoot,
} from '../../fixtures/onboarding-v2-helpers';

const EMAIL = WP_J_SHARDS.integrity;

test.describe('WP-J #5 — Edge case integrity', () => {
  test.beforeEach(async () => {
    await resetUserState(EMAIL);
  });

  test.afterEach(async () => {
    await resetUserState(EMAIL);
  });

  test('Step 2 sum > income → error visible + Avanti disabled', async ({ page }) => {
    await loginPoolUser(page, EMAIL, /\/onboarding\/plan/);
    await expect(wizardRoot(page)).toBeVisible();

    // Welcome → Step 2
    await page.getByRole('button', { name: 'Avanti' }).click();

    // Configure: income 1000, essentials 50% (500), lifestyle 300, savings 500
    // sum = 500 + 300 + 500 = 1300 > 1000. Hard-block expected.
    await page.getByLabel(/reddito netto mensile/i).fill('1000');
    await page.getByLabel(/reddito netto mensile/i).blur();
    await page.waitForTimeout(100);

    // Lifestyle auto-default applies first; manually overwrite to trigger sum > income.
    await page.getByLabel(/lifestyle buffer/i).fill('300');
    await page.getByLabel(/risparmio mensile target/i).fill('500');
    // Investments optional — leave 0.

    // Sum overflow error banner visible
    await expect(
      page.getByText(/La somma eccede il reddito/i)
    ).toBeVisible({ timeout: 5_000 });

    // Avanti button disabled
    await expect(page.getByRole('button', { name: 'Avanti' })).toBeDisabled();
  });

  test('DB stays consistent when infeasible config blocks creation', async ({ page }) => {
    await loginPoolUser(page, EMAIL, /\/onboarding\/plan/);
    await page.getByRole('button', { name: 'Avanti' }).click(); // to Step 2

    // Same infeasible config as above
    await page.getByLabel(/reddito netto mensile/i).fill('1000');
    await page.getByLabel(/reddito netto mensile/i).blur();
    await page.waitForTimeout(100);
    await page.getByLabel(/lifestyle buffer/i).fill('300');
    await page.getByLabel(/risparmio mensile target/i).fill('500');

    // User cannot advance — confirmed by Avanti disabled.
    await expect(page.getByRole('button', { name: 'Avanti' })).toBeDisabled();

    // No plan row should exist for this user.
    const plans = await fetchPlans(EMAIL);
    expect(plans.length).toBe(0);
  });

  test('fixing the overflow re-enables Avanti', async ({ page }) => {
    await loginPoolUser(page, EMAIL, /\/onboarding\/plan/);
    await page.getByRole('button', { name: 'Avanti' }).click();

    // First create the overflow
    await page.getByLabel(/reddito netto mensile/i).fill('1000');
    await page.getByLabel(/reddito netto mensile/i).blur();
    await page.waitForTimeout(100);
    await page.getByLabel(/lifestyle buffer/i).fill('300');
    await page.getByLabel(/risparmio mensile target/i).fill('500');
    await expect(page.getByRole('button', { name: 'Avanti' })).toBeDisabled();

    // Now reduce savings to fix the overflow: sum = 500 + 300 + 50 = 850 ≤ 1000
    await page.getByLabel(/risparmio mensile target/i).fill('50');
    // Allow state to settle
    await page.waitForTimeout(200);
    await expect(
      page.getByText(/La somma eccede il reddito/i)
    ).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Avanti' })).toBeEnabled();
  });
});
