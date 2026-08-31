import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { assembleFromBank, assembleToeflFromBank, assembleAdmissionSection, type ToeflSection } from '@/lib/study/assemble'
import { ADMISSION_BLUEPRINT } from '@/lib/study/admission-tests'
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

export async function POST(req: NextRequest) {
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
  const family = body.family === 'toefl' ? 'toefl'
    : body.family === 'ssat' ? 'ssat'
    : body.family === 'isee' ? 'isee'
    : 'sat'
  const isToefl = family === 'toefl'
  const isAdmission = family === 'ssat' || family === 'isee'

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
    ? ADMISSION_BLUEPRINT[family].find(b => b.key === body.section && b.bankSection !== null)
    : null
  const section = isToefl
    ? (TOEFL_SECTIONS.includes(body.section as ToeflSection) ? (body.section as ToeflSection) : null)
    : isAdmission
      ? (block ? block.key : null)
      : (body.section === 'math' || body.section === 'reading_writing' ? body.section : null)
  if (!section) {
    const valid = isToefl ? 'reading, listening, writing or speaking'
      : isAdmission
        ? ADMISSION_BLUEPRINT[family].filter(b => b.bankSection).map(b => b.key).join(', ')
        : 'math or reading_writing'
    return NextResponse.json({ error: `section must be ${valid}` }, { status: 400 })
  }
  /** What the BANK is queried by. Equal to `section` except on SSAT/ISEE. */
  const bankSection = block ? block.bankSection! : section

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
  const adaptive = isAdmission ? false
    : isToefl ? (toeflCfg != null && body.adaptive !== false)
    : body.adaptive === true
  // The block's published question count, NOT body.count: the whole point
  // of a fixed-form test is that the caller does not choose its length.
  const count = isAdmission ? block!.questions
    : isToefl ? 0
    : adaptive
      ? SAT_MODULE_CONFIG[section as 'math' | 'reading_writing'].moduleSize
      : Math.min(Math.max(Number(body.count) || 22, 5), 54)
  // Journey section-test nodes tag their sessions so the path page can
  // track per-node completion (config.pathNode → node id).
  const pathNode = typeof body.pathNode === 'string' && body.pathNode.length <= 64 ? body.pathNode : null

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
    const [{ count: poolSize }, { data: seenRows }] = await Promise.all([
      dbAdmin
        .from('study_item_bank')
        .select('id', { count: 'exact', head: true })
        .eq('family', family).eq('section', bankSection)
        .eq('verified', true).eq('archived', false),
      dbAdmin
        .from('study_item_exposures')
        .select('item_id, item:study_item_bank!inner(family, section)')
        .eq('student_id', user.id)
        .eq('item.family', family)
        .eq('item.section', bankSection),
    ])
    const input = { poolSize: poolSize ?? 0, seen: seenRows?.length ?? 0, needed: count }
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

  // Assemble from the bank. Seed with the (not-yet-created) session id so
  // the shuffle is stable per session; fall back to a fresh session first.
  const { data: sess, error: sessErr } = await dbAdmin
    .from('study_sessions')
    .insert({
      student_id: user.id, topic_id: SECTION_TOPIC[family][section], mode: 'full_test',
      status: 'active', language: 'en', generation_status: 'ready',
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
            ...(body.count ? { maxItems: Number(body.count) } : {}),
            // Single-domain drill (path per-question-type stops).
            ...(body.domain ? { domain: String(body.domain) } : {}),
          },
          sess.id,
        )
      : isAdmission
        ? await assembleAdmissionSection(
            { family, sectionKey: section, studentId: user.id },
            sess.id,
          )
        // SAT Module 1 is mixed difficulty → no difficulty filter, blueprint-weighted.
        : await assembleFromBank({ section: section as 'math' | 'reading_writing', count, studentId: user.id }, sess.id)
  } catch (e) {
    // Not enough verified items for this section — roll back the session.
    // Delete error intentionally ignored: the credits are already back, so
    // the worst case is an empty session row that carries no questions and
    // gets swept by cleanupAbandonedPracticeSessions.
    if (creditCost > 0) await refundTestCredits(user.id, sess.id, creditCost)
    await dbAdmin.from('study_sessions').delete().eq('id', sess.id)
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
    if (creditCost > 0) await refundTestCredits(user.id, sess.id, creditCost)
    await dbAdmin.from('study_sessions').delete().eq('id', sess.id)
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
