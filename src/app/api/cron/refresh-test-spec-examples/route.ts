import { NextRequest, NextResponse } from 'next/server'
import { refreshTestSpecExamples, listAllSpecTargetsFromDB } from '@/lib/test-spec-refresh'

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
  const authHeader = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET_KEY}`
  if (!process.env.CRON_SECRET_KEY || authHeader !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const targets = await listAllSpecTargetsFromDB()
  const results = []
  for (const t of targets) {
    const r = await refreshTestSpecExamples(t, { targetCount: 8 })
    results.push(r)
  }

  return NextResponse.json({
    ran: results.length,
    ok: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    examplesAdded: results.reduce((sum, r) => sum + r.examplesAdded, 0),
  })
}
