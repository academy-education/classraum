/** @jest-environment node */
/**
 * The "seen it all" gate for FREE-RESPONSE-ONLY sections (SSAT Writing
 * Sample, ISEE Essay).
 *
 * 2026-10-11: a real student opened SSAT -> Writing -> Full test and was told
 * "You have worked through every question we have for this section". She had
 * never saved an essay. Exposures are written at serve time, the section is
 * one prompt per test from a pool of five, and she had opened it five times —
 * four of them on 2026-10-03, while every essay submit 400'd. Five serves,
 * zero submissions, locked out.
 *
 * For a pool with NO keyed items the gate now counts prompts the student
 * SUBMITTED a non-blank response to. Every keyed or mixed section keeps the
 * serve-time exposure count, and so does any read failure.
 *
 * DB order the route issues (per-table FIFO in tableRouter):
 *   study_item_bank #1  pool head count
 *   study_item_exposures  serve-time exposure head count
 *   study_item_bank #2  keyed-item head count (0 = free-response only)
 *   study_item_bank #3  pool ids               (free-response only)
 *   study_attempts      the student's attempts on those ids
 */
import { POST } from '@/app/api/study/test/assemble/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { reserveTestCredits } from '@/lib/study/credits'
import { assembleAdmissionSection } from '@/lib/study/assemble'
import { tableRouter, makeRequest, type QueryResult, type ChainMock } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn(), rpc: jest.fn() } }))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn(async () => ({ user: { id: 'stu-1' } })) }))
jest.mock('@/lib/rate-limit', () => ({ enforceRateLimit: jest.fn(() => null) }))
jest.mock('@/lib/study/analytics', () => ({ trackEvent: jest.fn(async () => {}) }))
jest.mock('@/lib/study/entitlements', () => ({ canAccessTest: jest.fn(async () => true) }))
jest.mock('@/lib/study/shipped-tests', () => ({ isShippedTestFamily: jest.fn(() => true) }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))
jest.mock('@/lib/study/credits', () => ({
  reserveTestCredits: jest.fn(async () => ({ ok: true })),
  refundTestCredits: jest.fn(async () => ({ refunded: 2, already: 0, noDebit: 0, failed: 0, refundedSources: [] })),
}))
jest.mock('@/lib/study/assemble', () => ({
  assembleFromBank: jest.fn(),
  assembleToeflFromBank: jest.fn(),
  assembleAdmissionSection: jest.fn(),
  assembleActSection: jest.fn(),
  recordTestExposures: jest.fn(async () => {}),
  toeflSectionShape: jest.requireActual('@/lib/study/assemble').toeflSectionShape,
}))

const from = dbAdmin.from as unknown as jest.Mock
const reserve = reserveTestCredits as jest.Mock
const admission = assembleAdmissionSection as jest.Mock

const POOL = ['p1', 'p2', 'p3', 'p4', 'p5']
const essayTest = () => ({
  title: 'SSAT — Writing', timeLimitMinutes: 25, section: 'Writing', family: 'ssat',
  questions: [{ prompt: 'Choose ONE of the two prompts below.', type: 'essay_choice', choices: [], correct_answer: '' }],
  composition: { Writing: 1 }, itemIds: ['p1'],
})
const mcTest = (n: number) => ({
  title: 'SSAT — Verbal', timeLimitMinutes: 30, section: 'Verbal', family: 'ssat',
  questions: Array.from({ length: n }, () => ({ prompt: 'p', type: 'multiple_choice', choices: ['A', 'B', 'C', 'D', 'E'], correct_answer: 'A' })),
  composition: {}, itemIds: Array.from({ length: n }, (_, i) => `id-${i}`),
})

interface Gate {
  pool: number
  exposures: number
  keyed: QueryResult
  poolIds?: QueryResult
  attempts?: QueryResult
}
function db(g: Gate): { keyed: ChainMock } {
  const enqueue = tableRouter(from)
  enqueue('study_item_bank', { count: g.pool })
  enqueue('study_item_exposures', { count: g.exposures })
  const keyed = enqueue('study_item_bank', g.keyed)
  if (g.poolIds) enqueue('study_item_bank', g.poolIds)
  if (g.attempts) enqueue('study_attempts', g.attempts)
  enqueue('study_sessions', { data: { id: 'sess-1' } })   // insert
  enqueue('study_sessions', {})                            // title update
  enqueue('study_messages', { error: null })               // cache write
  return { keyed }
}

