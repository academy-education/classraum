/** @jest-environment node */
/**
 * /api/admin/bank-qc/drafts for MAP reading drafts (4 choices). The SSAT
 * guarantees live in bank-qc-drafts.test.ts, unchanged; this file pins:
 *  - the list runs one query per allowlisted family, each with that family's
 *    filters, and keeps only rows that really are drafts of that family
 *  - get reports the family and its choice count
 *  - a MAP save is filtered on family=map, section=reading,
 *    cohort LIKE 'map-reading-draft-%', and a 5-choice MAP edit is refused
 */
import { GET, POST } from '@/app/api/admin/bank-qc/drafts/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/app/api/admin/_lib/admin-auth'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
jest.mock('@/app/api/admin/_lib/admin-auth', () => ({ requireAdmin: jest.fn() }))

const fromMock = dbAdmin.from as unknown as jest.Mock
const requireAdminMock = requireAdmin as unknown as jest.Mock
const GROUP = 'map-draft1-M1-P01'
const CHOICES = ['one', 'two', 'three', 'four']

const mkRow = (i: number, over: Record<string, unknown> = {}) => ({
  id: `m-${i}`, family: 'map', section: 'reading', cohort: 'map-reading-draft-1', verified: false, archived: false,
  passage_group_id: GROUP, content_sha: `sha-${i}`, created_at: '2026-10-12',
  item: { passage: 'P', prompt: `Q${i}`, choices: [...CHOICES], correct_answer: 'two', explanation: 'E' },
  verify_meta: { draft: { status: 'awaiting_edit', qc: { risk: 'med', oo_hits: 1 } } },
  ...over,
})

type Call = { table: string; ops: [string, unknown[]][] }
let calls: Call[]
let rows: ReturnType<typeof mkRow>[]
let listFor: ((call: Call) => unknown[]) | null

function builder(table: string) {
  const call: Call = { table, ops: [] }
  calls.push(call)
  const p: unknown = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'then') {
        const isUpdate = call.ops.some(([o]) => o === 'update')
        const result = isUpdate ? { data: [{ id: 'x' }], error: null }
          : { data: listFor && call.ops.some(([o]) => o === 'range') ? listFor(call) : rows, error: null }
        return (res: (v: unknown) => unknown) => Promise.resolve(result).then(res)
      }
      return (...args: unknown[]) => { call.ops.push([String(prop), args]); return p }
    },
  })
  return p
}

beforeEach(() => {
  jest.clearAllMocks()
  calls = []
  rows = Array.from({ length: 4 }, (_, i) => mkRow(i))
  listFor = null
  fromMock.mockImplementation((t: string) => builder(t))
  requireAdminMock.mockResolvedValue({ userId: 'admin-1', role: 'admin' })
})

const req = (body?: unknown, url = 'http://x/api/admin/bank-qc/drafts') =>
  ({ json: async () => body, nextUrl: new URL(url), headers: new Headers() } as unknown as Parameters<typeof POST>[0])
const saveBody = (choices = CHOICES) => ({
  action: 'save', group: GROUP,
  items: rows.map(r => ({ id: r.id, expectedSha: r.content_sha, prompt: r.item.prompt, choices: [...choices], correct_answer: 'two', explanation: 'E' })),
})
const updates = () => calls.filter(c => c.ops.some(([o]) => o === 'update'))

it('lists with one query per family, each with its own filters, keeping only that family\'s drafts', async () => {
  // The mock answers every query with the same rows, MAP plus one SSAT draft:
  // the SSAT query must not surface the MAP rows, and vice versa.
  // A verified MAP row must also be dropped by the re-check, not counted.
  rows = [...rows, mkRow(9, { family: 'ssat', cohort: 'ssat-reading-draft-1', passage_group_id: 'draft1-D1-P01' }), mkRow(8, { verified: true })]
  const res = await GET(req())
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.rows).toBe(5)
  expect(body.passages.map((p: { group: string; family: string; items: number }) => [p.group, p.family, p.items]).sort())
    .toEqual([['draft1-D1-P01', 'ssat-reading', 1], [GROUP, 'map-reading', 4]])
  const lists = calls.filter(c => c.ops.some(([o]) => o === 'range'))
  expect(lists).toHaveLength(2)
  expect(lists[0].ops).toEqual(expect.arrayContaining([['eq', ['family', 'ssat']], ['like', ['cohort', 'ssat-reading-draft-%']]]))
  expect(lists[1].ops).toEqual(expect.arrayContaining([
    ['eq', ['family', 'map']], ['eq', ['section', 'reading']], ['like', ['cohort', 'map-reading-draft-%']],
    ['eq', ['verified', false]], ['eq', ['archived', false]],
  ]))
})

it('a family query that returns another family\'s drafts cannot widen the list', async () => {
  // Simulates a broken filter: the SSAT query hands back MAP drafts and the
  // MAP query returns nothing. The rows must be dropped, not listed.
  listFor = call => (call.ops.some(([o, a]) => o === 'eq' && a[0] === 'family' && a[1] === 'ssat') ? rows : [])
  const body = await (await GET(req())).json()
  expect(body.rows).toBe(0)
  expect(body.passages).toEqual([])
})

it('gets a MAP passage with its family and choice count', async () => {
  const res = await GET(req(undefined, `http://x/api/admin/bank-qc/drafts?group=${GROUP}`))
  expect(res.status).toBe(200)
  expect(await res.json()).toMatchObject({ family: 'map-reading', familyLabel: 'MAP reading', choiceCount: 4 })
})

it('refuses a group mixing SSAT and MAP drafts: 403 on get, save, skip; no update', async () => {
  rows[2] = mkRow(2, { family: 'ssat', cohort: 'ssat-reading-draft-1' })
  expect((await GET(req(undefined, `http://x/api/admin/bank-qc/drafts?group=${GROUP}`))).status).toBe(403)
  expect((await POST(req(saveBody()))).status).toBe(403)
  expect((await POST(req({ action: 'skip', group: GROUP }))).status).toBe(403)
  expect(updates()).toHaveLength(0)
})

it('saves a MAP passage with writes filtered to the MAP family and the loaded sha', async () => {
  const body = saveBody()
  ;(body.items[0] as { choices: string[] }).choices = ['one', 'two', 'three', 'a new four']
  const res = await POST(req(body))
  expect(res.status).toBe(200)
  expect(await res.json()).toMatchObject({ ok: true, written: 4, changed: 1 })
  const ups = updates()
  expect(ups).toHaveLength(4)
  for (const u of ups) {
    const patch = u.ops.find(([o]) => o === 'update')![1][0] as Record<string, unknown>
    expect(patch).not.toHaveProperty('verified')
    expect(patch).not.toHaveProperty('archived')
    expect(u.ops).toEqual(expect.arrayContaining([
      ['eq', ['family', 'map']], ['eq', ['section', 'reading']], ['like', ['cohort', 'map-reading-draft-%']],
      ['eq', ['verified', false]], ['eq', ['archived', false]],
    ]))
    expect(u.ops.some(([o, a]) => o === 'eq' && a[0] === 'family' && a[1] === 'ssat')).toBe(false)
    expect(u.ops.some(([o, a]) => o === 'eq' && a[0] === 'content_sha')).toBe(true)
  }
})

it('refuses a 5-choice edit on a MAP passage with 400 and writes nothing', async () => {
  const res = await POST(req(saveBody([...CHOICES, 'five'])))
  expect(res.status).toBe(400)
  expect(updates()).toHaveLength(0)
})
