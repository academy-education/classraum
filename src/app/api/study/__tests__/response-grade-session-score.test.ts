/** @jest-environment node */
/**
 * /api/study/response/grade serves two callers: dedicated response-mode
 * practice (one item IS the session) and the full-test review panel (one
 * item of many). It wrote `score = band / scaleMax` onto the session for
 * both, so a review-panel grade replaced a whole TOEFL Writing/Speaking
 * section score in history with one card's band. A full test must be
 * rescored by the shared scorer instead.
 */
import { POST } from '@/app/api/study/response/grade/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { gradeAndPersistResponse } from '@/lib/study/gradeResponse'
import { recomputeAndPersistSessionScore } from '@/lib/study/persist-session-score'
import { tableRouter, makeRequest } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn(), rpc: jest.fn() } }))
jest.mock('@/lib/rate-limit', () => ({ enforceRateLimit: jest.fn(() => null) }))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn() }))
jest.mock('@/lib/study/xp', () => ({ awardXp: jest.fn(async () => undefined), XP_VALUES: { response_graded: 10 } }))
jest.mock('@/lib/study/notify', () => ({ notifyStudent: jest.fn(async () => undefined) }))
jest.mock('@/lib/study/persist-session-score', () => ({
  recomputeAndPersistSessionScore: jest.fn(async () => ({ score: 72, updated: true })),
}))
jest.mock('@/lib/study/gradeResponse', () => {
  class GradeGenerationError extends Error {}
  class GradePersistError extends Error {}
  return { gradeAndPersistResponse: jest.fn(), GradeGenerationError, GradePersistError }
})

const fromMock = dbAdmin.from as unknown as jest.Mock
const SID = '11111111-1111-4111-8111-111111111111'

async function grade(mode: 'full_test' | 'response') {
  const enqueue = tableRouter(fromMock)
  enqueue('study_sessions', { data: { id: SID, student_id: 'student-1', mode, language: 'en' } })
  const sessionWrite = enqueue('study_sessions', { error: null })
  const res = await POST(makeRequest({
    sessionId: SID, testFamily: 'toefl', skill: 'writing', taskType: 'email',
    promptText: 'Write an email to your manager about the schedule.',
    responseText: 'Dear Ms Lee, I am writing about next week and the schedule change.',
  }))
  return { res, sessionWrite }
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(requireStudyUser as unknown as jest.Mock).mockResolvedValue({ user: { id: 'student-1' } })
  ;(gradeAndPersistResponse as unknown as jest.Mock).mockResolvedValue({
    cached: false, submissionId: 'sub-1', scaleMax: 5, xpSourceId: 'x',
    grade: { overallBand: 2, summary: '' }, diagnostics: null,
  })
})

it('a full-test review grade rescores the section, never writes one item band as the score', async () => {
  const { res, sessionWrite } = await grade('full_test')
  expect(res.status).toBe(200)
  expect(recomputeAndPersistSessionScore).toHaveBeenCalledWith(SID)
  expect(sessionWrite.update).not.toHaveBeenCalled()
})

it('response-mode practice still completes its own session with the band', async () => {
  const { res, sessionWrite } = await grade('response')
  expect(res.status).toBe(200)
  expect(sessionWrite.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed', score: 40 }))
  expect(recomputeAndPersistSessionScore).not.toHaveBeenCalled()
})
