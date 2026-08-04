/**
 * Collecting league rewards pays ONCE, however many times it is asked.
 *
 * This is the test that justifies the whole shape of claimRewards. The
 * tempting implementation is:
 *
 *     const rows = await select().is('claimed_at', null)   // check
 *     await grantCredits(sum(rows))                        // pay
 *     await update().set({ claimed_at })                   // mark
 *
 * which passes every single-caller test and pays twice the moment a
 * student double-taps. CLAUDE.md records that exact race reaching
 * production once already — the TOEFL grader whose "server-side
 * idempotency" was a SELECT followed by an INSERT, and which produced
 * four submission rows for two essays because both SELECTs missed.
 *
 * So the fake below models the ONE property that makes the real thing
 * safe: `update ... where claimed_at is null` is atomic per row, and
 * only the rows it RETURNS may be paid. Two callers race; the loser
 * matches nothing.
 */
import { claimRewards } from '@/lib/study/league-rewards'

interface Row { id: string; student_id: string; credits: number; claimed_at: string | null }

let ROWS: Row[]
let GRANTS: Array<{ studentId: string; delta: number }>
let LEDGER: number

/**
 * Minimal PostgREST stand-in.
 *
 * The important part is `update`: it filters and mutates in ONE
 * synchronous pass before any await, exactly as Postgres serialises a
 * single UPDATE statement on a row. A fake that awaited between reading
 * and writing would be modelling the bug, not the database.
 */
jest.mock('@/lib/supabase-admin', () => ({
  dbAdmin: {
    from: (table: string) => {
      if (table === 'study_credit_ledger') {
        return { insert: async () => { LEDGER++; return { error: null } } }
      }
      const q: Record<string, unknown> = {}
      let studentId = ''
      let onlyUnclaimed = false
      let mode: 'update' | 'select' = 'select'
      let stamp: string | null = null

      const chain = {
        update(patch: { claimed_at: string }) { mode = 'update'; stamp = patch.claimed_at; return chain },
        select() { return chain },
        eq(col: string, v: string) { if (col === 'student_id') studentId = v; return chain },
        is(col: string, v: null) { if (col === 'claimed_at' && v === null) onlyUnclaimed = true; return chain },
        gt() { return chain },
        order() { return chain },
        then(resolve: (r: { data: unknown; error: null }) => void) {
          const match = ROWS.filter(r =>
            r.student_id === studentId && (!onlyUnclaimed || r.claimed_at === null) && r.credits > 0)
          if (mode === 'update') {
            // Atomic: claim and capture in the same tick.
            match.forEach(r => { r.claimed_at = stamp })
          }
          return Promise.resolve({ data: match.map(r => ({ ...r })), error: null }).then(resolve)
        },
      }
      void q
      return chain
    },
    rpc: async (_fn: string, args: { p_student_id?: string; p_delta?: number }) => {
      GRANTS.push({ studentId: args.p_student_id ?? '', delta: args.p_delta ?? 0 })
      return { error: null }
    },
  },
}))

beforeEach(() => {
  GRANTS = []
  LEDGER = 0
  ROWS = [
    { id: 'r1', student_id: 's1', credits: 3, claimed_at: null }, // podium #1
    { id: 'r2', student_id: 's1', credits: 1, claimed_at: null }, // promotion
    { id: 'r3', student_id: 's2', credits: 2, claimed_at: null }, // someone else
  ]
})

describe('claimRewards', () => {
  it('pays the waiting rewards once and marks them collected', async () => {
    const out = await claimRewards('s1')
    expect(out).toEqual({ claimed: 2, credits: 4 })
    expect(GRANTS).toEqual([{ studentId: 's1', delta: 4 }])
    expect(ROWS.filter(r => r.student_id === 's1' && r.claimed_at === null)).toHaveLength(0)
  })

  it('TWO CONCURRENT CLAIMS pay exactly once', async () => {
    // The reason this file exists.
    const [a, b] = await Promise.all([claimRewards('s1'), claimRewards('s1')])

    const totalPaid = GRANTS.reduce((n, g) => n + g.delta, 0)
    expect(totalPaid).toBe(4)
    // One caller gets the rewards, the other gets nothing — and which
    // one is genuinely a race, so assert on the pair, not on `a`.
    expect([a.credits, b.credits].sort()).toEqual([0, 4])
    expect([a.claimed, b.claimed].sort()).toEqual([0, 2])
  })

  it('a second claim later is a no-op, not an error', async () => {
    await claimRewards('s1')
    GRANTS = []
    const again = await claimRewards('s1')
    expect(again).toEqual({ claimed: 0, credits: 0 })
    expect(GRANTS).toEqual([]) // nothing granted for an empty claim
  })

  it('never pays out another student\'s rewards', async () => {
    await claimRewards('s1')
    expect(ROWS.find(r => r.id === 'r3')!.claimed_at).toBeNull()
    expect(GRANTS.every(g => g.studentId === 's1')).toBe(true)
  })

  it('writes a ledger row for the payout', async () => {
    await claimRewards('s1')
    expect(LEDGER).toBe(1)
  })
})
