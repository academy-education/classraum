/** @jest-environment node */
/**
 * GET /api/admin/bank-qc/review?runId=…&next=1 — resuming a review whose
 * blind pick saved but whose verdict did not.
 *
 * On 2026-10-26 the co-founder's MAP Reading spot run ended with 11 of 12
 * verdicts: one item had its blind pick and no verdict. `next` only looked
 * for rows with blind_at null, so it answered `done`, his screen showed
 * nothing left, and the release script refused to close the run because a
 * verdict was missing. Neither side could move. These tests pin the resume.
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/admin/bank-qc/review/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/app/api/admin/_lib/admin-auth'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
jest.mock('@/app/api/admin/_lib/admin-auth', () => ({ requireAdmin: jest.fn() }))

const fromMock = dbAdmin.from as unknown as jest.Mock
const requireAdminMock = requireAdmin as unknown as jest.Mock
const ME = 'reviewer-one'

type Row = Record<string, unknown>
let reviewRows: Row[] = []
const bank: Record<string, Row> = {
  i1: { item: { passage: 'P1', prompt: 'Q1', choices: ['w', 'x', 'y', 'z'] } },
  i2: { item: { passage: 'P2', prompt: 'Q2', choices: ['a', 'b', 'c', 'd'] } },
}

/** Just enough of the PostgREST builder for the filters the route uses. */
function table(rows: Row[]) {
  const preds: Array<(r: Row) => boolean> = []
  const q = {
    select: () => q,
    eq: (c: string, v: unknown) => { preds.push(r => r[c] === v); return q },
    is: (c: string, v: null) => { preds.push(r => (r[c] ?? null) === v); return q },
    not: (c: string, _op: string, v: null) => { preds.push(r => (r[c] ?? null) !== v); return q },
    or: (expr: string) => {
      const parts = expr.split(',').map(p => p.split('.')[0])
      preds.push(r => parts.some(c => (r[c] ?? null) === null)); return q
    },
    order: () => q,
    limit: () => q,
    maybeSingle: async () => ({ data: rows.filter(r => preds.every(p => p(r)))[0] ?? null, error: null }),
    single: async () => ({ data: rows.filter(r => preds.every(p => p(r)))[0] ?? null, error: null }),
  }
  return q
}

beforeEach(() => {
  requireAdminMock.mockResolvedValue({ userId: ME })
  fromMock.mockImplementation((name: string) => {
    if (name === 'study_item_reviews') return table(reviewRows)
    if (name === 'study_item_bank') return table(Object.entries(bank).map(([id, r]) => ({ id, ...r })))
    throw new Error(`unexpected table ${name}`)
  })
})

const next = (runId = 'run-1') =>
  GET(new NextRequest(`http://x/api/admin/bank-qc/review?runId=${runId}&next=1`)).then(r => r.json())

it('resumes at the reveal when the blind pick saved and the verdict did not', async () => {
  reviewRows = [
    { run_id: 'run-1', reviewer_id: ME, item_id: 'i1', shown_order: [0, 1, 2, 3], key_slot: 'A', blind_pick: 'A', blind_at: 't', verdict: 'unique' },
    { run_id: 'run-1', reviewer_id: ME, item_id: 'i2', shown_order: [3, 2, 1, 0], key_slot: 'B', blind_pick: 'D', blind_at: 't', verdict: null },
  ]
  const json = await next()
  expect(json.done).toBeUndefined()
  expect(json.itemId).toBe('i2')
  expect(json.reveal).toEqual({ stimulus: 'P2', prompt: 'Q2', options: ['d', 'c', 'b', 'a'], keySlot: 'B', wasCorrect: false })
})

it('a blind-pending item still comes first, with no reveal attached', async () => {
  reviewRows = [
    { run_id: 'run-1', reviewer_id: ME, item_id: 'i1', shown_order: [0, 1, 2, 3], key_slot: 'A', blind_pick: null, blind_at: null, verdict: null },
    { run_id: 'run-1', reviewer_id: ME, item_id: 'i2', shown_order: [3, 2, 1, 0], key_slot: 'B', blind_pick: 'D', blind_at: 't', verdict: null },
  ]
  const json = await next()
  expect(json.itemId).toBe('i1')
  expect(json.reveal).toBeUndefined()
})

it('is done only when every row has a verdict', async () => {
  reviewRows = [
    { run_id: 'run-1', reviewer_id: ME, item_id: 'i1', shown_order: [0, 1, 2, 3], key_slot: 'A', blind_pick: 'A', blind_at: 't', verdict: 'unique' },
  ]
  expect(await next()).toEqual({ done: true })
})

it("another reviewer's missing verdict is not resumed into mine", async () => {
  reviewRows = [
    { run_id: 'run-1', reviewer_id: 'someone-else', item_id: 'i2', shown_order: [0, 1, 2, 3], key_slot: 'B', blind_pick: 'D', blind_at: 't', verdict: null },
  ]
  expect(await next()).toEqual({ done: true })
})
