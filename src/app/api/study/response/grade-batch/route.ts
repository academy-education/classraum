import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { enforceRateLimit } from '@/lib/rate-limit'
import { awardXp } from '@/lib/study/xp'
import { OPEN_RESPONSE_TYPES, RESPONSE_SKILL_BY_TYPE } from '@/lib/study/openResponse'
import {
  inferSpeakingTaskType,
  type ResponseSkill,
  type ResponseTaskType,
  type ResponseTestFamily,
} from '@/lib/study/responseRubrics'
import {
  gradeAndPersistResponse,
  GradeGenerationError,
  GradePersistError,
} from '@/lib/study/gradeResponse'

/**
 * Grade every open response in a finished test, in one request.
 *
 * Replaces four-plus separate per-card calls. That shape had three
 * problems, all of which a student hit on 2026-07-28:
 *
 *  - it burned the 10-per-10-minute limiter on response/grade, so the
 *    later items returned "Too many requests" and the student read it as
 *    an OpenAI billing failure;
 *  - each item was graded only if the student happened to expand its
 *    card, so a Speaking section could sit permanently half-graded;
 *  - the section score excluded the rubric items entirely, meaning a
 *    TOEFL Speaking result reflected only Listen-and-Repeat.
 *
 * Idempotent by construction: gradeAndPersistResponse returns the stored
 * grade when the same prompt+response is already graded in this session,
 * so re-running after a partial failure only pays for what is missing.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Per-question delivery metrics, keyed by the question's position in the
 *  delivered order. Whisper produces these during Speaking and only the
 *  client holds them; without them the staged grader scores a halting
 *  45-second answer exactly like a fluent one, because all it sees is the
 *  transcript. Optional, so a Writing-only batch can omit the field. */
const SignalsSchema = z.object({
  audioPath: z.string().optional(),
  durationSec: z.number().nullable().optional(),
  wpm: z.number().nullable().optional(),
  pauseCount: z.number().nullable().optional(),
  clarity: z.number().min(0).max(1).nullable().optional(),
})

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  signals: z.record(z.string(), SignalsSchema).optional(),
})

export async function POST(req: NextRequest) {
  const auth = await requireStudyUser(req)
  if ('response' in auth) return auth.response
  const { user } = auth

  // ONE slot per batch, where the per-card flow spent one per item. A
  // whole test is a single unit of work now, so a limit that used to be
  // exhausted mid-section is no longer reachable in normal use.
  const blocked = enforceRateLimit(
    `response-grade-batch:user:${user.id}`,
    { windowMs: 10 * 60 * 1000, max: 6 },
  )
  if (blocked) return blocked

  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }

  const { data: session } = await dbAdmin
    .from('study_sessions')
    .select('id, language, topic:study_topics ( slug )')
    .eq('id', body.sessionId)
    .eq('student_id', user.id)
    .maybeSingle()
  if (!session) return NextResponse.json({ error: 'session not found' }, { status: 404 })

  const topicRel = session.topic as { slug: string } | { slug: string }[] | null
  const topicSlug = (Array.isArray(topicRel) ? topicRel[0]?.slug : topicRel?.slug) ?? ''
  // Only TOEFL and IELTS have response rubrics; test_family has a CHECK
  // constraint allowing exactly those two.
  const testFamily: ResponseTestFamily | null =
    topicSlug.startsWith('toefl-') ? 'toefl'
    : topicSlug.startsWith('ielts-') ? 'ielts'
    : null
  if (!testFamily) {
    return NextResponse.json({ graded: 0, items: [], reason: 'no_rubric_family' })
  }

  const { data: attempts } = await dbAdmin
    .from('study_attempts')
    .select('id, position, question, student_answer')
    .eq('session_id', body.sessionId)
    .order('position', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })

  const targets = (attempts ?? []).flatMap(a => {
    const q = a.question as { type?: string; prompt?: string } | null
    const type = q?.type ?? ''
    if (!q?.prompt || !OPEN_RESPONSE_TYPES.has(type)) return []
    const skill = RESPONSE_SKILL_BY_TYPE[type]
    if (!skill) return []
    // An unanswered open response has nothing to grade; grading an empty
    // string would spend a gpt-4o call to be told it is a zero.
    const answer = (a.student_answer ?? '').trim()
    if (!answer) return []
    // A recorded Speaking answer is graded from the audio by
    // /api/study/speaking/grade-audio, which the client calls directly.
    // Grading it here as well would produce a SECOND submission row for
    // the same task: the dedupe in gradeAndPersistResponse is a read
    // then a write, so two callers a second apart both miss and both
    // insert. That is exactly what put four submissions and two
    // disagreeing bands on one Writing test. One writer per item.
    if (a.position != null && body.signals?.[String(a.position)]?.audioPath) return []
    return [{ position: a.position, type, skill, prompt: q.prompt, answer }]
  })

  if (targets.length === 0) {
    return NextResponse.json({ graded: 0, items: [] })
  }

  // Parallel: four independent gpt-4o pipelines at ~15s each run inside
  // the 300s budget together, where sequentially they would not.
  const settled = await Promise.allSettled(targets.map(t => {
    const taskType = (t.skill === 'speaking'
      ? inferSpeakingTaskType(t.type)
      : t.type === 'writing_email' ? 'email' : 'academic_discussion'
    ) as ResponseTaskType | undefined
    // Absent for Writing, and absent for Speaking when the student typed
    // instead of recording. gradeAndPersistResponse already treats every
    // field as nullable, so a miss degrades to transcript-only grading
    // rather than failing the item.
    const sig = t.position == null ? undefined : body.signals?.[String(t.position)]
    return gradeAndPersistResponse({
      userId: user.id,
      sessionId: body.sessionId,
      sessionLanguage: session.language,
      testFamily,
      skill: t.skill,
      taskType,
      promptText: t.prompt,
      responseText: t.answer,
      audioPath: sig?.audioPath ?? null,
      durationSeconds: sig?.durationSec ?? null,
      wpm: sig?.wpm ?? null,
      pauseCount: sig?.pauseCount ?? null,
      clarity: sig?.clarity ?? null,
    }).then(r => ({ position: t.position, skill: t.skill, ...r }))
  }))

  const items: Array<{
    position: number | null
    skill: ResponseSkill
    submissionId: string
    overallBand: number
    scaleMax: number
    cached: boolean
  }> = []
  const failures: Array<{ position: number | null; reason: string }> = []

  settled.forEach((s, i) => {
    if (s.status === 'fulfilled') {
      const v = s.value
      items.push({
        position: v.position,
        skill: v.skill,
        submissionId: v.submissionId,
        overallBand: v.grade.overallBand,
        scaleMax: v.scaleMax,
        cached: v.cached,
      })
      // Deterministic per-task key — a re-run collides on the unique
      // index and cannot pay out twice.
      if (!v.cached) void awardXp(user.id, 'response_graded', v.xpSourceId)
    } else {
      const e = s.reason
      failures.push({
        position: targets[i]!.position,
        reason: e instanceof GradeGenerationError ? 'generation'
          : e instanceof GradePersistError ? 'persist'
          : 'unknown',
      })
      console.error('[response/grade-batch] item failed', targets[i]!.position, e)
    }
  })

  // 207: some graded, some did not. The client shows what landed and can
  // re-run for the rest — a partial result is worth more than an error
  // that discards the grades already paid for.
  return NextResponse.json(
    { graded: items.length, items, failures },
    { status: failures.length > 0 && items.length > 0 ? 207 : failures.length > 0 ? 502 : 200 },
  )
}
