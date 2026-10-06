/** @jest-environment node */
/**
 * Owner decision 2026-10-07: "there is no annual plan". The annual,
 * 3-month and 6-month Study plans stay DEFINED in STUDY_PLANS (history
 * still renders, an existing holder still renews) but no entry point may
 * START one. Before this, /pay/subscribe?plan=general_annual_v1 typed by
 * hand rendered a working checkout and POST /billing-key charged ₩99,000.
 *
 * Live DB on 2026-10-07: zero study_subscriptions (plan or pending_plan),
 * study_payments, credit-ledger notes or analytics events name any of the
 * five ids, so nobody is being taken away from.
 */
import fs from 'fs'
import path from 'path'
import { POST as billingKey } from '@/app/api/study/subscription/billing-key/route'
import { POST as changePlan } from '@/app/api/study/subscription/change-plan/route'
import { POST as webhook } from '@/app/api/study/subscription/webhook/route'
import { POST as recover } from '@/app/api/study/subscription/recover/route'
import { activateSubscriptionFromBillingKey } from '@/lib/study/activate-subscription'
import { decidePlanChange } from '@/lib/study/subscription-state'
import { resolveItem } from '@/lib/study/pay-item'
import { STUDY_PLANS, isPassPlan, isPurchasableStudyPlan, resolvePlan } from '@/lib/study/plans'
import { dbAdmin } from '@/lib/supabase-admin'
import { chargeBillingKey, chargeAlreadyPaid, getBillingKeyInfo } from '@/lib/portone-charge'
import { tableRouter, makeRequest } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn(), rpc: jest.fn() } }))
jest.mock('@/lib/study/auth', () => ({
  requireStudyUser: jest.fn(async () => ({ user: { id: 'stu-1' } })),
}))
jest.mock('@/lib/rate-limit', () => ({ enforceRateLimit: jest.fn(() => null) }))
jest.mock('@/lib/portone-charge', () => ({
  chargeBillingKey: jest.fn(),
  chargeAlreadyPaid: jest.fn(async () => false),
  getBillingKeyInfo: jest.fn(),
  getPaymentInfo: jest.fn(),
}))
jest.mock('@/lib/study/record-subscription-payment', () => ({ recordSubscriptionPayment: jest.fn(async () => {}) }))
jest.mock('@/lib/study/analytics', () => ({ trackEvent: jest.fn(async () => {}) }))
jest.mock('@/lib/study/referral-conversion', () => ({ grantReferralConversionIfEligible: jest.fn(async () => {}) }))
jest.mock('@/lib/study/sync-refund', () => ({ syncStudyPaymentRefund: jest.fn() }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn() }))

const fromMock = dbAdmin.from as unknown as jest.Mock
const chargeMock = chargeBillingKey as unknown as jest.Mock
const keyInfoMock = getBillingKeyInfo as unknown as jest.Mock
void chargeAlreadyPaid

/** Every plan that is defined but no longer sold. Derived, not listed, so
 *  a future non-monthly entry is covered automatically. */
const NOT_SOLD = Object.values(STUDY_PLANS)
  .filter(p => !isPassPlan(p.id) && p.intervalDays !== 30)
  .map(p => p.id)
const MONTHLY_PAID = ['general_v1', 'premium_v1', 'premium_plus_v1']

describe('the catalog', () => {
  it('still defines the five non-monthly plans (history renders) and none of them is purchasable', () => {
    // Denominator first: a filter that matched nothing would pass every
    // loop below vacuously.
    expect(NOT_SOLD.sort()).toEqual(
      ['general_annual_v1', 'premium_3mo_v1', 'premium_6mo_v1', 'premium_annual_v1', 'premium_plus_annual_v1'],
    )
    for (const id of NOT_SOLD) {
      expect(resolvePlan(id).id).toBe(id)
      expect(isPurchasableStudyPlan(id)).toBe(false)
    }
    for (const id of MONTHLY_PAID) expect(isPurchasableStudyPlan(id)).toBe(true)
  })

  it('passes are not purchasable as a recurring plan either', () => {
    expect(isPurchasableStudyPlan('sat_pass_v1')).toBe(false)
    expect(isPurchasableStudyPlan('toefl_pass_v1')).toBe(false)
  })
})

describe('/pay/subscribe link — resolveItem', () => {
  it.each(NOT_SOLD)('?plan=%s renders the unknown-item card, not a checkout', id => {
    expect(resolveItem(new URLSearchParams(`plan=${id}`), true)).toBeNull()
    expect(resolveItem(new URLSearchParams(`plan=${id}`), false)).toBeNull()
  })
  it.each(MONTHLY_PAID)('?plan=%s still resolves as a monthly plan', id => {
    const item = resolveItem(new URLSearchParams(`plan=${id}`), true)
    expect(item?.kind).toBe('plan')
    expect(item?.period).toBe('월')
  })
})

