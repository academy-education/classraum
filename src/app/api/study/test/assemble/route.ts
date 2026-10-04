import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { assembleFromBank, assembleToeflFromBank, assembleAdmissionSection, assembleActSection, type ToeflSection } from '@/lib/study/assemble'
import { ADMISSION_BLUEPRINT } from '@/lib/study/admission-tests'
import { ACT_BLUEPRINT, type ActSectionKey } from '@/lib/study/act-test'
import { SAT_MODULE_CONFIG } from '@/lib/study/sat-adaptive'
import { toeflAdaptiveConfig } from '@/lib/toefl-adaptive'
import { requireStudyUser } from '@/lib/study/auth'
import { trackEvent } from '@/lib/study/analytics'
import { creditCostForTest } from '@/lib/study/plans'
import { assessCoverage, itemsShortBy } from '@/lib/study/bank-coverage'
import { reserveTestCredits, refundTestCredits } from '@/lib/study/credits'
import { canAccessTest } from '@/lib/study/entitlements'
import { isShippedTestFamily } from '@/lib/study/shipped-tests'
import { SECTION_TOPIC } from '@/lib/study/section-topics'
import { resolvePathTestNode } from '@/lib/study-path'
import { raiseAlert } from '@/lib/ops/alert'
import { withApiFailureLogging } from '@/lib/ops/api-failure'

/**
 * POST /api/study/test/assemble — build a full-test session from the
 * pre-verified item bank instead of generating one live.
 *
 * Unlike /generate this is INSTANT (a DB query, not a 12-minute model
 * run). Since the 2026-07 credit relaunch, bank-assembled mock tests
 * consume credits like every other full test (SAT R&W / Math = 2 each;
 * TOEFL Reading/Writing = 1, Speaking/Listening = 2; see
 * creditCostForTest). Journey path-node sessions stay free — they're
 * the StudyPath progression loop, not standalone mocks.
 *
 * Serves two families, both bank-only (no AI top-up):
 *   • SAT (math / reading_writing) — domain-blueprint draw, optionally
 *     two-module adaptive (Module 1 here; Module 2 via /route).
 *   • TOEFL (reading / listening / writing / speaking) — task-type
 *     blueprint draw. Reading + Listening are two-module adaptive like
 *     SAT (Module 1 here; the routed Module 2 via /route); Writing and
 *     Speaking are LINEAR per ETS's Jan-2026 blueprint and draw whole.
 *     Item types include Complete-the-Words, Build-a-Sentence,
 *     Listen-and-Repeat, Interview, Email and Academic Discussion; the
 *     cached payload is identical in shape to the live TOEFL
 *     generator's, so TestSession + submit grading serve it unchanged.
 *
 * Writes the assembled payload as the same `[full-test-v1]` cache row
 * the generator emits, so the existing TestSession UI + submit grading
 * serve it unchanged.
 */

export const dynamic = 'force-dynamic'

const CACHED_TEST_MARKER = '[full-test-v1]'

// family → section → seed topic map now lives in
// src/lib/study/section-topics.ts (shared with the camp start route).

const TOEFL_SECTIONS: ToeflSection[] = ['reading', 'listening', 'writing', 'speaking']

