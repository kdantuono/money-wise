import { chromium, FullConfig } from '@playwright/test'

/**
 * Global teardown for Playwright tests
 * Cleans up test data and generates test reports
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Playwright global teardown')

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000'

    // Cleanup test data
    console.log('🗑️ Cleaning up test data')

    const response = await page.request.post(`${baseURL}/api/test/cleanup`, {
      data: {
        userId: 'test-user-id',
        preserveCore: true
      },
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok()) {
      console.log('✅ Test data cleanup complete')
    } else {
      console.warn('⚠️ Test data cleanup failed, manual cleanup may be required')
    }

    // Generate additional reports if needed
    console.log('📊 Generating additional test reports')

    // You can add custom report generation here
    // For example, consolidating accessibility reports, performance metrics, etc.

  } catch (error) {
    console.error('❌ Global teardown encountered an error:', error)
    // Don't throw error in teardown to avoid masking test failures
  } finally {
    await browser.close()
  }

  console.log('✅ Global teardown complete')
}

export default globalTeardown