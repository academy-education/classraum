import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/wrong-notebook/reviewed — mark or unmark a wrong-
 * answer attempt as "I've got this now". Toggles the reviewed_at
 * column on study_attempt_notes (auto-inserts the row if the student
 * has never written a note for this attempt).
 */

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  attemptId: z.string().uuid(),
  reviewed: z.boolean(),
})

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(
    `wrong-notebook-reviewed:user:${user.id}`,
    { windowMs: 60 * 1000, max: 60 },
  )
  if (blocked) return blocked

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'bad body' }, { status: 400 })
  const { attemptId, reviewed } = parsed.data

  const { data: attempt } = await supabaseAdmin
    .from('study_attempts')
    .select('id, session:study_sessions!inner ( student_id )')
    .eq('id', attemptId)
    .maybeSingle()
  const session = attempt?.session as { student_id: string } | { student_id: string }[] | null
  const sessionStudent = Array.isArray(session) ? session[0]?.student_id : session?.student_id
  if (!attempt || sessionStudent !== user.id) {
    return NextResponse.json({ error: 'attempt not found' }, { status: 404 })
  }

  const reviewedAt = reviewed ? new Date().toISOString() : null

  // UPDATE-then-INSERT instead of upsert: the old upsert wrote
  // note:'' on conflict, silently erasing any note the student had
  // written on this attempt when they toggled "reviewed".
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('study_attempt_notes')
    .update({ reviewed_at: reviewedAt })
    .eq('student_id', user.id)
    .eq('attempt_id', attemptId)
    .select('attempt_id')
  if (updateErr) {
    console.error('[wrong-notebook/reviewed]', updateErr)
    return NextResponse.json({ error: 'persist failed' }, { status: 500 })
  }
  if (!updated || updated.length === 0) {
    const { error: insertErr } = await supabaseAdmin
      .from('study_attempt_notes')
      .insert({ student_id: user.id, attempt_id: attemptId, reviewed_at: reviewedAt, note: '' })
    // A concurrent insert can race us here — retry as an update.
    if (insertErr) {
      const { error: retryErr } = await supabaseAdmin
        .from('study_attempt_notes')
        .update({ reviewed_at: reviewedAt })
        .eq('student_id', user.id)
        .eq('attempt_id', attemptId)
      if (retryErr) {
        console.error('[wrong-notebook/reviewed]', retryErr)
        return NextResponse.json({ error: 'persist failed' }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ reviewedAt })
}
