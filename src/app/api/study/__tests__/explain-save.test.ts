/** @jest-environment node */
/**
 * POST /api/study/explain persists an explanation ONLY against an attempt the
 * caller owns. Practice now sends an attemptId on every "Explain more", so
 * this is the check that stops a client from attaching text to another
 * student's attempt by sending its id (IDOR).
 */
import { POST } from '@/app/api/study/explain/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { enforceRateLimit } from '@/lib/rate-limit'
import { generateText } from 'ai'
import { tableRouter, makeRequest } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
jest.mock('@/lib/rate-limit', () => ({ enforceRateLimit: jest.fn(() => null) }))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn() }))
jest.mock('@/lib/error-monitoring', () => ({ loggers: { study: { error: jest.fn() } } }))
jest.mock('ai', () => ({ generateText: jest.fn() }))
jest.mock('@ai-sdk/openai', () => ({ createOpenAI: jest.fn(() => jest.fn(() => 'mock-model')) }))

const fromMock = dbAdmin.from as unknown as jest.Mock
const requireStudyUserMock = requireStudyUser as unknown as jest.Mock
const enforceRateLimitMock = enforceRateLimit as unknown as jest.Mock
const generateTextMock = generateText as unknown as jest.Mock

const body = (extra: Record<string, unknown> = {}) => ({
  prompt: 'Which choice?', passage: 'Some passage.', choices: ['a', 'b'],
  correctAnswer: 'b', studentAnswer: 'a', mode: 'more', language: 'en', ...extra,
})

describe('POST /api/study/explain — saving against an attempt', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    requireStudyUserMock.mockResolvedValue({ user: { id: 'student-1' } })
    enforceRateLimitMock.mockReturnValue(null)
    generateTextMock.mockResolvedValue({ text: 'B is right.' })
    enqueue = tableRouter(fromMock)
  })

  it('saves to `more` when the attempt belongs to the caller', async () => {
    enqueue('study_attempts', { data: { id: 'att-1', session: { student_id: 'student-1' } } })
    const save = enqueue('study_attempt_explanations', { error: null })
    const res = await POST(makeRequest(body({ attemptId: 'att-1' })))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ text: 'B is right.' })
    expect(save.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ student_id: 'student-1', attempt_id: 'att-1', language: 'en', more: 'B is right.' }),
      { onConflict: 'student_id,attempt_id,language' },
    )
  })

  it("never writes against another student's attempt (IDOR)", async () => {
    const lookup = enqueue('study_attempts', { data: { id: 'att-x', session: { student_id: 'someone-else' } } })
    const res = await POST(makeRequest(body({ attemptId: 'att-x' })))
    // The caller still gets the text they paid a call for — nothing is saved.
    expect(res.status).toBe(200)
    expect(lookup.eq).toHaveBeenCalledWith('id', 'att-x')
    expect(fromMock).not.toHaveBeenCalledWith('study_attempt_explanations')
  })

  it('never writes when the attempt does not exist', async () => {
    enqueue('study_attempts', { data: null })
    const res = await POST(makeRequest(body({ attemptId: 'missing' })))
    expect(res.status).toBe(200)
    expect(fromMock).not.toHaveBeenCalledWith('study_attempt_explanations')
  })

  it('does not look anything up without an attemptId', async () => {
    const res = await POST(makeRequest(body()))
    expect(res.status).toBe(200)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('passes the passage to the model separately from the question', async () => {
    await POST(makeRequest(body({ passage: 'P'.repeat(5000), prompt: 'The question?' })))
    const ctx = generateTextMock.mock.calls[0][0].prompt as string
    expect(ctx).toContain('The question?')
    expect(ctx).toContain('P'.repeat(5000))
  })

  it('rate-limited callers get no model call and no write', async () => {
    enforceRateLimitMock.mockReturnValue(new Response(null, { status: 429 }))
    const res = await POST(makeRequest(body({ attemptId: 'att-1' })))
    expect(res.status).toBe(429)
    expect(generateTextMock).not.toHaveBeenCalled()
    expect(fromMock).not.toHaveBeenCalled()
  })
})
