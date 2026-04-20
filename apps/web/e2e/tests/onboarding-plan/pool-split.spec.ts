import { test, expect } from '@playwright/test';
import { loginTestUser } from '../../fixtures/onboarding-v2-helpers';

/**
 * Sprint 1.5.3 WP-Q3 + WP-Q5 MVP — user scenario from spec:
 * Income 2250, essentials 80%, lifestyle 120, savings 300, invest 20.
 *
 * Asserts 3 pool split distinct visible + correct routing + no hardBlock.
 *
 * Requires ENABLE_3POOL_MODEL=true in test env. Skip if flag off.
 */

test.describe('Sprint 1.5.3 — 3-pool split (user scenario)', () => {
  test.beforeEach(async ({ page }) => {
    const flag = process.env.NEXT_PUBLIC_ENABLE_3POOL_MODEL;
    test.skip(flag !== 'true', '3-pool flag disabled in test env');
    await loginTestUser(page);
  });

  test('scenario 2250/80%/120/300/20 renders 3 pool distinct', async ({ page }) => {
    // Navigate to onboarding wizard
    await page.goto('/onboarding/plan');

    // Step 1: Benvenuto → Avanti
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
    await page.getByRole('button', { name: /avanti/i }).click();

    // Step 2: Profilo — fill income + essentials + lifestyle + savings + invest
    await page.getByTestId('input-monthly-income').fill('2250');
    await page.getByTestId('slider-essentials').press('End'); // max
    // Reset slider to 80% via keyboard (approximate — each decrement is 1%)
    for (let i = 0; i < 20; i++) {
      await page.getByTestId('slider-essentials').press('ArrowLeft');
    }
    await page.getByTestId('input-lifestyle-buffer').fill('120');
    await page.getByTestId('input-savings-target').fill('300');
    await page.getByTestId('input-investments-target').fill('20');
    await page.getByRole('button', { name: /avanti/i }).click();

    // Step 3: Obiettivi — 1 savings preset (emergency) + 1 savings preset (casa) + custom invest
    await page.getByRole('button', { name: /fondo emergenza/i }).click();
    await page.getByRole('button', { name: /salva|aggiungi/i }).click();

    await page.getByRole('button', { name: /comprare casa/i }).click();
    await page.getByRole('button', { name: /salva|aggiungi/i }).click();

    // Custom invest goal
    await page.getByRole('button', { name: /aggiungi manualmente/i }).click();
    await page.getByTestId('goal-name-input').fill('ETF mondiali');
    await page.getByTestId('goal-target-input').fill('10000');
    await page.getByRole('button', { name: /salva|aggiungi/i }).click();

    await page.getByRole('button', { name: /avanti/i }).click();

    // Step 4: Calibration — verify 3 pool sections + lifestyle info
    await expect(page.getByTestId('step-calibration')).toBeVisible();

    // Savings pool visible with 2 items (emergency + casa)
    const savingsPool = page.getByTestId('pool-section-savings');
    await expect(savingsPool).toBeVisible();
    await expect(savingsPool).toContainText(/Savings/i);
    await expect(savingsPool).toContainText(/€300/);

    // Investments pool visible with 1 item (ETF mondiali)
    const investPool = page.getByTestId('pool-section-investments');
    await expect(investPool).toBeVisible();
    await expect(investPool).toContainText(/Investimenti/i);
    await expect(investPool).toContainText(/€20/);

    // Lifestyle info visible
    const lifestyle = page.getByTestId('lifestyle-info');
    await expect(lifestyle).toBeVisible();
    await expect(lifestyle).toContainText(/€120/);
    await expect(lifestyle).toContainText(/non allocabile/i);

    // Summary has 4th metric (Lifestyle)
    await expect(page.getByTestId('summary-lifestyle')).toBeVisible();

    // No hardBlock
    await expect(page.getByTestId('hard-block-error')).not.toBeVisible();

    // Avanti enabled
    await expect(page.getByRole('button', { name: /avanti/i })).toBeEnabled();
  });
});
