/** @jest-environment node */
/**
 * POST /api/admin/bank-qc/sweep — the guards on an open verdict.
 *
 * Three of these pin decisions that would otherwise be invisible until
 * they had already cost a review pass:
 *
 *  - a flag or reject without a note is refused, because a bare reject
 *    removes an item and leaves nobody able to tell the next author what
 *    to avoid;
 *  - the content hash is read from the BANK, never accepted from the
 *    client, so a stale tab cannot stamp a verdict with the hash of text
 *    nobody is looking at any more;
 *  - clearing is a real operation, because a reviewer who marked the
 *    wrong row needs a way back that is not "mark it keep and hope".
 */
import { POST } from '@/app/api/admin/bank-qc/sweep/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/app/api/admin/_lib/admin-auth'
import { sweepSha } from '@/lib/study/item-sweep'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
jest.mock('@/app/api/admin/_lib/admin-auth', () => ({ requireAdmin: jest.fn() }))

const fromMock = dbAdmin.from as unknown as jest.Mock
const requireAdminMock = requireAdmin as unknown as jest.Mock

const REVIEWER = 'reviewer-one'
const ITEM = '11111111-1111-1111-1111-111111111111'
const BANK_ITEM = {
  passage: 'A passage.',
  prompt: 'A question?',
  choices: ['right', 'wrong'],
  correct_answer: 'right',
  explanation: 'because',
}

const req = (body: unknown) =>
  ({ json: async () => body } as unknown as Parameters<typeof POST>[0])

let upserted: Record<string, unknown> | null
let deleted: { item: string; reviewer: string } | null

beforeEach(() => {
  jest.clearAllMocks()
  upserted = null
  deleted = null
  requireAdminMock.mockResolvedValue({ userId: REVIEWER, role: 'admin' })
  fromMock.mockImplementation((table: string) => {
    if (table === 'study_item_bank') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { item: BANK_ITEM }, error: null }) }) }) }
    }
    return {
      upsert: async (row: Record<string, unknown>) => { upserted = row; return { error: null } },
      delete: () => ({
        eq: (_c1: string, v1: string) => ({
          eq: async (_c2: string, v2: string) => { deleted = { item: v1, reviewer: v2 }; return { error: null } },
        }),
      }),
    }
  })
})

it('refuses a caller who is not an admin', async () => {
  requireAdminMock.mockResolvedValue(null)
  const res = await POST(req({ itemId: ITEM, verdict: 'keep' }))
  expect(res.status).toBe(401)
  expect(upserted).toBeNull()
})

it('refuses a reject with no note, and says why', async () => {
  const res = await POST(req({ itemId: ITEM, verdict: 'reject' }))
  expect(res.status).toBe(400)
  expect((await res.json()).error).toMatch(/note/i)
  expect(upserted).toBeNull()
})

it('refuses a flag whose note is only whitespace', async () => {
  const res = await POST(req({ itemId: ITEM, verdict: 'flag', note: '   ' }))
  expect(res.status).toBe(400)
  expect(upserted).toBeNull()
})

it('accepts a keep with no note', async () => {
  const res = await POST(req({ itemId: ITEM, verdict: 'keep' }))
  expect(res.status).toBe(200)
  expect(upserted).toMatchObject({ item_id: ITEM, reviewer_id: REVIEWER, verdict: 'keep', note: null })
})

it('stamps the hash from the bank, not from the request', async () => {
  const res = await POST(req({
    itemId: ITEM, verdict: 'flag', note: 'two defensible answers',
    // A stale tab trying to sign off on text that is no longer live.
    item_sha: 'attacker-supplied', sha: 'attacker-supplied',
  }))
  expect(res.status).toBe(200)
  expect(upserted!.item_sha).toBe(sweepSha(BANK_ITEM))
  expect(upserted!.item_sha).not.toBe('attacker-supplied')
})

it('rejects a verdict outside the union', async () => {
  const res = await POST(req({ itemId: ITEM, verdict: 'looks-fine' }))
  expect(res.status).toBe(400)
  expect(upserted).toBeNull()
})

it('clears the caller row on an empty verdict, and only their own', async () => {
  const res = await POST(req({ itemId: ITEM, verdict: '' }))
  expect(res.status).toBe(200)
  expect((await res.json()).cleared).toBe(true)
  expect(deleted).toEqual({ item: ITEM, reviewer: REVIEWER })
})

it('404s when the item is gone', async () => {
  fromMock.mockImplementation((table: string) => {
    if (table === 'study_item_bank') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'no rows' } }) }) }) }
    }
    return { upsert: async (r: Record<string, unknown>) => { upserted = r; return { error: null } } }
  })
  const res = await POST(req({ itemId: ITEM, verdict: 'keep' }))
  expect(res.status).toBe(404)
  expect(upserted).toBeNull()
})
