/** @jest-environment node */
/**
 * Regression tests for the SAT branch of POST /api/study/test/route:
 * grade Module 1 from the cached payload, route by performance, draw
 * the routed Module 2 from the bank, append it to the cache, return it.
 */
import { POST } from '@/app/api/study/test/route/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { enforceRateLimit } from '@/lib/rate-limit'
import { assembleFromBank } from '@/lib/study/assemble'
import { tableRouter, makeRequest } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: jest.fn() },
}))
jest.mock('@/lib/rate-limit', () => ({ enforceRateLimit: jest.fn(() => null) }))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn() }))
jest.mock('@/lib/study/assemble', () => ({ assembleFromBank: jest.fn() }))

const fromMock = supabaseAdmin.from as unknown as jest.Mock
const requireStudyUserMock = requireStudyUser as unknown as jest.Mock
const assembleMock = assembleFromBank as unknown as jest.Mock

const MARKER = '[full-test-v1]'
const SID = '11111111-1111-1111-1111-111111111111'

/** A 3-question Module 1 payload (breakIdx = 3), keys A/B/C. */
function cacheContent() {
  return MARKER + JSON.stringify({
    adaptive: true,
    sectionKey: 'math',
    moduleBreakIdx: 3,
    questions: [
      { correct_answer: 'A' }, { correct_answer: 'B' }, { correct_answer: 'C' },
    ],
  })
}

function m2Question(i: number) {
  return { prompt: `M2 Q${i}`, type: 'multiple_choice', choices: ['A', 'B', 'C', 'D'], correct_answer: 'A', difficulty: 'hard', explanation: '' }
}

describe('POST /api/study/test/route — SAT adaptive branch', () => {
  let enqueue: ReturnType<typeof tableRouter>
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    requireStudyUserMock.mockResolvedValue({ user: { id: 'student-1' } })
    ;(enforceRateLimit as unknown as jest.Mock).mockReturnValue(null)
    enqueue = tableRouter(fromMock)
  })
  afterEach(() => (console.error as jest.Mock).mockRestore())

  function body(answers: (string | null)[]) {
    return { sessionId: SID, sectionName: 'Math', answers: answers.map((answer, index) => ({ index, answer })) }
  }

  it('routes HARD on ≥60% Module 1 and returns the drawn Module 2', async () => {
    enqueue('study_sessions', { data: { id: SID, student_id: 'student-1', module2_route: null } })
    enqueue('study_messages', { data: [{ content: cacheContent() }] })
    enqueue('study_messages', { error: null }) // cache update
    enqueue('study_sessions', { error: null }) // session update
    assembleMock.mockResolvedValue({ questions: [m2Question(0), m2Question(1)] })

    // All 3 correct → 100% → hard.
    const res = await POST(makeRequest(body(['A', 'B', 'C'])))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.route).toBe('hard')
    expect(json.module1Correct).toBe(3)
    expect(json.module2Questions).toHaveLength(2)
    // Drew from the HARD band.
    expect(assembleMock).toHaveBeenCalledWith(
      expect.objectContaining({ section: 'math', difficulties: ['hard'], studentId: 'student-1' }),
      SID,
    )
  })

  it('routes EASY below 60% and draws the easy/medium band', async () => {
    enqueue('study_sessions', { data: { id: SID, student_id: 'student-1', module2_route: null } })
    enqueue('study_messages', { data: [{ content: cacheContent() }] })
    enqueue('study_messages', { error: null })
    enqueue('study_sessions', { error: null })
    assembleMock.mockResolvedValue({ questions: [m2Question(0)] })

    // 1 of 3 correct → 33% → easy.
    const res = await POST(makeRequest(body(['A', 'X', 'X'])))
    const json = await res.json()
    expect(json.route).toBe('easy')
    expect(json.module1Correct).toBe(1)
    expect(assembleMock).toHaveBeenCalledWith(
      expect.objectContaining({ difficulties: ['easy', 'medium'] }),
      SID,
    )
  })

  it('is idempotent: an already-routed session returns the cached M2 without redrawing', async () => {
    // Cache already has M1 (3) + M2 (2) appended; session carries the route.
    const merged = MARKER + JSON.stringify({
      adaptive: true, sectionKey: 'math', moduleBreakIdx: 3,
      questions: [{ correct_answer: 'A' }, { correct_answer: 'B' }, { correct_answer: 'C' }, m2Question(0), m2Question(1)],
    })
    enqueue('study_sessions', { data: { id: SID, student_id: 'student-1', module2_route: 'hard', module1_correct: 3, module1_total: 3 } })
    enqueue('study_messages', { data: [{ content: merged }] })

    const res = await POST(makeRequest(body(['A', 'B', 'C'])))
    const json = await res.json()
    expect(json.alreadyRouted).toBe(true)
    expect(json.route).toBe('hard')
    expect(json.module2Questions).toHaveLength(2)
    expect(assembleMock).not.toHaveBeenCalled() // no second draw
  })

  it('returns 409 when Module 2 cannot be drawn from the bank', async () => {
    enqueue('study_sessions', { data: { id: SID, student_id: 'student-1', module2_route: null } })
    enqueue('study_messages', { data: [{ content: cacheContent() }] })
    assembleMock.mockRejectedValue(new Error('no verified items'))

    const res = await POST(makeRequest(body(['A', 'B', 'C'])))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('module2_bank_empty')
  })
})
