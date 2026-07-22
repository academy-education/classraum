import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/report-question — file a student report against a
 * question they saw in review (wrong answer key, ambiguous, typo, etc.).
 *
 * Served questions carry no stable id (the bank draw returns
 * renderer-shaped items), so we identify a reported question by a
 * server-computed content hash of its normalized prompt + correct answer,
 * and store a full snapshot for the human reviewer. One report per student
 * per question — a repeat is a silent no-op (unique index), so the flag
 * can't be spammed to skew the queue.
 *
 * This is the first trustworthy quality signal from live use: study
 * attempts are contaminated test data, but an explicit human flag isn't.
 */

export const dynamic = 'force-dynamic'

const REASONS = ['wrong_key', 'ambiguous', 'typo', 'off_topic', 'other'] as const

const BodySchema = z.object({
  sessionId: z.string().uuid().nullable().optional(),
  reason: z.enum(REASONS),
  note: z.string().trim().max(1000).optional(),
  question: z.object({
    prompt: z.string().min(1).max(20000),
    type: z.string().max(64).optional(),
    choices: z.array(z.string().max(4000)).max(12).optional(),
    correct_answer: z.string().max(8000).nullable().optional(),
    explanation: z.string().max(20000).nullable().optional(),
  }),
})

/** Stable identity for a served question — normalized so trivial
 *  whitespace differences hash to the same item. */
function hashQuestion(prompt: string, correctAnswer: string | null | undefined): string {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()
  return createHash('sha256')
    .update(`${norm(prompt)}\n${norm(correctAnswer ?? '')}`)
    .digest('hex')
}

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(
    `report-question:user:${user.id}`,
    { windowMs: 60 * 1000, max: 20 },
  )
  if (blocked) return blocked

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'bad body' }, { status: 400 })
  const { sessionId, reason, note, question } = parsed.data

  const questionHash = hashQuestion(question.prompt, question.correct_answer)

  // Insert; a duplicate (same student + same question) is a no-op so the
  // student sees the same "thanks" state without a unique-violation error.
  const { data, error } = await supabaseAdmin
    .from('study_question_reports')
    .upsert(
      {
        student_id: user.id,
        session_id: sessionId ?? null,
        question_hash: questionHash,
        question_snapshot: question,
        reason,
        note: note && note.length > 0 ? note : null,
      },
      { onConflict: 'student_id,question_hash', ignoreDuplicates: true },
    )
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[report-question]', error)
    return NextResponse.json({ error: 'persist failed' }, { status: 500 })
  }

  // data is null when the row already existed (ignoreDuplicates) — still a
  // success from the student's point of view.
  return NextResponse.json({ ok: true, duplicate: data == null })
}
