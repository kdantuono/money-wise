import { test, expect } from '@playwright/test'

test.describe('Visual Regression Tests', () => {
  test('should match login page visual snapshot', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for any animations to complete
    await page.waitForTimeout(500)

    // Take full page screenshot
    await expect(page).toHaveScreenshot('login-page.png')
  })

  test('should match loading state visual snapshot', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Fill form to trigger loading state
    await page.getByLabel(/access id/i).fill('test@example.com')
    await page.getByLabel(/security key/i).fill('validpassword')

    // Trigger loading state but intercept to maintain it
    await page.route('**/api/auth/login', route => {
      // Delay response to capture loading state
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        })
      }, 1000)
    })

    await page.getByRole('button', { name: /authenticate/i }).click()

    // Wait for loading state to appear
    await expect(page.getByText('UNLOCKING SYSTEM...')).toBeVisible()

    // Take screenshot of loading state
    await expect(page).toHaveScreenshot('login-loading-state.png')
  })

  test('should match password visibility toggle states', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Fill password field
    await page.getByLabel(/security key/i).fill('password123')

    // Screenshot with password hidden
    await expect(page.locator('form')).toHaveScreenshot('password-hidden.png')

    // Toggle password visibility
    await page.getByLabel(/toggle password visibility/i).click()

    // Screenshot with password visible
    await expect(page.locator('form')).toHaveScreenshot('password-visible.png')
  })

  test('should match form validation states', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Test empty form validation
    await page.getByRole('button', { name: /authenticate/i }).click()

    // Wait for any validation styling to appear
    await page.waitForTimeout(200)

    await expect(page.locator('form')).toHaveScreenshot('form-validation.png')
  })

  test('should be consistent across different viewport sizes', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(300)
    await expect(page).toHaveScreenshot('login-mobile.png')

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(300)
    await expect(page).toHaveScreenshot('login-tablet.png')

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(300)
    await expect(page).toHaveScreenshot('login-desktop.png')
  })

  test('should handle dark mode visual consistency', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Switch to dark mode if supported
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.waitForTimeout(300)

    await expect(page).toHaveScreenshot('login-dark-mode.png')
  })
})