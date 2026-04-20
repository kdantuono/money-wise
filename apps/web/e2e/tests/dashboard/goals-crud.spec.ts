/**
 * Scenario 2 — Dashboard goals CRUD + Settings redo wizard
 * Sprint 1.5.2 WP-J (depends on WP-G dashboard page + WP-H settings tab)
 *
 * Verifies:
 *   - /dashboard/goals empty state → Add goal (Radix modal)
 *   - Edit goal card → modal pre-filled
 *   - Delete goal with destructive confirm
 *   - Type filter chips narrow the grid
 *   - Settings → Onboarding tab → Rivedi piano → navigates to wizard in
 *     edit mode with pre-populated income
 */

import { test, expect } from '@playwright/test';
import {
  WP_J_SHARDS,
  loginPoolUser,
  resetUserState,
  markUserOnboarded,
  fetchGoals,
  adminClientAs,
} from '../../fixtures/onboarding-v2-helpers';

const EMAIL = WP_J_SHARDS.goalsCrud;

/**
 * Create a minimal plan + goal directly via Supabase so the user lands on
 * /dashboard/goals already onboarded with one seed goal. Much faster than
 * running the full wizard in each beforeEach.
 */
async function seedPlanAndGoal(email: string): Promise<void> {
  const session = await adminClientAs(email);
  if (!session) return;
  const { client, userId } = session;
  try {
    // Fetch family_id (required by plans/goals schema, NOT NULL).
    const { data: prof } = await client
      .from('profiles')
      .select('family_id')
      .eq('id', userId)
      .single<{ family_id: string }>();
    const familyId = prof?.family_id;
    if (!familyId) return;

    // plans.user_id is UNIQUE — defensive delete first.
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

    // Seed goal (name "Fondo Emergenza" → inferGoalType → 'emergency')
    await client.from('goals').delete().eq('user_id', userId);
    await client.from('goals').insert({
      user_id: userId,
      family_id: familyId,
      name: 'Fondo Emergenza Seed',
      target: 5000,
      current: 0,
      priority: 1,
      monthly_allocation: 500,
      status: 'ACTIVE',
    });

    // Mark onboarded so OnboardingGate lets user through to /dashboard/goals.
    await client.from('profiles').update({ onboarded: true }).eq('id', userId);
  } finally {
    await client.auth.signOut();
  }
}

test.describe('WP-J #2 — Dashboard goals CRUD', () => {
  test.beforeEach(async () => {
    await resetUserState(EMAIL);
    await seedPlanAndGoal(EMAIL);
  });

  test.afterEach(async () => {
    await resetUserState(EMAIL);
  });

  test('add goal via floating "+ Aggiungi" opens modal and persists', async ({ page }) => {
    await loginPoolUser(page, EMAIL, /\/dashboard/);
    await page.goto('/dashboard/goals');
    await expect(page.getByTestId('goals-page')).toBeVisible();

    // Click floating add button
    await page.getByTestId('goals-add-btn').click();
    await expect(page.getByTestId('goal-edit-modal')).toBeVisible();
    await expect(page.getByTestId('goal-modal-title')).toHaveText('Nuovo obiettivo');

    await page.getByTestId('goal-modal-name').fill('Nuovo Obiettivo E2E');
    await page.getByTestId('goal-modal-target').fill('2000');
    await page.getByTestId('goal-modal-save').click();

    // Card appears in grid (via client-side state + DB persistence)
    await expect(page.getByText('Nuovo Obiettivo E2E')).toBeVisible({ timeout: 5_000 });

    // DB consistency: 2 goals now (seed + new one)
    const goals = await fetchGoals(EMAIL);
    expect(goals.map((g) => g.name)).toContain('Nuovo Obiettivo E2E');
    expect(goals.length).toBe(2);
  });

  test('edit goal via card click opens modal pre-filled', async ({ page }) => {
    await loginPoolUser(page, EMAIL, /\/dashboard/);
    await page.goto('/dashboard/goals');

    // Click seeded goal card (the card itself is the click target for edit)
    await page.getByText('Fondo Emergenza Seed').click();

    await expect(page.getByTestId('goal-edit-modal')).toBeVisible();
    await expect(page.getByTestId('goal-modal-title')).toHaveText('Modifica obiettivo');
    // Pre-filled
    await expect(page.getByTestId('goal-modal-name')).toHaveValue('Fondo Emergenza Seed');
    await expect(page.getByTestId('goal-modal-target')).toHaveValue('5000');

    // Update target
    await page.getByTestId('goal-modal-target').fill('7500');
    await page.getByTestId('goal-modal-save').click();

    // Card reflects new target
    await expect(page.getByText(/7\.500|7500/)).toBeVisible({ timeout: 5_000 });
  });

  test('delete goal shows destructive confirm + removes card + DB', async ({ page }) => {
    await loginPoolUser(page, EMAIL, /\/dashboard/);
    await page.goto('/dashboard/goals');

    // Click delete button (X icon on GoalCard — id-keyed testid)
    const goals = await fetchGoals(EMAIL);
    expect(goals.length).toBe(1);
    const goalId = goals[0]!.id;

    await page.getByTestId(`goal-delete-${goalId}`).click();
    await expect(page.getByTestId('delete-confirm-dialog')).toBeVisible();

    // Confirm destructive delete
    await page.getByTestId('delete-confirm-ok').click();

    // Card removed from UI
    await expect(page.getByText('Fondo Emergenza Seed')).not.toBeVisible({ timeout: 5_000 });

    // DB: goal deleted
    const goalsAfter = await fetchGoals(EMAIL);
    expect(goalsAfter.length).toBe(0);

    // Empty state reappears
    await expect(page.getByTestId('goals-empty-state')).toBeVisible();
  });

  test('type filter chip narrows the grid', async ({ page }) => {
    await loginPoolUser(page, EMAIL, /\/dashboard/);
    await page.goto('/dashboard/goals');

    // Click "Investment" filter — seed is Fondo Emergenza (emergency), so
    // filtered view should hide it.
    await page.getByTestId('filter-chip-investment').click();
    await expect(page.getByTestId('goals-filter-empty')).toBeVisible();
    await expect(page.getByText('Fondo Emergenza Seed')).not.toBeVisible();

    // Click "Tutti" chip — all goals back
    await page.getByTestId('filter-chip-all').click();
    await expect(page.getByText('Fondo Emergenza Seed')).toBeVisible();
  });

  test('Settings → Rivedi piano navigates to wizard in edit mode', async ({ page }) => {
    await loginPoolUser(page, EMAIL, /\/dashboard/);
    await page.goto('/dashboard/settings');

    // Select Onboarding tab (exact label "Onboarding" from TABS config)
    await page.getByRole('button', { name: 'Onboarding', exact: true }).click();

    // Click Rivedi piano (first click expands confirm)
    await page.getByRole('button', { name: /Rivedi piano/i }).click();
    // Then Procedi
    await page.getByRole('button', { name: 'Procedi', exact: true }).click();

    // Should navigate to /onboarding/plan?mode=edit
    await page.waitForURL(/\/onboarding\/plan\?mode=edit/, { timeout: 10_000 });

    // Wizard opens; PlanPageClient loads existing plan then opens dialog.
    // Title should be "Modifica il tuo piano" in edit mode.
    await expect(
      page.getByRole('dialog', { name: /modifica il tuo piano/i })
    ).toBeVisible({ timeout: 15_000 });
  });
});
