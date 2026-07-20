import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { loadStudyPromptContext } from '@/lib/study-prompt-context'
import { drawBankPractice } from '@/lib/study/assemble'
import { requireStudyUser } from '@/lib/study/auth'
import { canAccessTest } from '@/lib/study/entitlements'
import { PATH_STOP_QUESTION_COUNT } from '@/lib/study-path'

/**
 * POST /api/study/practice/generate — serve a batch of practice
 * questions from the verified item bank.
 *
 * BANK-ONLY (no AI, no token cost, no subscription required). Draw is
 * unseen-first with no-repeat tracking (study_item_exposures) and the
 * oldest-seen items recycled once the pool runs dry, using the same
 * College-Board-blueprint draw as the full mock tests. The daily
 * challenge seeds by DATE so every student gets the same set that day;
 * everything else seeds by session id.
 *
 * The live-AI generation fallback was removed on purpose so practice is
 * provably zero-cost. Topics without bank coverage (only SAT is banked
 * today) return an empty set rather than calling a model.
 *
 * Questions are not persisted at generation time — they land in
 * study_attempts when the student answers via /grade. The served batch
 * is cached to study_messages so /grade can match answers against the
 * server's copy (anti-forgery).
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/** Topic-page practice sets allowed per KST calendar day. Path stops
 *  and the daily challenge don't count against (or check) these. The
 *  bank is finite (~160 items/section) and doubles as the mock-test
 *  pool, so the ceiling protects item freshness, not revenue. */
