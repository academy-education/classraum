/** @jest-environment node */
/**
 * Regression tests for POST /api/study/test/submit — full-test grading
 * must be anti-forgery: when a server-side [full-test-v1] cache row
 * exists it is authoritative and client-sent answer keys are never
 * trusted.
 */
import { NextResponse } from 'next/server'
import { POST } from '@/app/api/study/test/submit/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { enforceRateLimit } from '@/lib/rate-limit'
import { tableRouter, makeRequest } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: jest.fn(), rpc: jest.fn(), auth: { getUser: jest.fn() } },
}))
jest.mock('@/lib/rate-limit', () => ({ enforceRateLimit: jest.fn(() => null) }))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn() }))
jest.mock('@/lib/study-mastery-assess', () => ({
  assessSessionMastery: jest.fn(async () => undefined),
}))

const fromMock = supabaseAdmin.from as unknown as jest.Mock
const requireStudyUserMock = requireStudyUser as unknown as jest.Mock
const enforceRateLimitMock = enforceRateLimit as unknown as jest.Mock

function mcQuestion(prompt: string, correct: string) {
  return {
    prompt,
    type: 'multiple_choice' as const,
    choices: ['A', 'B', 'C', 'D'],
    correct_answer: correct,
    difficulty: 'easy' as const,
    explanation: 'because',
  }
}

const SESSION = { id: 'sess-1', student_id: 'student-1', mode: 'full_test', topic_id: 'topic-1' }

describe('POST /api/study/test/submit', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    requireStudyUserMock.mockResolvedValue({ user: { id: 'student-1' } })
    enforceRateLimitMock.mockReturnValue(null)
    enqueue = tableRouter(fromMock)
  })

  afterEach(() => {
    ;(console.error as jest.Mock).mockRestore()
  })

  function submitBody(questions: unknown[], answers: (string | null)[]) {
    return {
      sessionId: 'sess-1',
      questions,
      answers,
      elapsedSeconds: 300,
    }
  }

  it('returns the auth response as-is when unauthorized', async () => {
    const denied = NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    requireStudyUserMock.mockResolvedValue({ response: denied })

    const res = await POST(makeRequest(submitBody([mcQuestion('Q1', 'A')], ['A'])))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('grades against client questions when no cache row exists (legacy session) with correct math', async () => {
    const questions = [mcQuestion('Q1', 'A'), mcQuestion('Q2', 'A'), mcQuestion('Q3', 'A')]
    enqueue('study_sessions', { data: SESSION })
    enqueue('study_messages', { data: null }) // no [full-test-v1] cache
    enqueue('study_attempts', { data: [] })   // no prior attempts
    const insertChain = enqueue('study_attempts', { error: null })
    enqueue('study_sessions', { data: null }) // completion update

    const res = await POST(makeRequest(submitBody(questions, ['A', 'A', 'B'])))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      success: true,
      totalQuestions: 3,
      correctCount: 2,
      scorePercent: 67,
    })
    expect(body.verdicts).toEqual([
      { index: 0, correct: true, correctAnswer: 'A' },
      { index: 1, correct: true, correctAnswer: 'A' },
      { index: 2, correct: false, correctAnswer: 'A' },
    ])
    // Persisted one attempt row per question
    const rows = insertChain.insert.mock.calls[0][0]
    expect(rows).toHaveLength(3)
    expect(rows.map((r: { is_correct: boolean }) => r.is_correct)).toEqual([true, true, false])
  })

  it('grades against the SERVER cache when a [full-test-v1] row exists — client answer key is ignored', async () => {
    // Server says the correct answer is B; the doctored client payload
    // claims A is correct and answers A everywhere.
    const serverQs = [mcQuestion('Q1', 'B'), mcQuestion('Q2', 'B'), mcQuestion('Q3', 'B')]
    const clientQs = [mcQuestion('Q1', 'A'), mcQuestion('Q2', 'A'), mcQuestion('Q3', 'A')]
    enqueue('study_sessions', { data: SESSION })
    enqueue('study_messages', {
      data: { content: '[full-test-v1]' + JSON.stringify({ questions: serverQs }) },
    })
    enqueue('study_attempts', { data: [] })
    enqueue('study_attempts', { error: null })
    enqueue('study_sessions', { data: null })

    const res = await POST(makeRequest(submitBody(clientQs, ['A', 'A', 'A'])))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ totalQuestions: 3, correctCount: 0, scorePercent: 0 })
    // Verdicts reveal the server's answer key, not the client's
    expect(body.verdicts.every((v: { correctAnswer: string }) => v.correctAnswer === 'B')).toBe(true)
  })

  it('rejects with 400 when submitted question count mismatches the cached test', async () => {
    const serverQs = [mcQuestion('Q1', 'A'), mcQuestion('Q2', 'A')]
    const clientQs = [mcQuestion('Q1', 'A'), mcQuestion('Q2', 'A'), mcQuestion('Q3', 'A')]
    enqueue('study_sessions', { data: SESSION })
    enqueue('study_messages', {
      data: { content: '[full-test-v1]' + JSON.stringify({ questions: serverQs }) },
    })

    const res = await POST(makeRequest(submitBody(clientQs, ['A', 'A', 'A'])))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: 'submitted question count does not match the served test',
    })
    expect(fromMock).not.toHaveBeenCalledWith('study_attempts')
  })

  it('returns 500 when the cache row exists but its JSON is unparseable — never falls back to client questions', async () => {
    enqueue('study_sessions', { data: SESSION })
    enqueue('study_messages', { data: { content: '[full-test-v1]{not-json' } })

    const res = await POST(makeRequest(submitBody([mcQuestion('Q1', 'A')], ['A'])))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'served test payload unreadable' })
    expect(fromMock).not.toHaveBeenCalledWith('study_attempts')
  })

  it('returns 500 when the cached questions fail schema validation — never falls back to client questions', async () => {
    enqueue('study_sessions', { data: SESSION })
    enqueue('study_messages', {
      data: { content: '[full-test-v1]' + JSON.stringify({ questions: [{}] }) },
    })

    const res = await POST(makeRequest(submitBody([mcQuestion('Q1', 'A')], ['A'])))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'served test payload unreadable' })
    expect(fromMock).not.toHaveBeenCalledWith('study_attempts')
  })

  it('returns 500 when the cache lookup returns a DB error (no silent client-key fallback)', async () => {
    enqueue('study_sessions', { data: SESSION })
    enqueue('study_messages', { data: null, error: { message: 'permission denied' } })

    const res = await POST(makeRequest(submitBody([mcQuestion('Q1', 'A')], ['A'])))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'served test payload unreadable' })
    expect(fromMock).not.toHaveBeenCalledWith('study_attempts')
  })

  it('returns 404 when the session belongs to a different student', async () => {
    enqueue('study_sessions', { data: { ...SESSION, student_id: 'someone-else' } })
    const res = await POST(makeRequest(submitBody([mcQuestion('Q1', 'A')], ['A'])))
    expect(res.status).toBe(404)
  })

  it('returns the rate-limit response as-is when blocked', async () => {
    const limited = NextResponse.json({ error: 'rate limited' }, { status: 429 })
    enforceRateLimitMock.mockReturnValue(limited)
    const res = await POST(makeRequest(submitBody([mcQuestion('Q1', 'A')], ['A'])))
    expect(res.status).toBe(429)
    expect(fromMock).not.toHaveBeenCalled()
  })
})
