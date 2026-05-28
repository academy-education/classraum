// Sentry server SDK config — runs in Node on every API route + RSC render.
//
// Set SENTRY_DSN in your env. Falls back to the public DSN if only the
// browser var is set (they're the same string for Sentry projects).

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Sample 10% of API-route transactions in prod for performance traces.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // ── PII scrubbing ──────────────────────────────────────────────────
  // Server-side scrubbing is stricter — student names, emails, payment
  // amounts, anything from req.body should never leave the server.
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies
      delete event.request.data  // form bodies / JSON payloads
      if (event.request.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
        delete event.request.headers['x-supabase-auth']
      }
    }

    // Scrub user object — Sentry SDK populates this from auth context.
    // We only need a hashed/anonymous identifier for grouping; the email
    // would be PII.
    if (event.user) {
      delete event.user.email
      delete event.user.ip_address
      delete event.user.username
      // Keep event.user.id if it's a UUID (not personally identifying on its own)
    }

    return event
  },

  ignoreErrors: [
    // Supabase/PostgREST auth-expired errors get retried by the client;
    // not actionable as server errors.
    'JWT expired',
    'refresh_token_not_found',
  ],
})