const PRACTICE_SETS_PER_DAY_FREE = 3
const PRACTICE_SETS_PER_DAY_PAID = 10

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  // Cheap abuse guard on the DB draw (no model cost here).
  const blocked = enforceRateLimit(
    `practice-generate:user:${user.id}`,
    { windowMs: 10 * 60 * 1000, max: 30 }
  )
  if (blocked) return blocked

  let body: { sessionId?: string; count?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }
  const sessionId = body.sessionId
  if (!sessionId) {
    return NextResponse.json({ error: 'missing sessionId' }, { status: 400 })
  }

  const { data: session } = await supabaseAdmin
    .from('study_sessions')
    .select('id, student_id, mode, language, topic_id, config, status')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session || session.student_id !== user.id) {
    return NextResponse.json({ error: 'session not found' }, { status: 404 })
  }
  if (session.mode !== 'practice') {
    return NextResponse.json({ error: 'session is not in practice mode' }, { status: 400 })
  }

  // A completed practice set is review-only — same rule as graded mock
  // tests. Serving a fresh batch into a finished session would let the
  // score be overwritten and per-answer XP re-earned; "practice more"
  // starts a NEW session instead. (The session page also redirects
  // completed sessions to the summary; this is the server-side backstop.)
  if (session.status === 'completed') {
    return NextResponse.json(
      { error: 'practice set already completed', reason: 'completed' },
      { status: 409 },
    )
  }

  // Resume: an ACTIVE session that already served a batch returns that
  // same batch plus the per-question verdicts so far, so a reload or a
  // History tap lands the student exactly where they left off instead
  // of silently drawing a new set (which orphaned their graded answers).
  {
    const { data: cacheRow } = await supabaseAdmin
      .from('study_messages')
      .select('content')
      .eq('session_id', sessionId)
      .like('content', `${PRACTICE_CACHE_MARKER}%`)
      .maybeSingle()
    if (cacheRow?.content) {
      try {
        const cached = JSON.parse((cacheRow.content as string).slice(PRACTICE_CACHE_MARKER.length)) as { questions?: unknown[] }
        const questions = Array.isArray(cached.questions) ? cached.questions : []
        if (questions.length > 0) {
          const { data: attempts } = await supabaseAdmin
            .from('study_attempts')
            .select('is_correct')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true })
          const results = (attempts ?? []).map(a => a.is_correct === true)
          return NextResponse.json({
            questions,
            source: 'cache',
            resume: { results: results.slice(0, questions.length) },
          })
        }
      } catch { /* corrupt cache → fall through to a fresh draw */ }
    }
  }

  const config = (session.config ?? {}) as {
    questionCount?: number
    dailyChallenge?: string
    // Journey nodes tag their sessions with the node id plus optional
    // bank filters so each node trains one skill at a time.
    pathNode?: string
    domain?: string
    difficulties?: Array<'easy' | 'medium' | 'hard'>
  }
  // Path stops serve EXACTLY 3 questions — enforced here so a doctored
  // client config can't inflate a free path stop into a bigger draw.
  // (Mock-test stops don't pass through this route; they assemble via
  // /test/assemble with their full-length counts.)
  const count = config.pathNode
    ? PATH_STOP_QUESTION_COUNT
    : Math.max(3, Math.min(10, config.questionCount ?? body.count ?? 5))

  // No single-stop repeats: once ANY unarchived session for this path
  // node is completed, the stop is terminal. Repeating is whole-path
  // only (POST /api/study/path/repeat archives the old run's sessions,
  // which is what un-blocks this check for the new run).
  if (config.pathNode) {
    const { data: done } = await supabaseAdmin
      .from('study_sessions')
      .select('id')
      .eq('student_id', user.id)
      .eq('archived', false)
      .eq('status', 'completed')
      .eq('config->>pathNode', config.pathNode)
      .neq('id', session.id)
      .limit(1)
    if (done && done.length > 0) {
      return NextResponse.json(
        { error: 'path stop already completed', reason: 'node_completed' },
        { status: 409 },
      )
    }
  }

  // ── Daily practice-set cap ─────────────────────────────────────
  // Practice is free (bank-served, no credits), so without a ceiling a
  // single student can page through the whole verified bank in a day —
  // and the bank doubles as the mock-test pool. Cap NEW topic-page sets
  // per KST calendar day; path stops and the daily challenge have their
  // own once-per-day/terminal rules and stay exempt. Resumes never hit
  // this: the cached-batch return above runs first.
  if (!config.pathNode && !config.dailyChallenge) {
    // Paid subscribers get a higher ceiling; the limit is about bank
    // conservation, not monetization, so even free stays generous.
    const { data: sub } = await supabaseAdmin
      .from('study_subscriptions')
      .select('status')
      .eq('student_id', user.id)
      .maybeSingle()
    const paid = sub?.status === 'active' || sub?.status === 'trial'
    const limit = paid ? PRACTICE_SETS_PER_DAY_PAID : PRACTICE_SETS_PER_DAY_FREE

    // KST midnight — the audience's calendar day, not the server's.
    const now = Date.now()
    const kst = new Date(now + 9 * 3600_000)
    kst.setUTCHours(0, 0, 0, 0)
    const sinceIso = new Date(kst.getTime() - 9 * 3600_000).toISOString()

    const { count } = await supabaseAdmin
      .from('study_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('mode', 'practice')
      .eq('archived', false)
      .gte('created_at', sinceIso)
      .is('config->>pathNode', null)
      .is('config->>dailyChallenge', null)
      .neq('id', session.id)
    if ((count ?? 0) >= limit) {
      // This session was created moments ago and never served a batch —
      // remove it so it doesn't linger on the resumable shelf.
      await supabaseAdmin.from('study_sessions').delete().eq('id', session.id).eq('student_id', user.id)
      return NextResponse.json(
        { error: 'daily practice limit reached', reason: 'daily_limit', limit },
        { status: 429 },
      )
    }
  }

  // Resolve the bank section from the topic. Section comes from the
  // locale-independent SLUG (ctx.testSection is a localized display
  // name — matching it against /math/i once served R&W to Korean-
  // language Math sessions). Only SAT is banked today.
  const lang = session.language as 'en' | 'ko'
  let bankSection: 'math' | 'reading_writing' | null = null
  if (session.topic_id) {
    const ctx = await loadStudyPromptContext(session.topic_id, lang)
    if (ctx?.testFamily === 'sat') {
      bankSection = ctx.topicSlug === 'sat-math' ? 'math' : 'reading_writing'
    }
    // Test-scoped access: family = topicSlug prefix before '-'. Block a
    // pass holder scoped to a different test before the draw. Fail open
    // when the slug is missing/unresolvable (free/plan users always pass).
    const family = ctx?.topicSlug ? ctx.topicSlug.split('-')[0]?.toLowerCase() : null
    if (family && !(await canAccessTest(user.id, family))) {
      return NextResponse.json({ error: 'test not unlocked', code: 'test_locked', test: family }, { status: 403 })
    }
  }

  // No bank coverage → no questions (previously this fell through to a
  // paid AI generation; that path is intentionally gone).
  if (!bankSection) {
    return NextResponse.json({ questions: [], reason: 'no_bank_coverage' })
  }

  try {
    const seed = config.dailyChallenge
      ? `daily:${config.dailyChallenge}:${bankSection}`
      : `session:${session.id}`
    const questions = await drawBankPractice({
      section: bankSection,
      count,
      seed,
      domain: config.domain,
      difficulties: config.difficulties,
      studentId: user.id,
      source: config.dailyChallenge
        ? 'daily_challenge'
        : config.pathNode ? 'path' : 'practice',
      sessionId: session.id,
    })
    await cacheServedBatch(session.id, questions)
    return NextResponse.json({ questions, source: 'bank' })
  } catch (err) {
    console.error('[practice/generate] bank draw failed', err)
    return NextResponse.json({ error: 'draw failed' }, { status: 502 })
  }
}

/** Marker for the server-side copy of the served practice batch. The
 *  grade route matches submitted questions against this row so a
 *  doctored client payload can't smuggle its own answer key. */
const PRACTICE_CACHE_MARKER = '[practice-v1]'

/** Persist the batch we just served, replacing any prior batch for the
 *  session ("Practice more" swaps the whole set). Non-fatal on failure
 *  — the grade route falls back to legacy behavior when no row exists. */
async function cacheServedBatch(sessionId: string, questions: unknown[]): Promise<void> {
  try {
    await supabaseAdmin
      .from('study_messages')
      .delete()
      .eq('session_id', sessionId)
      .like('content', `${PRACTICE_CACHE_MARKER}%`)
    const { error } = await supabaseAdmin
      .from('study_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: PRACTICE_CACHE_MARKER + JSON.stringify({ questions }),
        model: 'practice-cache',
      })
    if (error) console.error('[practice/generate] batch cache write failed', error)
  } catch (e) {
    console.error('[practice/generate] batch cache write failed', e)
  }
}
