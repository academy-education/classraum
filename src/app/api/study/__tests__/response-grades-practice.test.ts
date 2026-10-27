/** @jest-environment node */
/**
 * GET /api/study/response/grades with an SSAT/ISEE practice-essay row
 * (2026-10-27). getRubric has no rubric for a practice family, so without
 * the practice branch this lookup threw and the result screen got a 500 for
 * EVERY grade in the session, TOEFL or not.
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/study/response/grades/route'
import { dbAdmin } from '@/lib/supabase-admin'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn(async () => ({ user: { id: 'stu-1' } })) }))

const ROWS = [
  {
    id: 'a', prompt_text: 'Choose ONE of the two prompts below and write your response. You have 25 minutes.',
    skill: 'writing', test_family: 'ssat', audio_path: null, created_at: '2026-10-27T00:00:00Z',
    study_response_grades: [{
      overall_band: 3.5, summary: 's', rubric_scores: [{ key: 'organization', evidence: 'e', score: 3 }],
      annotations: [{ kind: 'strength', quote: 'q', comment: 'c', quoteVerified: true }],
    }],
  },
  {
    id: 'b', prompt_text: '[Email] Reply.', skill: 'writing', test_family: 'toefl', audio_path: null,
    created_at: '2026-10-27T00:00:01Z',
    study_response_grades: [{ overall_band: 4, summary: null, rubric_scores: [], annotations: [{ quote: 'x' }] }],
  },
]

beforeEach(() => {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order']) b[m] = jest.fn(() => b)
  b.then = (ok: (v: unknown) => unknown) => Promise.resolve(ok({ data: ROWS, error: null }))
  ;(dbAdmin.from as jest.Mock).mockReturnValue(b)
})

it('returns the practice grade on the 1-5 scale, flagged practice, with its comments', async () => {
  const res = (await GET(new NextRequest('http://localhost/api/study/response/grades?sessionId=s1')))!
  expect(res.status).toBe(200)
  const { grades } = await res.json()
  expect(grades[ROWS[0]!.prompt_text]).toMatchObject({
    band: 3.5, scaleMax: 5, practice: true,
    comments: [{ kind: 'strength', quote: 'q', comment: 'c', quoteVerified: true }],
  })
  // The TOEFL grade beside it is unchanged and not flagged practice.
  expect(grades['[Email] Reply.']).toMatchObject({ band: 4, scaleMax: 5, practice: false, comments: null })
})
