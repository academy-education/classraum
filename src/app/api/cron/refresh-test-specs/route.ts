import { NextRequest, NextResponse } from 'next/server'
import { refreshTestSpec, listAllSpecTargetsFromDB } from '@/lib/test-spec-refresh'
import { withHeartbeat } from '@/lib/ops/heartbeat'
import { verifyCronAuth } from '@/lib/cron-auth'

/**
 * GET /api/cron/refresh-test-specs — monthly walk of every
 * (family, section) pair derived from study_topics, refreshing any
 * format spec that hasn't been verified within 30 days.
 *
 * This is FORMAT only — the more expensive samples pass runs
 * quarterly via /api/cron/refresh-test-spec-examples.
 *
 * Auth: CRON_SECRET_KEY bearer header, matching the other crons.
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
  const summary = await withHeartbeat('refresh-test-specs', async () => {
    const targets = await listAllSpecTargetsFromDB()
    const results = []
    for (const t of targets) {
      const r = await refreshTestSpec(t)
      results.push(r)
    }
    return {
      ran: results.length,
      ok: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
    }
  })

  return NextResponse.json(summary)
}
