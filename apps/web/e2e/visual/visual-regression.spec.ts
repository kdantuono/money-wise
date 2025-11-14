import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/login.page'
import { DashboardPage } from '../pages/dashboard.page'

test.describe('Visual Regression Tests @critical', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('Login page visual snapshot', async ({ page }) => {
    await page.goto('/auth/login')

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle')

    // Take visual snapshot
    await expect(page).toHaveScreenshot('login-page.png')
  })

  test('Login page with error state', async ({ page }) => {
    const loginPage = new LoginPage(page)

    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    // Trigger error state
    await loginPage.login('invalid@example.com', 'wrongpassword')

    // Wait for error message to appear
    await page.waitForSelector('[data-testid="error-message"]', {
      state: 'visible',
      timeout: 5000
    }).catch(() => {
      // Fallback if error message doesn't have test ID
      console.log('Error message test ID not found, continuing with screenshot')
    })

    await expect(page).toHaveScreenshot('login-page-error.png')
  })

  test('Dashboard page visual snapshot', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const dashboardPage = new DashboardPage(page)

    // Login first
    await page.goto('/auth/login')
    await loginPage.loginWithValidCredentials()

    // Wait for dashboard to load
    await dashboardPage.waitForDashboardLoad()

    // Take visual snapshot
    await expect(page).toHaveScreenshot('dashboard-page.png')
  })

  test('Dashboard page mobile view', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const dashboardPage = new DashboardPage(page)

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Login and navigate to dashboard
    await page.goto('/auth/login')
    await loginPage.loginWithValidCredentials()
    await dashboardPage.waitForDashboardLoad()

    // Take mobile visual snapshot
    await expect(page).toHaveScreenshot('dashboard-page-mobile.png')
  })

  test('Registration page visual snapshot', async ({ page }) => {
    await page.goto('/auth/register')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('register-page.png')
  })

  test('Landing page visual snapshot', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('landing-page.png')
  })

  test('Theme variations', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    // Test light theme (default)
    await expect(page).toHaveScreenshot('login-light-theme.png')

    // Test dark theme if available
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })

    await expect(page).toHaveScreenshot('login-dark-theme.png')
  })

  test('Form states visual snapshots', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    // Focus on email field
    await page.locator('[data-testid="email-input"]').focus()
    await expect(page).toHaveScreenshot('login-email-focused.png')

    // Fill email field
    await page.locator('[data-testid="email-input"]').fill('test@example.com')
    await expect(page).toHaveScreenshot('login-email-filled.png')

    // Focus on password field
    await page.locator('[data-testid="password-input"]').focus()
    await expect(page).toHaveScreenshot('login-password-focused.png')
  })

  test('Loading states visual snapshots', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    // Fill form
    await page.locator('[data-testid="email-input"]').fill('test@example.com')
    await page.locator('[data-testid="password-input"]').fill('password123')

    // Mock slow network to capture loading state
    await page.route('**/api/auth/login', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.continue()
    })

    // Click submit and immediately take screenshot of loading state
    const submitPromise = page.locator('[data-testid="login-button"]').click()

    // Wait a bit for loading state to appear
    await page.waitForTimeout(200)

    await expect(page).toHaveScreenshot('login-loading-state.png')

    await submitPromise
  })
})