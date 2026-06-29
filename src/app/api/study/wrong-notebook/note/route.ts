import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/study/wrong-notebook/note — upsert a student-authored
 * note on a wrong-answer attempt. Used by the 오답노트 page's inline
 * note editor.
 *
 * Empty note string clears the note (we delete the row so the page
 * doesn't show empty entries as "annotated").
 */

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  attemptId: z.string().uuid(),
  note: z.string().max(2000),
})

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const blocked = enforceRateLimit(
    `wrong-notebook-note:user:${user.id}`,
    { windowMs: 60 * 1000, max: 30 },
  )
  if (blocked) return blocked

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'bad body' }, { status: 400 })
  const { attemptId, note } = parsed.data

  // Ownership check — the attempt must belong to a session owned by
  // this user. RLS would block cross-user writes anyway but we want
  // a clean 404 instead of a silent RLS failure.
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

  const trimmed = note.trim()
  if (trimmed.length === 0) {
    await supabaseAdmin
      .from('study_attempt_notes')
      .delete()
      .eq('student_id', user.id)
      .eq('attempt_id', attemptId)
    return NextResponse.json({ note: '', deleted: true })
  }

  const { error: upsertErr } = await supabaseAdmin
    .from('study_attempt_notes')
    .upsert(
      { student_id: user.id, attempt_id: attemptId, note: trimmed },
      { onConflict: 'student_id,attempt_id' },
    )
  if (upsertErr) {
    console.error('[wrong-notebook/note]', upsertErr)
    return NextResponse.json({ error: 'persist failed' }, { status: 500 })
  }

  return NextResponse.json({ note: trimmed, deleted: false })
}
