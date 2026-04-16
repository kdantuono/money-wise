// @ts-check
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@money-wise/ui', '@money-wise/types', '@money-wise/utils'],
  images: {
    domains: ['images.unsplash.com'],
  },
  experimental: {
    clientTraceMetadata: ['baggage', 'sentry-trace'],
  },
};

const withBundleAnalyzer =
  process.env.ANALYZE === 'true'
    ? (await import('@next/bundle-analyzer')).default({ enabled: true })
    : (/** @type {import('next').NextConfig} */ config) => config;

/**
 * @type {import('@sentry/nextjs').SentryBuildOptions}
 */
const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  disableLogger: true,
  automaticVercelMonitors: true,
  telemetry: false,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeReplayWorker: true,
  },
  release: {
    name: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
  },
};

// Export Next.js config wrapped with bundle analyzer, next-intl, and Sentry
// Order (innermost first): bundle analyzer → next-intl → Sentry
export default withSentryConfig(
  withNextIntl(withBundleAnalyzer(nextConfig)),
  sentryWebpackPluginOptions
);
