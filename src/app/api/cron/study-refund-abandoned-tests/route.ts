import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { sweepAbandonedTests } from '@/lib/study/abandoned-test-refund'

/**
 * Refund + archive full tests opened but never submitted (policy and
 * trade-offs in src/lib/study/abandoned-test-refund.ts).
 *
 * NOT SCHEDULED: absent from vercel.json until the owner approves the
 * policy. Lists only (dry run) unless called with ?apply=1.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const apply = req.nextUrl.searchParams.get('apply') === '1'
  try {
    const result = await sweepAbandonedTests({ apply })
    return NextResponse.json({ ok: result.failedSessions.length === 0, ...result })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
