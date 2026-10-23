import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/api/admin/_lib/admin-auth'
import { loadBankUsage } from '@/lib/study/bank-usage-load'

/**
 * Supply and usage per test section, for the Overview tab of /admin/bank-qc.
 *
 * For every family/section: live and staged item counts, staged items in a
 * human review, whole tests' worth of each (blueprint sizes from
 * lib/study/bank-test-size.ts), the measured depth from depth-snapshot.json,
 * and how much REAL students have used the section — completed full tests,
 * the most any one student has taken, and how many are under 5 tests left.
 *
 * The definitions are lib/study/bank-usage.ts, shared with
 * scripts/study-bank/runout-monitor.ts. The response carries counts only:
 * no student id, name or email leaves this route.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    return NextResponse.json(await loadBankUsage())
  } catch (e) {
    console.error('[bank-qc/usage]', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
