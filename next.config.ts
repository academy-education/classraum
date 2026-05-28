import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    domains: ['localhost', 'app.localhost', '127.0.0.1'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
      {
        protocol: 'http',
        hostname: 'app.localhost',
        port: '3000',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Build-time type checking. Previously set to `ignoreBuildErrors: true`,
  // which let bugs like the 'not_submitted' vs 'not submitted' status
  // mismatch ship to production silently. Now that `npx tsc --noEmit`
  // passes clean, the build enforces it.
  typescript: {
    ignoreBuildErrors: false,
  },
  // Suppress warnings during builds
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Security response headers, applied to every route.
  //
  // Headers chosen to defend against the OWASP "top of mind" attacks
  // that don't require app-code changes:
  //   - HSTS                 → force HTTPS, prevent SSL-strip
  //   - X-Frame-Options      → clickjacking on /auth and /payments
  //   - X-Content-Type-Opts  → MIME-sniffing
  //   - Referrer-Policy      → cap third-party leakage of student URLs
  //   - Permissions-Policy   → kill browser APIs we never use
  //
  // CSP is intentionally omitted from this pass — adding it correctly
  // requires testing every page (Supabase realtime, PortOne iframes,
  // Sentry ingest, Google Fonts) and a misconfigured CSP breaks the
  // app silently. Recommend adding it next as a Report-Only header
  // first, then promoting to enforcing once violations stabilise.
  async headers() {
    return [
      {
        // Match every route except the Next.js internals.
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            // DENY would also block our own iframes; SAMEORIGIN is the
            // PortOne payment-iframe-compatible default.
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            // Send origin to cross-site requests, full URL for same-site.
            // Prevents student-report URLs (which include the report id)
            // from leaking to outbound link destinations.
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            // We don't use any of these APIs anywhere. Disabling shrinks
            // the attack surface against future supply-chain compromises
            // of dependencies (e.g. a malicious npm pkg trying to grab
            // the user's camera).
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'usb=()',
              'magnetometer=()',
              'gyroscope=()',
              'accelerometer=()',
              'payment=(self)',  // PortOne SDK uses Payment Request API
            ].join(', '),
          },
        ],
      },
    ];
  },
};

// Sentry build-time options. Source maps are uploaded automatically when
// SENTRY_AUTH_TOKEN is set; safe to leave unset in dev (Sentry just skips
// the upload step). See docs/SENTRY_SETUP.md for the full env-var checklist.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,           // quiet builds locally, verbose in CI
  widenClientFileUpload: true,       // upload more source maps for better stack traces
  sourcemaps: { disable: false },    // upload source maps so stack traces resolve
  disableLogger: true,               // tree-shake Sentry's verbose console logger
  automaticVercelMonitors: true,     // auto-create Vercel cron monitors
});
