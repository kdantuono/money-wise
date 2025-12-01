import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    name: '@money-wise/web',
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/out/**',
      '**/e2e/**',
      '**/__tests__/pages/**',
      '**/__tests__/lib/**',
      '**/__tests__/components/auth/protected-route.test.tsx',
      '**/__tests__/components/layout/dashboard-layout.test.tsx'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '.next/',
        'out/',
        'coverage/',
        'e2e/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/layout.tsx',
        '**/page.tsx',
        '**/__tests__/**',
        '**/__mocks__/**',
        // Example/demo files (not production code)
        '**/*.example.*',
        '**/*.examples.*',
        '**/examples.tsx',
        // Barrel exports (just re-exports, no logic to test)
        '**/index.ts',
        '**/index.tsx',
        // Infrastructure files (better tested via E2E/integration)
        'instrumentation*.ts',
        'app/global-error.tsx',
        'public/mockServiceWorker.js',
        // API routes (tested via integration tests, not unit tests)
        'app/api/**/*.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@money-wise/types': path.resolve(__dirname, '../../packages/types/src'),
      '@money-wise/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@money-wise/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@money-wise/config': path.resolve(__dirname, '../../packages/config')
    }
  }
});