describe('POST /api/study/subscription/billing-key — direct POST', () => {
  let enqueue: ReturnType<typeof tableRouter>
  beforeEach(() => {
    jest.clearAllMocks()
    enqueue = tableRouter(fromMock)
  })

  it.each(NOT_SOLD)('refuses plan=%s with 400 and never charges or writes', async id => {
    const res = await billingKey(makeRequest({ billingKey: 'bk-1', plan: id }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('plan_not_sold')
    expect(chargeMock).not.toHaveBeenCalled()
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('refuses a pass id (a recurring card for a one-time product)', async () => {
    const res = await billingKey(makeRequest({ billingKey: 'bk-1', plan: 'sat_pass_v1' }))
    expect(res.status).toBe(400)
    expect(chargeMock).not.toHaveBeenCalled()
  })

  it.each(MONTHLY_PAID)('still charges and activates plan=%s', async id => {
    enqueue('study_subscriptions', { data: null }) // no existing row
    const upsert = enqueue('study_subscriptions', { error: null })
    chargeMock.mockResolvedValue({ ok: true, status: 'PAID', httpStatus: 200 })

    const res = await billingKey(makeRequest({ billingKey: 'bk-1', plan: id }))
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(chargeMock).toHaveBeenCalledTimes(1)
    expect(chargeMock.mock.calls[0][0].amount).toBe(STUDY_PLANS[id]!.priceWon)
    expect(upsert.upsert.mock.calls[0][0].plan).toBe(id)
  })
})

describe('the shared helper (webhook backstop and /recover both call it)', () => {
  beforeEach(() => { jest.clearAllMocks(); tableRouter(fromMock) })

  it.each(NOT_SOLD)('refuses %s before touching the DB or PortOne', async id => {
    const out = await activateSubscriptionFromBillingKey({ studentId: 'stu-1', billingKey: 'bk-1', planId: id })
    expect(out.status).toBe('error')
    expect(chargeMock).not.toHaveBeenCalled()
    expect(fromMock).not.toHaveBeenCalled()
  })
})

describe('BillingKey.Issued webhook and /recover — a key stamped with an unsold plan', () => {
  const prevSecret = process.env.PORTONE_WEBHOOK_SECRET
  beforeAll(() => { delete process.env.PORTONE_WEBHOOK_SECRET })
  afterAll(() => { if (prevSecret !== undefined) process.env.PORTONE_WEBHOOK_SECRET = prevSecret })
  beforeEach(() => {
    jest.clearAllMocks()
    tableRouter(fromMock)
    keyInfoMock.mockResolvedValue({
      ok: true,
      customData: { kind: 'study_subscription', plan: 'general_annual_v1', student_id: 'stu-1' },
    })
  })

  it('the webhook backstop ignores it and charges nothing', async () => {
    const res = await webhook(makeRequest({ type: 'BillingKey.Issued', data: { billingKey: 'bk-1' } }))
    expect(res.status).toBe(200)
    expect((await res.json()).ignored).toBe('plan not sold')
    expect(chargeMock).not.toHaveBeenCalled()
  })

  it('/recover refuses it and charges nothing', async () => {
    const res = await recover(makeRequest({ billingKey: 'bk-1' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('plan_not_sold')
    expect(chargeMock).not.toHaveBeenCalled()
  })
})

describe('change-plan — switching INTO an unsold plan', () => {
  const monthlyRow = {
    status: 'active', plan: 'premium_plus_v1', pending_plan: null as string | null,
    cancel_at_period_end: false, portone_subscription_id: 'bk-1', purchased_credits_remaining: 0,
  }
  let enqueue: ReturnType<typeof tableRouter>
  beforeEach(() => {
    jest.clearAllMocks()
    enqueue = tableRouter(fromMock)
  })

  it.each(NOT_SOLD)('a monthly holder cannot upgrade or downgrade to %s (no charge, no write)', async id => {
    enqueue('study_subscriptions', { data: monthlyRow })
    const res = await changePlan(makeRequest({ plan: id }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('plan_not_sold')
    expect(chargeMock).not.toHaveBeenCalled()
    expect(fromMock).toHaveBeenCalledTimes(1) // the select only
  })

  it('an EXISTING annual holder is left alone: may cancel a scheduled change and may move to monthly', () => {
    const annual = { ...monthlyRow, plan: 'premium_annual_v1', pending_plan: 'general_v1' }
    const undo = decidePlanChange(annual, 'premium_annual_v1')
    expect(undo.ok && undo.action).toBe('clear_pending')
    const down = decidePlanChange(annual, 'general_v1')
    expect(down.ok && down.action).toBe('schedule_downgrade')
    const other = decidePlanChange(annual, 'premium_plus_annual_v1')
    expect(other.ok).toBe(false)
  })

  it('a monthly upgrade still works', () => {
    const d = decidePlanChange({ ...monthlyRow, plan: 'general_v1' }, 'premium_v1')
    expect(d.ok && d.action).toBe('upgrade')
  })
})

describe('renewals of existing holders are untouched', () => {
  it('the renewal cron does not consult the purchase guard', () => {
    const cron = fs.readFileSync(path.join(process.cwd(), 'src/app/api/cron/study-billing/route.ts'), 'utf8')
    expect(cron).toMatch(/resolvePlan|STUDY_PLANS/) // it does read plans
    expect(cron).not.toMatch(/isPurchasableStudyPlan/)
  })
})
