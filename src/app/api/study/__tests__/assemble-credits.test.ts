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
import { assembleFromBank } from '@/lib/study/assemble'
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
  assembleToeflFromBank: jest.fn(),
  assembleAdmissionSection: jest.fn(),
  assembleActSection: jest.fn(),
}))

const from = dbAdmin.from as unknown as jest.Mock
const reserve = reserveTestCredits as jest.Mock
const refund = refundTestCredits as jest.Mock
const assemble = assembleFromBank as jest.Mock
const alert = raiseAlert as jest.Mock

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

  it('assembler throws and the refund FAILS → critical alert naming the session', async () => {
    happyDbNoPath()
    assemble.mockRejectedValueOnce(new Error('no verified items'))
    refund.mockResolvedValueOnce({ refunded: 1, already: 0, noDebit: 0, failed: 2, refundedSources: ['x'] })
    const res = await POST(makeRequest({ section: 'math' }))
    expect(res.status).toBe(409)
    expect(refund).toHaveBeenCalledWith('stu-1', 'sess-1', 3)
    expect(alert).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'critical',
      context: expect.objectContaining({ sessionId: 'sess-1', studentId: 'stu-1', failed: 2 }),
    }))
  })

  it('assembler throws and the refund succeeds → no alert', async () => {
    happyDbNoPath()
    assemble.mockRejectedValueOnce(new Error('no verified items'))
    const res = await POST(makeRequest({ section: 'math' }))
    expect(res.status).toBe(409)
    expect(refund).toHaveBeenCalled()
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
