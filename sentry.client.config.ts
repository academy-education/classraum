// Sentry browser SDK config. Loaded by next/instrumentation on every page.
//
// Set NEXT_PUBLIC_SENTRY_DSN in your env after creating a Sentry project.
// If the env var is unset, Sentry initialises in no-op mode — safe for dev
// without an account.

import * as Sentry from '@sentry/nextjs'
import {
  scrubPii,
  scrubConsoleBreadcrumb,
  scrubNavigationBreadcrumb,
} from '@/lib/sentry-scrubbing'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment + release help separate prod errors from dev/staging noise
  // and let Sentry link errors to a specific deploy.
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Capture 10% of transactions for performance monitoring in production,
  // 100% in dev. Adjust based on Sentry quota usage.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay is disabled by default (it costs more quota); enable
  // selectively after launch if you want to see what users were doing
  // when an error happened.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // ── PII scrubbing ──────────────────────────────────────────────────
  // Strip user-identifiable fields from breadcrumbs and event bodies
  // before they leave the browser. Defence in depth: even with Sentry's
  // own "Default PII" settings, app-level scrubbing prevents regressions.
  sendDefaultPii: false,
  beforeSend(event) {
    // Drop request body content — auth tokens, form data, etc.
    if (event.request) {
      delete event.request.cookies
      delete event.request.data
      if (event.request.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
      }
    }
    // Recursively scrub PII from event.extra and event.contexts — these
    // are where Sentry.captureException(err, { extra: {...} }) data lives
    // and frequently include logged user objects.
    if (event.extra) {
      event.extra = scrubPii(event.extra) as Record<string, unknown>
    }
    if (event.contexts) {
      event.contexts = scrubPii(event.contexts) as typeof event.contexts
    }
    return event
  },
  beforeBreadcrumb(breadcrumb) {
    scrubNavigationBreadcrumb(breadcrumb)
    // Console breadcrumbs are the biggest leak vector: every console.error
    // in the codebase becomes one with the original args attached as
    // breadcrumb.data.arguments. Pattern-scrub them here so we catch
    // existing call sites without needing per-file rewrites.
    scrubConsoleBreadcrumb(breadcrumb)
    return breadcrumb
  },

  // Filter known-noisy errors that aren't actionable.
  ignoreErrors: [
    // Browser extension noise
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Network failures from offline / aborted requests
    'NetworkError',
    'Network request failed',
    'AbortError',
    // Capacitor / iOS WebView quirks
    'Non-Error promise rejection captured',
  ],
})
