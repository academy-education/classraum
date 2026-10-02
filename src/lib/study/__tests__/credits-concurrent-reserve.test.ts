/** @jest-environment node */
/**
 * Two concurrent reserveTestCredits calls for the SAME session / charge id
 * (double-tap on generate, two path-repeat requests). They derive identical
 * credit-slice sources, so the loser sees `already` on slices the winner
 * debited, then an error on the slice the two raced for (the ledger's
 * unique index rolls the loser's RPC back).
 *
 * The loser must roll back only what IT debited. Refunding an `already`
 * slice gave the student back a credit the winner's session still holds.
 */
import { reserveTestCredits } from '@/lib/study/credits'
import { dbAdmin } from '@/lib/supabase-admin'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { rpc: jest.fn() } }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))

const rpc = dbAdmin.rpc as unknown as jest.Mock

/** A tiny model of the ledger the three RPCs share. */
function ledgerModel(balance: number) {
  const debits = new Set<string>()
  const refunds = new Set<string>()
  const state = { balance, debits, refunds }
  rpc.mockImplementation(async (fn: string, args: { p_source: string }) => {
    const s = args.p_source
    if (fn === 'use_study_credit') {
      if (debits.has(s)) return { data: { ok: true, already: true }, error: null }
      if (state.balance <= 0) return { data: { ok: false, reason: 'no_credits' }, error: null }
      state.balance--; debits.add(s)
      return { data: { ok: true, bucket: 'grant' }, error: null }
    }
    if (fn === 'refund_study_credit') {
      if (!debits.has(s)) return { data: { ok: false, reason: 'no_debit' }, error: null }
      if (refunds.has(s)) return { data: { ok: true, already: true }, error: null }
      state.balance++; refunds.add(s)
      return { data: { ok: true }, error: null }
    }
    throw new Error(`unexpected rpc ${fn}`)
  })
  return state
}

describe('reserveTestCredits under a concurrent same-session caller', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.spyOn(console, 'error').mockImplementation(() => {}) })

  it('the loser does not refund slices the winner debited', async () => {
    const state = ledgerModel(10)
    // Winner reserves both slices of a 2-credit test first.
    expect((await reserveTestCredits('stu', 'sess-1', 2)).ok).toBe(true)
    expect(state.balance).toBe(8)

    // Loser: slice 0 is already debited (by the winner); slice 1 is the one
    // the two raced for — the loser's RPC hit the unique index and errored.
    const realImpl = rpc.getMockImplementation()!
    let call = 0
    rpc.mockImplementation(async (fn: string, args: { p_source: string }) => {
      if (fn === 'use_study_credit' && ++call === 2) {
        return { data: null, error: { code: '23505', message: 'duplicate key' } }
      }
      return realImpl(fn, args)
    })
    const loser = await reserveTestCredits('stu', 'sess-1', 2)
    expect(loser.ok).toBe(false)

    // The winner's session still holds both credits.
    expect(state.balance).toBe(8)
    expect(state.refunds.size).toBe(0)
  })

  it('still rolls back the slices THIS call debited on a partial failure', async () => {
    const state = ledgerModel(1)
    const r = await reserveTestCredits('stu', 'sess-2', 2)
    expect(r).toMatchObject({ ok: false, reason: 'no_credits' })
    expect(state.balance).toBe(1)
    expect(state.refunds.size).toBe(1)
  })
})
