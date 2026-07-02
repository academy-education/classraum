import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'

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
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

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

  // Upsert a row with just the reviewed flag when there's no note.
  const { error: upsertErr } = await supabaseAdmin
    .from('study_attempt_notes')
    .upsert(
      { student_id: user.id, attempt_id: attemptId, reviewed_at: reviewedAt, note: '' },
      { onConflict: 'student_id,attempt_id', ignoreDuplicates: false },
    )
  if (upsertErr) {
    console.error('[wrong-notebook/reviewed]', upsertErr)
    return NextResponse.json({ error: 'persist failed' }, { status: 500 })
  }

  return NextResponse.json({ reviewedAt })
}