async function handlePOST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  // Each call creates a session AND burns up to 54 exposure-ledger
  // rows before the test is even opened — keep retry loops in check.
  const blocked = enforceRateLimit(
    `test-assemble:user:${user.id}`,
    { windowMs: 60 * 1000, max: 6 },
  )
  if (blocked) return blocked

  let body: { family?: string; section?: string; count?: number; pathNode?: string; adaptive?: boolean; creditSource?: 'pass' | 'regular'; domain?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  // Family drives everything downstream: which sections are valid, which
  // topic the session attaches to, credit cost, access gating, and which
  // assembler runs. Defaults to 'sat' for back-compat with older clients
  // that only sent `section`.
  //
  // A path stop knows its own family. Path-page builds before 2026-10-04
  // sent no family, so a TOEFL stop defaulted to 'sat' and was rejected as
  // a bad SAT section; an omitted family on a real stop now comes from the
  // stop. An explicit family is still checked against it below.
  const stopFamily = !body.family && typeof body.pathNode === 'string'
    ? resolvePathTestNode(body.pathNode)?.family
    : undefined
  const requestedFamily = body.family ?? stopFamily
  const family = requestedFamily === 'toefl' ? 'toefl'
    : requestedFamily === 'ssat' ? 'ssat'
    : requestedFamily === 'isee' ? 'isee'
    : requestedFamily === 'act' ? 'act'
    : 'sat'
  const isToefl = family === 'toefl'
  const isAdmission = family === 'ssat' || family === 'isee'
  /* ACT is linear with a published blueprint, like SSAT/ISEE, and the
     request's `section` is likewise a BLUEPRINT KEY ('english', 'math',
     'reading', 'science'). bankSection comes from the blueprint, never
     from the client - same server-authoritative rule as admission. */
  const isAct = family === 'act'

  /*
   * For SSAT/ISEE the request's `section` is a BLUEPRINT BLOCK KEY
   * ('quant1', 'mathach', …), not a bank section. The two differ because
   * both tests deliver two separate blocks that draw from the same bank
   * section, and every downstream consumer needs the right one:
   *   - the topic map and credit table are keyed by BLOCK
   *   - the bank query and the exposure/coverage gate need BANK SECTION
   * Conflating them would charge and attribute two SSAT quant sittings as
   * one, and would size the coverage gate against the wrong pool.
   */
  const block = isAdmission
    ? ADMISSION_BLUEPRINT[family as 'ssat' | 'isee'].find(b => b.key === body.section && b.bankSection !== null)
    : null
  // Multiple-choice ACT sections only: the essay is free-response and
  // has no bank draw, so 'writing' is rejected here rather than reaching
  // the assembler to throw.
  const actBlock = isAct
    ? ACT_BLUEPRINT.find(b => b.key === body.section && b.bankSection !== null && b.choiceCount > 0)
    : null
  const section = isToefl
    ? (TOEFL_SECTIONS.includes(body.section as ToeflSection) ? (body.section as ToeflSection) : null)
    : isAdmission
      ? (block ? block.key : null)
      : isAct
        ? (actBlock ? actBlock.key : null)
        : (body.section === 'math' || body.section === 'reading_writing' ? body.section : null)
  if (!section) {
    const valid = isToefl ? 'reading, listening, writing or speaking'
      : isAdmission
        ? ADMISSION_BLUEPRINT[family as 'ssat' | 'isee'].filter(b => b.bankSection).map(b => b.key).join(', ')
        : isAct
          ? ACT_BLUEPRINT.filter(b => b.bankSection && b.choiceCount > 0).map(b => b.key).join(', ')
          : 'math or reading_writing'
    return NextResponse.json({ error: `section must be ${valid}` }, { status: 400 })
  }
  /** What the BANK is queried by. Equal to `section` except on SSAT/ISEE/ACT. */
  const bankSection = block ? block.bankSection! : actBlock ? actBlock.bankSection! : section

  // Test-scoped access: block a pass holder scoped to a different test
  // before any session/credit work. Free/plan/all-access users pass
  // through (canAccessTest returns true for them).
  if (!(await canAccessTest(user.id, family))) {
    return NextResponse.json({ error: 'test not unlocked', code: 'test_locked', test: family }, { status: 403 })
  }
  // Shipped-family gate — same rule the generate route enforces, so both
  // entry points agree on what we actually support. A family without an
  // item bank cannot be assembled anyway; failing here gives a clear
  // reason instead of "no verified items".
  if (!isShippedTestFamily(family)) {
    return NextResponse.json(
      { error: 'test not available yet', code: 'test_coming_soon', test: family },
      { status: 403 },
    )
  }

  // Journey path stops are FREE (creditCost 0 below), so the stop is
  // resolved against the path definitions, never trusted from the body.
  // A free-form pathNode with a body-chosen count was a free 54-question
  // mock, repeatable with a fresh id each time.
  let pathDef: ReturnType<typeof resolvePathTestNode> = null
  if (body.pathNode !== undefined && body.pathNode !== null) {
    pathDef = resolvePathTestNode(typeof body.pathNode === 'string' ? body.pathNode : null)
    if (!pathDef || pathDef.family !== family || pathDef.section !== section) {
      return NextResponse.json({ error: 'unknown path stop', reason: 'bad_path_node' }, { status: 400 })
    }
  }
  const pathNode = pathDef ? pathDef.node.id : null

  // Adaptive tests draw ONLY Module 1 here (fixed module size, mixed
  // difficulty); Module 2 is drawn by /api/study/test/route after the
  // student finishes and is graded on Module 1.
  //   • SAT — opt-in per request (body.adaptive).
  //   • TOEFL Reading/Listening — adaptive is the SHAPE of the section
  //     on the real exam (two modules, module 2 branches), so it's on
  //     by default; a caller can still opt out with adaptive:false.
  //   • TOEFL Writing/Speaking — LINEAR per ETS's Jan-2026 blueprint
  //     (Note 5): everyone gets the same tasks. Never adaptive; the
  //     assembler draws the whole section at once from its task-type
  //     blueprint (count is ignored; see TOEFL_META).
  const toeflCfg = isToefl ? toeflAdaptiveConfig(section) : null
  // SSAT and ISEE are LINEAR — the published formats are fixed blocks with
  // fixed clocks, with no module branching to model. `adaptive` is forced
  // off rather than left to the caller so a stray adaptive:true cannot
  // halve a section and silently change the test's shape.
  // A path stop (SAT or TOEFL) is a fixed-length linear set; adaptive
  // would append a free Module 2 — on a TOEFL drill, a whole module after
  // a 3-item stop. Checked before the TOEFL default-on below.
  const adaptive = (isAdmission || isAct) ? false
    : pathDef ? false
    : isToefl ? (toeflCfg != null && body.adaptive !== false)
    : body.adaptive === true
  // The block's published question count, NOT body.count: the whole point
  // of a fixed-form test is that the caller does not choose its length.
  const count = isAdmission ? block!.questions
    : isAct ? actBlock!.questions
    : isToefl ? 0
    : adaptive
      ? SAT_MODULE_CONFIG[section as 'math' | 'reading_writing'].moduleSize
      : pathDef
        ? (pathDef.node.questionCount ?? 22)
        : Math.min(Math.max(Number(body.count) || 22, 5), 54)
  // Journey section-test nodes tag their sessions so the path page can
  // track per-node completion (config.pathNode → node id; resolved above).
  /** Length / domain the draw uses: the path stop's own, for a free stop. */
  const drawMaxItems = pathDef ? pathDef.node.questionCount : (body.count ? Number(body.count) : undefined)
  const drawDomain = pathDef ? pathDef.node.domain : (body.domain ? String(body.domain) : undefined)

  // No single-stop repeats on the path: once a node has a completed
  // unarchived session, it's terminal. The only way back in is the
  // whole-path repeat (POST /api/study/path/repeat), which archives
  // the old run's sessions and thereby clears this check.
  if (pathNode) {
    const { data: done } = await dbAdmin
      .from('study_sessions')
      .select('id')
      .eq('student_id', user.id)
      .eq('archived', false)
      .eq('status', 'completed')
      .eq('config->>pathNode', pathNode)
      .limit(1)
    if (done && done.length > 0) {
      return NextResponse.json(
        { error: 'path stop already completed', reason: 'node_completed' },
        { status: 409 },
      )
    }
  }

  /* Exhaustion gate — BEFORE the session insert and the credit reserve.
   *
   * The draw recycles oldest-seen items once the unseen pool runs dry.
   * That is right for a student who has seen most of a section, and
   * wrong once they have seen all of it: the "new" mock is then entirely
   * questions they have already answered, its score measures memory
   * rather than skill, and it costs 1-2 credits. Charging for a replay
   * is the part that makes this a correctness bug and not a preference.
   *
   * Order matters. Placed after the insert this would have to delete the
   * session and refund; placed here it simply never starts. */
  {
    const [{ count: poolSize }, { count: seenCount }] = await Promise.all([
      dbAdmin
        .from('study_item_bank')
        .select('id', { count: 'exact', head: true })
        .eq('family', family).eq('section', bankSection)
        .eq('verified', true).eq('archived', false),
      dbAdmin
        .from('study_item_exposures')
        // HEAD count, not rows.length: a rows read is capped at 1000 by
        // PostgREST, so a student with >1000 exposures in this section
        // was under-counted and let into a test of items they had seen
        // (2026-10-02). The !inner join filters the count too.
        .select('item_id, item:study_item_bank!inner(family, section)', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('item.family', family)
        .eq('item.section', bankSection),
    ])
    const input = { poolSize: poolSize ?? 0, seen: seenCount ?? 0, needed: count }
    const coverage = assessCoverage(input)
    if (!coverage.ok) {
      return NextResponse.json({
        error: coverage.reason === 'no_bank_coverage'
          ? 'no questions banked for this section yet'
          : 'you have seen every question we have for this section',
        reason: coverage.reason,
        unseen: coverage.unseen,
        shortBy: itemsShortBy(input),
      }, { status: 409 })
    }
  }

  // The session's language drives every piece of test-screen chrome
  // (Pause, module badge, the result page's scale note). It was hardcoded
  // 'en' here, so a Korean student sat a bank test in English chrome while
  // the rest of the app was Korean (found in the 2026-09-02 store-screenshot
  // review). Bank items themselves stay English; only the chrome follows.
  const { data: langPref } = await dbAdmin
    .from('user_preferences').select('language').eq('user_id', user.id).maybeSingle()
  const sessionLanguage = langPref?.language === 'korean' ? 'ko' : 'en'

  // Assemble from the bank. Seed with the (not-yet-created) session id so
  // the shuffle is stable per session; fall back to a fresh session first.
  const { data: sess, error: sessErr } = await dbAdmin
    .from('study_sessions')
    .insert({
      student_id: user.id, topic_id: SECTION_TOPIC[family][section], mode: 'full_test',
      status: 'active', language: sessionLanguage, generation_status: 'ready',
      config: { source: 'bank', family, section, ...(adaptive ? { adaptive: true } : {}), ...(pathNode ? { pathNode } : {}) },
    })
    .select('id')
    .single()
  if (sessErr || !sess) return NextResponse.json({ error: 'session create failed' }, { status: 500 })

  // ── Credit reserve ─────────────────────────────────────────────
  // Full mocks cost credits (SAT R&W / Math = 2; TOEFL Reading/Writing
  // = 1, Speaking/Listening = 2). Journey path-node sessions (SAT only)
  // are exempt — the StudyPath loop stays free.
  const creditCost = pathNode ? 0 : creditCostForTest(family, section)
  if (creditCost > 0) {
    // Spend this test's exam-pass credits first unless the student chose 'regular'.
    const credit = await reserveTestCredits(user.id, sess.id, creditCost, family, { skipPass: body.creditSource === 'regular' })
    if (!credit.ok) {
      // Error intentionally ignored on all three rollback deletes below:
      // credits are reserved/refunded independently, so a failed delete
      // only leaves an empty, question-less session in history.
      await dbAdmin.from('study_sessions').delete().eq('id', sess.id)
      void trackEvent(user.id, 'out_of_credits', { reason: credit.reason ?? 'no_credits', kind: `bank_${family}` })
      return NextResponse.json(
        { error: 'no test credits remaining', reason: credit.reason === 'no_subscription' ? 'no_subscription' : 'no_credits' },
        { status: 402 },
      )
    }
  }

  let test
  try {
    test = isToefl
      ? await assembleToeflFromBank(
          {
            section: section as ToeflSection,
            studentId: user.id,
            // Module 1 only for the two adaptive sections; Writing and
            // Speaking keep the whole-section draw.
            ...(adaptive ? { module: 1 as const } : {}),
            /*
             * `count` was accepted from the body but only ever reached
             * the SAT branch, so a TOEFL caller asking for a short run
             * got a full section and no error. The path's Speaking and
             * Writing warmups depend on this.
             */
            ...(drawMaxItems ? { maxItems: drawMaxItems } : {}),
            // Single-domain drill (path per-question-type stops).
            ...(drawDomain ? { domain: drawDomain } : {}),
          },
          sess.id,
        )
      : isAdmission
        ? await assembleAdmissionSection(
            { family: family as 'ssat' | 'isee', sectionKey: section, studentId: user.id },
            sess.id,
          )
      : isAct
        ? await assembleActSection(
            { sectionKey: section as ActSectionKey, studentId: user.id },
            sess.id,
          )
        // SAT Module 1 is mixed difficulty → no difficulty filter, blueprint-weighted.
        : await assembleFromBank({ section: section as 'math' | 'reading_writing', count, studentId: user.id }, sess.id)
  } catch (e) {
    // Not enough verified items for this section — roll back the session.
    // Delete error intentionally ignored: the credits are already back, so
    // the worst case is an empty session row that carries no questions and
    // gets swept by cleanupAbandonedPracticeSessions.
    await rollBack(user.id, sess.id, creditCost, family, section, 'assemble threw')
    return NextResponse.json({ error: (e as Error).message, reason: 'bank_empty' }, { status: 409 })
  }

  // For adaptive sessions the cached payload carries the module-break
  // index (= Module 1 length) and a combined timer across both modules;
  // /route appends Module 2 to this same row after routing.
  const perModuleMinutes = adaptive
    ? (toeflCfg
        ? toeflCfg.minutesPerModule
        : SAT_MODULE_CONFIG[section as 'math' | 'reading_writing'].minutesPerModule)
    : 0
  const payload = adaptive
    ? {
        ...test,
        adaptive: true,
        sectionKey: section,
        moduleBreakIdx: test.questions.length,
        totalModules: 2,
        // Per-module timing: each module gets its own countdown. The
        // combined value is kept for any legacy/whole-test reader.
        perModuleMinutes,
        timeLimitMinutes: 2 * perModuleMinutes,
      }
    : test

  const { error: cacheErr } = await dbAdmin
    .from('study_messages')
    .insert({
      session_id: sess.id, role: 'assistant',
      content: CACHED_TEST_MARKER + JSON.stringify(payload), model: 'bank-assembled',
    })
  if (cacheErr) {
    // Same rollback as above — delete error intentionally ignored, since
    // the credits are already refunded and the leftover row holds no test.
    await rollBack(user.id, sess.id, creditCost, family, section, 'cache write failed')
    return NextResponse.json({ error: 'cache write failed' }, { status: 500 })
  }
  // Error intentionally ignored: the title is cosmetic (the cached payload
  // carries the authoritative one) and the test is already fully usable.
  await dbAdmin.from('study_sessions').update({ title: test.title }).eq('id', sess.id)

  // Funnel: a bank-assembled test started — the usual first test for a
  // new user, so key for activation.
  void trackEvent(user.id, 'test_started', { kind: `bank_${family}`, section, creditCost })

  return NextResponse.json({
    sessionId: sess.id,
    title: test.title,
    questionCount: test.questions.length,
    composition: test.composition,
    adaptive,
  })
}

/**
 * Undo a start that reserved credits but produced no test: refund, then
 * delete the question-less session.
 *
 * The refund result used to be discarded. refundTestCredits does not throw
 * — an errored slice just dropped out of its totals — so a failed refund
 * followed by the delete left the student debited with no session row, no
 * reaper coverage (it only sees 'pending' generations) and no signal. (The
 * ledger holds 13 unrefunded debits from July whose session no longer exists
 * — the shape this produces, though their origin is not proven.) Now a slice
 * that did not come back pages, carrying the session id the admin refund tool needs
 * (POST /api/admin/study/sessions/refund-credits takes studentId for a
 * deleted session).
 */
async function rollBack(studentId: string, sessionId: string, cost: number, family: string, section: string, why: string) {
  if (cost > 0) {
    const r = await refundTestCredits(studentId, sessionId, cost)
    if (r.failed > 0) {
      await raiseAlert({
        severity: 'critical',
        title: 'Study credits debited for a test that was never delivered',
        message:
          `${r.failed} of ${cost} credit slice(s) could not be refunded after a bank test ` +
          `failed to start (${why}). Refund with POST /api/admin/study/sessions/refund-credits ` +
          `{ sessionId: "${sessionId}", studentId: "${studentId}" }.`,
        dedupeKey: `study-assemble-refund-failed:${sessionId}`,
        context: { studentId, sessionId, cost, family, section, why, ...r },
      })
    }
  }
  // Error intentionally ignored: the leftover row holds no test, and the
  // credits are either back or paged above.
  await dbAdmin.from('study_sessions').delete().eq('id', sessionId)
}

// Every non-2xx is recorded to error_logs and alerts when it spreads (src/lib/ops/api-failure.ts).
export const POST = withApiFailureLogging('study/test/assemble', handlePOST)
