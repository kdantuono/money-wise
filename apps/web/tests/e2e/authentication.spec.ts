import { test, expect } from '@playwright/test';

test.describe('Authentication Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete successful login flow', async ({ page }) => {
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');

    // Verify login form is visible
    await expect(page.getByText('SECURE ACCESS')).toBeVisible();
    await expect(page.getByLabel(/access id/i)).toBeVisible();
    await expect(page.getByLabel(/security key/i)).toBeVisible();

    // Fill in login credentials
    await page.getByLabel(/access id/i).fill('test@example.com');
    await page.getByLabel(/security key/i).fill('validpassword');

    // Submit form
    await page.getByRole('button', { name: /authenticate/i }).click();

    // Verify loading state appears
    await expect(page.getByText('UNLOCKING SYSTEM...')).toBeVisible();
    await expect(page.getByText('Authenticating...')).toBeVisible();

    // Wait for authentication to complete and redirect
    await page.waitForURL('**/dashboard');

    // Verify successful login - should be on dashboard
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should handle invalid credentials', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Fill in invalid credentials
    await page.getByLabel(/access id/i).fill('invalid@example.com');
    await page.getByLabel(/security key/i).fill('wrongpassword');

    // Submit form
    await page.getByRole('button', { name: /authenticate/i }).click();

    // Verify error message appears
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();

    // Verify still on login page
    await expect(page).toHaveURL(/login|\//);
  });

  test('should validate required fields', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    await page.getByRole('button', { name: /authenticate/i }).click();

    // Verify HTML5 validation prevents submission
    const emailInput = page.getByLabel(/access id/i);
    const passwordInput = page.getByLabel(/security key/i);

    await expect(emailInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('required');
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const passwordInput = page.getByLabel(/security key/i);
    const toggleButton = page.getByLabel(/toggle password visibility/i);

    // Initially password is hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click to hide password again
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Start from email field
    await page.getByLabel(/access id/i).focus();

    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/security key/i)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/toggle password visibility/i)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: /authenticate/i })
    ).toBeFocused();
  });

  test('should handle form submission with Enter key', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Fill form
    await page.getByLabel(/access id/i).fill('test@example.com');
    await page.getByLabel(/security key/i).fill('validpassword');

    // Press Enter to submit
    await page.getByLabel(/security key/i).press('Enter');

    // Verify loading state appears
    await expect(page.getByText('UNLOCKING SYSTEM...')).toBeVisible();
  });
});
