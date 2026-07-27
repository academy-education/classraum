import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import type { Json } from '@/lib/database.types'
import { verifyCronAuth } from '@/lib/cron-auth'
import { refundTestCredits } from '@/lib/study/credits'
import { markTestReadyAndNotify, notifyTestGenerationFailed } from '@/lib/study/test-generation-status'
import { recordHeartbeat } from '@/lib/ops/heartbeat'

/**
 * Stale full-test generation reaper.
 *
 * /api/study/test/generate debits the student's credits BEFORE it spends
 * a single model token, then flips study_sessions.generation_status to
 * 'pending'. Its own finally now settles the row on every in-process
 * outcome (throw, early return, client disconnect) — but a process that
 * is KILLED runs no finally at all. Vercel terminating the invocation at
 * maxDuration, an OOM, or a deploy landing mid-generation all leave the
 * row 'pending' forever with the credit spent and no test to show for
 * it. Nothing in-process can ever clean that up, which is exactly why
 * this runs out-of-band.
 *
 * Every 10 minutes:
 *   - find full_test sessions still 'pending' whose generation started
 *     more than STALE_MS ago (the generator's ceiling is 300s, so this
 *     can never catch a healthy run);
 *   - if the generated test actually landed in study_messages (the
 *     [full-test-v1] cache row — the same row the generate route, the
 *     resume path and the submit grader read), the run finished and
 *     only the status write was lost: mark it 'ready'. NEVER refund a
 *     student who actually got their test;
 *   - otherwise mark it 'failed' and refund, using the cost/family the
 *     generator persisted into config at reserve time.
 *
 * Refunds are idempotent end-to-end: refund_study_credit no-ops once a
 * refund ledger row exists for the slice, so a row reaped here and later
 * touched by the route cannot pay out twice. Marking 'failed' also takes
 * the row out of this query, so a repeat run is a no-op.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Must stay >= GENERATION_STALE_MS in the generate route, otherwise the
 *  reaper would refund a run that route still considers live (and would
 *  hand back a credit that the fall-through regeneration then spends). */
const STALE_MS = 12 * 60 * 1000
/** Same marker the generate route writes/reads. */
const CACHED_TEST_MARKER = '[full-test-v1]'
/** Pending rows are naturally few (bounded by live generations); this is
 *  a runaway guard, not a paging scheme. Oldest first so a backlog can
 *  never starve the genuinely stuck rows. */
const MAX_PER_RUN = 100

