/**
 * Category Management E2E Tests
 *
 * End-to-end tests for category management flows:
 * - View categories list
 * - Create new category
 * - Edit existing category
 * - Category hierarchy (parent/child)
 * - Category type filtering (EXPENSE/INCOME)
 *
 * @module e2e/tests/categories
 */

import { test, expect } from '@playwright/test';
import { ROUTES, API_ROUTES } from '../../config/routes';
import { TEST_IDS } from '../../config/test-ids';

// Helper to login before each test
test.beforeEach(async ({ page }) => {
  // Login
  await page.goto(ROUTES.AUTH.LOGIN);
  await page.waitForSelector(TEST_IDS.AUTH.LOGIN_FORM, { state: 'visible' });
  await page.fill(TEST_IDS.AUTH.EMAIL_INPUT, 'e2e-shard-3@moneywise.test');
  await page.fill(TEST_IDS.AUTH.PASSWORD_INPUT, 'SecureTest#2025!');
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/auth/login')),
    page.click(TEST_IDS.AUTH.LOGIN_BUTTON),
  ]);

  await expect(page).toHaveURL(ROUTES.DASHBOARD);
});

test.describe('Categories List Page', () => {
  test('should display categories page with tabs', async ({ page }) => {
    await page.goto(ROUTES.CATEGORIES.INDEX);

    // Should have page title
    await expect(page.locator('h1')).toContainText('Categories');

    // Should have type tabs
    await expect(page.getByRole('tab', { name: /expense/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /income/i })).toBeVisible();
  });

  test('should filter categories by type when tab is clicked', async ({ page }) => {
    await page.goto(ROUTES.CATEGORIES.INDEX);

    // Wait for categories to load
    await page.waitForResponse(r => r.url().includes(API_ROUTES.CATEGORIES.LIST));

    // Click expense tab
    await page.getByRole('tab', { name: /expense/i }).click();

    // Categories list should show expense categories
    // (specific assertions depend on seeded data)
    await expect(page.locator('[data-testid="category-tree"]')).toBeVisible();
  });

  test('should show create category button', async ({ page }) => {
    await page.goto(ROUTES.CATEGORIES.INDEX);

    // Should have create button
    await expect(page.getByRole('button', { name: /add category/i })).toBeVisible();
  });

  test('should open create category modal when button is clicked', async ({ page }) => {
    await page.goto(ROUTES.CATEGORIES.INDEX);

    // Click create button
    await page.getByRole('button', { name: /add category/i }).click();

    // Modal should open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /create category/i })).toBeVisible();
  });
});

test.describe('Create Category Flow', () => {
  test('should create a new expense category', async ({ page }) => {
    await page.goto(ROUTES.CATEGORIES.INDEX);

    // Open create modal
    await page.getByRole('button', { name: /add category/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill form
    await page.fill('input[name="name"]', 'Test Category E2E');
    await page.selectOption('select[name="type"]', 'EXPENSE');

    // Submit
    await Promise.all([
      page.waitForResponse(r => r.url().includes(API_ROUTES.CATEGORIES.CREATE) && r.request().method() === 'POST'),
      page.getByRole('button', { name: /create/i }).click(),
    ]);

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // New category should appear in list
    await expect(page.getByText('Test Category E2E')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto(ROUTES.CATEGORIES.INDEX);

    // Open create modal
    await page.getByRole('button', { name: /add category/i }).click();

    // Try to submit empty form
    await page.getByRole('button', { name: /create/i }).click();

    // Should show validation error
    await expect(page.getByText(/name is required/i)).toBeVisible();
  });
});

test.describe('Category Hierarchy', () => {
  test('should expand parent category to show children', async ({ page }) => {
    await page.goto(ROUTES.CATEGORIES.INDEX);

    // Wait for categories to load
    await page.waitForResponse(r => r.url().includes(API_ROUTES.CATEGORIES.LIST));

    // Find a parent category with expand button
    const expandButton = page.locator('[aria-label="Expand"]').first();
    if (await expandButton.isVisible()) {
      await expandButton.click();

      // Children should now be visible
      const childItems = page.locator('[role="treeitem"][style*="padding-left"]');
      await expect(childItems.first()).toBeVisible();
    }
  });

  test('should collapse expanded category', async ({ page }) => {
    await page.goto(ROUTES.CATEGORIES.INDEX);

    // Wait for categories to load
    await page.waitForResponse(r => r.url().includes(API_ROUTES.CATEGORIES.LIST));

    // Expand first
    const expandButton = page.locator('[aria-label="Expand"]').first();
    if (await expandButton.isVisible()) {
      await expandButton.click();

      // Now collapse
      const collapseButton = page.locator('[aria-label="Collapse"]').first();
      await collapseButton.click();

      // Should be collapsed (aria-expanded = false)
      const treeItem = page.locator('[role="treeitem"]').first();
      await expect(treeItem).toHaveAttribute('aria-expanded', 'false');
    }
  });
});

test.describe('Edit Category Flow', () => {
  test('should navigate to category detail page', async ({ page }) => {
    await page.goto(ROUTES.CATEGORIES.INDEX);

    // Wait for categories to load
    await page.waitForResponse(r => r.url().includes(API_ROUTES.CATEGORIES.LIST));

    // Click on a category name to navigate
    const categoryLink = page.locator('[role="treeitem"]').first().locator('button').first();
    await categoryLink.click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/dashboard\/categories\/.+/);
  });

  test('should show edit button on category detail page', async ({ page }) => {
    await page.goto(ROUTES.CATEGORIES.INDEX);

    // Wait for categories to load and click first category
    await page.waitForResponse(r => r.url().includes(API_ROUTES.CATEGORIES.LIST));
    const categoryLink = page.locator('[role="treeitem"]').first().locator('button').first();
    await categoryLink.click();

    // Should have edit button on detail page
    await expect(page.getByRole('button', { name: /edit/i })).toBeVisible();
  });
});

test.describe('Category Type Restrictions', () => {
  test('should not allow editing system categories', async ({ page }) => {
    await page.goto(ROUTES.CATEGORIES.INDEX);

    // Wait for categories to load
    await page.waitForResponse(r => r.url().includes(API_ROUTES.CATEGORIES.LIST));

    // Find system category (marked with lock icon)
    const systemCategory = page.locator('[aria-label*="System"]');
    if (await systemCategory.isVisible()) {
      // Edit button should not be visible for system categories
      const parentItem = systemCategory.locator('xpath=ancestor::*[@role="treeitem"]');
      const editButton = parentItem.locator('[aria-label*="Edit"]');
      await expect(editButton).not.toBeVisible();
    }
  });
});
