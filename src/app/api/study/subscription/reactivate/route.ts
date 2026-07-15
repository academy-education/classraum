import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { isPassPlan } from '@/lib/study/plans'

/**
 * POST /api/study/subscription/reactivate — undo a scheduled
 * cancellation. Only works while we're still inside the current
 * period (status is trial/active and cancel_at_period_end is true).
 * Past-period rows need to go through /checkout instead.
 *
 * The 수능 pass is intentionally cancel_at_period_end=true for its whole
 * life (it finalizes at the exam date, never renews). Reactivating it
 * would clear that flag and expose it to the renewal charge cron, so
 * pass rows are refused here.
 */
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const { data: sub } = await supabaseAdmin
    .from('study_subscriptions')
    .select('plan')
    .eq('student_id', user.id)
    .maybeSingle()
  if (sub && isPassPlan(sub.plan)) {
    return NextResponse.json({ error: 'pass cannot be reactivated', code: 'pass_no_reactivate' }, { status: 409 })
  }

  const { error } = await supabaseAdmin
    .from('study_subscriptions')
    .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
    .eq('student_id', user.id)
    .in('status', ['trial', 'active'])

  if (error) return NextResponse.json({ error: 'reactivate failed' }, { status: 500 })
  return NextResponse.json({ success: true })
}
