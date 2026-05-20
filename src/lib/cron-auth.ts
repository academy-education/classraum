import { NextRequest } from 'next/server'

/**
 * Verify that a request is from a legitimate cron job.
 *
 * SECURITY: The cron endpoint at /api/cron/process-account-deletions
 * hard-deletes user accounts. Any caller who can pass this check can
 * trigger destructive operations against users whose grace period
 * elapsed. So:
 *
 *   1. ALWAYS require a Bearer token matching CRON_SECRET_KEY when the
 *      code is running on Vercel (or any other deploy target). The old
 *      User-Agent fallback (`vercel-cron/1.0`) was trivially spoofable —
 *      anyone could fire the cron by sending the right UA. Dropped.
 *
 *   2. Allow unauthenticated access ONLY in genuinely local dev
 *      (no `VERCEL_ENV` env var, which Vercel sets in every preview +
 *      production deploy). `NODE_ENV !== 'production'` was too loose —
 *      Vercel preview deploys often run with NODE_ENV=development but
 *      are publicly internet-reachable with prod env vars including
 *      the Supabase service role key.
 *
 * Returns true if authorized, false otherwise.
 */
export function verifyCronAuth(req: NextRequest): boolean {
  // Genuinely local development: no Vercel-injected env vars present.
  // Preview / production deploys all set VERCEL_ENV.
  const isLocalDev =
    process.env.VERCEL_ENV === undefined &&
    process.env.NODE_ENV !== 'production'
  if (isLocalDev) {
    return true
  }

  // Anywhere else (production OR preview), require the Bearer token.
  const cronSecret = process.env.CRON_SECRET_KEY
  if (!cronSecret) {
    // Hard-fail loud: never silently allow when the secret isn't
    // configured — that would re-introduce the bypass.
    console.error(
      '[cron-auth] CRON_SECRET_KEY not configured but VERCEL_ENV is set ' +
        '(env=' +
        process.env.VERCEL_ENV +
        '). Rejecting cron request.'
    )
    return false
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${cronSecret}`) {
    return true
  }

  return false
}
