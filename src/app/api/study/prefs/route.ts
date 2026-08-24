import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { isStudyAvatarId } from '@/lib/study/avatars'
import {
  isAvatarConfigLike, normaliseAvatarConfig, type AvatarConfig,
} from '@/lib/study/avatarConfig'

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
  /** Public unique handle shown on leaderboards + used for friend search.
   *  Null until set. Written via /api/study/nickname (not the prefs PUT),
   *  which owns the format + uniqueness rules. */
  nickname: string | null
  /** Which PRESET the student started from, or NULL if they built from
   *  scratch (see src/lib/study/avatars.ts). NOT what the renderer
   *  reads — avatar_config is. Kept so preset popularity is answerable.
   *  Settable through this PUT. */
  avatar_id: string | null
  /**
   * The customised avatar — THE source of truth for rendering.
   *
   * NULL means "never opened the builder", which is what makes the
   * friends list and the league leaderboard draw the deterministic
   * initials avatar. Optional on this interface because migration 072
   * is NOT APPLIED: until it is, the column does not exist and the GET
   * simply does not return the field.
   */
  avatar_config?: AvatarConfig | null
  target_test: string | null
  /** Full set of active target tests (SAT, TOEFL, …). Superset of
   *  target_test, which is the "current focus" pointer. Empty array
   *  when the student hasn't picked any target yet. */
  target_tests: string[]
  grade_level: string | null
  daily_goal_minutes: number
  /** Legacy single goal, SAT-scaled. Kept in lockstep with
   *  goal_scores.sat so the SAT-only predicted-score engine reads it
   *  unchanged. Prefer goal_scores for new callers. */
  goal_score: number | null
  /** Per-test goal map, keyed by lowercased test family ('sat','toefl',…)
   *  → integer goal on that test's own scale. */
  goal_scores: Record<string, number>
  test_date: string | null
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

  const { data: existing } = await dbAdmin
    .from('study_user_prefs')
    .select('*')
    .eq('student_id', user.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ prefs: existing })

  // Auto-create default row. On failure we return prefs:null, which the
  // onboarding gate reads as "no prefs yet" — the wizard reappears on every
  // load — so the cause must not be invisible.
  const { data: created, error: createErr } = await dbAdmin
    .from('study_user_prefs')
    .insert({ student_id: user.id })
    .select()
    .single()
  if (createErr) console.error('[study/prefs] default row create failed', { studentId: user.id, error: createErr })
  return NextResponse.json({ prefs: created })
}

/**
 * Is this error "that column does not exist"?
 *
 * TWO codes, because the two directions fail in two different layers:
 *
 *   42703     Postgres's undefined_column. What a SELECT naming an
 *             unknown column returns (see readPrefsIdentity).
 *   PGRST204  PostgREST's own schema-cache miss. What an INSERT /
 *             UPDATE / UPSERT returns — the request never reaches
 *             Postgres, so there is no SQLSTATE to match on.
 *
 * The message is checked as a last resort because PGRST204 is also used
 * for other schema-cache misses in some PostgREST versions, and because
 * a code that changes under us should degrade to "retry without the
 * avatar" rather than to a 500.
 */
