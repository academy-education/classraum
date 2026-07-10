import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/study/subscription/cancel — mark cancel_at_period_end so
 * the student keeps access until current_period_end, then auto-flips
 * to status='cancelled' on the next renewal tick (Phase 4.5 cron).
 *
 * v1 just flips the flag and leaves the row otherwise alone. Status
 * stays 'trial' / 'active' until the period actually ends.
 */
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { error } = await supabaseAdmin
    .from('study_subscriptions')
    .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
    .eq('student_id', user.id)
    // Only live paid subscriptions can be cancelled — free/expired/
    // cancelled rows have nothing to cancel (mirrors reactivate).
    .in('status', ['trial', 'active'])

  if (error) return NextResponse.json({ error: 'cancel failed' }, { status: 500 })
  return NextResponse.json({ success: true })
}
