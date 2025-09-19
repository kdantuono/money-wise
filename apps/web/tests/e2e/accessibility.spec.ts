import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should have proper ARIA labels and roles', async ({ page }) => {
    // Check form has proper structure
    const form = page.locator('form')
    await expect(form).toBeVisible()

    // Check email input accessibility
    const emailInput = page.getByLabel(/access id/i)
    await expect(emailInput).toHaveAttribute('required')
    await expect(emailInput).toHaveAttribute('type', 'email')

    // Check password input accessibility
    const passwordInput = page.getByLabel(/security key/i)
    await expect(passwordInput).toHaveAttribute('required')
    await expect(passwordInput).toHaveAttribute('type', 'password')

    // Check toggle button has proper ARIA
    const toggleButton = page.getByLabel(/toggle password visibility/i)
    await expect(toggleButton).toHaveAttribute('aria-label')
  })

  test('should be keyboard navigable', async ({ page }) => {
    // Start navigation
    await page.keyboard.press('Tab')
    await expect(page.getByLabel(/access id/i)).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByLabel(/security key/i)).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByLabel(/toggle password visibility/i)).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: /authenticate/i })).toBeFocused()

    // Test reverse navigation
    await page.keyboard.press('Shift+Tab')
    await expect(page.getByLabel(/toggle password visibility/i)).toBeFocused()
  })

  test('should have proper focus management during loading', async ({ page }) => {
    // Fill form
    await page.getByLabel(/access id/i).fill('test@example.com')
    await page.getByLabel(/security key/i).fill('validpassword')

    // Submit and check loading state accessibility
    await page.getByRole('button', { name: /authenticate/i }).click()

    // During loading, interactive elements should be disabled
    await expect(page.getByLabel(/access id/i)).toBeDisabled()
    await expect(page.getByLabel(/security key/i)).toBeDisabled()
    await expect(page.getByLabel(/toggle password visibility/i)).toBeDisabled()
    await expect(page.getByRole('button', { name: /unlocking system/i })).toBeDisabled()
  })

  test('should have sufficient color contrast', async ({ page }) => {
    // Run accessibility scan specifically for color contrast
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    // Check for color contrast violations
    const colorContrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    )

    expect(colorContrastViolations).toHaveLength(0)
  })

  test('should work with screen reader simulation', async ({ page }) => {
    // Test that form labels are properly associated
    const emailInput = page.getByLabel(/access id/i)
    const passwordInput = page.getByLabel(/security key/i)

    // These should be findable by their labels
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()

    // Test form submission feedback
    await emailInput.fill('test@example.com')
    await passwordInput.fill('validpassword')
    await page.getByRole('button', { name: /authenticate/i }).click()

    // Loading state should be announced
    await expect(page.getByText('UNLOCKING SYSTEM...')).toBeVisible()
    await expect(page.getByText('Authenticating...')).toBeVisible()
  })

  test('should handle high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' })

    // Run accessibility scan in dark mode
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should be usable at 200% zoom', async ({ page }) => {
    // Set viewport to simulate 200% zoom
    await page.setViewportSize({ width: 640, height: 360 })

    // Verify form is still usable
    await expect(page.getByLabel(/access id/i)).toBeVisible()
    await expect(page.getByLabel(/security key/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /authenticate/i })).toBeVisible()

    // Test interaction still works
    await page.getByLabel(/access id/i).fill('test@example.com')
    await page.getByLabel(/security key/i).fill('password')
    await page.getByRole('button', { name: /authenticate/i }).click()

    await expect(page.getByText('UNLOCKING SYSTEM...')).toBeVisible()
  })
})