/** @jest-environment node */
/**
 * POST /api/study/test/submit persists an SSAT Writing Sample, graded
 * against the payload production ACTUALLY cached for a real 2026-10-11
 * session (lib/study/__fixtures__/ssat-writing-served.ts), not a tidied
 * fixture. The client half is TestSession.essay-submit.test.tsx.
 *
 * The essay lands in study_attempts.student_answer — the only place a
 * full-test answer is ever stored server-side — with is_correct NULL (no
 * key), item_id = the bank row, and the session completed with score NULL
 * ("not scored", never 0%).
 */
import { POST } from '@/app/api/study/test/submit/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { enforceRateLimit } from '@/lib/rate-limit'
import { tableRouter, makeRequest } from '@/tests/study-route-helpers'
import { SSAT_WRITING_SERVED_2026_10_11 as SERVED } from '@/lib/study/__fixtures__/ssat-writing-served'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn(), rpc: jest.fn(), auth: { getUser: jest.fn() } } }))
jest.mock('@/lib/rate-limit', () => ({ enforceRateLimit: jest.fn(() => null) }))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn() }))
jest.mock('@/lib/study-mastery-assess', () => ({ assessSessionMastery: jest.fn(async () => undefined) }))
jest.mock('@/lib/study/xp', () => ({ awardXp: jest.fn(async () => undefined), XP_VALUES: { session_complete: 50 } }))
jest.mock('@/lib/study/srs-seed', () => ({ seedSrsFromWrongAnswer: jest.fn(async () => undefined) }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => undefined) }))
jest.mock('@/lib/study/analytics', () => ({ trackEvent: jest.fn(async () => undefined) }))

const fromMock = dbAdmin.from as unknown as jest.Mock
const SESSION = { id: 'sess-w', student_id: 'student-1', mode: 'full_test', topic_id: 'topic-ssat-writing', module2_route: null, topic: { slug: 'ssat-writing' } }
const ESSAY = 'I am choosing the Story Starter.\n\nThe vending machine gave back more money than I had put in...'

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  ;(requireStudyUser as unknown as jest.Mock).mockResolvedValue({ user: { id: 'student-1' } })
  ;(enforceRateLimit as unknown as jest.Mock).mockReturnValue(null)
})
afterEach(() => { jest.restoreAllMocks() })

it('stores the essay against the served cache row, ungraded, session completed unscored', async () => {
  const enqueue = tableRouter(fromMock)
  enqueue('study_sessions', { data: SESSION })
  enqueue('study_messages', { data: { content: '[full-test-v1]' + JSON.stringify(SERVED) } })
  enqueue('study_attempts', { data: [] })                     // no prior attempts
  const insert = enqueue('study_attempts', { error: null })
  const complete = enqueue('study_sessions', { error: null })

  // The body is what TestSession sends: the served questions echoed back.
  const res = await POST(makeRequest({
    sessionId: 'sess-w', questions: SERVED.questions, answers: [ESSAY],
    elapsedSeconds: 900, questionSeconds: [900],
  }))
  const body = await res.json()
  expect({ status: res.status, error: body.error }).toEqual({ status: 200, error: undefined })
  expect(body.verdicts).toEqual([expect.objectContaining({ index: 0, ungraded: true })])

  const rows = insert.insert.mock.calls[0][0] as Array<Record<string, unknown>>
  expect(rows).toHaveLength(1)
  expect(rows[0]).toMatchObject({
    session_id: 'sess-w', position: 0, student_answer: ESSAY, is_correct: null,
    item_id: '1c891f4a-d678-4da3-9573-8231c6b00fd6',
  })
  expect(complete.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed', score: null }))
})
