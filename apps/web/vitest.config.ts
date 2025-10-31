import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: {
    jsxInject: `import React from 'react'`
  },
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
        '**/__mocks__/**'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
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