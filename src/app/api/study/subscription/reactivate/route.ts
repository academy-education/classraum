import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/subscription/reactivate — undo a scheduled
 * cancellation. Only works while we're still inside the current
 * period (status is trial/active and cancel_at_period_end is true).
 * Past-period rows need to go through /checkout instead.
 */
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const { error } = await supabaseAdmin
    .from('study_subscriptions')
    .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
    .eq('student_id', user.id)
    .in('status', ['trial', 'active'])

  if (error) return NextResponse.json({ error: 'reactivate failed' }, { status: 500 })
  return NextResponse.json({ success: true })
}
