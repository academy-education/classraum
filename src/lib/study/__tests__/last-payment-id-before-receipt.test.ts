/** @jest-environment node */
/**
 * Every subscription charge path writes study_subscriptions.last_payment_id
 * BEFORE recordSubscriptionPayment (which sends the receipt).
 * (That recordSubscriptionPayment then calls sendChargeReceipt is pinned in
 * record-subscription-payment.test.ts.)
 *
 * Why the order matters: the receipt quotes the next renewal date only
 * when `sub.last_payment_id === paymentId` (charge-receipt.ts). Recorded
 * first, the receipt reads the PREVIOUS charge's id and silently drops the
 * renewal line — no error, just a wrong email. CLAUDE.md states the rule;
 * until 2026-10-02 no test held any of the three callers to it, and moving
 * recordSubscriptionPayment above the write kept every suite green.
 */
import { NextRequest } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { chargeBillingKey } from '@/lib/portone-charge'
import { recordSubscriptionPayment } from '@/lib/study/record-subscription-payment'
import { activateSubscriptionFromBillingKey } from '@/lib/study/activate-subscription'
import { POST as changePlan } from '@/app/api/study/subscription/change-plan/route'
import { GET as studyBilling } from '@/app/api/cron/study-billing/route'
import { tableRouter, makeRequest, type ChainMock } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn(), rpc: jest.fn(async () => ({ error: null })) } }))
jest.mock('@/lib/portone-charge', () => ({ chargeBillingKey: jest.fn(async () => ({ ok: true })) }))
jest.mock('@/lib/study/record-subscription-payment', () => ({ recordSubscriptionPayment: jest.fn(async () => {}) }))
jest.mock('@/lib/study/analytics', () => ({ trackEvent: jest.fn(async () => {}) }))
jest.mock('@/lib/study/referral-conversion', () => ({ grantReferralConversionIfEligible: jest.fn(async () => {}) }))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn(async () => ({ user: { id: 'stu-1' } })) }))
jest.mock('@/lib/cron-auth', () => ({ verifyCronAuth: jest.fn(() => true) }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))
jest.mock('@/lib/study/notify', () => ({ notifyStudent: jest.fn(async () => {}) }))

const fromMock = dbAdmin.from as unknown as jest.Mock
const chargeMock = chargeBillingKey as unknown as jest.Mock
const recordMock = recordSubscriptionPayment as unknown as jest.Mock

/** The write carrying last_payment_id ran, with this charge's id, before the record. */
function expectWrittenBeforeRecord(write: ChainMock, method: 'update' | 'upsert') {
  expect(chargeMock).toHaveBeenCalledTimes(1)
  const paymentId = chargeMock.mock.calls[0][0].paymentId as string
  expect(write[method]).toHaveBeenCalledWith(expect.objectContaining({ last_payment_id: paymentId }), ...(method === 'upsert' ? [expect.anything()] : []))
  expect(recordMock).toHaveBeenCalledWith(expect.objectContaining({ paymentId }))
  expect(write[method].mock.invocationCallOrder[0]).toBeLessThan(recordMock.mock.invocationCallOrder[0])
}

let enqueue: ReturnType<typeof tableRouter>
beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  chargeMock.mockResolvedValue({ ok: true })
  enqueue = tableRouter(fromMock)
})
afterEach(() => { (console.error as jest.Mock).mockRestore() })

it('first subscription (activateSubscriptionFromBillingKey)', async () => {
  enqueue('study_subscriptions', { data: null })              // no existing row
  const upsert = enqueue('study_subscriptions', { error: null })
  enqueue('study_credit_ledger', { error: null })
  const out = await activateSubscriptionFromBillingKey({ studentId: 'stu-1', billingKey: 'bk-1', planId: 'premium_v1' })
  expect(out.status).toBe('activated')
  expectWrittenBeforeRecord(upsert, 'upsert')
})

it('upgrade (change-plan route)', async () => {
  enqueue('study_subscriptions', { data: {
    status: 'active', plan: 'general_v1', pending_plan: null, cancel_at_period_end: false,
    portone_subscription_id: 'bk-1', purchased_credits_remaining: 0,
  } })
  const update = enqueue('study_subscriptions', { error: null })
  enqueue('study_credit_ledger', { error: null })
  const res = await changePlan(makeRequest({ plan: 'premium_v1' }))
  expect(res.status).toBe(200)
  expectWrittenBeforeRecord(update, 'update')
})

it('renewal (study-billing cron)', async () => {
  enqueue('study_subscriptions', { data: [] })                // §1 cancellations
  enqueue('study_subscriptions', { data: [{
    id: 'sub-1', student_id: 'stu-1', status: 'active', plan: 'general_monthly_v1', pending_plan: null,
    current_period_end: '2020-01-01T00:00:00.000Z', cancel_at_period_end: false,
    portone_subscription_id: 'bk-1', last_payment_attempt_at: null,
  }] })                                                       // §2 renewals due
  const advance = enqueue('study_subscriptions', { error: null })
  enqueue('study_subscriptions', { data: [] })                // §3 past-due retries
  enqueue('study_subscriptions', { data: [] })                // §4 grant sweep
  enqueue('study_credit_ledger', { error: null })
  const res = await studyBilling(new NextRequest('http://localhost/api/cron/study-billing', { headers: { authorization: 'Bearer t' } }))
  expect((await res.json()).summary.charged).toBe(1)
  expectWrittenBeforeRecord(advance, 'update')
})
