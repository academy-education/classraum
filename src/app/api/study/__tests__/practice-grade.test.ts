/** @jest-environment node */
/**
 * Regression tests for POST /api/study/practice/grade — grading must
 * use the SERVER's cached [practice-v1] copy of a served question,
 * never the client's correct_answer.
 */
import { POST } from '@/app/api/study/practice/grade/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { enforceRateLimit } from '@/lib/rate-limit'
import { awardXp } from '@/lib/study/xp'
import { tableRouter, makeRequest } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: jest.fn(), rpc: jest.fn(), auth: { getUser: jest.fn() } },
}))
jest.mock('@/lib/rate-limit', () => ({ enforceRateLimit: jest.fn(() => null) }))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn() }))
jest.mock('@/lib/study/xp', () => ({ awardXp: jest.fn(async () => undefined) }))
// Keep AI grading off the network — MC/TF paths never call it anyway.
jest.mock('ai', () => ({ generateObject: jest.fn() }))
jest.mock('@ai-sdk/openai', () => ({ createOpenAI: jest.fn(() => jest.fn(() => 'mock-model')) }))

const fromMock = supabaseAdmin.from as unknown as jest.Mock
const requireStudyUserMock = requireStudyUser as unknown as jest.Mock
const enforceRateLimitMock = enforceRateLimit as unknown as jest.Mock

const SESSION = {
  id: 'sess-1', student_id: 'student-1', mode: 'practice', language: 'en', topic_id: 'topic-1',
}

function mcQuestion(prompt: string, correct: string, explanation = 'client explanation') {
  return {
    prompt,
    type: 'multiple_choice' as const,
    choices: ['A', 'B', 'C', 'D'],
    correct_answer: correct,
    difficulty: 'easy' as const,
    explanation,
  }
}

describe('POST /api/study/practice/grade', () => {
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

  function gradeBody(question: unknown, studentAnswer: string) {
    return { sessionId: 'sess-1', question, studentAnswer, timeSpentSeconds: 12 }
  }

  it('grades against the SERVER copy when the prompt matches a served [practice-v1] question', async () => {
    // Server served the question with correct_answer B; the doctored
    // client payload claims A. Student answers A — must be WRONG.
    const serverQ = mcQuestion('What is X?', 'B', 'server explanation')
    const clientQ = mcQuestion('What is X?', 'A', 'client explanation')
    enqueue('study_sessions', { data: SESSION })
    enqueue('study_messages', {
      data: { content: '[practice-v1]' + JSON.stringify({ questions: [serverQ] }) },
    })
    const attemptsChain = enqueue('study_attempts', { error: null })

    const res = await POST(makeRequest(gradeBody(clientQ, 'A')))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ isCorrect: false, aiExplanation: 'server explanation' })
    // The attempt persists the SERVER copy of the question
    expect(attemptsChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      is_correct: false,
      question: expect.objectContaining({ correct_answer: 'B' }),
    }))
    expect(awardXp).not.toHaveBeenCalled()
  })

  it('marks correct when the answer matches the SERVER key even if the client key differs', async () => {
    const serverQ = mcQuestion('What is X?', 'B')
    const clientQ = mcQuestion('What is X?', 'A')
    enqueue('study_sessions', { data: SESSION })
    enqueue('study_messages', {
      data: { content: '[practice-v1]' + JSON.stringify({ questions: [serverQ] }) },
    })
    enqueue('study_attempts', { error: null })

    const res = await POST(makeRequest(gradeBody(clientQ, 'B')))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.isCorrect).toBe(true)
    expect(awardXp).toHaveBeenCalledWith('student-1', 'attempt_correct', 'sess-1')
  })

  it('rejects with 400 a question that is not part of the served set', async () => {
    const serverQ = mcQuestion('A totally different prompt', 'A')
    enqueue('study_sessions', { data: SESSION })
    enqueue('study_messages', {
      data: { content: '[practice-v1]' + JSON.stringify({ questions: [serverQ] }) },
    })

    const res = await POST(makeRequest(gradeBody(mcQuestion('Fabricated?', 'A'), 'A')))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'question is not part of the served set' })
    expect(fromMock).not.toHaveBeenCalledWith('study_attempts')
  })

  it('returns 500 when the served-set lookup returns a DB error (no silent legacy fallback)', async () => {
    enqueue('study_sessions', { data: SESSION })
    enqueue('study_messages', { data: null, error: { message: 'permission denied' } })

    const res = await POST(makeRequest(gradeBody(mcQuestion('What is X?', 'A'), 'A')))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'served batch unreadable' })
    expect(fromMock).not.toHaveBeenCalledWith('study_attempts')
  })

  it('returns 500 when the served-set lookup throws', async () => {
    enqueue('study_sessions', { data: SESSION })
    enqueue('study_messages', {}, { reject: new Error('db connection lost') })

    const res = await POST(makeRequest(gradeBody(mcQuestion('What is X?', 'A'), 'A')))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'served batch unreadable' })
    expect(fromMock).not.toHaveBeenCalledWith('study_attempts')
  })

  it('returns 404 for another student\'s session', async () => {
    enqueue('study_sessions', { data: { ...SESSION, student_id: 'someone-else' } })
    const res = await POST(makeRequest(gradeBody(mcQuestion('What is X?', 'A'), 'A')))
    expect(res.status).toBe(404)
  })
})
