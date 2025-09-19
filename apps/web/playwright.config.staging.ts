import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Configuration for Staging Environment
 * Comprehensive E2E testing with accessibility, performance, and visual regression
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1,
  workers: process.env.CI ? 2 : undefined,

  // Enhanced reporting for CI/CD
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['line']
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://staging-money-wise.example.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Enhanced test settings for staging
    actionTimeout: 30000,
    navigationTimeout: 60000,

    // Security headers validation
    extraHTTPHeaders: {
      'X-Test-Environment': 'staging'
    }
  },

  // Comprehensive browser coverage
  projects: [
    // Desktop Browsers
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.spec\.ts/
    },
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /.*\.spec\.ts/
    },
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'] },
      testMatch: /.*\.spec\.ts/
    },

    // Mobile Devices
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: /.*\.(mobile|responsive)\.spec\.ts/
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      testMatch: /.*\.(mobile|responsive)\.spec\.ts/
    },

    // Tablet Devices
    {
      name: 'tablet-chrome',
      use: { ...devices['iPad Pro'] },
      testMatch: /.*\.(tablet|responsive)\.spec\.ts/
    },

    // Accessibility Testing
    {
      name: 'accessibility',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.accessibility\.spec\.ts/
    },

    // Performance Testing
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--disable-background-timer-throttling']
        }
      },
      testMatch: /.*\.performance\.spec\.ts/
    },

    // Visual Regression Testing
    {
      name: 'visual-regression',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.visual\.spec\.ts/
    }
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./tests/global-setup'),
  globalTeardown: require.resolve('./tests/global-teardown'),

  // Test timeout configuration
  timeout: 60000,
  expect: {
    timeout: 10000,
    // Visual comparison threshold
    threshold: 0.2,
    // Animation handling
    toHaveScreenshot: { threshold: 0.2, mode: 'local' },
    toMatchSnapshot: { threshold: 0.2 }
  },

  // Output directories
  outputDir: 'test-results/',

  // Web server configuration for staging
  webServer: undefined // Using external staging server
})