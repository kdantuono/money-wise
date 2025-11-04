/**
 * Security Configuration for NestJS Backend
 *
 * Implements comprehensive security headers using helmet.js to protect against:
 * - XSS (Cross-Site Scripting) attacks
 * - Clickjacking attacks
 * - MIME type sniffing
 * - Information leakage
 * - Insecure connections (production)
 *
 * Configuration is environment-aware with separate settings for development and production.
 */

import { HelmetOptions } from 'helmet';

/**
 * Get helmet configuration based on environment
 *
 * @param nodeEnv - Current environment (development, production, test)
 * @param corsOrigin - Frontend origin URL for CSP directives
 * @returns Helmet configuration object
 */
export function getHelmetConfig(
  nodeEnv: string = 'development',
  corsOrigin: string = 'http://localhost:3000'
): HelmetOptions {
  const isProduction = nodeEnv === 'production';
  const isDevelopment = nodeEnv === 'development';

  return {
    // Content Security Policy (CSP) - Prevents XSS attacks
    // Defines approved sources of content that the browser is allowed to load
    contentSecurityPolicy: {
      directives: {
        // Default fallback for all resource types not explicitly defined
        defaultSrc: ["'self'"],

        // Scripts: Allow same-origin scripts
        // 'unsafe-inline' and 'unsafe-eval' disabled for security in production
        scriptSrc: [
          "'self'",
          ...(isDevelopment ? ["'unsafe-eval'"] : []), // Needed for dev tools only
        ],

        // Stylesheets: Allow same-origin styles
        styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for styled-components

        // Images: Allow same-origin and data URIs (for base64 images)
        imgSrc: ["'self'", 'data:', 'https:'],

        // Fonts: Allow same-origin fonts
        fontSrc: ["'self'"],

        // AJAX/Fetch connections: Allow same-origin and frontend origin
        connectSrc: [
          "'self'",
          corsOrigin, // Allow connections from frontend
          ...(isDevelopment ? ['http://localhost:*', 'ws://localhost:*'] : []),
        ],

        // Frames: Disallow embedding in iframes (clickjacking protection)
        frameSrc: ["'none'"],

        // Object/Embed: Disallow Flash and other plugins
        objectSrc: ["'none'"],

        // Media: Allow same-origin media
        mediaSrc: ["'self'"],

        // Forms: Only allow submissions to same origin
        formAction: ["'self'"],

        // Base URI: Prevent base tag injection
        baseUri: ["'self'"],

        // Upgrade insecure requests in production
        ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
      },
    },

    // Cross-Origin-Embedder-Policy (COEP)
    // Prevents document from loading cross-origin resources that don't explicitly grant permission
    crossOriginEmbedderPolicy: false, // Disabled to avoid breaking CORS for cookies

    // Cross-Origin-Opener-Policy (COOP)
    // Isolates browsing context to prevent cross-origin attacks
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },

    // Cross-Origin-Resource-Policy (CORP)
    // Prevents other origins from reading your resources
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow frontend access

    // DNS Prefetch Control
    // Controls browser DNS prefetching (privacy vs performance trade-off)
    dnsPrefetchControl: { allow: true },

    // X-Frame-Options - Prevents clickjacking by disallowing embedding in iframes
    // DENY: Cannot be embedded in any iframe
    frameguard: { action: 'deny' },

    // Hide X-Powered-By header to prevent information leakage
    // Prevents attackers from knowing the underlying technology stack
    hidePoweredBy: true,

    // HTTP Strict Transport Security (HSTS)
    // Forces browsers to use HTTPS connections only
    // Only enabled in production to avoid localhost issues
    hsts: isProduction
      ? {
          maxAge: 63072000, // 2 years in seconds (recommended by OWASP)
          includeSubDomains: true, // Apply to all subdomains
          preload: true, // Allow inclusion in browser HSTS preload lists
        }
      : false, // Disabled in development (localhost doesn't support HTTPS)

    // IE No Open - Prevents IE from executing downloads in site's context
    ieNoOpen: true,

    // X-Content-Type-Options - Prevents MIME type sniffing
    // Forces browsers to respect declared Content-Type
    noSniff: true,

    // Origin-Agent-Cluster
    // Provides origin-level isolation in the browser
    originAgentCluster: true,

    // Permissions-Policy (formerly Feature-Policy)
    // Controls which browser features and APIs can be used
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },

    // Referrer-Policy - Controls how much referrer information is sent
    // 'strict-origin-when-cross-origin': Full URL for same-origin, origin only for cross-origin
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

    // X-XSS-Protection - Legacy XSS protection for older browsers
    // Modern browsers use CSP instead, but this provides defense-in-depth
    xssFilter: true,
  };
}

/**
 * Additional security headers not covered by helmet
 * These can be added manually via custom middleware or reverse proxy
 */
export const ADDITIONAL_SECURITY_HEADERS = {
  // Permissions-Policy - Controls browser features (replaces Feature-Policy)
  // Example: "geolocation=(), microphone=(), camera=()"
  'Permissions-Policy':
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=()',

  // X-Permitted-Cross-Domain-Policies - Controls Adobe Flash/PDF cross-domain requests
  'X-Permitted-Cross-Domain-Policies': 'none',

  // Expect-CT (Certificate Transparency) - Requires valid CT logs
  // Note: This header is being deprecated in favor of automatic CT in browsers
  ...(process.env.NODE_ENV === 'production' && {
    'Expect-CT': 'max-age=86400, enforce',
  }),
};

/**
 * Security best practices documentation:
 *
 * 1. CSP (Content Security Policy):
 *    - Prevents XSS by controlling resource loading
 *    - Use 'nonce' or 'hash' for inline scripts in production
 *    - Gradually tighten directives as you understand your app's needs
 *
 * 2. HSTS (HTTP Strict Transport Security):
 *    - Forces HTTPS for 2 years
 *    - Only enable in production with valid SSL certificate
 *    - Once enabled, cannot be easily disabled (browsers cache it)
 *
 * 3. Frame Options:
 *    - DENY prevents all framing (strongest protection)
 *    - Use SAMEORIGIN if you need to embed your own pages
 *    - Modern browsers also respect CSP frame-ancestors
 *
 * 4. CORS vs Security Headers:
 *    - CORS headers (Access-Control-*) control cross-origin access
 *    - Security headers protect the user's browser
 *    - Both are needed and serve different purposes
 *
 * 5. Cookie Security:
 *    - Use HttpOnly flag to prevent JavaScript access
 *    - Use Secure flag in production (requires HTTPS)
 *    - Use SameSite=Strict or SameSite=Lax for CSRF protection
 *    - Security headers complement cookie flags
 */
