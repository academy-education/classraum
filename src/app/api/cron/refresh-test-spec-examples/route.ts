import { NextRequest, NextResponse } from 'next/server'
import { refreshTestSpecExamples, listSpecTargetsForCron } from '@/lib/test-spec-refresh'
import { summarizeRefresh } from '@/lib/test-spec-refresh-summary'
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
  // TIME BUDGET. 57 targets × two model calls (web research + structured
  // extraction) does not fit one 300-second invocation; through 2026-09-29
  // this job had NEVER written a heartbeat — it was dying on the Vercel
  // timeout every month, silently, and the ops watchdog read that as
  // "never ran". The loop now stops starting new targets after BUDGET_MS,
  // records what it did and how many remain, and the schedule is daily:
  // each refresher already skips targets verified within its own window
  // (30 days for specs, 90 for examples), so a daily run is a no-op once
  // everything is fresh and the backlog drains a handful per day.
  const BUDGET_MS = 240_000
  const started = Date.now()
  const summary = await withHeartbeat('refresh-test-spec-examples', async () => {
    const targets = await listSpecTargetsForCron()
    const results = []
    let remaining = 0
    for (const t of targets) {
      if (Date.now() - started > BUDGET_MS) { remaining++; continue }
      const r = await refreshTestSpecExamples(t, { targetCount: 8 })
      results.push(r)
    }
    // Partial failure is visible: 'degraded' when some attempted targets
    // failed, 'failed' above half. Until 2026-10-02 this returned the
    // counts and withHeartbeat marked every run green, 13/16 and 10/11
    // failures included.
    return {
      ...summarizeRefresh(results, remaining),
      examplesAdded: results.reduce((sum, r) => sum + r.examplesAdded, 0),
    }
  }, s => s.status)
  return NextResponse.json(summary)
}
