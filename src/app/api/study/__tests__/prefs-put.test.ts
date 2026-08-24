/** @jest-environment node */
/**
 * Regression tests for PUT /api/study/prefs — field whitelist +
 * validators must reject malformed shapes with 400, and student_id
 * from the body must never reach the upsert payload.
 */
import { PUT } from '@/app/api/study/prefs/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { tableRouter, makeRequest } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({
  dbAdmin: { from: jest.fn(), rpc: jest.fn(), auth: { getUser: jest.fn() } },
}))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn() }))

const fromMock = dbAdmin.from as unknown as jest.Mock
const requireStudyUserMock = requireStudyUser as unknown as jest.Mock

describe('PUT /api/study/prefs', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    requireStudyUserMock.mockResolvedValue({ user: { id: 'student-1' } })
    enqueue = tableRouter(fromMock)
  })

  it('upserts a valid partial payload and returns 200', async () => {
    const prefsRow = { student_id: 'student-1', daily_goal_minutes: 30 }
    const upsertChain = enqueue('study_user_prefs', { data: prefsRow })

    const res = await PUT(makeRequest({ daily_goal_minutes: 30 }, { method: 'PUT' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ prefs: prefsRow })

    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: 'student-1',
        daily_goal_minutes: 30,
        updated_at: expect.any(String),
      }),
      { onConflict: 'student_id' },
    )
  })

  it.each([
    ['target_tests as a string', { target_tests: 'SAT' }, 'target_tests'],
    ['target_tests containing non-strings', { target_tests: ['SAT', 42] }, 'target_tests'],
    ['daily_goal_minutes of 0', { daily_goal_minutes: 0 }, 'daily_goal_minutes'],
    ['daily_goal_minutes of 100000', { daily_goal_minutes: 100000 }, 'daily_goal_minutes'],
    ['non-integer daily_goal_minutes', { daily_goal_minutes: 7.5 }, 'daily_goal_minutes'],
    ["default_language 'fr'", { default_language: 'fr' }, 'default_language'],
    ["onboarded_at 'not-a-date'", { onboarded_at: 'not-a-date' }, 'onboarded_at'],
    // avatar_id must be an id this build can DRAW. The column's own CHECK
    // only constrains format, so a well-formed unknown id would store
    // fine and then render as a blank disc for every friend who sees it.
    ['an unregistered avatar_id', { avatar_id: 'person-nonexistent' }, 'avatar_id'],
    ['a non-string avatar_id', { avatar_id: 3 }, 'avatar_id'],
    ['an avatar_id that fails the column format', { avatar_id: 'Raumi Classic!' }, 'avatar_id'],
  ])('rejects %s with 400', async (_label, body, field) => {
    const res = await PUT(makeRequest(body, { method: 'PUT' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: `invalid value for ${field}` })
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('persists a registered avatar_id', async () => {
    const upsertChain = enqueue('study_user_prefs', { data: { student_id: 'student-1', avatar_id: 'person-aster' } })

    const res = await PUT(makeRequest({ avatar_id: 'person-aster' }, { method: 'PUT' }))
    expect(res.status).toBe(200)
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ student_id: 'student-1', avatar_id: 'person-aster' }),
      { onConflict: 'student_id' },
    )
  })

  it('persists a null avatar_id — the way back to the initials avatar', async () => {
    const upsertChain = enqueue('study_user_prefs', { data: { student_id: 'student-1', avatar_id: null } })

    const res = await PUT(makeRequest({ avatar_id: null }, { method: 'PUT' }))
    expect(res.status).toBe(200)
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ student_id: 'student-1', avatar_id: null }),
      { onConflict: 'student_id' },
    )
  })

  // ── avatar_config (migration 072, NOT APPLIED) ──────────────────────

  it.each([
    ['a scalar', { avatar_config: 'person-aster' }],
    ['a number', { avatar_config: 7 }],
    ['an array', { avatar_config: ['tone-1'] }],
    ['a boolean', { avatar_config: true }],
  ])('rejects avatar_config as %s with 400', async (_label, body) => {
    // The column's own CHECK is jsonb_typeof = 'object'. An ARRAY is
    // typed 'array' so Postgres would catch that one, but a rejected
    // write is a 500 at the client; catching it here is a 400 with a
    // field name. A scalar string is valid jsonb of type 'string' — the
    // DB check would pass it and it would render as nothing.
    const res = await PUT(makeRequest(body, { method: 'PUT' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid value for avatar_config' })
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('stores the NORMALISED config — junk keys and undrawable parts never reach the row', async () => {
    const upsertChain = enqueue('study_user_prefs', { data: { student_id: 'student-1' } })

    const res = await PUT(makeRequest({
      avatar_config: {
        skin: 'tone-6',
        hair: 'a-style-from-2029',
        top: 'not-a-hex',
        exfiltrated: 'x'.repeat(400),
      },
      avatar_id: null,
    }, { method: 'PUT' }))
    expect(res.status).toBe(200)

    const stored = upsertChain.upsert.mock.calls[0][0].avatar_config
    expect(stored.skin).toBe('tone-6')          // known part kept
    expect(stored.hair).toBe('crop-neat')       // undrawable part degraded
    expect(stored.top).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(stored).not.toHaveProperty('exfiltrated')
    // The 2 KB shape CHECK is a ceiling, not a plan. A normalised config
    // is nowhere near it — which is the actual defence.
    expect(JSON.stringify(stored).length).toBeLessThan(400)
  })

  it('persists a null avatar_config — the way back to the initials avatar', async () => {
    const upsertChain = enqueue('study_user_prefs', { data: { student_id: 'student-1' } })

    const res = await PUT(makeRequest({ avatar_config: null }, { method: 'PUT' }))
    expect(res.status).toBe(200)
    expect(upsertChain.upsert.mock.calls[0][0].avatar_config).toBeNull()
  })

  it.each([
    // The shape a real PUT actually gets. Verified against the live
    // database on 2026-08-03: PostgREST rejects the write from its
    // CACHED SCHEMA before Postgres ever sees it, so there is no
    // SQLSTATE — the code is PGRST204, not 42703. The first version of
    // this ladder matched 42703 only; every test here passed, because
    // the test supplied the code the code was looking for, and the live
    // PUT returned a bare 500.
    ['PGRST204 — what a WRITE gets', {
      code: 'PGRST204',
      message: "Could not find the 'avatar_config' column of 'study_user_prefs' in the schema cache",
    }],
    // Kept alongside it: 42703 is what a SELECT gets, and a future
    // PostgREST could surface it here too.
    ['42703 — what a SELECT gets', {
      code: '42703', message: 'column study_user_prefs.avatar_config does not exist',
    }],
    // Belt and braces: an unrecognised code with a recognisable message
    // must still degrade rather than 500.
    ['an unknown code with a missing-column message', {
      code: 'XX000',
      message: "Could not find the 'avatar_config' column of 'study_user_prefs' in the schema cache",
    }],
  ])('SAVES THE REST when the avatar column does not exist — %s', async (_label, columnError) => {
    // The trap: a single failed column fails the whole upsert, so a
    // student who changed their daily goal and their avatar in one
    // request would lose BOTH and see a generic error.
    enqueue('study_user_prefs', { error: columnError })
    const retryChain = enqueue('study_user_prefs', {
      data: { student_id: 'student-1', daily_goal_minutes: 45 },
    })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const res = await PUT(makeRequest(
      { daily_goal_minutes: 45, avatar_config: { skin: 'tone-2' } },
      { method: 'PUT' },
    ))
    expect(res.status).toBe(200)
    const body = await res.json()
    // Reported, not hidden: the client can say "avatars aren't available
    // yet" instead of showing a face that will not survive a reload.
    expect(body.unsupported).toEqual(['avatar_config'])
    expect(body.prefs.daily_goal_minutes).toBe(45)
    expect(retryChain.upsert.mock.calls[0][0]).not.toHaveProperty('avatar_config')
    expect(retryChain.upsert.mock.calls[0][0].daily_goal_minutes).toBe(45)
    warn.mockRestore()
  })

  it('does NOT report success for an avatar-only PUT the column cannot take', async () => {
    // The "quiet wrong answer" failure. With nothing else in the patch
    // there is no retry worth making, and a 200 here would have the
    // builder show the new avatar until the next reload undid it.
    enqueue('study_user_prefs', {
      error: {
        code: 'PGRST204',
        message: "Could not find the 'avatar_config' column of 'study_user_prefs' in the schema cache",
      },
    })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const res = await PUT(makeRequest({ avatar_config: { skin: 'tone-2' } }, { method: 'PUT' }))
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({
      error: 'avatar storage unavailable', unsupported: ['avatar_config'],
    })
    warn.mockRestore()
  })

  it('KEEPS THE PRESET when only avatar_config is missing (072 unapplied, 071 applied)', async () => {
    // The rung that matters if the two migrations ever land apart:
    // dropping BOTH avatar fields at the first 42703 would throw away a
    // preset choice the database would have accepted.
    enqueue('study_user_prefs', {
      error: {
        code: 'PGRST204',
        message: "Could not find the 'avatar_config' column of 'study_user_prefs' in the schema cache",
      },
    })
    const retryChain = enqueue('study_user_prefs', {
      data: { student_id: 'student-1', avatar_id: 'person-aster' },
    })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const res = await PUT(makeRequest(
      { avatar_id: 'person-aster', avatar_config: { skin: 'tone-2' } },
      { method: 'PUT' },
    ))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ unsupported: ['avatar_config'] })
    const payload = retryChain.upsert.mock.calls[0][0]
    expect(payload.avatar_id).toBe('person-aster')
    expect(payload).not.toHaveProperty('avatar_config')
    warn.mockRestore()
  })

  it('still 500s on a non-column error, rather than silently retrying', async () => {
    enqueue('study_user_prefs', { error: { code: '23505', message: 'duplicate key' } })

    const res = await PUT(makeRequest(
      { daily_goal_minutes: 45, avatar_config: { skin: 'tone-2' } },
      { method: 'PUT' },
    ))
    expect(res.status).toBe(500)
  })

  it('ignores student_id in the body — the upsert always uses the authenticated user', async () => {
    const upsertChain = enqueue('study_user_prefs', { data: { student_id: 'student-1' } })

    const res = await PUT(makeRequest(
      { student_id: 'attacker-99', daily_goal_minutes: 30 },
      { method: 'PUT' },
    ))
    expect(res.status).toBe(200)

    const payload = upsertChain.upsert.mock.calls[0][0]
    expect(payload.student_id).toBe('student-1')
    expect(JSON.stringify(payload)).not.toContain('attacker-99')
  })

  it('returns 400 for a non-JSON body', async () => {
    const res = await PUT(makeRequest('not json', { method: 'PUT' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'bad json' })
  })

  /* target_test (the focus POINTER) vs target_tests (the LIST).
   *
   * The lockstep block used to be `if / else if` with the pointer branch
   * REBUILDING the list, so a body carrying BOTH keys — which the study
   * onboarding wizard sends — kept only the pointer:
   * {target_tests:['sat','toefl'], target_test:'sat'} stored ['sat'].
   * All four shapes are pinned here. */
  describe('target_test / target_tests lockstep', () => {
    it('LIST ONLY: stores the list and fills the pointer from it', async () => {
      enqueue('study_user_prefs', { data: { target_test: null } })   // pointer read
      const upsertChain = enqueue('study_user_prefs', { data: { student_id: 'student-1' } })

      const res = await PUT(makeRequest({ target_tests: ['sat', 'toefl'] }, { method: 'PUT' }))
      expect(res.status).toBe(200)
      const payload = upsertChain.upsert.mock.calls[0][0]
      expect(payload.target_tests).toEqual(['sat', 'toefl'])
      expect(payload.target_test).toBe('sat')
    })

    it('LIST ONLY: keeps an existing pointer that is still a member', async () => {
      enqueue('study_user_prefs', { data: { target_test: 'toefl' } })
      const upsertChain = enqueue('study_user_prefs', { data: { student_id: 'student-1' } })

      const res = await PUT(makeRequest({ target_tests: ['sat', 'toefl'] }, { method: 'PUT' }))
      expect(res.status).toBe(200)
      const payload = upsertChain.upsert.mock.calls[0][0]
      expect(payload.target_tests).toEqual(['sat', 'toefl'])
      // The pointer is left OUT of the patch entirely when it is still
      // valid — the column keeps its stored value. Asserting the
      // effective value (patch if present, else the stored one) so this
      // fails if the route ever moves the focus to list[0] instead.
      expect('target_test' in payload ? payload.target_test : 'toefl').toBe('toefl')
    })

    it('POINTER ONLY: appends to the stored list without clobbering it', async () => {
      enqueue('study_user_prefs', { data: { target_tests: ['toefl'] } })  // list read
      const upsertChain = enqueue('study_user_prefs', { data: { student_id: 'student-1' } })

      const res = await PUT(makeRequest({ target_test: 'sat' }, { method: 'PUT' }))
      expect(res.status).toBe(200)
      const payload = upsertChain.upsert.mock.calls[0][0]
      expect(payload.target_test).toBe('sat')
      expect(payload.target_tests).toEqual(['toefl', 'sat'])
    })

    it('BOTH: the list is the list and the pointer is the focus — neither is rebuilt', async () => {
      // No DB read at all in this shape: the caller stated both values.
      const upsertChain = enqueue('study_user_prefs', { data: { student_id: 'student-1' } })

      const res = await PUT(makeRequest(
        { target_tests: ['sat', 'toefl'], target_test: 'sat' },
        { method: 'PUT' },
      ))
      expect(res.status).toBe(200)
      const payload = upsertChain.upsert.mock.calls[0][0]
      // THE DEFECT: this used to be ['sat'].
      expect(payload.target_tests).toEqual(['sat', 'toefl'])
      expect(payload.target_test).toBe('sat')
    })

    it('BOTH: a pointer that is not in the list is a 400, not a silent pick', async () => {
      const res = await PUT(makeRequest(
        { target_tests: ['sat', 'toefl'], target_test: 'act' },
        { method: 'PUT' },
      ))
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({
        error: 'target_test must be a member of target_tests',
      })
      expect(fromMock).not.toHaveBeenCalled()
    })

    it('BOTH: membership is case-insensitive and the pointer takes the list\'s casing', async () => {
      const upsertChain = enqueue('study_user_prefs', { data: { student_id: 'student-1' } })

      const res = await PUT(makeRequest(
        { target_tests: ['SAT', 'toefl'], target_test: 'sat' },
        { method: 'PUT' },
      ))
      expect(res.status).toBe(200)
      const payload = upsertChain.upsert.mock.calls[0][0]
      expect(payload.target_tests).toEqual(['SAT', 'toefl'])
      expect(payload.target_test).toBe('SAT')
    })

    it('BOTH: a null pointer is filled from the list rather than rejected', async () => {
      const upsertChain = enqueue('study_user_prefs', { data: { student_id: 'student-1' } })

      const res = await PUT(makeRequest(
        { target_tests: ['sat', 'toefl'], target_test: null },
        { method: 'PUT' },
      ))
      expect(res.status).toBe(200)
      const payload = upsertChain.upsert.mock.calls[0][0]
      expect(payload.target_tests).toEqual(['sat', 'toefl'])
      expect(payload.target_test).toBe('sat')
    })

    it('BOTH: an empty list clears the pointer', async () => {
      const upsertChain = enqueue('study_user_prefs', { data: { student_id: 'student-1' } })

      const res = await PUT(makeRequest(
        { target_tests: [], target_test: null },
        { method: 'PUT' },
      ))
      expect(res.status).toBe(200)
      const payload = upsertChain.upsert.mock.calls[0][0]
      expect(payload.target_tests).toEqual([])
      expect(payload.target_test).toBeNull()
    })
  })
})
