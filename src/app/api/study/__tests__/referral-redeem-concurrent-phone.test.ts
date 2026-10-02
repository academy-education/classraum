/** @jest-environment node */
/**
 * Two accounts that share ONE phone number redeem referral codes at the same
 * moment. The route's phone check is "does any other account with my number
 * already have a redemption?" — a SELECT, then the INSERT. Both callers run
 * the SELECT before either INSERT lands, so both pass it.
 *
 * Only the database can pick a single winner: the redemption row carries the
 * referee's phoneKey and a unique index (migration 118) rejects the second.
 * The fake DB below models exactly the two unique indexes the live table has
 * after 118 — referee_id and referee_phone_key — and nothing else, so the
 * test passes only if the route actually writes the key.
 */
import { POST } from '@/app/api/study/referral/redeem/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { findAccountsByPhone } from '@/lib/auth/phone-duplicates'
import { makeRequest } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn(), rpc: jest.fn() } }))
jest.mock('@/lib/rate-limit', () => ({ enforceRateLimit: jest.fn(() => null) }))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn() }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))
jest.mock('@/lib/study/analytics', () => ({ trackEvent: jest.fn(async () => {}) }))
jest.mock('@/lib/auth/phone-duplicates', () => ({ findAccountsByPhone: jest.fn() }))

type Row = Record<string, unknown>

/** Yield a macrotask so two in-flight requests interleave step by step. */
const tick = () => new Promise(r => setImmediate(r))

function fakeDb() {
  const tables: Record<string, Row[]> = {
    users: [
      { id: 'acct-a', phone: '010-1234-5678' },
      { id: 'acct-b', phone: '+82 10 1234 5678' },   // same person, typed differently
    ],
    study_referral_codes: [{ code: 'FRIEND1', student_id: 'referrer-1' }],
    study_referral_redemptions: [],
    study_subscriptions: [],
    study_credit_ledger: [],
  }
  let grants = 0
  let nextId = 1

  // Unique indexes as they exist after migration 118.
  const UNIQUE: Record<string, Array<{ col: string; name: string }>> = {
    study_referral_redemptions: [
      { col: 'referee_id', name: 'study_referral_redemptions_referee_unique' },
      { col: 'referee_phone_key', name: 'study_referral_redemptions_phone_key_unique' },
    ],
    study_subscriptions: [{ col: 'student_id', name: 'study_subscriptions_pkey' }],
  }

  function builder(table: string) {
    let op: 'select' | 'insert' | 'update' = 'select'
    let payload: Row | null = null
    const filters: Array<(r: Row) => boolean> = []
    let single = false
    let limit = Infinity

    const run = async () => {
      await tick()
      const rows = tables[table]
      if (op === 'insert') {
        for (const u of UNIQUE[table] ?? []) {
          const v = payload![u.col]
          if (v != null && rows.some(r => r[u.col] === v)) {
            return { data: null, error: { code: '23505', message: `duplicate key value violates unique constraint "${u.name}"` } }
          }
        }
        const row = { id: `row-${nextId++}`, ...payload }
        rows.push(row)
        return { data: single ? row : [row], error: null }
      }
      const hit = rows.filter(r => filters.every(f => f(r))).slice(0, limit)
      if (op === 'update') { hit.forEach(r => Object.assign(r, payload)); return { data: null, error: null } }
      return { data: single ? (hit[0] ?? null) : hit, error: null }
    }

    const b: Record<string, unknown> = {
      select: () => b,
      insert: (p: Row) => { op = 'insert'; payload = p; return b },
      update: (p: Row) => { op = 'update'; payload = p; return b },
      eq: (c: string, v: unknown) => { filters.push(r => r[c] === v); return b },
      in: (c: string, vs: unknown[]) => { filters.push(r => vs.includes(r[c])); return b },
      limit: (n: number) => { limit = n; return b },
      maybeSingle: () => { single = true; return run() },
      single: () => { single = true; return run() },
      then: (f: (v: unknown) => unknown, j?: (e: unknown) => unknown) => run().then(f, j),
    }
    return b
  }

  ;(dbAdmin.from as unknown as jest.Mock).mockImplementation((t: string) => builder(t))
  ;(dbAdmin.rpc as unknown as jest.Mock).mockImplementation(async (fn: string) => {
    await tick()
    if (fn === 'increment_study_purchased_credits') grants++
    return { data: null, error: null }
  })
  return { tables, grants: () => grants }
}

describe('referral redeem: two accounts, one phone, concurrently', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    // Each account sees the other as a same-phone account.
    ;(findAccountsByPhone as jest.Mock).mockImplementation(async (_p: string, me: string) => {
      await tick()
      return [{ id: me === 'acct-a' ? 'acct-b' : 'acct-a', provider: 'email', since: '2026-09-01', emailHint: 'x' }]
    })
  })

  it('rewards exactly one of them; the loser gets phone_already_rewarded', async () => {
    const db = fakeDb()
    const auth = requireStudyUser as unknown as jest.Mock
    auth
      .mockResolvedValueOnce({ user: { id: 'acct-a' } })
      .mockResolvedValueOnce({ user: { id: 'acct-b' } })

    const [ra, rb] = await Promise.all([
      POST(makeRequest({ code: 'FRIEND1' })),
      POST(makeRequest({ code: 'FRIEND1' })),
    ])
    const statuses = [ra.status, rb.status].sort()
    const bodies = await Promise.all([ra.json(), rb.json()])

    expect(statuses).toEqual([200, 409])
    expect(bodies.map(b => b.code).filter(Boolean)).toEqual(['phone_already_rewarded'])
    expect(db.grants()).toBe(1)
    expect(db.tables.study_referral_redemptions).toHaveLength(1)
    expect(db.tables.study_referral_redemptions[0].referee_phone_key).toBe('012345678')
  })

  it('a later sequential redeem from the other account is still blocked by the pre-check', async () => {
    const db = fakeDb()
    const auth = requireStudyUser as unknown as jest.Mock
    auth.mockResolvedValueOnce({ user: { id: 'acct-a' } })
    expect((await POST(makeRequest({ code: 'FRIEND1' }))).status).toBe(200)
    auth.mockResolvedValueOnce({ user: { id: 'acct-b' } })
    const r = await POST(makeRequest({ code: 'FRIEND1' }))
    expect(r.status).toBe(409)
    expect((await r.json()).code).toBe('phone_already_rewarded')
    expect(db.grants()).toBe(1)
  })
})
