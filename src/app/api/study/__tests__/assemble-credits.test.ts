/** @jest-environment node */
/**
 * /api/study/test/assemble — the two credit defects fixed 2026-10-04.
 *
 * 1. FREE PATH STOPS WERE CLIENT-DEFINED. creditCost is 0 whenever a
 *    pathNode is present, and pathNode / count / domain all came from the
 *    body, so { section:'math', count:54, pathNode:'x' } was a free 54-item
 *    mock, repeatable with a new id each time. Now only a real full_test
 *    stop is free, at that stop's own length.
 * 2. A FAILED ROLLBACK REFUND WAS SILENT. refundTestCredits does not throw;
 *    the route discarded its result and deleted the session, so a student
 *    could be left debited for a test that never existed, with no signal.
 */
import { POST } from '@/app/api/study/test/assemble/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { reserveTestCredits, refundTestCredits } from '@/lib/study/credits'
import { assembleFromBank, assembleToeflFromBank } from '@/lib/study/assemble'
import { PATHS, pathTestRequestBody } from '@/lib/study-path'
import { raiseAlert } from '@/lib/ops/alert'
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
  refundTestCredits: jest.fn(async () => ({ refunded: 3, already: 0, noDebit: 0, failed: 0, refundedSources: [] })),
}))
jest.mock('@/lib/study/assemble', () => ({
  assembleFromBank: jest.fn(async () => ({ title: 'SAT Math', questions: [{}], composition: {} })),
  assembleToeflFromBank: jest.fn(async () => ({ title: 'TOEFL', questions: [{}], composition: {} })),
  assembleAdmissionSection: jest.fn(),
  assembleActSection: jest.fn(),
  recordTestExposures: jest.fn(async () => {}),
}))

const from = dbAdmin.from as unknown as jest.Mock
const reserve = reserveTestCredits as jest.Mock
const refund = refundTestCredits as jest.Mock
const assemble = assembleFromBank as jest.Mock
const alert = raiseAlert as jest.Mock
const assembleToefl = assembleToeflFromBank as jest.Mock

function happyDb() {
  const enqueue = tableRouter(from)
  enqueue('study_sessions', { data: [] })                        // node-completed check (path only)
  enqueue('study_item_bank', { count: 1000 })
  enqueue('study_item_exposures', { count: 0 })
  enqueue('study_sessions', { data: { id: 'sess-1' } })          // insert
  return enqueue
}
/** Same, without the path-completed probe (non-path requests skip it). */
function happyDbNoPath() {
  const enqueue = tableRouter(from)
  enqueue('study_item_bank', { count: 1000 })
  enqueue('study_item_exposures', { count: 0 })
  enqueue('study_sessions', { data: { id: 'sess-1' } })
  return enqueue
}

