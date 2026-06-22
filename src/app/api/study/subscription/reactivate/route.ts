import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/study/subscription/reactivate — undo a scheduled
 * cancellation. Only works while we're still inside the current
 * period (status is trial/active and cancel_at_period_end is true).
 * Past-period rows need to go through /checkout instead.
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
    .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
    .eq('student_id', user.id)
    .in('status', ['trial', 'active'])

  if (error) return NextResponse.json({ error: 'reactivate failed' }, { status: 500 })
  return NextResponse.json({ success: true })
}