function isMissingColumn(error: { code?: string; message?: string }): boolean {
  if (error.code === '42703' || error.code === 'PGRST204') return true
  return /could not find the .* column|column .* does not exist/i.test(error.message ?? '')
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
    // Avatar choice. null clears it (back to the initials avatar). Only
    // ids this build can DRAW are accepted: the column's own constraint
    // checks format, not membership, so an unrecognised id would store
    // fine and then render as a blank disc for everyone who sees the
    // student. Rejecting here keeps the stored set drawable.
    avatar_id: v => v === null || isStudyAvatarId(v),
    // The customised avatar. The column's own CHECK (072) constrains
    // SHAPE only — object, under 2 KB — deliberately, so that adding a
    // part category never needs a migration. Membership is this line's
    // job: normaliseAvatarConfig rejects anything that is not an object
    // and, below, the value actually STORED is the normalised one, so
    // unknown keys and undrawable part values never reach the row in
    // the first place.
    avatar_config: v => v === null || isAvatarConfigLike(v),
    // Score-plan engine (P1): the total goal (SAT 400–1600) + exam date.
    goal_score: v => v === null || (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 2000),
    // Per-test goal map: { sat: 1500, toefl: 105, … }. Each value an
    // integer 0–2000 (widest scale; per-test UI presets are tighter).
    goal_scores: v => v !== null && typeof v === 'object' && !Array.isArray(v) &&
      Object.entries(v as Record<string, unknown>).every(([k, val]) =>
        typeof k === 'string' && k.length > 0 && k.length <= 64 &&
        typeof val === 'number' && Number.isInteger(val) && val >= 0 && val <= 2000),
    test_date: v => v === null || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))),
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

  // Store the NORMALISED config, never the submitted one. Two reasons,
  // and the second is the one that bites: unknown keys are dropped (so
  // the 2 KB shape CHECK cannot be filled with someone else's
  // document), and every part value is one this build can draw — which
  // means what comes back out of the column renders the same face that
  // went in, rather than silently degrading on read forever after.
  if ('avatar_config' in patch && patch.avatar_config !== null) {
    patch.avatar_config = normaliseAvatarConfig(patch.avatar_config)
  }

  /* Keep target_test (the focus POINTER) and target_tests (the LIST) in
   * lockstep. All three shapes are honoured — and the third is why this
   * is one block rather than an if/else-if chain:
   *
   *   - pointer alone  → append it to the stored list, keep it as focus
   *   - list alone     → keep the stored focus if it is still a member,
   *                      else fall back to the first entry (null if empty)
   *   - BOTH together  → the list is the list, the pointer is the focus.
   *
   * It used to be `if ('target_test') … else if ('target_tests')`, and
   * the pointer branch REBUILT the list from the stored rows. So a
   * caller sending both — which the study onboarding wizard does — had
   * its list thrown away: {target_tests:['sat','toefl'],
   * target_test:'sat'} stored ['sat']. Measured on a real row, not
   * inferred. Neither key may silently overwrite the other.
   *
   * Membership is case-insensitive throughout: onboarding stored "SAT"
   * while other callers PUT "sat", and a case-sensitive check appended a
   * duplicate that rendered as two identical chips. When both keys
   * arrive, the pointer is stored using the LIST's casing so the two
   * columns hold literally the same string.
   *
   * A non-null pointer that is not in the submitted list is a 400, not a
   * coercion. The caller has stated two things that contradict each
   * other; picking one of them silently is the exact failure mode this
   * block is being fixed for, and no legitimate caller can hit it (the
   * wizard chooses its focus out of the list it sends). A null pointer
   * is not a contradiction — it means "no preference" — so it is filled
   * from the list rather than rejected.
   */
  const hasPtr = 'target_test' in patch
  const hasList = 'target_tests' in patch

  if (hasPtr && hasList) {
    const list = (patch.target_tests as string[] | undefined) ?? []
    const ptr = patch.target_test as string | null
    if (ptr === null) {
      patch.target_test = list.length > 0 ? list[0] : null
    } else {
      const match = list.find(e => e.toLowerCase() === ptr.toLowerCase())
      if (!match) {
        return NextResponse.json(
          { error: 'target_test must be a member of target_tests' },
          { status: 400 },
        )
      }
      patch.target_test = match
    }
  } else if (hasPtr) {
    const current = patch.target_test as string | null
    // Merge into the array. Read the existing list off the DB so we don't
    // clobber other targets the student has already added.
    const { data: row } = await dbAdmin
      .from('study_user_prefs')
      .select('target_tests')
      .eq('student_id', user.id)
      .maybeSingle()
    const existing = (row?.target_tests as string[] | undefined) ?? []
    if (current && !existing.some(e => e.toLowerCase() === current.toLowerCase())) {
      patch.target_tests = [...existing, current]
    }
  } else if (hasList) {
    const list = (patch.target_tests as string[] | undefined) ?? []
    const { data: row } = await dbAdmin
      .from('study_user_prefs')
      .select('target_test')
      .eq('student_id', user.id)
      .maybeSingle()
    const currentPtr = row?.target_test as string | null | undefined
    const stillThere = currentPtr
      ? list.find(e => e.toLowerCase() === currentPtr.toLowerCase())
      : undefined
    if (list.length === 0) {
      patch.target_test = null
    } else if (!stillThere) {
      patch.target_test = list[0]
    } else if (stillThere !== currentPtr) {
      // Same test, different casing — align on the list's spelling.
      patch.target_test = stillThere
    }
  }

  // Keep goal_score (legacy, SAT-scaled) and goal_scores (per-test map)
  // in lockstep, so either shape can be PUT and the SAT-only
  // predicted-score engine keeps reading goal_score unchanged:
  //   - PUT goal_scores → mirror its 'sat' entry down to goal_score
  //   - PUT goal_score alone (onboarding) → write it into goal_scores.sat
  if ('goal_scores' in patch) {
    const map = patch.goal_scores as Record<string, number>
    patch.goal_score = typeof map.sat === 'number' ? map.sat : null
  } else if ('goal_score' in patch) {
    const sat = patch.goal_score as number | null
    const { data: row } = await dbAdmin
      .from('study_user_prefs')
      .select('goal_scores')
      .eq('student_id', user.id)
      .maybeSingle()
    const map = { ...((row?.goal_scores as Record<string, number> | null) ?? {}) }
    if (sat === null) delete map.sat
    else map.sat = sat
    patch.goal_scores = map
  }

  /**
   * Upsert so a first-time PUT (before any GET) still works — and step
   * DOWN the migration ladder if a column does not exist yet.
   *
   * MIGRATION 072 IS NOT APPLIED. Writing a column PostgREST does not
   * know fails the WHOLE upsert, so a student who changed their daily
   * goal and their avatar in one request would lose BOTH and see a
   * generic "couldn't save".
   *
   * THE ERROR CODE IS NOT 42703 ON A WRITE. That is what a SELECT gets
   * (Postgres's own undefined_column, which is why readPrefsIdentity is
   * written against it). A write never reaches Postgres: PostgREST
   * rejects it from its cached schema first, and returns PGRST204 —
   *   "Could not find the 'avatar_config' column of 'study_user_prefs'
   *    in the schema cache"
   * — with no SQLSTATE at all. This ladder originally matched 42703
   * only. Every unit test passed, because the test supplied the code the
   * code was looking for; the live PUT returned a plain 500 and the
   * builder said "couldn't save". Found by issuing a real PUT against
   * the real database, which is the only thing that could have found it.
   *
   * The rungs drop one migration's column at a time, newest first —
   * NOT both at once. Against a post-071/pre-072 database, dropping
   * both would throw away a preset choice that would have saved
   * perfectly well, which is the same "one unapplied migration breaks
   * the feature that already worked" trap readPrefsIdentity guards on
   * the read side.
   *
   * What is NOT done here: silently returning 200 when nothing was
   * written. `unsupported` names the fields that did not make it, and
   * an avatar-only PUT with nothing left to write is a 503 — the
   * builder can then say "not available yet" instead of showing a face
   * that the next reload will undo.
   */
  const DROP_LADDER: readonly (readonly string[])[] = [
    [],
    ['avatar_config'],
    ['avatar_config', 'avatar_id'],
  ]
  let lastError: { code?: string; message: string } | null = null

  for (const drop of DROP_LADDER) {
    // Skip a rung that would change nothing about the previous attempt.
    if (drop.length > 0 && !drop.some(f => f in patch)) continue

    const attempt: Record<string, unknown> = { ...patch }
    for (const f of drop) delete attempt[f]
    const dropped = drop.filter(f => f in patch)
    const writesSomething = Object.keys(attempt).some(k => k !== 'updated_at')

    if (!writesSomething) {
      console.warn('[study/prefs] avatar columns missing and nothing else to write', {
        unsupported: dropped, message: lastError?.message,
      })
      return NextResponse.json(
        { error: 'avatar storage unavailable', unsupported: dropped },
        { status: 503 },
      )
    }

    const { data, error } = await dbAdmin
      .from('study_user_prefs')
      .upsert({ student_id: user.id, ...attempt }, { onConflict: 'student_id' })
      .select()
      .single()

    if (!error) {
      return NextResponse.json(
        dropped.length > 0 ? { prefs: data, unsupported: dropped } : { prefs: data },
      )
    }
    lastError = error
    // Anything other than "column does not exist" is a real failure and
    // must not be retried into a narrower, quieter write.
    if (!isMissingColumn(error)) break
    console.warn('[study/prefs] column missing — retrying without it', {
      willDrop: drop, code: (error as { code?: string }).code, message: error.message,
    })
  }

  return NextResponse.json({ error: lastError?.message ?? 'upsert failed' }, { status: 500 })
}
