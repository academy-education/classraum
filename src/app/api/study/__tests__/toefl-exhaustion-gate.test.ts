/** @jest-environment node */
/**
 * The "seen it all" gate in /api/study/test/assemble, for TOEFL.
 *
 * Until 2026-10-06 the route passed `needed: count` to assessCoverage, and
 * TOEFL's count is 0 (the blueprint sizes the draw). 0 is assessCoverage's
 * "no requirement", so the gate could never refuse a TOEFL section: a
 * student who had seen the whole pool was admitted and charged for a pure
 * replay (FORM-QC-2026-10-04 #10). `needed` is now the section's bank-row
 * count from toeflSectionShape — the REAL function, not a restatement, so a
 * blueprint change moves these thresholds with it.
 *
 * Thresholds below are ceil(needed * 2/3) unseen (FRESH_FRACTION):
 *   listening 48 rows → 32, reading 30 → 20, writing 12 → 8, speaking 11 → 8.
 * Each is pinned at its boundary (passes at the threshold, refused one
 * below), so an off-by-one in the derivation fails here.
 *
 * And one gate per cause: a bank too thin to fill the section for ANYONE is
 * the draw's section_unavailable (with its alert), never "you have seen
 * every question".
 */
import { POST } from '@/app/api/study/test/assemble/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { reserveTestCredits } from '@/lib/study/credits'
import { assembleFromBank, assembleToeflFromBank, toeflSectionShape } from '@/lib/study/assemble'
import { SectionShortError, SECTION_UNAVAILABLE } from '@/lib/study/section-availability'
import { tableRouter, makeRequest } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn(), rpc: jest.fn() } }))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn(async () => ({ user: { id: 'stu-1' } })) }))
jest.mock('@/lib/rate-limit', () => ({ enforceRateLimit: jest.fn(() => null) }))
jest.mock('@/lib/study/analytics', () => ({ trackEvent: jest.fn(async () => {}) }))
jest.mock('@/lib/study/entitlements', () => ({ canAccessTest: jest.fn(async () => true) }))
jest.mock('@/lib/study/shipped-tests', () => ({ isShippedTestFamily: jest.fn(() => true) }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))
jest.mock('@/lib/study/credits', () => ({
  reserveTestCredits: jest.fn(async () => ({ ok: true })),
  refundTestCredits: jest.fn(async () => ({ refunded: 1, already: 0, noDebit: 0, failed: 0, refundedSources: [] })),
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
const toefl = assembleToeflFromBank as jest.Mock
const sat = assembleFromBank as jest.Mock

const full = (n: number) => ({
  title: 'T', timeLimitMinutes: 10, section: 'S', family: 'toefl',
  questions: Array.from({ length: n }, () => ({ prompt: 'p', type: 'multiple_choice', choices: ['A', 'B'], correct_answer: 'A' })),
  composition: {}, itemIds: Array.from({ length: n }, (_, i) => `id-${i}`),
})

function db(poolSize: number, seen: number) {
  const enqueue = tableRouter(from)
  enqueue('study_item_bank', { count: poolSize })
  enqueue('study_item_exposures', { count: seen })
  enqueue('study_sessions', { data: { id: 'sess-1' } })
  enqueue('study_sessions', {})
  enqueue('study_messages', { error: null })
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  toefl.mockImplementation(async () => full(20))
  sat.mockImplementation(async () => full(27))
})
afterEach(() => jest.restoreAllMocks())

describe('the derivation is the blueprint, not a literal', () => {
  it('row counts the thresholds below assume', () => {
    // If the blueprint moves, these move — and so do the route's thresholds.
    // This block only states what the boundary cases were computed from.
    expect(toeflSectionShape('listening', 'lower').total.cards).toBe(48)
    expect(toeflSectionShape('listening', 'upper').total.cards).toBe(48)
    expect(toeflSectionShape('reading', 'lower').total.cards).toBe(30)
    expect(toeflSectionShape('writing').total.cards).toBe(12)
    expect(toeflSectionShape('speaking').total.cards).toBe(11)
  })
})

describe('TOEFL: a student who has seen the whole pool is refused, before any charge', () => {
  it('listening, every item seen → 409 pool_exhausted, no draw, no session, no charge', async () => {
    db(200, 200)
    const res = await POST(makeRequest({ family: 'toefl', section: 'listening' }))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ reason: 'pool_exhausted', unseen: 0, shortBy: 32 })
    expect(toefl).not.toHaveBeenCalled()
    expect(reserve).not.toHaveBeenCalled()
  })

  it.each([
    ['listening', 32],
    ['reading', 20],
    ['writing', 8],
    ['speaking', 8],
  ] as const)('%s: admitted at %i unseen, refused one below', async (section, required) => {
    const pool = 200
    db(pool, pool - required)
    const ok = await POST(makeRequest({ family: 'toefl', section }))
    expect(ok.status).toBe(200)
    expect(reserve).toHaveBeenCalledTimes(1)

    jest.clearAllMocks()
    db(pool, pool - required + 1)
    const refused = await POST(makeRequest({ family: 'toefl', section }))
    expect(refused.status).toBe(409)
    expect(await refused.json()).toMatchObject({ reason: 'pool_exhausted', unseen: required - 1, shortBy: 1 })
    expect(toefl).not.toHaveBeenCalled()
    expect(reserve).not.toHaveBeenCalled()
  })
})

describe('one gate per cause: a thin bank is section_unavailable, not "seen it all"', () => {
  it('pool smaller than a full draw goes to the draw, which refuses it as section_unavailable', async () => {
    // 20 rows, all seen: unseen 0 < 32, but no student could get a full
    // Listening section from 20 rows — the bank is short, not the student.
    db(20, 20)
    toefl.mockRejectedValueOnce(new SectionShortError({ scope: 'toefl/listening', want: 27, got: 20 }))
    const res = await POST(makeRequest({ family: 'toefl', section: 'listening' }))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: SECTION_UNAVAILABLE, scope: 'toefl/listening' })
    expect(reserve).not.toHaveBeenCalled()
  })

  it('an empty bank is still no_bank_coverage', async () => {
    db(0, 0)
    const res = await POST(makeRequest({ family: 'toefl', section: 'listening' }))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ reason: 'no_bank_coverage' })
    expect(toefl).not.toHaveBeenCalled()
  })
})

describe('SAT is unchanged', () => {
  it('adaptive R&W gates on its 27-item module: 18 unseen admitted, 17 refused', async () => {
    db(200, 182)
    expect((await POST(makeRequest({ section: 'reading_writing', adaptive: true }))).status).toBe(200)
    jest.clearAllMocks()
    db(200, 183)
    const res = await POST(makeRequest({ section: 'reading_writing', adaptive: true }))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ reason: 'pool_exhausted', unseen: 17 })
  })
})
