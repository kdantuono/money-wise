import { defineConfig, devices } from '@playwright/test';

/**
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
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['line'],
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
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI
    ? [
        // In CI, use production builds for faster startup
        {
          command: 'pnpm --filter @money-wise/backend start:prod',
          url: 'http://localhost:3001/health',
          reuseExistingServer: false,
          timeout: 60 * 1000,
          env: {
            NODE_ENV: 'test',
            DB_HOST: process.env.DB_HOST || 'localhost',
            DB_PORT: process.env.DB_PORT || '5432',
            DB_USERNAME: process.env.DB_USERNAME || 'postgres',
            DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
            DB_NAME: process.env.DB_NAME || 'moneywise_test',
            REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
            JWT_ACCESS_SECRET:
              process.env.JWT_ACCESS_SECRET || 'test-access-secret-for-e2e',
            JWT_REFRESH_SECRET:
              process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-for-e2e',
          },
        },
        {
          command: 'pnpm start',
          url: 'http://localhost:3000',
          reuseExistingServer: false,
          timeout: 60 * 1000,
        },
      ]
    : [
        // In local dev, use dev servers
        {
          command: 'pnpm dev',
          url: 'http://localhost:3000',
          reuseExistingServer: true,
          timeout: 120 * 1000,
        },
        {
          command: 'pnpm --filter @money-wise/backend dev',
          url: 'http://localhost:3001/health',
          reuseExistingServer: true,
          timeout: 120 * 1000,
        },
      ],

  /* Global test setup and teardown */
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/global-teardown.ts'),

  /* Output directories */
  outputDir: 'test-results/',

  /* Test timeout */
  timeout: 30 * 1000,

  /* Expect configuration with visual testing */
  expect: {
    /* Timeout for expect() assertions */
    timeout: 10 * 1000,

    /* Visual comparison configuration */
    toHaveScreenshot: {
      /* Threshold for visual comparison (0-1) */
      threshold: 0.2,

      /* Enable animation handling */
      animations: 'disabled',

      /* Set screenshot mode */
      mode: 'css',
    },

    /* Match screenshots across different operating systems */
    toMatchSnapshot: {
      threshold: 0.2,
    },
  },
});
