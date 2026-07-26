/** @jest-environment node */
/**
 * Regression tests for the TOEFL branch of POST /api/study/test/route.
 *
 * This branch used to be cosmetic: Module 2 was drawn and cached before
 * the student answered question 1, and the route was a feedback chip.
 * It is now a real two-stage draw — grade Module 1, route three ways,
 * draw Module 2 from the routed difficulty band, append it to the same
 * `[full-test-v1]` cache row /submit grades against.
 */
import { POST } from '@/app/api/study/test/route/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { enforceRateLimit } from '@/lib/rate-limit'
import { assembleToeflFromBank } from '@/lib/study/assemble'
import { tableRouter, makeRequest, type ChainMock } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: jest.fn() },
}))
jest.mock('@/lib/rate-limit', () => ({ enforceRateLimit: jest.fn(() => null) }))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn() }))
jest.mock('@/lib/study/assemble', () => ({
  assembleFromBank: jest.fn(),
  assembleToeflFromBank: jest.fn(),
}))

const fromMock = supabaseAdmin.from as unknown as jest.Mock
const requireStudyUserMock = requireStudyUser as unknown as jest.Mock
const assembleMock = assembleToeflFromBank as unknown as jest.Mock

const MARKER = '[full-test-v1]'
const SID = '22222222-2222-2222-2222-222222222222'

/** A 5-item Module-1 Reading payload (breakIdx = 5), keys A..E. */
function cacheContent(overrides: Record<string, unknown> = {}) {
  return MARKER + JSON.stringify({
    adaptive: true,
    family: 'toefl',
    sectionKey: 'reading',
    moduleBreakIdx: 5,
    questions: [
      { correct_answer: 'A' }, { correct_answer: 'B' }, { correct_answer: 'C' },
      { correct_answer: 'D' }, { correct_answer: 'E' },
    ],
    ...overrides,
  })
}

function m2Question(i: number) {
  return {
    prompt: `M2 Q${i}`, type: 'multiple_choice', choices: ['A', 'B', 'C', 'D'],
    correct_answer: 'A', difficulty: 'hard', explanation: '',
  }
}