const ayoung = (attempts: QueryResult): Gate => ({
  pool: 5, exposures: 5, keyed: { count: 0 },
  poolIds: { data: POOL.map(id => ({ id })) },
  attempts,
})

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  admission.mockImplementation(async () => essayTest())
})
afterEach(() => jest.restoreAllMocks())

describe('free-response-only section: seen = submitted, not served', () => {
  it('five serves and zero submissions (the 2026-10-11 student) is NOT exhausted', async () => {
    db(ayoung({ data: [] }))
    const res = await POST(makeRequest({ family: 'ssat', section: 'writing' }))
    expect(res.status).toBe(200)
    expect(admission).toHaveBeenCalled()
    expect(reserve).toHaveBeenCalled()
  })

  it('the keyed-count probe excludes exactly the open-response types', async () => {
    const { keyed } = db(ayoung({ data: [] }))
    await POST(makeRequest({ family: 'ssat', section: 'writing' }))
    expect(keyed.not).toHaveBeenCalledWith('item_type', 'in', expect.stringMatching(/essay_choice/))
    const list = String(keyed.not.mock.calls[0][2])
    expect(list).toMatch(/\bessay\b/)
    expect(list).not.toMatch(/multiple_choice/)
  })

  it('all five prompts actually written IS exhausted', async () => {
    db(ayoung({ data: POOL.map(id => ({ item_id: id, student_answer: 'I chose the essay. My reason is...' })) }))
    const res = await POST(makeRequest({ family: 'ssat', section: 'writing' }))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ reason: 'pool_exhausted', unseen: 0 })
    expect(reserve).not.toHaveBeenCalled()
  })

  it('a blank or whitespace-only submission is not a written prompt', async () => {
    db(ayoung({ data: [
      ...POOL.slice(0, 4).map(id => ({ item_id: id, student_answer: 'A real essay.' })),
      { item_id: 'p5', student_answer: '   \n ' },
    ] }))
    const res = await POST(makeRequest({ family: 'ssat', section: 'writing' }))
    expect(res.status).toBe(200)
  })

  it('attempts on items outside this pool do not count', async () => {
    db(ayoung({ data: ['x1', 'x2', 'x3', 'x4', 'x5'].map(id => ({ item_id: id, student_answer: 'text' })) }))
    const res = await POST(makeRequest({ family: 'ssat', section: 'writing' }))
    expect(res.status).toBe(200)
  })
})

describe('everything else keeps the serve-time count', () => {
  it('a keyed section with every item served is still refused (MC gate not weakened)', async () => {
    admission.mockImplementation(async () => mcTest(60))
    // No poolIds/attempts enqueued: a keyed pool must never reach them.
    db({ pool: 60, exposures: 60, keyed: { count: 60 } })
    const res = await POST(makeRequest({ family: 'ssat', section: 'verbal' }))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ reason: 'pool_exhausted' })
    expect(from.mock.calls.map(c => c[0])).not.toContain('study_attempts')
  })

  it('a failed keyed-count probe falls back to exposures, not to "nothing seen"', async () => {
    db({ pool: 5, exposures: 5, keyed: { count: null, error: { message: 'boom' } } })
    const res = await POST(makeRequest({ family: 'ssat', section: 'writing' }))
    expect(res.status).toBe(409)
  })

  it('a failed attempts read falls back to exposures', async () => {
    db(ayoung({ data: null, error: { message: 'boom' } }))
    const res = await POST(makeRequest({ family: 'ssat', section: 'writing' }))
    expect(res.status).toBe(409)
  })

  it('a failed pool-id read falls back to exposures', async () => {
    db({ pool: 5, exposures: 5, keyed: { count: 0 }, poolIds: { data: null, error: { message: 'boom' } } })
    const res = await POST(makeRequest({ family: 'ssat', section: 'writing' }))
    expect(res.status).toBe(409)
  })
})
