/** @jest-environment node */
/**
 * Regression tests for PUT /api/study/prefs — field whitelist +
 * validators must reject malformed shapes with 400, and student_id
 * from the body must never reach the upsert payload.
 */
import { PUT } from '@/app/api/study/prefs/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { tableRouter, makeRequest } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: jest.fn(), rpc: jest.fn(), auth: { getUser: jest.fn() } },
}))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn() }))

const fromMock = supabaseAdmin.from as unknown as jest.Mock
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
  ])('rejects %s with 400', async (_label, body, field) => {
    const res = await PUT(makeRequest(body, { method: 'PUT' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: `invalid value for ${field}` })
    expect(fromMock).not.toHaveBeenCalled()
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
})
