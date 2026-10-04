/** @jest-environment node */
/**
 * Every student-facing study route listed here must record its non-2xx
 * responses (src/lib/ops/api-failure.ts). The essay-submit 400 ran for a
 * week because nothing did. The static half pins the wiring on every
 * route; the behavioural half proves the wrapper actually runs on one.
 */
import fs from 'fs'
import path from 'path'
import { POST } from '@/app/api/study/test/submit/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { tableRouter, makeRequest } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({
  dbAdmin: { from: jest.fn(), rpc: jest.fn(), auth: { getUser: jest.fn() } },
}))
jest.mock('@/lib/rate-limit', () => ({ enforceRateLimit: jest.fn(() => null) }))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn() }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))
jest.mock('@/lib/study-mastery-assess', () => ({ assessSessionMastery: jest.fn(async () => undefined) }))

const WRAPPED = [
  'test/submit', 'test/assemble', 'test/generate',
  'response/grade', 'response/grade-batch', 'explain', 'referral/redeem',
]

describe('study routes record their failures', () => {
  it.each(WRAPPED)('%s exports POST through withApiFailureLogging', (r) => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/app/api/study', r, 'route.ts'), 'utf8')
    expect(src).toMatch(new RegExp(`export const POST = withApiFailureLogging\\('study/${r}', handlePOST\\)`))
    expect(src).not.toMatch(/export async function POST/)
  })

  it('a bad submit payload writes an error_logs row (no answer text)', async () => {
    const fromMock = dbAdmin.from as unknown as jest.Mock
    const enqueue = tableRouter(fromMock)
    const insert = enqueue('error_logs', { error: null })
    ;(requireStudyUser as unknown as jest.Mock).mockResolvedValue({ user: { id: 'student-1' } })
    ;(dbAdmin.auth.getUser as unknown as jest.Mock).mockResolvedValue({ data: { user: { id: 'student-1' } } })
    jest.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(makeRequest({
      sessionId: 'sess-1',
      questions: [{ prompt: 'Q', type: 'not_a_real_type', choices: [], correct_answer: 'SECRET-ANSWER-TEXT' }],
      answers: ['SECRET-ANSWER-TEXT'],
      elapsedSeconds: 10,
    }))
    expect(res.status).toBe(400)
    expect(insert.insert).toHaveBeenCalledTimes(1)
    const row = insert.insert.mock.calls[0][0]
    expect(row).toMatchObject({ service_name: 'StudyApi', user_id: 'student-1' })
    expect(row.context).toMatchObject({ route: 'study/test/submit', status: 400, error: 'bad payload' })
    expect(JSON.stringify(row)).not.toContain('SECRET-ANSWER-TEXT')
  })
})
