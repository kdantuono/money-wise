import { chromium, FullConfig } from '@playwright/test'

/**
 * Global setup for Playwright tests
 * Handles authentication, test data setup, and environment validation
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright global setup for staging environment')

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Environment health check
    const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000'
    console.log(`🔍 Checking environment health: ${baseURL}`)

    await page.goto(`${baseURL}/health`)
    const healthResponse = await page.textContent('body')

    if (!healthResponse?.includes('OK') && !healthResponse?.includes('healthy')) {
      throw new Error('Environment health check failed')
    }

    console.log('✅ Environment health check passed')

    // Setup test authentication
    console.log('🔑 Setting up test authentication')

    // Create test user session
    await page.goto(`${baseURL}/login`)

    // Login with test credentials (these should be in CI/CD variables)
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@moneywise.com')
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')
    await page.click('[data-testid="login-button"]')

    // Wait for successful login
    await page.waitForURL('**/dashboard', { timeout: 10000 })

    // Save authentication state
    await context.storageState({ path: 'tests/auth/user.json' })
    console.log('✅ Test authentication setup complete')

    // Setup test data if needed
    console.log('📊 Setting up test data')

    // Navigate to API and create test data via API calls if needed
    const response = await page.request.post(`${baseURL}/api/test/setup`, {
      data: {
        userId: 'test-user-id',
        resetData: true
      },
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok()) {
      console.log('✅ Test data setup complete')
    } else {
      console.warn('⚠️ Test data setup failed, continuing with existing data')
    }

  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }

  console.log('🎉 Global setup complete')
}

export default globalSetup