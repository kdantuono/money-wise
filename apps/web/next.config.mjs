import { withSentryConfig } from '@sentry/nextjs';
import bundleAnalyzer from '@next/bundle-analyzer';

// Bundle analyzer for development bundle size analysis
// Enable with: ANALYZE=true pnpm build
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Output standalone build for Docker deployment
  // This bundles the server with all dependencies for containerized environments
  // Required for Next.js 15 to properly serve static files in Docker
  output: 'standalone',

  // Compiler options - preserve data-testid for E2E tests in production
  // By default, Next.js preserves all data attributes in production builds.
  // We explicitly DO NOT configure reactRemoveProperties to ensure data-testid
  // attributes remain in the production build for E2E testing.
  // NOTE: reactRemoveProperties is opt-in to REMOVE attributes, not preserve them.
  compiler: {
    // No reactRemoveProperties configuration = data-testid preserved
  },

  // Webpack configuration - exclude jsdom from server bundle
  // jsdom is used by isomorphic-dompurify but causes issues during static generation
  // because it tries to load CSS files that don't exist in the bundled context
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Treat jsdom as external to prevent bundling issues
      config.externals = [...(config.externals || []), 'jsdom'];
    }
    return config;
  },

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

  // Security Headers - Defense-in-depth protection for frontend
  // These headers complement backend security and protect the user's browser
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';

    // Base security headers applied to all routes
    const securityHeaders = [
      {
        // X-DNS-Prefetch-Control - Controls browser DNS prefetching
        // Allow DNS prefetching for better performance
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
      },
      {
        // X-Frame-Options - Prevents clickjacking attacks
        // DENY: Prevents page from being embedded in any iframe
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        // X-Content-Type-Options - Prevents MIME type sniffing
        // Forces browser to respect declared Content-Type header
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        // X-XSS-Protection - Legacy XSS protection for older browsers
        // Modern browsers use CSP, but this provides defense-in-depth
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        // Referrer-Policy - Controls referrer information sent with requests
        // origin-when-cross-origin: Send full URL for same-origin, origin only for cross-origin
        key: 'Referrer-Policy',
        value: 'origin-when-cross-origin',
      },
      {
        // Permissions-Policy - Controls browser features and APIs
        // Disables unnecessary features to reduce attack surface
        key: 'Permissions-Policy',
        value: 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=()',
      },
    ];

    // Add HSTS only in production (requires HTTPS)
    if (isProduction) {
      securityHeaders.push({
        // HTTP Strict Transport Security - Forces HTTPS connections
        // max-age=63072000: 2 years (recommended by OWASP)
        // includeSubDomains: Apply to all subdomains
        // preload: Allow inclusion in browser HSTS preload lists
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      });
    }

    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
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

// Export Next.js config wrapped with bundle analyzer and Sentry
// Order matters: bundle analyzer wraps Next config, then Sentry wraps that
export default withSentryConfig(
  withBundleAnalyzer(nextConfig),
  sentryWebpackPluginOptions
);
