import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { loadStudyPromptContext } from '@/lib/study-prompt-context'
import { drawBankPractice } from '@/lib/study/assemble'
import { requireStudyUser } from '@/lib/study/auth'
import { canAccessTest } from '@/lib/study/entitlements'
import { spendEnergy, cleanupAbandonedPracticeSessions } from '@/lib/study/practice-quota'
import { PATH_STOP_QUESTION_COUNT, PRACTICE_SESSION_QUESTION_COUNT } from '@/lib/study-path'

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
    : Math.max(3, Math.min(10, config.questionCount ?? body.count ?? PRACTICE_SESSION_QUESTION_COUNT))

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

  // ── Resolve bank coverage + access FIRST (before spending energy) ─
  // Ordering matters: energy must only be charged for a draw we can
  // actually serve. Resolving coverage/access up front means a topic
  // with no practice bank (e.g. TOEFL Listening/Speaking/Writing — only
  // SAT + TOEFL Reading are banked for practice today) never burns the
  // student's energy or leaves a lingering 0-attempt "practice" session
  // on the shelf / history.
  //
  // Section comes from the locale-independent SLUG (ctx.testSection is a
  // localized display name — matching it against /math/i once served R&W
  // to Korean-language Math sessions).
  const lang = session.language as 'en' | 'ko'
  let bankFamily: 'sat' | 'toefl' = 'sat'
  let bankSection: 'math' | 'reading_writing' | 'reading' | null = null
  let accessBlockedFamily: string | null = null
  if (session.topic_id) {
    const ctx = await loadStudyPromptContext(session.topic_id, lang)
    if (ctx?.testFamily === 'sat') {
      bankFamily = 'sat'
      bankSection = ctx.topicSlug === 'sat-math' ? 'math' : 'reading_writing'
    } else if (ctx?.testFamily === 'toefl' && ctx.topicSlug === 'toefl-reading') {
      // TOEFL Reading is the one non-SAT section with a practice-eligible
      // multiple-choice bank (~500 verified items). The other TOEFL
      // sections need audio (Listening) or free-response grading
      // (Speaking/Writing), so they stay bank-full-test-only.
      bankFamily = 'toefl'
      bankSection = 'reading'
    }
    // Test-scoped access: family = topicSlug prefix before '-'. Block a
    // pass holder scoped to a different test. Fail open when the slug is
    // missing/unresolvable (free/plan users always pass).
    const family = ctx?.topicSlug ? ctx.topicSlug.split('-')[0]?.toLowerCase() : null
    if (family && !(await canAccessTest(user.id, family))) accessBlockedFamily = family
  }

  // Any path that can't serve a batch deletes the just-created empty
  // session so it never shows up as a recent/abandoned practice set, and
  // returns WITHOUT charging energy.
  const bailUnserveable = async (payload: object, status: number) => {
    await supabaseAdmin.from('study_sessions').delete().eq('id', session.id).eq('student_id', user.id)
    return NextResponse.json(payload, { status })
  }
  if (accessBlockedFamily) {
    return bailUnserveable({ error: 'test not unlocked', code: 'test_locked', test: accessBlockedFamily }, 403)
  }
  // No bank coverage → no questions, no energy, no lingering session.
  // (Previously this fell through to a paid AI generation; that path is
  // intentionally gone.)
  if (!bankSection) {
    return bailUnserveable({ questions: [], reason: 'no_bank_coverage' }, 200)
  }

  // ── Energy ─────────────────────────────────────────────────────
  // Starting a practice or flashcards set spends 1 energy; energy regens
  // over time up to a cap (free +1/8h→3, paid +1/3h→8). Path stops spend
  // too; only the daily challenge is exempt. This runs only for a FRESH
  // draw — resumes returned from cache above, so the spend is once per set
  // — AND only after coverage is confirmed, so a no-coverage tap is free.
  if (!config.dailyChallenge) {
    const spend = await spendEnergy(user.id)
    if (!spend.ok) {
      // The just-created empty session never served a batch — delete it
      // so an unused set doesn't linger on the shelf or in history.
      await supabaseAdmin.from('study_sessions').delete().eq('id', session.id).eq('student_id', user.id)
      return NextResponse.json(
        { error: 'out of energy', reason: 'no_energy', cap: spend.state.cap, nextRefillSeconds: spend.state.nextRefillSeconds },
        { status: 429 },
      )
    }
    // Sweep the student's other abandoned (0-attempt) practice sessions.
    void cleanupAbandonedPracticeSessions(user.id, session.id)
  }

  try {
    const seed = config.dailyChallenge
      ? `daily:${config.dailyChallenge}:${bankSection}`
      : `session:${session.id}`
    const questions = await drawBankPractice({
      family: bankFamily,
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
