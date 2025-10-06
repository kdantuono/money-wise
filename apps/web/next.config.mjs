import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Experimental features
  experimental: {
    // Client trace metadata for Sentry
    clientTraceMetadata: ['baggage', 'sentry-trace'],
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // Optimize images
  images: {
    domains: [],
  },

  // TypeScript configuration
  typescript: {
    // Fail builds on type errors (strict checking enforced)
    // Type checking is also done in CI/CD pipeline for early detection
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Run ESLint during builds
    ignoreDuringBuilds: false,
  },
};

// Sentry webpack plugin configuration for source map upload
const sentryWebpackPluginOptions = {
  // Sentry organization and project
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Suppress all logs
  silent: true,

  // Upload a larger set of source maps for better error context
  widenClientFileUpload: true,

  // Hide source maps from generated client bundles (security)
  hideSourceMaps: true,

  // Disable Sentry logger to reduce bundle size
  disableLogger: true,

  // Automatically annotate React components for better component tracking
  reactComponentAnnotation: {
    enabled: true,
  },

  // Automatically instrument Next.js data fetching methods and API routes
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
};

// Export Next.js config wrapped with Sentry
export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
