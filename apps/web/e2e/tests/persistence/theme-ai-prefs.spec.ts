/**
 * Scenario 3 — Persistence: theme + AI preferences cross-reload
 * Sprint 1.5.2 WP-J
 *
 * Adaptation from original spec:
 *   Spec asks for "wizard ↔ settings AI tab bi-directional sync".
 *   Settings page does NOT have a dedicated AI tab (TabKey has profile,
 *   appearance, categories, apikeys, plan, notifications, onboarding,
 *   integrations, security, data). So we test the equivalent persistence
 *   contract via a pure wizard round-trip:
 *     1. First submit persists aiPreferences.enableAiCategorization = checked.
 *     2. Re-enter wizard via ?mode=edit and verify hydration preserves state.
 *
 * Plus the theme test as originally specified: Settings → Aspetto →
 * Italian Style → reload → class applied.
 */

import { test, expect } from '@playwright/test';
import {
  WP_J_SHARDS,
  loginPoolUser,
  resetUserState,
  adminClientAs,
} from '../../fixtures/onboarding-v2-helpers';

const EMAIL = WP_J_SHARDS.themeAiPrefs;

/**
 * Seed a plan with AI prefs = {categorization: true, insights: true}
 * and mark onboarded, so the user enters the app already past the wizard.
 */
async function seedOnboardedWithAiPrefs(email: string): Promise<void> {
  const session = await adminClientAs(email);
  if (!session) return;
  const { client, userId } = session;
  try {
    const { data: prof } = await client
      .from('profiles')
      .select('family_id, preferences')
      .eq('id', userId)
      .single<{ family_id: string; preferences: Record<string, unknown> | null }>();
    const familyId = prof?.family_id;
    if (!familyId) return;

    // Reset & insert plan
    await client.from('plans').delete().eq('user_id', userId);
    const { data: plan } = await client
      .from('plans')
      .insert({
        user_id: userId,
        family_id: familyId,
        monthly_income: 3000,
        monthly_savings_target: 500,
        essentials_pct: 50,
      })
      .select('id')
      .single<{ id: string }>();
    if (!plan) return;

    await client.from('goals').delete().eq('user_id', userId);
    await client.from('goals').insert({
      user_id: userId,
      family_id: familyId,
      name: 'Fondo Test Persistence',
      target: 3000,
      current: 0,
      priority: 2,
      monthly_allocation: 250,
      status: 'ACTIVE',
    });

    // Preserve notifications & other prefs keys, inject AI prefs + onboarded.
    const existingPrefs = (prof?.preferences ?? {}) as Record<string, unknown>;
    const mergedPrefs = {
      ...existingPrefs,
      ai: {
        enableAiCategorization: true,
        enableAiInsights: true,
      },
      theme: 'system',
    };
    await client
      .from('profiles')
      .update({ onboarded: true, preferences: mergedPrefs })
      .eq('id', userId);
  } finally {
    await client.auth.signOut();
  }
}

test.describe('WP-J #3 — Persistence cross-reload', () => {
  test.beforeEach(async () => {
    await resetUserState(EMAIL);
    await seedOnboardedWithAiPrefs(EMAIL);
  });

  test.afterEach(async () => {
    await resetUserState(EMAIL);
  });

  test('theme change (Italian Style) persists after reload', async ({ page }) => {
    await loginPoolUser(page, EMAIL, /\/dashboard/);
    await page.goto('/dashboard/settings');

    // Select Aspetto tab
    await page.getByRole('button', { name: 'Aspetto', exact: true }).click();

    // Click Italian Style theme card (contains "Italian Style" text)
    await page.getByRole('button', { name: /Italian Style/i }).click();

    // Small wait: profiles update is fire-and-forget but needs to reach DB
    // before reload re-reads preferences.
    await page.waitForTimeout(600);

    // Reload and verify theme class is applied to <html>
    await page.reload();

    // The ThemeProvider reads from localStorage on mount; verify the dom attr.
    // Italian theme sets `data-theme="italian"` on <html> (see ThemeProvider).
    const htmlTheme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(htmlTheme).toBe('italian');
  });

  test('AI prefs survive round-trip via wizard edit mode', async ({ page }) => {
    await loginPoolUser(page, EMAIL, /\/dashboard/);

    // Navigate to wizard in edit mode — PlanPageClient hydrates store from plan
    await page.goto('/onboarding/plan?mode=edit');
    await expect(
      page.getByRole('dialog', { name: /modifica il tuo piano/i })
    ).toBeVisible({ timeout: 15_000 });

    // Jump to Step 5 by clicking Avanti 4 times (modal starts at Welcome)
    // Note: button label remains "Avanti" across steps 1-4.
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: 'Avanti' }).click();
      // Between-step framer motion settle
      await page.waitForTimeout(250);
    }

    // On Step 5, AI prefs checkboxes should be checked (from seed)
    const categorizationCheckbox = page.getByLabel(/Categorizzazione automatica/i);
    const insightsCheckbox = page.getByLabel(/Insight personalizzati/i);
    await expect(categorizationCheckbox).toBeChecked();
    await expect(insightsCheckbox).toBeChecked();

    // Toggle one off, submit, then re-enter wizard — should reflect new value.
    await categorizationCheckbox.uncheck();
    const submit = page.getByRole('button', { name: /Salva modifiche/i });
    await expect(submit).toBeEnabled({ timeout: 10_000 });
    await submit.click();

    // Redirect lands on /dashboard/goals
    await page.waitForURL(/\/dashboard\/goals/, { timeout: 10_000 });

    // Re-enter wizard, verify uncheck survived
    await page.goto('/onboarding/plan?mode=edit');
    await expect(
      page.getByRole('dialog', { name: /modifica il tuo piano/i })
    ).toBeVisible({ timeout: 15_000 });
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: 'Avanti' }).click();
      await page.waitForTimeout(250);
    }
    await expect(page.getByLabel(/Categorizzazione automatica/i)).not.toBeChecked();
    await expect(page.getByLabel(/Insight personalizzati/i)).toBeChecked();
  });
});
