import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * GET /api/study/prefs — returns the student's stored study prefs,
 * auto-creating a default row if none exists. The default row
 * persists onboarded_at=null so the landing knows to show the
 * onboarding wizard.
 *
 * PUT /api/study/prefs — partial update. Body is a subset of the
 * StudyUserPrefs fields; updated_at is bumped automatically.
 */

export const dynamic = 'force-dynamic'

export interface StudyUserPrefs {
  student_id: string
  target_test: string | null
  /** Full set of active target tests (SAT, TOEFL, …). Superset of
   *  target_test, which is the "current focus" pointer. Empty array
   *  when the student hasn't picked any target yet. */
  target_tests: string[]
  grade_level: string | null
  daily_goal_minutes: number
  default_language: 'en' | 'ko'
  default_difficulty: 'warmup' | 'balanced' | 'challenge'
  onboarded_at: string | null
  /** When the student dismissed the 4-step bottom-nav tour (Snap /
   *  Review / League / Notebook). Account-level so it never re-shows
   *  on a new device — localStorage alone reset per device/origin. */
  nav_tour_seen_at: string | null
  updated_at: string
}

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const { data: existing } = await supabaseAdmin
    .from('study_user_prefs')
    .select('*')
    .eq('student_id', user.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ prefs: existing })

  // Auto-create default row.
  const { data: created } = await supabaseAdmin
    .from('study_user_prefs')
    .insert({ student_id: user.id })
    .select()
    .single()
  return NextResponse.json({ prefs: created })
}

export async function PUT(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  let body: Partial<StudyUserPrefs> = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  // Whitelist + validate mutable fields. student_id / created_at are never
  // user-settable, and a malformed value (target_tests as a string, a
  // negative goal) must not reach the row — the landing page trusts these
  // shapes and a bad write bricks it for that student.
  const isNullOrString = (v: unknown, max = 64) =>
    v === null || (typeof v === 'string' && v.length <= max)
  const isNullOrIsoDate = (v: unknown) =>
    v === null || (typeof v === 'string' && !Number.isNaN(Date.parse(v)))
  const validators: Record<string, (v: unknown) => boolean> = {
    target_test: v => isNullOrString(v),
    target_tests: v => Array.isArray(v) && v.length <= 20 &&
      v.every(t => typeof t === 'string' && t.length > 0 && t.length <= 64),
    grade_level: v => isNullOrString(v),
    daily_goal_minutes: v => typeof v === 'number' && Number.isInteger(v) && v >= 5 && v <= 480,
    default_language: v => v === 'en' || v === 'ko',
    default_difficulty: v => v === 'warmup' || v === 'balanced' || v === 'challenge',
    onboarded_at: isNullOrIsoDate,
    nav_tour_seen_at: isNullOrIsoDate,
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const [key, valid] of Object.entries(validators)) {
    if (!(key in body)) continue
    const value = (body as Record<string, unknown>)[key]
    if (!valid(value)) {
      return NextResponse.json({ error: `invalid value for ${key}` }, { status: 400 })
    }
    patch[key] = value
  }

  // Keep target_test and target_tests in lockstep so callers can PUT
  // either shape and the server does the right thing:
  //   - PUT target_test alone → also append to target_tests + set current
  //   - PUT target_tests alone → ensure target_test still refers to one
  //     of the tests in the list (fallback to first entry, or null on empty)
  if ('target_test' in patch) {
    const current = patch.target_test as string | null
    // Merge into the array. Read the existing list off the DB so we don't
    // clobber other targets the student has already added.
    const { data: row } = await supabaseAdmin
      .from('study_user_prefs')
      .select('target_tests')
      .eq('student_id', user.id)
      .maybeSingle()
    const existing = (row?.target_tests as string[] | undefined) ?? []
    if (current && !existing.includes(current)) {
      patch.target_tests = [...existing, current]
    }
  } else if ('target_tests' in patch) {
    const list = (patch.target_tests as string[] | undefined) ?? []
    const { data: row } = await supabaseAdmin
      .from('study_user_prefs')
      .select('target_test')
      .eq('student_id', user.id)
      .maybeSingle()
    const currentPtr = row?.target_test as string | null | undefined
    if (list.length === 0) {
      patch.target_test = null
    } else if (!currentPtr || !list.includes(currentPtr)) {
      patch.target_test = list[0]
    }
  }

  // Upsert so first-time PUT (before any GET) still works.
  const { data, error } = await supabaseAdmin
    .from('study_user_prefs')
    .upsert({ student_id: user.id, ...patch }, { onConflict: 'student_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prefs: data })
}