describe('POST /api/study/test/route — TOEFL adaptive branch', () => {
  let enqueue: ReturnType<typeof tableRouter>
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    requireStudyUserMock.mockResolvedValue({ user: { id: 'student-9' } })
    ;(enforceRateLimit as unknown as jest.Mock).mockReturnValue(null)
    enqueue = tableRouter(fromMock)
  })
  afterEach(() => (console.error as jest.Mock).mockRestore())

  function body(answers: (string | null)[], sectionName = 'Reading') {
    return { sessionId: SID, sectionName, answers: answers.map((answer, index) => ({ index, answer })) }
  }

  /** Queue for the happy path: session read → cache read → claim → cache write. */
  function happyPath(): { claim: ChainMock; cacheWrite: ChainMock } {
    enqueue('study_sessions', { data: { id: SID, student_id: 'student-9', module2_route: null } })
    enqueue('study_messages', { data: [{ content: cacheContent() }] })
    const claim = enqueue('study_sessions', { data: [{ id: SID }] })
    const cacheWrite = enqueue('study_messages', { error: null })
    return { claim, cacheWrite }
  }

  it('routes HARD at ≥70% and draws Module 2 from the medium/hard band', async () => {
    happyPath()
    assembleMock.mockResolvedValue({ questions: [m2Question(0), m2Question(1)] })

    const res = await POST(makeRequest(body(['A', 'B', 'C', 'D', 'E']))) // 5/5 = 100%
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.route).toBe('hard')
    expect(json.module1Correct).toBe(5)
    expect(json.module1Total).toBe(5)
    expect(json.module2Questions).toHaveLength(2)
    expect(json.alreadyRouted).toBe(false)
    expect(assembleMock).toHaveBeenCalledWith(
      {
        section: 'reading',
        module: 2,
        difficulties: ['medium', 'hard'],
        studentId: 'student-9',
      },
      SID,
    )
  })

  it('routes MEDIUM in the 40–69% band', async () => {
    happyPath()
    assembleMock.mockResolvedValue({ questions: [m2Question(0)] })

    const res = await POST(makeRequest(body(['A', 'B', 'C', 'X', 'X']))) // 3/5 = 60%
    const json = await res.json()
    expect(json.route).toBe('medium')
    expect(assembleMock).toHaveBeenCalledWith(
      expect.objectContaining({ difficulties: ['easy', 'medium', 'hard'] }),
      SID,
    )
  })

  it('routes EASY below 40% and draws the easy/medium band', async () => {
    happyPath()
    assembleMock.mockResolvedValue({ questions: [m2Question(0)] })

    const res = await POST(makeRequest(body(['A', 'X', 'X', 'X', 'X']))) // 1/5 = 20%
    const json = await res.json()
    expect(json.route).toBe('easy')
    expect(assembleMock).toHaveBeenCalledWith(
      expect.objectContaining({ difficulties: ['easy', 'medium'] }),
      SID,
    )
  })

  it('uses the Listening section key when routing a Listening test', async () => {
    happyPath()
    assembleMock.mockResolvedValue({ questions: [m2Question(0)] })

    await POST(makeRequest(body(['A', 'B', 'C', 'D', 'E'], 'Listening')))
    expect(assembleMock).toHaveBeenCalledWith(
      expect.objectContaining({ section: 'listening' }),
      SID,
    )
  })

  it('appends Module 2 to the cache WITHOUT touching Module 1', async () => {
    const { cacheWrite } = happyPath()
    assembleMock.mockResolvedValue({ questions: [m2Question(0), m2Question(1)] })

    await POST(makeRequest(body(['A', 'B', 'C', 'D', 'E'])))

    const written = cacheWrite.update.mock.calls[0][0].content as string
    expect(written.startsWith(MARKER)).toBe(true)
    const merged = JSON.parse(written.slice(MARKER.length))
    // Module 1 verbatim, in order, still first — /submit grades against
    // this row, so any reorder would rescore the whole test.
    expect(merged.questions.slice(0, 5)).toEqual([
      { correct_answer: 'A' }, { correct_answer: 'B' }, { correct_answer: 'C' },
      { correct_answer: 'D' }, { correct_answer: 'E' },
    ])
    expect(merged.questions).toHaveLength(7)
    expect(merged.moduleBreakIdx).toBe(5)
    expect(merged.adaptive).toBe(true)
  })

  it('claims the route with an IS NULL guard so a double-fire cannot draw twice', async () => {
    const { claim } = happyPath()
    assembleMock.mockResolvedValue({ questions: [m2Question(0)] })

    await POST(makeRequest(body(['A', 'B', 'C', 'D', 'E'])))
    // The conditional predicate is the whole idempotency mechanism.
    expect(claim.is).toHaveBeenCalledWith('module2_route', null)
    expect(claim.update).toHaveBeenCalledWith(
      expect.objectContaining({ module2_route: 'hard', module1_correct: 5, module1_total: 5 }),
    )
  })

  it('a lost claim race replays the winner’s Module 2 instead of drawing another', async () => {
    const merged = MARKER + JSON.stringify({
      adaptive: true, family: 'toefl', sectionKey: 'reading', moduleBreakIdx: 5,
      questions: [
        { correct_answer: 'A' }, { correct_answer: 'B' }, { correct_answer: 'C' },
        { correct_answer: 'D' }, { correct_answer: 'E' }, m2Question(0), m2Question(1),
      ],
    })
    enqueue('study_sessions', { data: { id: SID, student_id: 'student-9', module2_route: null } })
    enqueue('study_messages', { data: [{ content: cacheContent() }] })
    enqueue('study_sessions', { data: [] })                      // claim matched 0 rows
    enqueue('study_messages', { data: [{ content: merged }] })   // re-read cache
    enqueue('study_sessions', { data: { module2_route: 'hard', module1_correct: 5, module1_total: 5 } })

    const res = await POST(makeRequest(body(['A', 'B', 'C', 'D', 'E'])))
    const json = await res.json()
    expect(json.alreadyRouted).toBe(true)
    expect(json.route).toBe('hard')
    expect(json.module2Questions).toHaveLength(2)
    expect(assembleMock).not.toHaveBeenCalled()
  })

  it('is idempotent: an already-routed session returns the cached M2 without redrawing', async () => {
    const merged = MARKER + JSON.stringify({
      adaptive: true, family: 'toefl', sectionKey: 'reading', moduleBreakIdx: 5,
      questions: [
        { correct_answer: 'A' }, { correct_answer: 'B' }, { correct_answer: 'C' },
        { correct_answer: 'D' }, { correct_answer: 'E' }, m2Question(0),
      ],
    })
    enqueue('study_sessions', { data: { id: SID, student_id: 'student-9', module2_route: 'medium', module1_correct: 3, module1_total: 5 } })
    enqueue('study_messages', { data: [{ content: merged }] })

    const res = await POST(makeRequest(body(['A', 'B', 'C', 'X', 'X'])))
    const json = await res.json()
    expect(json.alreadyRouted).toBe(true)
    expect(json.route).toBe('medium')
    expect(json.module2Questions).toHaveLength(1)
    expect(assembleMock).not.toHaveBeenCalled()
  })

  it('releases the claim and 409s when the bank cannot fill Module 2', async () => {
    enqueue('study_sessions', { data: { id: SID, student_id: 'student-9', module2_route: null } })
    enqueue('study_messages', { data: [{ content: cacheContent() }] })
    enqueue('study_sessions', { data: [{ id: SID }] })  // claim
    const release = enqueue('study_sessions', { error: null })
    assembleMock.mockRejectedValue(new Error('no verified items for toefl/reading'))

    const res = await POST(makeRequest(body(['A', 'B', 'C', 'D', 'E'])))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('module2_bank_empty')
    // Claim released — the student can retry once the bank is seeded.
    expect(release.update).toHaveBeenCalledWith({ module2_route: null })
  })

  it('Speaking and Writing never route — they are linear sections', async () => {
    for (const sectionName of ['Speaking', 'Writing']) {
      jest.clearAllMocks()
      enqueue = tableRouter(fromMock)
      enqueue('study_sessions', { data: { id: SID, student_id: 'student-9', module2_route: null } })
      enqueue('study_messages', { data: [{ content: cacheContent() }] })

      const res = await POST(makeRequest(body(['A', 'B', 'C', 'D', 'E'], sectionName)))
      expect(res.status).toBe(200)
      expect((await res.json()).route).toBeNull()
      expect(assembleMock).not.toHaveBeenCalled()
    }
  })

  it('legacy pre-adaptive payloads keep the soft behaviour — verdict only, no draw', async () => {
    // Whole section drawn up front (no `adaptive` flag): there is
    // nothing left to draw, so record the route and return no items.
    enqueue('study_sessions', { data: { id: SID, student_id: 'student-9', module2_route: null } })
    enqueue('study_messages', { data: [{ content: MARKER + JSON.stringify({
      family: 'toefl', moduleBreakIdx: 5,
      questions: [
        { correct_answer: 'A' }, { correct_answer: 'B' }, { correct_answer: 'C' },
        { correct_answer: 'D' }, { correct_answer: 'E' }, m2Question(0),
      ],
    }) }] })
    enqueue('study_sessions', { error: null })

    const res = await POST(makeRequest(body(['A', 'B', 'C', 'D', 'E'])))
    const json = await res.json()
    expect(json.route).toBe('hard')
    expect(json.module2Questions).toBeUndefined()
    expect(assembleMock).not.toHaveBeenCalled()
  })
})
