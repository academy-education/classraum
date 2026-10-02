/** @jest-environment node */
/**
 * The client POST /billing-key and the BillingKey.Issued webhook backstop
 * arrive within a second of each other for the same freshly issued key.
 * Both read "no active subscription" before either writes. With a
 * timestamped paymentId each then charged the card under its own id — two
 * real charges for one subscription. The paymentId is now derived from
 * the billing key, so PortOne (whose idempotency key it is) pays once and
 * answers the second with ALREADY_PAID.
 */
import { activateSubscriptionFromBillingKey } from '@/lib/study/activate-subscription'
import { dbAdmin } from '@/lib/supabase-admin'
import { chargeBillingKey, chargeAlreadyPaid } from '@/lib/portone-charge'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn(), rpc: jest.fn() } }))
jest.mock('@/lib/portone-charge', () => ({ chargeBillingKey: jest.fn(), chargeAlreadyPaid: jest.fn() }))
jest.mock('@/lib/study/record-subscription-payment', () => ({ recordSubscriptionPayment: jest.fn(async () => {}) }))
jest.mock('@/lib/study/analytics', () => ({ trackEvent: jest.fn(async () => {}) }))
jest.mock('@/lib/study/referral-conversion', () => ({ grantReferralConversionIfEligible: jest.fn(async () => {}) }))

const from = dbAdmin.from as unknown as jest.Mock
const charge = chargeBillingKey as unknown as jest.Mock

const tick = () => new Promise(r => setTimeout(r, 0))

/** In-memory study_subscriptions row + ledger, read through an awaited
 *  builder so concurrent callers genuinely interleave. */
function fakeDb() {
  const db: { sub: Record<string, unknown> | null; ledger: unknown[] } = { sub: null, ledger: [] }
  from.mockImplementation((table: string) => {
    const b: Record<string, unknown> = {}
    let op: 'select' | 'upsert' | 'insert' | 'update' = 'select'
    let payload: Record<string, unknown> | null = null
    for (const m of ['select', 'eq', 'maybeSingle', 'single']) b[m] = jest.fn(() => b)
    b.upsert = jest.fn((p: Record<string, unknown>) => { op = 'upsert'; payload = p; return b })
    b.insert = jest.fn((p: Record<string, unknown>) => { op = 'insert'; payload = p; return b })
    b.update = jest.fn((p: Record<string, unknown>) => { op = 'update'; payload = p; return b })
    b.then = async (ok: (v: unknown) => unknown) => {
      await tick()
      if (table === 'study_credit_ledger') { db.ledger.push(payload); return ok({ data: null, error: null }) }
      if (op === 'select') return ok({ data: db.sub ? { ...db.sub } : null, error: null })
      db.sub = { ...(db.sub ?? {}), ...payload }
      return ok({ data: null, error: null })
    }
    return b
  })
  return db
}

/** PortOne's behaviour: a paymentId is paid at most once. */
function fakePortOne() {
  const paid = new Set<string>()
  charge.mockImplementation(async ({ paymentId }: { paymentId: string }) => {
    await tick()
    if (paid.has(paymentId)) {
      return { ok: false, httpStatus: 409, code: 'ALREADY_PAID', message: 'already paid' }
    }
    paid.add(paymentId)
    return { ok: true, status: 'PAID', httpStatus: 200 }
  })
  // The re-read: PAID iff PortOne actually holds a paid payment for the id.
  ;(chargeAlreadyPaid as unknown as jest.Mock).mockImplementation(
    async (r: { ok: boolean; code?: string }, id: string) => !r.ok && r.code === 'ALREADY_PAID' && paid.has(id),
  )
  return paid
}

describe('activateSubscriptionFromBillingKey — client + webhook race', () => {
  beforeEach(() => jest.clearAllMocks())

  it('charges the card once when both callers miss the active-sub guard', async () => {
    const db = fakeDb()
    const paid = fakePortOne()

    const [client, webhook] = await Promise.all([
      activateSubscriptionFromBillingKey({ studentId: 'stu', billingKey: 'bk_1' }),
      activateSubscriptionFromBillingKey({ studentId: 'stu', billingKey: 'bk_1', onlyIfNoActiveSub: true }),
    ])

    expect(paid.size).toBe(1)
    // Both callers report success; neither wrote a payment failure.
    for (const o of [client, webhook]) expect(['activated', 'already_active']).toContain(o.status)
    expect(db.sub).toMatchObject({ status: 'active', portone_subscription_id: 'bk_1' })
    expect(db.sub?.last_payment_failure ?? null).toBeNull()
  })

  it('a later checkout with a NEW key is charged under a new id', async () => {
    fakeDb()
    const paid = fakePortOne()
    await activateSubscriptionFromBillingKey({ studentId: 'stu', billingKey: 'bk_1' })
    await activateSubscriptionFromBillingKey({ studentId: 'stu', billingKey: 'bk_2' })
    expect(paid.size).toBe(2)
  })
})
