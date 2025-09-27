import { defineConfig, devices } from '@playwright/test';

/**
 * Basic Playwright configuration for frontend-only E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/basic-results.json' }],
    ['line']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot settings */
    screenshot: 'only-on-failure',

    /* Video settings */
    video: 'retain-on-failure',

    /* Global timeout for each test */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /basic-.*\.spec\.ts/,
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /basic-.*\.spec\.ts/,
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: /basic-.*\.spec\.ts/,
    },
  ],

  /* Run only the Next.js dev server for basic tests */
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Output directories */
  outputDir: 'test-results/',

  /* Test timeout */
  timeout: 30 * 1000,

  /* Expect timeout */
  expect: {
    timeout: 10 * 1000,
  },
});