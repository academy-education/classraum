/** @jest-environment node */
/**
 * A refunded credit slice must never be spendable again for free.
 *
 * The live use_study_credit / use_study_pass_credit RPCs answer
 * `{ ok: true, already: true }` whenever a DEBIT ledger row exists for
 * (student, source) — they do not look for the REFUND row. Slice sources are
 * a pure function of (sessionId, slice), so any caller that reuses an id
 * after a refund got a reservation that charged nothing:
 *   - /api/study/path/repeat: chargeId derives from the completed-session
 *     set; archive fails → refund → retry derives the same chargeId.
 *   - /api/study/test/generate: client-sent sessionId; a failed generation
 *     refunds, the client retries the same id.
 *
 * The model below reproduces the live RPC bodies (fetched 2026-10-02),
 * including the ledger's UNIQUE(student, kind, source) index.
 */
import { reserveTestCredits, refundTestCredits } from '@/lib/study/credits'
import { dbAdmin } from '@/lib/supabase-admin'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { rpc: jest.fn(), from: jest.fn() } }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))

const rpc = dbAdmin.rpc as unknown as jest.Mock
const from = dbAdmin.from as unknown as jest.Mock
const tick = () => new Promise(r => setImmediate(r))

function liveLedger(balance: number, passBalance = 0) {
  const ledger: Array<{ kind: 'debit' | 'refund'; source: string; bucket: string }> = []
  const state = { balance, passBalance, ledger }
  const has = (kind: string, s: string) => ledger.some(l => l.kind === kind && l.source === s)
  rpc.mockImplementation(async (fn: string, a: { p_source: string }) => {
    await tick()
    const s = a.p_source
    if (fn === 'use_study_pass_credit') {
      if (has('debit', s)) return { data: { ok: true, already: true }, error: null }
      if (state.passBalance <= 0) return { data: { ok: false, reason: 'no_pass_credits' }, error: null }
      state.passBalance--; ledger.push({ kind: 'debit', source: s, bucket: 'pass:sat' })
      return { data: { ok: true }, error: null }
    }
    if (fn === 'use_study_credit') {
      if (has('debit', s)) return { data: { ok: true, already: true }, error: null }
      if (state.balance <= 0) return { data: { ok: false, reason: 'no_credits' }, error: null }
      await tick()
      if (has('debit', s)) return { data: null, error: { code: '23505', message: 'duplicate key' } }
      state.balance--; ledger.push({ kind: 'debit', source: s, bucket: 'grant' })
      return { data: { ok: true }, error: null }
    }
    if (fn === 'refund_study_credit') {
      const d = ledger.find(l => l.kind === 'debit' && l.source === s)
      if (!d) return { data: { ok: false, reason: 'no_debit' }, error: null }
      if (has('refund', s)) return { data: { ok: true, already: true }, error: null }
      if (d.bucket.startsWith('pass:')) state.passBalance++; else state.balance++
      ledger.push({ kind: 'refund', source: s, bucket: d.bucket })
      return { data: { ok: true }, error: null }
    }
    throw new Error(`unexpected rpc ${fn}`)
  })
  // study_credit_ledger reads: select('id').eq(...).eq(...).eq(...).limit(1)
  from.mockImplementation(() => {
    const f: Record<string, unknown> = {}
    const b: Record<string, unknown> = {
      select: () => b,
      eq: (c: string, v: unknown) => { f[c] = v; return b },
      limit: () => b,
      then: (ok: (v: unknown) => unknown, no?: (e: unknown) => unknown) => tick().then(() => ({
        data: ledger.filter(l => l.kind === f.kind && l.source === f.source_id).map((_, i) => ({ id: i })),
        error: null,
      })).then(ok, no),
    }
    return b
  })
  return state
}

describe('a refunded slice is not reusable', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.spyOn(console, 'error').mockImplementation(() => {}) })

  it('re-reserving a refunded session charges again', async () => {
    const s = liveLedger(10)
    expect((await reserveTestCredits('stu', 'sess-1', 2)).ok).toBe(true)
    expect(s.balance).toBe(8)
    expect((await refundTestCredits('stu', 'sess-1', 2)).refunded).toBe(2)
    expect(s.balance).toBe(10)

    expect((await reserveTestCredits('stu', 'sess-1', 2)).ok).toBe(true)
    expect(s.balance).toBe(8)                      // charged again, not free
  })

  it('a refunded slice with no balance left is refused, not handed out', async () => {
    const s = liveLedger(1)
    expect((await reserveTestCredits('stu', 'sess-2', 1)).ok).toBe(true)
    await refundTestCredits('stu', 'sess-2', 1)
    s.balance = 0                                  // the refunded credit was spent elsewhere
    const r = await reserveTestCredits('stu', 'sess-2', 1)
    expect(r).toMatchObject({ ok: false, reason: 'no_credits' })
  })

  it('pass credits: a refunded pass slice is re-charged too', async () => {
    const s = liveLedger(0, 3)
    expect((await reserveTestCredits('stu', 'sess-3', 1, 'sat')).ok).toBe(true)
    await refundTestCredits('stu', 'sess-3', 1)
    expect(s.passBalance).toBe(3)
    expect((await reserveTestCredits('stu', 'sess-3', 1, 'sat')).ok).toBe(true)
    expect(s.passBalance).toBe(2)
  })

  it('refund after a re-charge returns the live slice, and a second refund is a replay', async () => {
    const s = liveLedger(5)
    await reserveTestCredits('stu', 'sess-4', 1)
    await refundTestCredits('stu', 'sess-4', 1)
    await reserveTestCredits('stu', 'sess-4', 1)
    expect(s.balance).toBe(4)
    expect(await refundTestCredits('stu', 'sess-4', 1)).toEqual({ refunded: 1, already: 0, noDebit: 0 })
    expect(s.balance).toBe(5)
    expect(await refundTestCredits('stu', 'sess-4', 1)).toEqual({ refunded: 0, already: 1, noDebit: 0 })
    expect(s.balance).toBe(5)
  })

  it('a never-charged session still reports noDebit', async () => {
    liveLedger(5)
    expect(await refundTestCredits('stu', 'sess-none', 2)).toEqual({ refunded: 0, already: 0, noDebit: 2 })
  })

  it('two concurrent retries after a refund charge ONE credit per slice between them', async () => {
    const s = liveLedger(10)
    await reserveTestCredits('stu', 'sess-5', 2)
    await refundTestCredits('stu', 'sess-5', 2)
    expect(s.balance).toBe(10)
    const [a, b] = await Promise.all([
      reserveTestCredits('stu', 'sess-5', 2),
      reserveTestCredits('stu', 'sess-5', 2),
    ])
    expect(a.ok || b.ok).toBe(true)
    // Exactly one fresh charge per slice: never 10 (free), never 6 (double).
    expect(s.balance).toBe(8)
  })
})
