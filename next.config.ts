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
  // TypeScript errors ignored during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Suppress warnings during builds
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
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