describe('path stops are resolved server-side', () => {
  beforeEach(() => jest.clearAllMocks())

  it('an invented pathNode is rejected before any session or credit work', async () => {
    happyDb()
    const res = await POST(makeRequest({ section: 'math', count: 54, pathNode: 'free-mock-please' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ reason: 'bad_path_node' })
    expect(assemble).not.toHaveBeenCalled()
    expect(reserve).not.toHaveBeenCalled()
  })

  it('a practice stop id cannot be used to start a free test', async () => {
    happyDb()
    const res = await POST(makeRequest({ section: 'math', pathNode: 'sat-math-algebra-1' }))
    expect(res.status).toBe(400)
  })

  it('a real stop sent with the wrong section is rejected', async () => {
    happyDb()
    const res = await POST(makeRequest({ section: 'reading_writing', pathNode: 'sat-math-section' }))
    expect(res.status).toBe(400)
  })

  it('a real stop is free but drawn at the STOP length, never the body count, and never adaptive', async () => {
    happyDb()
    const res = await POST(makeRequest({ section: 'math', count: 54, adaptive: true, pathNode: 'sat-math-section' }))
    expect(res.status).toBe(200)
    expect(reserve).not.toHaveBeenCalled()
    expect(assemble).toHaveBeenCalledWith(expect.objectContaining({ count: 22 }), 'sess-1')
    expect((await res.json()).adaptive).toBe(false)
  })

  it('a paid request (no pathNode) still reserves the SAT price and honours count', async () => {
    happyDbNoPath()
    const res = await POST(makeRequest({ section: 'math', count: 30 }))
    expect(res.status).toBe(200)
    expect(reserve).toHaveBeenCalledWith('stu-1', 'sess-1', 3, 'sat', expect.anything())
    expect(assemble).toHaveBeenCalledWith(expect.objectContaining({ count: 30 }), 'sess-1')
  })
})

describe('rollback after a reserve', () => {
  beforeEach(() => jest.clearAllMocks())

  // Since "Block short tests" (2026-10-04) the draw runs BEFORE the
  // reserve, so a failed draw has nothing to refund: no debit was taken.
  it('assembler throws → 409 with no reserve, no refund, no alert', async () => {
    happyDbNoPath()
    assemble.mockRejectedValueOnce(new Error('no verified items'))
    const res = await POST(makeRequest({ section: 'math' }))
    expect(res.status).toBe(409)
    expect(reserve).not.toHaveBeenCalled()
    expect(refund).not.toHaveBeenCalled()
    expect(alert).not.toHaveBeenCalled()
  })

  it('cache write fails and the refund FAILS → critical alert', async () => {
    const enqueue = happyDbNoPath()
    enqueue('study_messages', { error: { message: 'insert failed' } })
    refund.mockResolvedValueOnce({ refunded: 0, already: 0, noDebit: 0, failed: 3, refundedSources: [] })
    const res = await POST(makeRequest({ section: 'math' }))
    expect(res.status).toBe(500)
    expect(alert).toHaveBeenCalledWith(expect.objectContaining({ severity: 'critical' }))
  })
})

/*
 * 3. EVERY PATH TEST STOP MUST START (2026-10-04). The path page sent
 *    `section` with no `family`; the route defaulted to 'sat', so every
 *    TOEFL stop ('reading', 'speaking', ...) came back 400 and the page's
 *    catch silently bounced the student to the topic page. Driven from
 *    PATHS so a new family's stops are covered the day they are added.
 */
describe('every path test stop starts, free, at its own length', () => {
  beforeEach(() => jest.clearAllMocks())

  const stops = PATHS.flatMap(p => p.nodes.filter(n => n.launchMode === 'full_test').map(n => ({ path: p, node: n })))

  it('covers both families that have paths (guard against an empty table)', () => {
    const fams = new Set(stops.map(s => pathTestRequestBody(s.node.id)?.family))
    expect(fams).toEqual(new Set(['sat', 'toefl']))
    expect(stops.length).toBe(14) // 4 SAT + 10 TOEFL
  })

  it.each(stops.map(s => [s.node.id, s] as const))('%s', async (_id, { path, node }) => {
    happyDb()
    const body = pathTestRequestBody(node.id)
    expect(body).not.toBeNull()
    const res = await POST(makeRequest(body!))
    expect(res.status).toBe(200)
    expect(reserve).not.toHaveBeenCalled()
    expect((await res.json()).adaptive).toBe(false)
    if (path.testSlug === 'test-toefl') {
      expect(assembleToefl).toHaveBeenCalledTimes(1)
      const arg = assembleToefl.mock.calls[0][0]
      expect(arg.module).toBeUndefined()
      expect(arg.maxItems).toBe(node.questionCount)
      expect(arg.domain).toBe(node.domain)
    } else {
      expect(assemble).toHaveBeenCalledWith(expect.objectContaining({ count: node.questionCount ?? 22 }), 'sess-1')
    }
  })

  it('a TOEFL stop from an older client (no family) still starts', async () => {
    happyDb()
    const res = await POST(makeRequest({ section: 'reading', count: 3, pathNode: 'toefl-rd-ctw', domain: 'Complete the Words' }))
    expect(res.status).toBe(200)
    expect(reserve).not.toHaveBeenCalled()
    expect(assembleToefl).toHaveBeenCalledWith(expect.objectContaining({ maxItems: 3, domain: 'Complete the Words' }), 'sess-1')
  })

  it('a TOEFL stop with an explicit wrong family is rejected', async () => {
    happyDb()
    const res = await POST(makeRequest({ family: 'sat', section: 'math', pathNode: 'toefl-reading-section' }))
    expect(res.status).toBe(400)
    expect(assembleToefl).not.toHaveBeenCalled()
    expect(reserve).not.toHaveBeenCalled()
  })

  it('a TOEFL stop cannot be turned adaptive by the body', async () => {
    happyDb()
    const res = await POST(makeRequest({ family: 'toefl', section: 'listening', adaptive: true, pathNode: 'toefl-listening-section' }))
    expect(res.status).toBe(200)
    expect(assembleToefl.mock.calls[0][0].module).toBeUndefined()
  })

  it('a paid TOEFL section (no pathNode) is still adaptive and charged', async () => {
    happyDbNoPath()
    const res = await POST(makeRequest({ family: 'toefl', section: 'reading' }))
    expect(res.status).toBe(200)
    expect(reserve).toHaveBeenCalled()
    expect(assembleToefl.mock.calls[0][0].module).toBe(1)
  })
})
