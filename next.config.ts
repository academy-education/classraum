import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// SINGLE config file. There used to be a parallel next.config.js which
// silently WON Next's config lookup (js > mjs > ts), so everything in
// this file — security headers, Sentry source-map upload, strict type
// checking — was inactive in every build until the .js file was
// removed. Do not re-add a next.config.js.
const nextConfig: NextConfig = {
  // Strict mode intentionally off: double-invoked effects break the
  // TOEFL Speaking auto-record flow in dev (mic starts twice) and
  // double every API call.
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
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
      {
        // Project bucket host — carried over from the legacy config's
        // `domains` entry, which allowed every path on this host.
        protocol: 'https',
        hostname: 'pprxpviwtsyvbseaozeg.supabase.co',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  trailingSlash: false,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react', '@phosphor-icons/react', '@radix-ui/react-avatar', '@radix-ui/react-label'],
  },
  // Client-reference-manifest workaround for the (app) route group —
  // see scripts/fix-client-manifest.js + CLAUDE.md build notes.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.optimization.sideEffects = false
    }
    return config
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
            // Disable every browser API we don't use to shrink the
            // attack surface against future supply-chain compromises.
            // EXCEPTIONS that must stay same-origin-enabled:
            //   - microphone=(self): TOEFL Speaking auto-record, chat
            //     voice input, and response sessions all call
            //     getUserMedia. microphone=() would silently break
            //     the entire Speaking test.
            //   - payment=(self): PortOne SDK uses Payment Request API.
            // (Snap-to-solve's camera uses <input capture>, which goes
            // through the OS picker and is NOT gated by this header —
            // camera=() is safe.)
            value: [
              'camera=()',
              'microphone=(self)',
              'geolocation=()',
              'usb=()',
              'magnetometer=()',
              'gyroscope=()',
              'accelerometer=()',
              'payment=(self)',
            ].join(', '),
          },
        ],
      },
    ];
  },
};

// Optional bundle analyzer: `ANALYZE=true npm run build` opens the
// treemap. Required LAZILY — the package is a devDependency, so a
// top-level import breaks config loading on deploy environments that
// prune dev deps (NODE_ENV=production installs). Only dev machines
// running ANALYZE=true ever load it.
let withBundleAnalyzer = (config: NextConfig): NextConfig => config;
if (process.env.ANALYZE === 'true') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: true });
}

// Sentry build-time options. Source maps are uploaded automatically when
// SENTRY_AUTH_TOKEN is set; safe to leave unset in dev (Sentry just skips
// the upload step). See docs/SENTRY_SETUP.md for the full env-var checklist.
export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,           // quiet builds locally, verbose in CI
  widenClientFileUpload: true,       // upload more source maps for better stack traces
  sourcemaps: { disable: false },    // upload source maps so stack traces resolve
  disableLogger: true,               // tree-shake Sentry's verbose console logger
  automaticVercelMonitors: true,     // auto-create Vercel cron monitors
});
