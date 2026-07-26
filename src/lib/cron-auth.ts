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
  //
  // CRON_SECRET is checked FIRST and is the one that actually matters:
  // Vercel Cron only attaches `Authorization: Bearer <value>` to its
  // scheduled requests when a project env var named exactly CRON_SECRET
  // exists. This repo standardised on CRON_SECRET_KEY, which Vercel does
  // not recognise — so if only that name is set, Vercel sends NO auth
  // header at all, every cron 401s, and nothing scheduled ever runs:
  // no weekly recap, no streak or payment reminders, no league roll, no
  // stuck-generation reaper. Accepting both means whichever name is
  // configured works, and adding CRON_SECRET in Vercel takes effect
  // without a code change. CRON_SECRET_KEY is retained for manual and
  // external callers that already use it.
  const cronSecret = process.env.CRON_SECRET || process.env.CRON_SECRET_KEY
  if (!cronSecret) {
    // Hard-fail loud: never silently allow when the secret isn't
    // configured — that would re-introduce the bypass.
    console.error(
      '[cron-auth] Neither CRON_SECRET nor CRON_SECRET_KEY is configured ' +
        'but VERCEL_ENV is set (env=' +
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
