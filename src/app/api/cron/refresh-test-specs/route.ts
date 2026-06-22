import { NextRequest, NextResponse } from 'next/server'
import { refreshTestSpec, listAllSpecTargets } from '@/lib/test-spec-refresh'
import type { TestFamily } from '@/lib/study-prompt-context'

/**
 * GET /api/cron/refresh-test-specs — monthly walk of every
 * (family, section) pair in the spec library, refreshing any that
 * haven't been verified within 30 days.
 *
 * Auth: CRON_SECRET_KEY bearer header, matching the other crons.
 *
 * Cost ceiling: ~20 sections × ~$0.04 (gpt-4o + 1 search + extract
 * mini call) ≈ $0.80/month at the high end. With the 30-day skip,
 * actual monthly cost is close to that on the first run, then drops
 * if any rows are still fresh.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET_KEY}`
  if (!process.env.CRON_SECRET_KEY || authHeader !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const targets = listAllSpecTargets()
  const results = []
  for (const t of targets) {
    const r = await refreshTestSpec(t.family as TestFamily, t.sectionKey)
    results.push(r)
  }

  return NextResponse.json({
    ran: results.length,
    ok: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
  })
}
