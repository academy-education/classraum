import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { cancelUpdatePayload } from '@/lib/study/subscription-state'

/**
 * POST /api/study/subscription/cancel — mark cancel_at_period_end so
 * the student keeps access until current_period_end, then auto-flips
 * to status='cancelled' on the next renewal tick (Phase 4.5 cron).
 *
 * Cancel WINS over a scheduled plan switch: pending_plan is cleared in
 * the same write, because the renewal cron never applies a pending
 * switch on a cancel_at_period_end row — leaving it set showed a
 * "switch" the system would silently drop (and would resurface as a
 * surprise switch after a later reactivation). Status stays
 * 'trial' / 'active' until the period actually ends.
 */
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const { error } = await dbAdmin
    .from('study_subscriptions')
    .update(cancelUpdatePayload(new Date().toISOString()))
    .eq('student_id', user.id)
    // Only live paid subscriptions can be cancelled — free/expired/
    // cancelled rows have nothing to cancel (mirrors reactivate).
    .in('status', ['trial', 'active'])

  if (error) return NextResponse.json({ error: 'cancel failed' }, { status: 500 })
  return NextResponse.json({ success: true })
}
