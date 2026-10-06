/** @jest-environment node */
/**
 * Proposed (unscheduled) abandoned-test sweep. Pins: dry run writes nothing;
 * the conditional claim — not a prior read — decides who is refunded; a
 * failed refund pages; an unreadable list is an error, never "0 candidates".
 */
import { sweepAbandonedTests, ABANDON_AFTER_DAYS } from '@/lib/study/abandoned-test-refund'
import { dbAdmin } from '@/lib/supabase-admin'
import { refundTestCredits } from '@/lib/study/credits'
import { raiseAlert } from '@/lib/ops/alert'
import { tableRouter } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn(), rpc: jest.fn() } }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))
jest.mock('@/lib/study/credits', () => ({
  refundTestCredits: jest.fn(async () => ({ refunded: 2, already: 0, noDebit: 4, failed: 0, refundedSources: ['a', 'b'] })),
}))

const from = dbAdmin.from as unknown as jest.Mock
const refund = refundTestCredits as jest.Mock
const NOW = new Date('2026-10-04T00:00:00Z')
const ROWS = [
  { id: 's1', student_id: 'u1', created_at: '2026-09-01T00:00:00Z', config: { family: 'sat' } },
  { id: 's2', student_id: 'u2', created_at: '2026-09-02T00:00:00Z', config: null },
]

describe('sweepAbandonedTests', () => {
  beforeEach(() => jest.clearAllMocks())

  it('dry run lists candidates and writes nothing', async () => {
    const enqueue = tableRouter(from)
    const list = enqueue('study_sessions', { data: ROWS })
    const out = await sweepAbandonedTests({ now: NOW, apply: false })
    expect(out).toMatchObject({ dryRun: true, candidates: 2, claimed: 0, creditsRefunded: 0 })
    expect(refund).not.toHaveBeenCalled()
    expect(from).toHaveBeenCalledTimes(1)
    // the cutoff is N days before now, and module-2 sessions are excluded
    const cutoff = new Date(NOW.getTime() - ABANDON_AFTER_DAYS * 86_400_000).toISOString()
    expect(list.lt).toHaveBeenCalledWith('created_at', cutoff)
    expect(list.is).toHaveBeenCalledWith('module2_route', null)
    // camp assignment sessions charged nothing and must stay visible to
    // the student's shelf and the camp teacher (all read archived=false)
    expect(list.is).toHaveBeenCalledWith('config->campAssignmentId', null)
  })

  it('refunds only rows whose conditional claim lands', async () => {
    const enqueue = tableRouter(from)
    enqueue('study_sessions', { data: ROWS })
    const claim1 = enqueue('study_sessions', { data: [{ id: 's1' }] })   // claimed
    enqueue('study_sessions', { data: [] })                              // s2 submitted meanwhile
    const out = await sweepAbandonedTests({ now: NOW, apply: true })
    expect(out).toMatchObject({ claimed: 1, creditsRefunded: 2 })
    expect(refund).toHaveBeenCalledTimes(1)
    expect(refund).toHaveBeenCalledWith('u1', 's1', 6)
    expect(claim1.update).toHaveBeenCalledWith(expect.objectContaining({ archived: true }))
    expect(claim1.eq).toHaveBeenCalledWith('status', 'active')
    expect(claim1.eq).toHaveBeenCalledWith('archived', false)
  })

  it('a refund that fails pages with the session id', async () => {
    const enqueue = tableRouter(from)
    enqueue('study_sessions', { data: [ROWS[0]] })
    enqueue('study_sessions', { data: [{ id: 's1' }] })
    refund.mockResolvedValueOnce({ refunded: 0, already: 0, noDebit: 0, failed: 2, refundedSources: [] })
    const out = await sweepAbandonedTests({ now: NOW, apply: true })
    expect(out.failedSessions).toEqual(['s1'])
    expect(raiseAlert).toHaveBeenCalledWith(expect.objectContaining({ severity: 'critical', context: expect.objectContaining({ sessionId: 's1' }) }))
  })

  it('an unreadable list throws instead of reporting zero candidates', async () => {
    const enqueue = tableRouter(from)
    enqueue('study_sessions', { error: { message: 'timeout' } })
    await expect(sweepAbandonedTests({ now: NOW, apply: true })).rejects.toThrow(/list failed/)
    expect(refund).not.toHaveBeenCalled()
  })
})