/** The object form of a jsonb value — `Json` itself also admits scalars. */
type JsonObject = { [key: string]: Json | undefined }

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Heartbeat timing starts past the auth guard — a 401'd request never
  // ran the job, so nothing below may report on its behalf.
  const startedAt = Date.now()

  const { data: rows, error } = await dbAdmin
    .from('study_sessions')
    .select('id, student_id, created_at, config, language')
    .eq('mode', 'full_test')
    .eq('generation_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(MAX_PER_RUN)
  if (error) {
    console.error('[cron/study-reap-stuck-generations] list failed', error)
    // Nothing was reaped, so no student got their credit back — recorded
    // explicitly because this branch returns rather than throws.
    await recordHeartbeat(
      'study-reap-stuck-generations',
      { ok: false, detail: { stage: 'list', error: error.message } },
      Date.now() - startedAt,
    )
    return NextResponse.json({ error: 'list failed' }, { status: 500 })
  }

  const now = Date.now()
  const summary = { pending: rows?.length ?? 0, stale: 0, recovered: 0, reaped: 0, creditsRefunded: 0, failedToMark: 0 }

  for (const row of rows ?? []) {
    // config is a jsonb column, so the generated type is `Json` — a union
    // that also admits scalars and arrays. Narrow to the object case
    // before reading keys or spreading it below; previously a scalar
    // config would have been spread character-by-character.
    const cfg: JsonObject =
      row.config && typeof row.config === 'object' && !Array.isArray(row.config)
        ? row.config
        : {}
    // Fall back to created_at only when the stamp is missing (legacy
    // rows written before the generator persisted it). Never the other
    // way round: a session can be created hours before generation
    // starts, so created_at alone would reap live runs.
    const startedAt = Date.parse(String(cfg.last_gen_started_at ?? row.created_at))
    const age = Number.isFinite(startedAt) ? now - startedAt : Number.POSITIVE_INFINITY
    if (age <= STALE_MS) continue
    summary.stale++

    // Did the test actually land? A run can die AFTER writing the cache
    // row but before the status update — refunding that student would
    // give away a test they received.
    const { data: cached, error: cacheErr } = await dbAdmin
      .from('study_messages')
      .select('id')
      .eq('session_id', row.id)
      .eq('role', 'assistant')
      .ilike('content', `${CACHED_TEST_MARKER}%`)
      .limit(1)
    if (cacheErr) {
      // Can't prove the test is missing → don't touch the credit.
      console.error('[cron/study-reap-stuck-generations] cache probe failed', row.id, cacheErr)
      continue
    }
    if (cached && cached.length > 0) {
      // Mark ready AND notify — one shared helper with the generator's
      // happy path (lib/study/test-generation-status.ts). This branch
      // used to write the status by hand and notify nobody, so a student
      // whose invocation was killed got a usable test sitting silently
      // in the DB. The pair can't diverge again because neither call
      // site writes the terminal status itself any more.
      await markTestReadyAndNotify({
        userId: row.student_id,
        sessionId: row.id,
        lang: row.language === 'ko' ? 'ko' : 'en',
      })
      summary.recovered++
      console.warn('[cron/study-reap-stuck-generations] recovered a completed generation', {
        sessionId: row.id, ageMs: age,
      })
      continue
    }

    // Genuinely dead: credit spent, no test. Fail the row (so the
    // student sees a retry affordance instead of an eternal spinner)
    // and give the credit back.
    const cost = typeof cfg.gen_credit_cost === 'number' && cfg.gen_credit_cost > 0
      ? cfg.gen_credit_cost
      : 1 // pre-fix rows didn't persist the cost; 1 is the floor price
    // Checked: marking the row 'failed' is what takes it out of this
    // query. If the write is dropped the student keeps the eternal
    // spinner this job exists to clear, and every subsequent run reaps
    // the same row again — re-sending the "generation failed" push every
    // 10 minutes forever. Skip the refund/notify pair until the status
    // sticks; refundTestCredits is idempotent so nothing is lost.
    const { error: failErr } = await dbAdmin
      .from('study_sessions')
      .update({
        generation_status: 'failed',
        config: {
          ...cfg,
          last_error: 'generation invocation died (reaped): no test produced, credit refunded',
          last_error_at: new Date().toISOString(),
        },
      })
      .eq('id', row.id)
    if (failErr) {
      console.error('[cron/study-reap-stuck-generations] fail-mark rejected', row.id, failErr)
      summary.failedToMark++
      continue
    }
    const refund = await refundTestCredits(row.student_id, row.id, cost)
    // Tell the student. Without this the refund is invisible until they
    // reopen the app and notice the spinner became a retry button. The
    // credit logic above is untouched — this only reports it.
    await notifyTestGenerationFailed({
      userId: row.student_id,
      sessionId: row.id,
      refundedCredits: refund.refunded,
      lang: row.language === 'ko' ? 'ko' : 'en',
    })
    summary.reaped++
    summary.creditsRefunded += refund.refunded
    console.warn('[cron/study-reap-stuck-generations] reaped a stuck generation', {
      sessionId: row.id,
      studentId: row.student_id,
      ageMs: age,
      cost,
      family: cfg.gen_credit_family ?? null,
      ...refund,
    })
  }

  const truncated = (rows?.length ?? 0) === MAX_PER_RUN
  // A run that couldn't mark any row did none of its work, and the route
  // still answers 200 — so the flag has to say so or the watchdog reads
  // green over students stuck on a spinner with a spent credit.
  const ok = summary.failedToMark === 0
  await recordHeartbeat(
    'study-reap-stuck-generations',
    { ok, detail: { ...summary, truncated } },
    Date.now() - startedAt,
  )

  return NextResponse.json({ ok, ...summary, truncated })
}
