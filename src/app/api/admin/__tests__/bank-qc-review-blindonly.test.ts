/** @jest-environment node */
/**
 * Blind-only review runs (owner rule 2026-10-27, science): the co-founder picks
 * from the options and nothing else. A run is blind-only when its run_id
 * contains "-blindonly-" (src/lib/study/item-review.ts).
 *
 * Pinned here:
 *   - the blind PATCH records the pick and returns NO reveal (no stimulus,
 *     graphic, key slot or correctness), and the reveal phase is refused
 *   - `next` reports done once every row has blind_at, with verdicts still null
 *   - openRun does not treat a closed blind-only run as open, and still finds a
 *     normal run's missing verdict behind it
 *   - the normal two-phase flow is unchanged
 *
 * BREAK-TESTED 2026-10-27 (each revert failed the named test; restored after):
 *   PATCH early return removed          -> "records the pick and returns no reveal"
 *   reveal-phase refusal removed        -> "refuses the reveal phase"
 *   next's blind-only done branch gone  -> "next is done on blind_at alone"
 *   openRun's run_id NOT LIKE removed   -> "openRun ignores a closed blind-only run ..."
 */
import { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/admin/bank-qc/review/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/app/api/admin/_lib/admin-auth'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
jest.mock('@/app/api/admin/_lib/admin-auth', () => ({ requireAdmin: jest.fn() }))

const fromMock = dbAdmin.from as unknown as jest.Mock
const requireAdminMock = requireAdmin as unknown as jest.Mock
const ME = 'reviewer-one'
const BO = 'mapsciencepilot-full1-blindonly-cofounder-2026-10-27'

type Row = Record<string, unknown>
let reviewRows: Row[] = []
const bank: Record<string, Row> = {
  i1: { item: { passage: 'P1', prompt: 'Q1', choices: ['w', 'x', 'y', 'z'], graphic: { type: 'table', columns: ['x'], rows: [['1']] } } },
  i2: { item: { passage: 'P2', prompt: 'Q2', choices: ['a', 'b', 'c', 'd'] } },
}

const like = (v: unknown, pat: string) =>
  typeof v === 'string' && new RegExp('^' + pat.split('%').map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$').test(v)

/** The PostgREST builder surface the route uses, in insertion order (as the real table returns without ORDER BY ties). */
function table(rows: Row[]) {
  const preds: Array<(r: Row) => boolean> = []
  let patch: Row | undefined
  let desc: string | null = null
  const hits = () => {
    const out = rows.filter(r => preds.every(p => p(r)))
    if (desc) { const k = desc; out.sort((a, b) => String(b[k]).localeCompare(String(a[k]))) }
    return out
  }
  const q = {
    select: () => q,
    update: (p: Row) => { patch = p; return q },
    match: (m: Row) => { for (const [k, v] of Object.entries(m)) preds.push(r => r[k] === v); return q },
    eq: (c: string, v: unknown) => { preds.push(r => r[c] === v); return q },
    is: (c: string, v: null) => { preds.push(r => (r[c] ?? null) === v); return q },
    not: (c: string, op: string, v: unknown) => {
      if (op === 'is') preds.push(r => (r[c] ?? null) !== v)
      else if (op === 'like') preds.push(r => !like(r[c], String(v)))
      else throw new Error(`mock: not.${op}`)
      return q
    },
    or: (expr: string) => {
      const parts = expr.split(',').map(p => p.split('.')[0])
      preds.push(r => parts.some(c => (r[c] ?? null) === null)); return q
    },
    order: (c: string, o?: { ascending?: boolean }) => { if (o?.ascending === false && !desc) desc = c; return q },
    limit: () => q,
    range: () => q,
    then: (res: (v: { data: Row[]; error: null }) => unknown) => Promise.resolve({ data: hits(), error: null }).then(res),
    maybeSingle: async () => {
      const hit = hits()[0] ?? null
      if (hit && patch) Object.assign(hit, patch)
      return { data: hit, error: null }
    },
    single: async () => ({ data: hits()[0] ?? null, error: null }),
  }
  return q
}

beforeEach(() => {
  requireAdminMock.mockResolvedValue({ userId: ME })
  fromMock.mockImplementation((name: string) => {
    if (name === 'study_item_reviews' || name === 'study_item_reviews_fresh') return table(reviewRows)
    if (name === 'study_item_bank') return table(Object.entries(bank).map(([id, r]) => ({ id, ...r })))
    throw new Error(`unexpected table ${name}`)
  })
})

const patch = (body: Row) => PATCH(new NextRequest('http://x/api/admin/bank-qc/review', { method: 'PATCH', body: JSON.stringify(body) }))
const next = (runId: string) => GET(new NextRequest(`http://x/api/admin/bank-qc/review?runId=${runId}&next=1`)).then(r => r.json())
const summary = () => GET(new NextRequest('http://x/api/admin/bank-qc/review')).then(r => r.json())
const row = (run: string, item: string, o: Row = {}): Row =>
  ({ run_id: run, reviewer_id: ME, item_id: item, shown_order: [0, 1, 2, 3], key_slot: 'A', blind_pick: null, blind_at: null, verdict: null, realism: null, note: null, reviewed_at: null, ...o })

describe('blind-only run', () => {
  it('records the pick and returns no reveal', async () => {
    reviewRows = [row(BO, 'i1')]
    const res = await patch({ runId: BO, itemId: 'i1', phase: 'blind', pick: 'A' })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ ok: true, blindOnly: true })
    expect(JSON.stringify(json)).not.toMatch(/P1|Q1|table|keySlot|wasCorrect/)
    expect(reviewRows[0].blind_pick).toBe('A')
    expect(reviewRows[0].blind_at).toBeTruthy()
  })

  it('refuses the reveal phase', async () => {
    reviewRows = [row(BO, 'i1', { blind_pick: 'A', blind_at: 't' })]
    const res = await patch({ runId: BO, itemId: 'i1', phase: 'reveal', verdict: 'unique', realism: 'authentic' })
    expect(res.status).toBe(409)
    expect(reviewRows[0].verdict).toBeNull()
  })

  it('next serves the next blind item with no reveal', async () => {
    reviewRows = [row(BO, 'i1', { blind_pick: 'B', blind_at: 't' }), row(BO, 'i2')]
    const json = await next(BO)
    expect(json.itemId).toBe('i2')
    expect(json.reveal).toBeUndefined()
  })

  it('next is done on blind_at alone (verdicts stay null)', async () => {
    reviewRows = [row(BO, 'i1', { blind_pick: 'B', blind_at: 't' }), row(BO, 'i2', { blind_pick: 'C', blind_at: 't' })]
    expect(await next(BO)).toEqual({ done: true })
  })

  it('openRun ignores a closed blind-only run, and still finds a normal run missing a verdict', async () => {
    // The blind-only run sorts AFTER the normal one by run_id, so a filter that does not exclude it hides the real one.
    reviewRows = [
      row(BO, 'i1', { blind_pick: 'B', blind_at: 't' }),
      row('actreadingv8a-bridge1-cofounder-2026-10-27', 'i2', { blind_pick: 'C', blind_at: 't' }),
    ]
    expect((await summary()).openRun).toBe('actreadingv8a-bridge1-cofounder-2026-10-27')
    reviewRows = [row(BO, 'i1', { blind_pick: 'B', blind_at: 't' })]
    const s = await summary()
    expect(s.openRun).toBeNull()
    expect(s.runs[0].blindOnly).toBe(true)
  })

  it('openRun still reports a blind-only run with an unanswered row', async () => {
    reviewRows = [row(BO, 'i1', { blind_pick: 'B', blind_at: 't' }), row(BO, 'i2')]
    expect((await summary()).openRun).toBe(BO)
  })
})

describe('normal two-phase run (unchanged)', () => {
  const RUN = 'actreadingv8a-bridge1-cofounder-2026-10-27'
  it('the blind answer returns the reveal with the key', async () => {
    reviewRows = [row(RUN, 'i1', { key_slot: 'B' })]
    const json = await (await patch({ runId: RUN, itemId: 'i1', phase: 'blind', pick: 'B' })).json()
    expect(json.reveal).toMatchObject({ stimulus: 'P1', prompt: 'Q1', keySlot: 'B', wasCorrect: true })
  })
  it('the verdict saves, and a missing verdict keeps the run open and resumes at the reveal', async () => {
    reviewRows = [row(RUN, 'i1', { blind_pick: 'A', blind_at: 't' })]
    expect((await summary()).openRun).toBe(RUN)
    expect((await next(RUN)).reveal).toBeDefined()
    const res = await patch({ runId: RUN, itemId: 'i1', phase: 'reveal', verdict: 'unique', realism: 'authentic' })
    expect(res.status).toBe(200)
    expect(reviewRows[0].verdict).toBe('unique')
    expect(await next(RUN)).toEqual({ done: true })
    expect((await summary()).openRun).toBeNull()
  })
})
