/** @jest-environment node */
/**
 * Guards around the plan-change / cancel state model.
 *
 * The states must be mutually exclusive: a row once carried BOTH
 * cancel_at_period_end=true AND pending_plan set (change-plan accepted a
 * switch while a cancellation was scheduled). The cron finalizes the
 * cancellation and silently ignores pending_plan, so the student saw
 * "Cancelling" over a switch that would never happen.
 *
 *   - change-plan REJECTS every request while cancel_at_period_end is
 *     true (code 'cancelling'), and writes nothing
 *   - cancel clears pending_plan in the same write (cancel wins)
 *   - the undo (same-plan request) clears pending_plan
 *   - a normal downgrade still schedules pending_plan
 */
import { POST as changePlan } from '@/app/api/study/subscription/change-plan/route'
import { POST as cancel } from '@/app/api/study/subscription/cancel/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { chargeBillingKey } from '@/lib/portone-charge'
import { tableRouter, makeRequest } from '@/tests/study-route-helpers'
import { decidePlanChange, deriveSubscriptionUiState } from '@/lib/study/subscription-state'

jest.mock('@/lib/supabase-admin', () => {
  const client = { from: jest.fn() }
  return { dbAdmin: client }
})
jest.mock('@/lib/study/auth', () => ({
  requireStudyUser: jest.fn(async () => ({ user: { id: 'stu-1' } })),
}))
jest.mock('@/lib/portone-charge', () => ({ chargeBillingKey: jest.fn() }))
jest.mock('@/lib/study/record-subscription-payment', () => ({
  recordSubscriptionPayment: jest.fn(async () => {}),
}))

const fromMock = dbAdmin.from as unknown as jest.Mock
const chargeMock = chargeBillingKey as unknown as jest.Mock

const baseRow = {
  status: 'active',
  plan: 'premium_plus_v1',
  pending_plan: null as string | null,
  cancel_at_period_end: false,
  portone_subscription_id: 'billing-key-1',
  purchased_credits_remaining: 0,
}

describe('change-plan route — cancelled state is exclusive', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    enqueue = tableRouter(fromMock)
  })

  it('rejects a scheduled downgrade while cancel_at_period_end is true, writing nothing', async () => {
    enqueue('study_subscriptions', { data: { ...baseRow, cancel_at_period_end: true } })

    const res = await changePlan(makeRequest({ plan: 'general_v1' }))
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.code).toBe('cancelling')
    // Only the select ran — no update, no charge.
    expect(fromMock).toHaveBeenCalledTimes(1)
    expect(chargeMock).not.toHaveBeenCalled()
  })

  it('rejects an upgrade while cancel_at_period_end is true — no charge is attempted', async () => {
    enqueue('study_subscriptions', {
      data: { ...baseRow, plan: 'general_v1', cancel_at_period_end: true },
    })

    const res = await changePlan(makeRequest({ plan: 'premium_v1' }))
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.code).toBe('cancelling')
    expect(chargeMock).not.toHaveBeenCalled()
    expect(fromMock).toHaveBeenCalledTimes(1)
  })

  it('sending the current plan id clears pending_plan (undo of a scheduled switch)', async () => {
    enqueue('study_subscriptions', { data: { ...baseRow, pending_plan: 'general_v1' } })
    const update = enqueue('study_subscriptions', { error: null })

    const res = await changePlan(makeRequest({ plan: 'premium_plus_v1' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.pending_plan).toBeNull()
    expect(update.update).toHaveBeenCalledWith(
      expect.objectContaining({ pending_plan: null }),
    )
    expect(chargeMock).not.toHaveBeenCalled()
  })

  it('a normal downgrade schedules pending_plan (no cancellation involved)', async () => {
    enqueue('study_subscriptions', { data: { ...baseRow } })
    const update = enqueue('study_subscriptions', { error: null })

    const res = await changePlan(makeRequest({ plan: 'general_v1' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.pending_plan).toBe('general_v1')
    expect(update.update).toHaveBeenCalledWith(
      expect.objectContaining({ pending_plan: 'general_v1' }),
    )
    // A downgrade never sets the cancellation flag.
    const payload = update.update.mock.calls[0][0] as Record<string, unknown>
    expect('cancel_at_period_end' in payload).toBe(false)
    expect(chargeMock).not.toHaveBeenCalled()
  })
})

describe('cancel route — cancel wins over a scheduled switch', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    enqueue = tableRouter(fromMock)
  })

  it('sets cancel_at_period_end AND clears pending_plan in one write', async () => {
    const update = enqueue('study_subscriptions', { error: null })

    const res = await cancel(makeRequest({}))

    expect(res.status).toBe(200)
    expect(update.update).toHaveBeenCalledWith(
      expect.objectContaining({ cancel_at_period_end: true, pending_plan: null }),
    )
  })
})

describe('decidePlanChange / deriveSubscriptionUiState — the one state model', () => {
  const row = (over: Partial<typeof baseRow>) => ({ ...baseRow, ...over })

  it('refuses changes on pass rows and cancelled rows alike', () => {
    const cancelled = decidePlanChange(row({ cancel_at_period_end: true }), 'general_v1')
    expect(cancelled).toMatchObject({ ok: false, status: 409, body: { code: 'cancelling' } })

    const pass = decidePlanChange(row({ plan: 'sat_pass_v1', cancel_at_period_end: true }), 'general_v1')
    expect(pass).toMatchObject({ ok: false, status: 409 })
  })

  it('requires an active subscription and a known non-pass target', () => {
    expect(decidePlanChange(null, 'general_v1')).toMatchObject({ ok: false, status: 403 })
    expect(decidePlanChange(row({ status: 'cancelled' }), 'general_v1')).toMatchObject({ ok: false, status: 403 })
    expect(decidePlanChange(row({}), 'nope_v9')).toMatchObject({ ok: false, status: 400 })
    expect(decidePlanChange(row({}), 'sat_pass_v1')).toMatchObject({ ok: false, status: 400 })
  })

  it('classifies clear_pending / downgrade / upgrade by price against the current plan', () => {
    expect(decidePlanChange(row({}), 'premium_plus_v1')).toMatchObject({ ok: true, action: 'clear_pending' })
    expect(decidePlanChange(row({}), 'general_v1')).toMatchObject({ ok: true, action: 'schedule_downgrade' })
    expect(decidePlanChange(row({ plan: 'general_v1' }), 'premium_v1')).toMatchObject({ ok: true, action: 'upgrade' })
  })

  it('a pending switch is its own UI state — never cancelling', () => {
    expect(deriveSubscriptionUiState(row({ pending_plan: 'general_v1' }))).toBe('pendingSwitch')
    expect(deriveSubscriptionUiState(row({ cancel_at_period_end: true }))).toBe('cancelling')
    // Legacy mixed row: cancel wins for display, matching the cron.
    expect(deriveSubscriptionUiState(row({ pending_plan: 'general_v1', cancel_at_period_end: true }))).toBe('cancelling')
    // Passes carry the flag by design — not a cancellation.
    expect(deriveSubscriptionUiState(row({ plan: 'sat_pass_v1', cancel_at_period_end: true }))).toBe('onPass')
    expect(deriveSubscriptionUiState(row({ cancel_at_period_end: true }), true)).toBe('onPass')
    expect(deriveSubscriptionUiState(null)).toBe('free')
    expect(deriveSubscriptionUiState(row({ status: 'expired' }))).toBe('free')
  })
})
