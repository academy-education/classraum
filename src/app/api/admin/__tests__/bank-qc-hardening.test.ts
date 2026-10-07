/** @jest-environment node */
/**
 * /api/admin/bank-qc/hardening — the two guarantees the owner asked for:
 *
 *  1. super_admin ONLY. requireAdmin admits `admin` too; this route must
 *     narrow it, and must not read or write anything for a refused caller.
 *  2. a save STAGES and never overwrites. The only write is the
 *     study_item_hardening_stage RPC (migration 124, which inserts a new
 *     verified=false row). No update/insert/upsert/delete may reach
 *     study_item_bank from this route, whatever the edit.
 *
 * The SQL side of (2) — the original row untouched, the live count
 * unchanged, a re-save replacing rather than duplicating, the swap
 * idempotent — is tested against the real schema in a rolled-back
 * transaction: database/tests/124_item_hardening.test.sql.
 */
import { GET, POST } from '@/app/api/admin/bank-qc/hardening/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/app/api/admin/_lib/admin-auth'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn(), rpc: jest.fn() } }))
jest.mock('@/app/api/admin/_lib/admin-auth', () => ({ requireAdmin: jest.fn() }))

const fromMock = dbAdmin.from as unknown as jest.Mock
const rpcMock = dbAdmin.rpc as unknown as jest.Mock
const requireAdminMock = requireAdmin as unknown as jest.Mock

const ITEM_ID = '11111111-1111-1111-1111-111111111111'
const SHA = 'sha-live'
const LIVE = {
  id: ITEM_ID, family: 'sat', section: 'math', domain: 'Algebra', subskill: 'systems',
  difficulty: 'medium', cohort: 'v3', passage_group_id: null, verified: true, archived: false,
  content_sha: SHA,
  item: {
    prompt: 'If 2x + 3 = 11, what is x?', passage: null,
    choices: ['2', '4', '7', '8'], correct_answer: '4', explanation: 'Subtract 3, divide by 2.',
    distractor_rationales: [{ choice: '2', reason: 'a' }, { choice: '7', reason: 'b' }, { choice: '8', reason: 'c' }],
  },
}

/** A thenable PostgREST stand-in: every builder method chains, awaiting resolves `result`. */
function chain(result: unknown, log?: string[], table?: string) {
  const p: unknown = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown) => Promise.resolve(result).then(res)
      return (..._args: unknown[]) => {
        if (log && table && ['update', 'insert', 'upsert', 'delete'].includes(String(prop))) log.push(`${String(prop)}:${table}`)
        return p
      }
    },
  })
  return p
}

let writes: string[]

beforeEach(() => {
  jest.clearAllMocks()
  writes = []
  fromMock.mockImplementation((table: string) => {
    if (table === 'study_item_bank') return chain({ data: LIVE, error: null, count: 0 }, writes, table)
    if (table === 'study_item_hardening_candidates') return chain({ data: [], error: null }, writes, table)
    if (table === 'study_item_hardening_edits') return chain({ data: [], error: null }, writes, table)
    return chain({ data: null, error: null }, writes, table)
  })
  rpcMock.mockResolvedValue({ data: 'edit-1', error: null })
})

const req = (body?: unknown, url = 'http://x/api/admin/bank-qc/hardening') =>
  ({ json: async () => body, nextUrl: new URL(url), headers: new Headers() } as unknown as Parameters<typeof POST>[0])

const edit = (over: Record<string, unknown> = {}) => ({
  itemId: ITEM_ID, expectedSha: SHA,
  prompt: 'If 2x + 3 = 11 and x is not an integer multiple of 4, what is x?',
  choices: ['2', '4', '7', '8'], correctIndex: 1, explanation: 'Subtract 3, divide by 2.',
  ...over,
})

describe('permissions', () => {
  it('401 for a non-admin, and touches nothing', async () => {
    requireAdminMock.mockResolvedValue(null)
    expect((await POST(req(edit()))).status).toBe(401)
    expect((await GET(req())).status).toBe(401)
    expect(fromMock).not.toHaveBeenCalled()
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('403 for a plain admin — requireAdmin is not enough here', async () => {
    requireAdminMock.mockResolvedValue({ userId: 'a', role: 'admin' })
    const res = await POST(req(edit()))
    expect(res.status).toBe(403)
    expect((await GET(req())).status).toBe(403)
    expect(fromMock).not.toHaveBeenCalled()
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('a super_admin gets through', async () => {
    requireAdminMock.mockResolvedValue({ userId: 'sa', role: 'super_admin' })
    expect((await POST(req(edit()))).status).toBe(200)
    expect((await GET(req())).status).toBe(200)
  })
})

describe('a save stages, never overwrites', () => {
  beforeEach(() => requireAdminMock.mockResolvedValue({ userId: 'sa', role: 'super_admin' }))

  it('calls only the staging RPC, with the edited item and the editor, and reports not-live', async () => {
    const res = await POST(req(edit({ note: 'adds a constraint' })))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toMatchObject({ editId: 'edit-1', status: 'queued', live: false })
    expect(rpcMock).toHaveBeenCalledTimes(1)
    const [fn, args] = rpcMock.mock.calls[0]
    expect(fn).toBe('study_item_hardening_stage')
    expect(args.p_original).toBe(ITEM_ID)
    expect(args.p_editor).toBe('sa')
    expect(args.p_expected_sha).toBe(SHA)
    expect(args.p_item.prompt).toMatch(/not an integer multiple/)
    expect(args.p_item.correct_answer).toBe('4')
    expect(args.p_changed).toEqual(['prompt'])
    expect(writes).toEqual([])               // no direct write to ANY table
  })

  it('refuses a stale tab (sha differs) before staging anything', async () => {
    const res = await POST(req(edit({ expectedSha: 'old-sha' })))
    expect(res.status).toBe(409)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('refuses an explanation-only edit (it cannot make the item harder)', async () => {
    const res = await POST(req(edit({ prompt: LIVE.item.prompt, explanation: 'A longer explanation.' })))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/explanation-only/)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('refuses an item that is not live', async () => {
    fromMock.mockImplementation((table: string) =>
      table === 'study_item_bank' ? chain({ data: { ...LIVE, verified: false }, error: null }, writes, table) : chain({ data: [], error: null }))
    expect((await POST(req(edit()))).status).toBe(409)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('maps the database refusals: in-gate -> 409, bad content -> 400', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { code: '55006', message: 'already in the gate' } })
    expect((await POST(req(edit()))).status).toBe(409)
    rpcMock.mockResolvedValueOnce({ data: null, error: { code: '22023', message: 'changes no stem' } })
    expect((await POST(req(edit()))).status).toBe(400)
  })
})
