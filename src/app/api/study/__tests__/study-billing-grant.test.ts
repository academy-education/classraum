/** @jest-environment node */
/**
 * Regression test for the study-billing cron §4 — the monthly
 * credit-grant refresh that keeps ANNUAL subscribers topped up every 30
 * days even though they're only charged once a year.
 *
 * The charge sections (§1–§3) are exercised with empty result sets so
 * this test isolates the grant sweep: an active annual sub whose
 * next_grant_at has passed (but whose yearly charge isn't due) must have
 * its grant reset to the plan allotment, next_grant_at advanced, and a
 * ledger row written — WITHOUT any PortOne charge.
 */
import { GET } from '@/app/api/cron/study-billing/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyCronAuth } from '@/lib/cron-auth'
import { chargeBillingKey } from '@/lib/portone-charge'
import { NextRequest } from 'next/server'
import { tableRouter } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: jest.fn() },
}))
jest.mock('@/lib/cron-auth', () => ({ verifyCronAuth: jest.fn(() => true) }))
jest.mock('@/lib/portone-charge', () => ({ chargeBillingKey: jest.fn() }))

const fromMock = supabaseAdmin.from as unknown as jest.Mock
const chargeMock = chargeBillingKey as unknown as jest.Mock

describe('study-billing cron — §4 annual grant refresh', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    ;(verifyCronAuth as unknown as jest.Mock).mockReturnValue(true)
    enqueue = tableRouter(fromMock)
  })

  const req = () => new NextRequest('http://localhost/api/cron/study-billing', {
    method: 'GET',
    headers: { authorization: 'Bearer test-token' },
  })

  it('resets the monthly grant for an annual sub whose next_grant_at passed, without charging', async () => {
    // §1 cancellations, §2 renewals, §3 past-due retries → all empty.
    enqueue('study_subscriptions', { data: [] })
    enqueue('study_subscriptions', { data: [] })
    enqueue('study_subscriptions', { data: [] })
    // §4 grant sweep returns one annual sub whose grant is due.
    enqueue('study_subscriptions', {
      data: [{
        id: 'sub-1',
        student_id: 'stu-1',
        plan: 'general_annual_v1',
        next_grant_at: '2020-01-01T00:00:00.000Z',
      }],
    })
    const updateChain = enqueue('study_subscriptions', { error: null })
    const ledgerChain = enqueue('study_credit_ledger', { error: null })

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.summary.granted).toBe(1)

    // No PortOne charge for a mid-year grant refresh.
    expect(chargeMock).not.toHaveBeenCalled()

    // Grant reset to the annual plan's monthly allotment (8), and the
    // ledger records the +8 grant.
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ grant_credits_remaining: 8 }),
    )
    expect(ledgerChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ student_id: 'stu-1', delta: 8, bucket: 'grant', kind: 'grant' }),
    )
  })

  it('does nothing in §4 when no grants are due', async () => {
    enqueue('study_subscriptions', { data: [] })
    enqueue('study_subscriptions', { data: [] })
    enqueue('study_subscriptions', { data: [] })
    enqueue('study_subscriptions', { data: [] }) // §4 empty

    const res = await GET(req())
    const body = await res.json()
    expect(body.summary.granted).toBe(0)
    expect(chargeMock).not.toHaveBeenCalled()
  })
})
