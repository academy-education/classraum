/** @jest-environment node */
/**
 * POST /api/subscription/reactivate — the undo for a cancellation.
 *
 * The guards are the whole point of this route, so they are what is
 * tested: reactivating must be possible ONLY while the already-paid
 * period is still running AND a usable billing key is on file. Flipping
 * auto_renew on a lapsed row would hand back unpaid access; flipping it
 * with a revoked key would promise a renewal the billing cron cannot
 * charge.
 */
import { POST } from '@/app/api/subscription/reactivate/route'
import { getAuthedClient } from '@/lib/api-auth'
import type { NextRequest } from 'next/server'

jest.mock('@/lib/api-auth', () => ({ getAuthedClient: jest.fn() }))

const getAuthedClientMock = getAuthedClient as unknown as jest.Mock

const DAY = 24 * 60 * 60 * 1000

/** A cancelled-but-still-paid subscription: the case reactivate exists for. */
function baseSubscription(overrides: Record<string, unknown> = {}) {
  return {
    academy_id: 'academy-1',
    plan_tier: 'pro',
    status: 'active',
    auto_renew: false,
    billing_key: 'billing-key-1',
    billing_key_cancelled_at: null,
    current_period_end: new Date(Date.now() + 10 * DAY).toISOString(),
    next_billing_date: '2026-08-06',
    ...overrides,
  }
}

/** Minimal stand-in for the PostgREST builder chains this route uses. */
function mockSupabase(subscription: unknown, updateError: unknown = null) {
  const update = jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: updateError }) }))
  const from = jest.fn((table: string) => {
    if (table === 'managers') {
      return {
        select: () => ({
          eq: () => ({ single: async () => ({ data: { academy_id: 'academy-1' }, error: null }) }),
        }),
      }
    }
    return {
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: subscription,
            error: subscription ? null : { message: 'no rows' },
          }),
        }),
      }),
      update,
    }
  })
  return { client: { from }, update }
}

function setup(subscription: unknown, updateError: unknown = null) {
  const { client, update } = mockSupabase(subscription, updateError)
  getAuthedClientMock.mockResolvedValue({ user: { id: 'user-1' }, supabase: client, error: null })
  return { update }
}

const request = {} as NextRequest

describe('POST /api/subscription/reactivate', () => {
  beforeEach(() => jest.clearAllMocks())

  it('flips auto_renew back to true inside the paid period', async () => {
    const { update } = setup(baseSubscription())

    const res = await POST(request)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({ success: true, code: 'reactivated' })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ auto_renew: true, next_billing_date: '2026-08-06' }),
    )
  })

  it('backfills next_billing_date from current_period_end when it is null', async () => {
    // Without this the cron's `next_billing_date <= today` filter never
    // matches, so auto_renew = true would never actually bill anything.
    const periodEnd = new Date(Date.now() + 10 * DAY).toISOString()
    const { update } = setup(baseSubscription({ next_billing_date: null, current_period_end: periodEnd }))

    const res = await POST(request)

    expect(res.status).toBe(200)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ next_billing_date: periodEnd.split('T')[0] }),
    )
  })

  it('refuses once the paid period has lapsed', async () => {
    const { update } = setup(
      baseSubscription({ current_period_end: new Date(Date.now() - DAY).toISOString() }),
    )

    const res = await POST(request)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.code).toBe('period_lapsed')
    expect(update).not.toHaveBeenCalled()
  })

  it('refuses when the subscription is no longer active', async () => {
    const { update } = setup(baseSubscription({ status: 'canceled' }))

    const res = await POST(request)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.code).toBe('not_active')
    expect(update).not.toHaveBeenCalled()
  })

  it.each([
    ['the billing key was revoked at cancel time', { billing_key_cancelled_at: new Date().toISOString() }],
    ['no billing key was ever stored', { billing_key: null }],
  ])('refuses with billing_key_required when %s', async (_label, overrides) => {
    const { update } = setup(baseSubscription(overrides))

    const res = await POST(request)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.code).toBe('billing_key_required')
    expect(update).not.toHaveBeenCalled()
  })

  it('is idempotent when auto_renew is already true', async () => {
    const { update } = setup(baseSubscription({ auto_renew: true }))

    const res = await POST(request)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({ success: true, code: 'already_active' })
    expect(update).not.toHaveBeenCalled()
  })

  it('401s when the caller is not authenticated', async () => {
    getAuthedClientMock.mockResolvedValue({ user: null, supabase: null, error: 'Auth session missing' })

    const res = await POST(request)

    expect(res.status).toBe(401)
  })

  it('404s when the academy has no subscription row', async () => {
    setup(null)

    const res = await POST(request)
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.code).toBe('no_subscription')
  })

  it('surfaces a failed write as a 500 rather than reporting success', async () => {
    setup(baseSubscription(), { message: 'permission denied' })

    const res = await POST(request)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body).toMatchObject({ success: false, code: 'update_failed' })
  })
})
