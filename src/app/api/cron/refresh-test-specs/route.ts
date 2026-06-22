import { NextRequest, NextResponse } from 'next/server'
import { refreshTestSpec, listAllSpecTargetsFromDB } from '@/lib/test-spec-refresh'

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
  const authHeader = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET_KEY}`
  if (!process.env.CRON_SECRET_KEY || authHeader !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const targets = await listAllSpecTargetsFromDB()
  const results = []
  for (const t of targets) {
    const r = await refreshTestSpec(t)
    results.push(r)
  }

  return NextResponse.json({
    ran: results.length,
    ok: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
  })
}
