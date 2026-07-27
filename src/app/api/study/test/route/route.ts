import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dbAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import {
  toeflAdaptiveConfig,
  computeToeflRoute,
  difficultiesForToeflModule2,
  computeToeflStage2Path,
} from '@/lib/toefl-adaptive'
import {
  SAT_MODULE_CONFIG,
  computeSatRoute,
  difficultiesForModule2,
} from '@/lib/study/sat-adaptive'
import { assembleFromBank, assembleToeflFromBank } from '@/lib/study/assemble'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/test/route — decide module 2 difficulty for an
 * adaptive TOEFL Reading / Listening session.
 *
 * Called by TestSession after the student submits module 1. Reads
 * module 1 answers, grades them against the cached test payload,
 * writes module1_correct / module1_total / module2_route back to
 * study_sessions, DRAWS the routed module 2 from the item bank, appends
 * it to the same `[full-test-v1]` cache row /submit grades against, and
 * returns those questions so the client can continue in place.
 *
 * Grading duplicates the multiple-choice matcher from /submit
 * intentionally — we don't want /submit's full-session side effects
 * (mastery reassessment, completion timestamp) firing at the halfway
 * point.
 */

export const dynamic = 'force-dynamic'

/** Must match the generator's cache-row prefix (generate/route.ts). */
const CACHED_TEST_MARKER = '[full-test-v1]'

