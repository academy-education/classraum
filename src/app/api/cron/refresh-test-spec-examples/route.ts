import { NextRequest, NextResponse } from 'next/server'
import { refreshTestSpecExamples, listAllSpecTargetsFromDB } from '@/lib/test-spec-refresh'
import { withHeartbeat } from '@/lib/ops/heartbeat'
import { verifyCronAuth } from '@/lib/cron-auth'

/**
 * GET /api/cron/refresh-test-spec-examples — QUARTERLY walk of every
 * (family, section) pair, pulling representative HARD released items
 * from authoritative sources and storing the verified ones as
 * hardItemExamples on each cached spec.
 *
 * Separate cron from the format refresh because:
 *  - Cost is higher (~$0.10-0.20 per section vs $0.04)
 *  - Released item sets change much less often than format docs
 *
 * Quarterly schedule (1st of Jan/Apr/Jul/Oct, 05:00 UTC).
 * Internal skip protects against double-runs — items refreshed within
 * the last 90 days are skipped.
 *
 * Auth: CRON_SECRET_KEY bearer header.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  // Shared guard: accepts CRON_SECRET (the name Vercel Cron actually
  // requires to send its Authorization header) as well as the legacy
  // CRON_SECRET_KEY, and allows genuinely-local dev through. This
  // route previously inlined its own CRON_SECRET_KEY check, so the
  // CRON_SECRET fix did not reach it and it would still 401 in prod.
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Heartbeat sits inside the auth guard — a 401'd request never ran the
  // job, so letting it report would mask a dead cron to the watchdog.
  const summary = await withHeartbeat('refresh-test-spec-examples', async () => {
    const targets = await listAllSpecTargetsFromDB()
    const results = []
    for (const t of targets) {
      const r = await refreshTestSpecExamples(t, { targetCount: 8 })
      results.push(r)
    }
    return {
      ran: results.length,
      ok: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      examplesAdded: results.reduce((sum, r) => sum + r.examplesAdded, 0),
    }
  })

  return NextResponse.json(summary)
}
