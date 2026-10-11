/** @jest-environment node */
/**
 * /api/admin/bank-qc/drafts — route-level guarantees:
 *  - admin only (401 otherwise, nothing read)
 *  - only list / get / save / skip; anything else 400
 *  - a group with any non-draft row is refused (403) and nothing is written
 *  - every write is filtered to the draft criteria and the loaded content_sha,
 *    and never carries verified or archived
 */
import { GET, POST } from '@/app/api/admin/bank-qc/drafts/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/app/api/admin/_lib/admin-auth'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
jest.mock('@/app/api/admin/_lib/admin-auth', () => ({ requireAdmin: jest.fn() }))

const fromMock = dbAdmin.from as unknown as jest.Mock
const requireAdminMock = requireAdmin as unknown as jest.Mock
const GROUP = 'draft-P01'
const CHOICES = ['one', 'two', 'three', 'four', 'five']

const mkRow = (i: number, over: Record<string, unknown> = {}) => ({
  id: `id-${i}`, family: 'ssat', section: 'reading', cohort: 'ssat-reading-draft-x', verified: false, archived: false,
  passage_group_id: GROUP, content_sha: `sha-${i}`, created_at: '2026-10-11',
  item: { passage: 'P', prompt: `Q${i}`, choices: [...CHOICES], correct_answer: 'two', explanation: 'E' },
  verify_meta: { draft: { status: 'awaiting_edit', qc: { risk: 'high', oo_hits: 3 } } },
  ...over,
})

type Call = { table: string; ops: [string, unknown[]][] }
let calls: Call[]
let rows: ReturnType<typeof mkRow>[]
let updateResult: { data: unknown; error: unknown }

function builder(table: string) {
  const call: Call = { table, ops: [] }
  calls.push(call)
  const p: unknown = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'then') {
        const isUpdate = call.ops.some(([o]) => o === 'update')
        const result = isUpdate ? updateResult : { data: rows, error: null }
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
  rows = Array.from({ length: 6 }, (_, i) => mkRow(i))
  updateResult = { data: [{ id: 'x' }], error: null }
  fromMock.mockImplementation((t: string) => builder(t))
  requireAdminMock.mockResolvedValue({ userId: 'admin-1', role: 'admin' })
})

const req = (body?: unknown, url = 'http://x/api/admin/bank-qc/drafts') =>
  ({ json: async () => body, nextUrl: new URL(url), headers: new Headers() } as unknown as Parameters<typeof POST>[0])
const saveBody = (over: Record<string, unknown> = {}) => ({
  action: 'save', group: GROUP,
  items: rows.map(r => ({ id: r.id, expectedSha: r.content_sha, prompt: r.item.prompt, choices: [...CHOICES], correct_answer: 'two', explanation: 'E' })),
  ...over,
})
const updates = () => calls.filter(c => c.ops.some(([o]) => o === 'update'))

describe('auth', () => {
  it('401 without an admin, and reads nothing', async () => {
    requireAdminMock.mockResolvedValue(null)
    expect((await GET(req())).status).toBe(401)
    expect((await POST(req(saveBody()))).status).toBe(401)
    expect(fromMock).not.toHaveBeenCalled()
  })
})

describe('actions', () => {
  it('lists drafts with the draft filters in the query', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.counts).toEqual({ awaiting_edit: 1, edited: 0, skipped: 0 })
    const ops = calls[0].ops
    expect(ops).toEqual(expect.arrayContaining([['like', ['cohort', 'ssat-reading-draft-%']], ['eq', ['verified', false]], ['eq', ['archived', false]], ['eq', ['family', 'ssat']]]))
  })

  it('gets a passage', async () => {
    const res = await GET(req(undefined, `http://x/api/admin/bank-qc/drafts?group=${GROUP}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(6)
    expect(body.items[0]).toMatchObject({ sha: 'sha-0', qc: { risk: 'high' }, correctAnswer: 'two' })
  })

  it('refuses an unknown action with 400 and reads nothing', async () => {
    for (const action of ['verify', 'archive', 'delete', undefined]) {
      calls = []
      expect((await POST(req({ action, group: GROUP }))).status).toBe(400)
      expect(calls).toHaveLength(0)
    }
  })
})

describe('non-draft rows are refused', () => {
  it.each([
    ['verified', { verified: true }], ['archived', { archived: true }],
    ['live cohort', { cohort: 'ssat-reading-wv6' }], ['other family', { family: 'sat' }],
  ])('%s row in the group: 403 on get, save and skip, no update issued', async (_n, over) => {
    rows[3] = mkRow(3, over)
    expect((await GET(req(undefined, `http://x/api/admin/bank-qc/drafts?group=${GROUP}`))).status).toBe(403)
    expect((await POST(req(saveBody()))).status).toBe(403)
    expect((await POST(req({ action: 'skip', group: GROUP }))).status).toBe(403)
    expect(updates()).toHaveLength(0)
  })
})

describe('writes', () => {
  it('save: one conditional update per item, filtered to drafts + loaded sha, no verified/archived in the patch', async () => {
    const body = saveBody()
    ;(body.items as { choices: string[] }[])[1].choices = ['one', 'two', 'three', 'four', 'a new five']
    const res = await POST(req(body))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, written: 6, changed: 1 })
    const ups = updates()
    expect(ups).toHaveLength(6)
    for (const u of ups) {
      const patch = u.ops.find(([o]) => o === 'update')![1][0] as Record<string, unknown>
      expect(patch).not.toHaveProperty('verified')
      expect(patch).not.toHaveProperty('archived')
      expect(patch).not.toHaveProperty('content_sha')
      expect(u.ops).toEqual(expect.arrayContaining([
        ['like', ['cohort', 'ssat-reading-draft-%']], ['eq', ['verified', false]], ['eq', ['archived', false]],
      ]))
      expect(u.ops.some(([o, a]) => o === 'eq' && a[0] === 'content_sha')).toBe(true)
    }
    const p1 = ups[1].ops.find(([o]) => o === 'update')![1][0] as { content_hash?: string; item?: { choices: string[] } }
    expect(p1.item!.choices[4]).toBe('a new five')
    expect(typeof p1.content_hash).toBe('string')
  })

  it('reports a row that changed underneath (0 rows matched) as 409', async () => {
    updateResult = { data: [], error: null }
    const res = await POST(req(saveBody()))
    expect(res.status).toBe(409)
  })

  it('skip writes status only', async () => {
    const res = await POST(req({ action: 'skip', group: GROUP }))
    expect(res.status).toBe(200)
    for (const u of updates()) {
      const patch = u.ops.find(([o]) => o === 'update')![1][0] as Record<string, unknown>
      expect(Object.keys(patch).sort()).toEqual(['updated_at', 'verify_meta'])
      expect((patch.verify_meta as { draft: { status: string } }).draft.status).toBe('skipped')
    }
  })
})