const AnswerSchema = z.object({
  index: z.number().int().min(0),
  answer: z.string().nullable().optional(),
})

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  sectionName: z.string(),
  answers: z.array(AnswerSchema).min(1),
})

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(
    `test-route:user:${user.id}`,
    { windowMs: 60 * 1000, max: 20 },
  )
  if (blocked) return blocked

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request', details: parsed.error.flatten() }, { status: 400 })
  }
  const { sessionId, sectionName, answers } = parsed.data

  const { data: session, error: sessErr } = await dbAdmin
    .from('study_sessions')
    .select('id, student_id, module2_route, module1_correct, module1_total')
    .eq('id', sessionId)
    .maybeSingle()
  if (sessErr || !session) {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
  }
  if (session.student_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // The authoritative payload lives in the marker-prefixed assistant
  // message (same row /submit grades against) — study_sessions has no
  // cached_test column.
  const { data: cacheRows } = await dbAdmin
    .from('study_messages')
    .select('content')
    .eq('session_id', sessionId)
    .eq('role', 'assistant')
    .ilike('content', `${CACHED_TEST_MARKER}%`)
    .limit(1)
  let cached:
    | {
        questions?: Array<{ correct_answer?: string | null }>
        moduleBreakIdx?: number | null
        adaptive?: boolean
        family?: string | null
        sectionKey?: string
      }
    | null = null
  if (cacheRows?.[0]) {
    try { cached = JSON.parse(cacheRows[0].content.slice(CACHED_TEST_MARKER.length)) } catch { /* corrupt cache */ }
  }
  const allQuestions = Array.isArray(cached?.questions) ? cached!.questions : []

  // ── SAT bank adaptive: grade Module 1, draw the routed Module 2 ──
  // Detected from the cached payload (not the section-name string) so a
  // mislabeled client request can't skip the branch.
  const satSectionKey: 'reading_writing' | 'math' | null =
    cached?.sectionKey === 'math' || cached?.sectionKey === 'reading_writing'
      ? cached.sectionKey
      : null
  if (cached?.adaptive === true && satSectionKey) {
    const sectionKey = satSectionKey
    const breakIdx = (typeof cached.moduleBreakIdx === 'number' && cached.moduleBreakIdx > 0)
      ? cached.moduleBreakIdx
      : SAT_MODULE_CONFIG[sectionKey].moduleSize

    // Idempotent: once routed, Module 2 is already appended to the
    // cache — return the same decision + the same M2 questions so a
    // double-tap doesn't draw a second (different) module.
    if (session.module2_route) {
      return NextResponse.json({
        route: session.module2_route,
        module1Correct: session.module1_correct ?? null,
        module1Total: session.module1_total ?? breakIdx,
        module2Questions: allQuestions.slice(breakIdx),
        alreadyRouted: true,
      })
    }

    const module1Questions = allQuestions.slice(0, breakIdx)
    if (module1Questions.length < Math.min(breakIdx, 3)) {
      return NextResponse.json(
        { error: 'insufficient_questions', have: module1Questions.length, need: breakIdx },
        { status: 409 },
      )
    }

    const correct = gradeMultipleChoice(module1Questions, answers)
    const route = computeSatRoute(correct, module1Questions.length)

    // CLAIM-then-draw — the same arbitration the TOEFL branch uses below,
    // and for the same reason. This used to draw first and write
    // module2_route LAST (a non-conditional update whose failure was only
    // logged), so two concurrent requests — a double-tap, or the tap
    // racing the module-1 timeout auto-route — both read a null route
    // above and both appended a Module 2 to the same cache row. The
    // client only ever holds ONE of them, so the resulting cache is
    // longer than the client's array and /submit rejects the finished
    // test with "submitted question count does not match the served
    // test" (submit/route.ts:170). The `module2_route IS NULL` predicate
    // makes the write the single point of arbitration: the loser matches
    // zero rows and replays the winner's Module 2.
    const { data: satClaimed } = await dbAdmin
      .from('study_sessions')
      .update({ module1_correct: correct, module1_total: module1Questions.length, module2_route: route })
      .eq('id', sessionId)
      .is('module2_route', null)
      .select('id')
    if (!satClaimed || satClaimed.length === 0) {
      const { data: freshRows } = await dbAdmin
        .from('study_messages')
        .select('content')
        .eq('session_id', sessionId)
        .eq('role', 'assistant')
        .ilike('content', `${CACHED_TEST_MARKER}%`)
        .limit(1)
      let fresh: { questions?: unknown[] } | null = null
      if (freshRows?.[0]) {
        try { fresh = JSON.parse(freshRows[0].content.slice(CACHED_TEST_MARKER.length)) } catch { /* corrupt */ }
      }
      const { data: s2 } = await dbAdmin
        .from('study_sessions')
        .select('module2_route, module1_correct, module1_total')
        .eq('id', sessionId)
        .maybeSingle()
      return NextResponse.json({
        route: s2?.module2_route ?? route,
        module1Correct: s2?.module1_correct ?? correct,
        module1Total: s2?.module1_total ?? module1Questions.length,
        module2Questions: (fresh?.questions ?? []).slice(breakIdx),
        alreadyRouted: true,
      })
    }

    // Draw Module 2 from the routed difficulty band. Module 1 items are
    // already in the exposure ledger (recorded at assemble) so this draw
    // excludes them; seed with the session id so it's stable on retry.
    let module2
    try {
      module2 = await assembleFromBank(
        {
          section: sectionKey,
          count: SAT_MODULE_CONFIG[sectionKey].moduleSize,
          difficulties: difficultiesForModule2(route),
          studentId: user.id,
        },
        sessionId,
      )
    } catch (e) {
      await releaseClaim(sessionId, 'empty bank')
      return NextResponse.json(
        { error: 'module2_bank_empty', details: (e as Error).message }, { status: 409 },
      )
    }

    // Append Module 2 to the cached payload (same row /submit reads).
    const satModule2 = scopeModule2PassageGroups(module2.questions)
    const merged = { ...cached, questions: [...allQuestions, ...satModule2] }
    const { error: writeErr } = await dbAdmin
      .from('study_messages')
      .update({ content: CACHED_TEST_MARKER + JSON.stringify(merged) })
      .eq('session_id', sessionId)
      .eq('role', 'assistant')
      .ilike('content', `${CACHED_TEST_MARKER}%`)
    if (writeErr) {
      await releaseClaim(sessionId, 'cache write failure')
      return NextResponse.json({ error: 'module2_cache_write_failed' }, { status: 500 })
    }

    return NextResponse.json({
      route,
      module1Correct: correct,
      module1Total: module1Questions.length,
      module2Questions: satModule2,
      alreadyRouted: false,
    })
  }

  // ── TOEFL Reading/Listening two-module adaptive ──────────────────
  // Speaking and Writing are linear (ETS Jan-2026 blueprint, Note 5) →
  // toeflAdaptiveConfig returns null and we no-op.
  const config = toeflAdaptiveConfig(sectionName)
  if (!config) {
    return NextResponse.json({ error: 'not_adaptive', route: null }, { status: 200 })
  }

  // Prefer the payload's own break point — a module-1 draw stamps its
  // exact length there (Reading anchors it after the first
  // Complete-the-Words block, so it is not a clean midpoint).
  const breakIdx = (typeof cached?.moduleBreakIdx === 'number' && cached.moduleBreakIdx > 0)
    ? cached.moduleBreakIdx
    : config.module1Items

  // Real adaptive sessions carry adaptive:true in the cache row and hold
  // ONLY Module 1 until this route draws the rest. Legacy rows (whole
  // section pre-drawn, no adaptive flag) keep the old soft behaviour:
  // grade + record the verdict, but there is nothing to draw.
  const isBankAdaptive = cached?.adaptive === true && cached.family === 'toefl'

  if (session.module2_route) {
    // Idempotent replay: Module 2 is already appended to the same cache
    // row, so hand back the identical decision AND the identical items.
    return NextResponse.json({
      route: session.module2_route,
      module1Correct: session.module1_correct ?? null,
      module1Total: session.module1_total ?? breakIdx,
      ...(isBankAdaptive ? { module2Questions: allQuestions.slice(breakIdx) } : {}),
      alreadyRouted: true,
    })
  }

  const module1Questions = allQuestions.slice(0, breakIdx)
  if (module1Questions.length < Math.min(breakIdx, 3)) {
    return NextResponse.json(
      { error: 'insufficient_questions', have: module1Questions.length, need: breakIdx },
      { status: 409 },
    )
  }

  const correct = gradeMultipleChoice(module1Questions, answers)
  const route = computeToeflRoute(sectionName, correct, module1Questions.length)
  if (!route) {
    return NextResponse.json({ error: 'not_adaptive', route: null }, { status: 200 })
  }

  if (!isBankAdaptive) {
    // Legacy pre-drawn payload — record the verdict only. Nothing is drawn
    // here, so a lost write just means the adaptive verdict never reaches
    // history/analytics; log it rather than 500 a working test.
    const { error: legacyErr } = await dbAdmin
      .from('study_sessions')
      .update({
        module1_correct: correct,
        module1_total: module1Questions.length,
        module2_route: route,
      })
      .eq('id', sessionId)
    if (legacyErr) {
      console.error('[test/route] legacy route verdict not persisted', { sessionId, route, error: legacyErr })
    }

    return NextResponse.json({
      route,
      module1Correct: correct,
      module1Total: module1Questions.length,
      alreadyRouted: false,
    })
  }

  // CLAIM-then-draw. The `module2_route IS NULL` predicate makes the
  // write the single point of arbitration: two concurrent requests (a
  // double-tap, or the tap racing the module-1 timeout auto-route) both
  // read a null route above, but only one UPDATE matches — the loser
  // gets zero rows back and replays the winner's Module 2 instead of
  // drawing and appending a second one.
  const { data: claimed } = await dbAdmin
    .from('study_sessions')
    .update({
      module1_correct: correct,
      module1_total: module1Questions.length,
      module2_route: route,
      module2_claimed_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .is('module2_route', null)
    .select('id')
  if (!claimed || claimed.length === 0) {
    // Lost the race. Re-read the cache the winner just wrote.
    const { data: freshRows } = await dbAdmin
      .from('study_messages')
      .select('content')
      .eq('session_id', sessionId)
      .eq('role', 'assistant')
      .ilike('content', `${CACHED_TEST_MARKER}%`)
      .limit(1)
    let fresh: { questions?: unknown[] } | null = null
    if (freshRows?.[0]) {
      try { fresh = JSON.parse(freshRows[0].content.slice(CACHED_TEST_MARKER.length)) } catch { /* corrupt */ }
    }
    const { data: s2 } = await dbAdmin
      .from('study_sessions')
      .select('module2_route, module1_correct, module1_total, module2_claimed_at')
      .eq('id', sessionId)
      .maybeSingle()

    const module2Questions = (fresh?.questions ?? []).slice(breakIdx)

    // ABANDONED CLAIM.
    //
    // The claim above is correct concurrency control, but it is not
    // self-healing: if the winner died between claiming the route and
    // writing Module 2 into the cache, this branch finds a route with no
    // questions behind it — and returns an EMPTY module 2, forever, on
    // every retry. The student sees a test that simply stops.
    //
    // A live race looks identical for a second or two, so age is what
    // separates them. Past the window, release the claim and let the
    // caller retry; inside it, keep waiting for the winner.
    const RECLAIM_AFTER_MS = 90_000
    const claimedAt = s2?.module2_claimed_at ? Date.parse(s2.module2_claimed_at) : null
    const stale = claimedAt != null && Date.now() - claimedAt > RECLAIM_AFTER_MS
    if (module2Questions.length === 0 && (stale || claimedAt == null)) {
      // claimedAt == null means the claim predates this column — those are
      // by definition old, so treat them as stale rather than stranding
      // sessions that were already broken before the fix.
      console.warn('[test/route] releasing an abandoned module-2 claim', {
        sessionId, claimedAt: s2?.module2_claimed_at ?? null,
      })
      await releaseClaim(sessionId, 'abandoned claim with no module 2 in cache')
      return NextResponse.json(
        { error: 'module2_retry', details: 'the previous attempt did not finish; retry' },
        { status: 409 },
      )
    }

    return NextResponse.json({
      route: s2?.module2_route ?? route,
      module1Correct: s2?.module1_correct ?? correct,
      module1Total: s2?.module1_total ?? module1Questions.length,
      module2Questions,
      alreadyRouted: true,
    })
  }

  // Draw Module 2. TWO independent decisions are passed here:
  //
  //  - `path` picks WHICH ETS Stage 2 module to build. Lower and upper carry
  //    different TASK MIXES (ETS Table 1): lower serves no Academic Talk /
  //    Academic Passage, upper serves no Announcement / Daily Life.
  //  - `difficulties` is a difficulty PREFERENCE within whatever tasks the
  //    path selected, and never filters the query.
  //
  // They are deliberately not collapsed into one value. Doing so would mean
  // a thin bank in one difficulty band silently changed which task types the
  // student saw, which is a content change dressed up as a difficulty one.
  //
  // Module 1's items are already in the exposure ledger (recorded at
  // assemble), so the unseen-first ranking cannot deal them a second time;
  // seeding with the session id keeps the draw stable on retry.
  let module2
  try {
    module2 = await assembleToeflFromBank(
      {
        section: config.bankSection,
        module: 2,
        difficulties: difficultiesForToeflModule2(route),
        path: computeToeflStage2Path(correct, module1Questions.length),
        studentId: user.id,
      },
      sessionId,
    )
  } catch (e) {
    // Release the claim so the student can retry once the bank is
    // seeded, rather than being stranded with a route and no Module 2.
    await releaseClaim(sessionId, 'empty bank')
    return NextResponse.json(
      { error: 'module2_bank_empty', details: (e as Error).message }, { status: 409 },
    )
  }

  // Append Module 2 to the cached payload — the SAME row /submit grades
  // against. `allQuestions` is Module 1 verbatim, so this never reorders
  // or rewrites it, and the scored-item accounting is unchanged.
  const toeflModule2 = scopeModule2PassageGroups(module2.questions)
  const merged = { ...cached, questions: [...allQuestions, ...toeflModule2] }
  const { error: writeErr } = await dbAdmin
    .from('study_messages')
    .update({ content: CACHED_TEST_MARKER + JSON.stringify(merged) })
    .eq('session_id', sessionId)
    .eq('role', 'assistant')
    .ilike('content', `${CACHED_TEST_MARKER}%`)
  if (writeErr) {
    // Same stranding risk as the bank-empty path above.
    await releaseClaim(sessionId, 'cache write failure')
    return NextResponse.json({ error: 'module2_cache_write_failed' }, { status: 500 })
  }

  return NextResponse.json({
    route,
    module1Correct: correct,
    module1Total: module1Questions.length,
    module2Questions: toeflModule2,
    alreadyRouted: false,
  })
}

/** Give up a won `module2_route` claim after the draw or the cache
 *  append failed, so the student can retry instead of being stranded
 *  with a route and no Module 2. If the release itself fails they ARE
 *  stranded — the replay path hands back an empty Module 2 forever — so
 *  it must not be silent. */
async function releaseClaim(sessionId: string, why: string): Promise<void> {
  const { error } = await dbAdmin
    .from('study_sessions')
    // Clear the timestamp with the route — a released claim must not look
    // like a fresh one to the staleness check.
    .update({ module2_route: null, module2_claimed_at: null })
    .eq('id', sessionId)
  if (error) {
    console.error(`[test/route] claim release failed after ${why}`, { sessionId, error })
  }
}

/**
 * Namespace every Module-2 `passageGroupId` so a passage set can never
 * span the module break.
 *
 * Module 2 is drawn from the same bank as Module 1 and only excludes
 * Module 1's ITEMS (via the exposure ledger) — never its passage
 * GROUPS. So the routed draw routinely returns further items carrying a
 * groupId Module 1 already used. Once appended, the client's grouper
 * (`passageGroupInfo`, mobile/study/session/[id]/test/helpers.tsx:85)
 * scans the WHOLE questions array by groupId, so those Module-1 and
 * Module-2 items are counted as ONE passage set: the student is told
 * "question 3 of 5 in this passage" on a Module-2 item whose two
 * siblings are behind a locked module break, and (because the bank
 * stores a different passage per item under the same group id) the
 * passage pane changes underneath the counter.
 *
 * Observed live: session bbe2f56d-c1bb-4e00-9f02-45458546d02c has group
 * `academic-1` at Module-1 indices 5,6 and Module-2 indices 16,17,18.
 *
 * A cross-module group is never legitimate — Module 1 is read-only once
 * Module 2 starts (TestSession.tsx:1199) — so the suffix costs nothing
 * and grouping WITHIN Module 2 is preserved. Ungrouped items are left
 * exactly as drawn. Note this does NOT fix same-group-different-passage
 * corruption inside one module; that is a bank-data problem.
 */
function scopeModule2PassageGroups<T extends { passageGroupId?: string | null }>(questions: T[]): T[] {
  return questions.map(q =>
    typeof q.passageGroupId === 'string' && q.passageGroupId !== ''
      ? { ...q, passageGroupId: `${q.passageGroupId}#m2` }
      : q,
  )
}

/** Count correct multiple-choice answers against a question slice.
 *  Shared by the SAT and TOEFL branches; case/space-insensitive. */
function gradeMultipleChoice(
  questions: Array<{ correct_answer?: string | null }>,
  answers: Array<{ index: number; answer?: string | null }>,
): number {
  let correct = 0
  for (const a of answers) {
    if (a.index >= questions.length) continue
    const q = questions[a.index]
    if (!q || typeof a.answer !== 'string') continue
    const key = String(q.correct_answer ?? '').trim().toLowerCase()
    if (!key) continue
    if (a.answer.trim().toLowerCase() === key) correct++
  }
  return correct
}
