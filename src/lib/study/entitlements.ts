import { supabaseAdmin } from '@/lib/supabase-admin'
import { isPassPlan, resolvePass } from '@/lib/study/plans'

/**
 * Per-test access entitlements.
 *
 * Access model (see study_entitlements migration):
 *   - A live RECURRING Premium plan (active, not free, not a pass) unlocks
 *     ALL tests. Resolved from study_subscriptions, not stored here.
 *   - PASSES are test-scoped: each active purchase writes a study_entitlements
 *     row for its test family ('sat' / 'toefl'), or '*' for an all-access
 *     pass (수능). Passes are stackable — a SAT pass + a TOEFL pass = two rows.
 *   - FREE / expired users (no plan, no pass) can trial ANY test with their
 *     free credits — the scoping only bites once a user actually holds a pass.
 *
 * Test families are lowercase and match the topic-slug prefix ('sat-math'
 * → 'sat', 'toefl-reading' → 'toefl').
 */

const RECURRING_PREMIUM = (status?: string | null, plan?: string | null) =>
  status === 'active' && !!plan && plan !== 'free_v1' && !isPassPlan(plan)

/** The test family a pass unlocks ('sat' | 'toefl' | '*'), or null if unknown. */
export function passTestFor(passId: string | null | undefined): 'sat' | 'toefl' | '*' | null {
  const pass = resolvePass(passId)
  return pass ? pass.test : null
}

/** Record/extend a pass's test entitlement. Stackable + idempotent: one row
 *  per (student, test); a repeat purchase pushes expires_at to the later date. */
export async function grantTestEntitlement(opts: {
  studentId: string
  test: 'sat' | 'toefl' | '*'
  expiresAt: Date | null
  source?: string
}): Promise<void> {
  const nowIso = new Date().toISOString()
  const expIso = opts.expiresAt ? opts.expiresAt.toISOString() : null
  const { data: existing } = await supabaseAdmin
    .from('study_entitlements')
    .select('expires_at')
    .eq('student_id', opts.studentId)
    .eq('test', opts.test)
    .maybeSingle()

  // Keep the latest expiry when stacking (null = never expires, always wins).
  let nextExp = expIso
  if (existing) {
    const cur = existing.expires_at as string | null
    if (cur === null || expIso === null) nextExp = null
    else nextExp = new Date(cur) > new Date(expIso) ? cur : expIso
  }

  await supabaseAdmin.from('study_entitlements').upsert({
    student_id: opts.studentId,
    test: opts.test,
    source: opts.source ?? 'pass',
    expires_at: nextExp,
    updated_at: nowIso,
  }, { onConflict: 'student_id,test' })
}

interface AccessResult {
  /** true = every test is accessible (recurring plan, all-access pass, or the
   *  free/trial state where scoping doesn't apply yet). */
  all: boolean
  /** When not `all`, the specific test families the user may access. */
  tests: string[]
}

async function resolveAccess(studentId: string): Promise<AccessResult> {
  const { data: sub } = await supabaseAdmin
    .from('study_subscriptions')
    .select('status, plan')
    .eq('student_id', studentId)
    .maybeSingle()

  if (RECURRING_PREMIUM(sub?.status, sub?.plan)) return { all: true, tests: [] }

  const nowIso = new Date().toISOString()
  const { data: rows } = await supabaseAdmin
    .from('study_entitlements')
    .select('test, expires_at')
    .eq('student_id', studentId)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)

  const active = (rows ?? []) as { test: string }[]
  // No active pass entitlements → free/trial: everything is open (limited by
  // free credits, not by test).
  if (active.length === 0) return { all: true, tests: [] }
  // Holds a pass → scoped. An all-access pass ('*') opens everything.
  if (active.some(r => r.test === '*')) return { all: true, tests: [] }
  return { all: false, tests: active.map(r => r.test) }
}

/** Can this student access the given test family? */
export async function canAccessTest(studentId: string, testFamily: string): Promise<boolean> {
  const access = await resolveAccess(studentId)
  return access.all || access.tests.includes(testFamily.toLowerCase())
}

/** For UI: which tests the user can access ({ all } short-circuits the list). */
export async function getTestAccess(studentId: string): Promise<AccessResult> {
  return resolveAccess(studentId)
}

/** Point the study path at a test the user just unlocked: make it the current
 *  focus (target_test) and add it to their multi-target list. Non-destructive
 *  — keeps any existing targets. */
export async function pointStudyPathAtTest(studentId: string, testFamily: 'sat' | 'toefl'): Promise<void> {
  const TEST = testFamily.toUpperCase() // stored convention: 'SAT' | 'TOEFL'
  const { data: prefs } = await supabaseAdmin
    .from('study_user_prefs')
    .select('target_tests')
    .eq('student_id', studentId)
    .maybeSingle()
  const existing = ((prefs?.target_tests as string[] | null) ?? []).map(s => s.toUpperCase())
  const next = Array.from(new Set([...existing, TEST]))
  await supabaseAdmin.from('study_user_prefs').upsert({
    student_id: studentId,
    target_test: TEST,
    target_tests: next,
  }, { onConflict: 'student_id' })
}
