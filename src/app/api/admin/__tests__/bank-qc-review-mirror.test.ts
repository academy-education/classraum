/** @jest-environment node */
/**
 * POST /api/admin/bank-qc/review with { mirrorOf } — the second-reviewer
 * path that register item B1 needs.
 *
 * ── Why this path had to exist ───────────────────────────────────────
 * B1 is "one OVERLAPPING sitting by a second reviewer". The normal draw
 * shuffles the cohort and takes a random slice, so two reviewers overlap
 * only by luck — and a second sitting on DIFFERENT items cannot answer
 * B1's question, which is whether a 55% blind score is a property of the
 * items or a habit of the reader.
 *
 * ── The guard these tests exist for ──────────────────────────────────
 * All 72 human reviews on this project were sat by ONE account. The
 * obvious next move — "let the second person use the account that
 * already has the review tooling set up" — silently destroys the
 * measurement: reviewerAgreement() groups by reviewer_id, so two
 * sittings under one account collapse to a single reviewer, no pair is
 * produced, and B1 returns nothing while appearing to have run.
 *
 * That failure is invisible at the keyboard, which is why it is refused
 * in code and pinned here rather than written in a document.
 */
import { POST } from '@/app/api/admin/bank-qc/review/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/app/api/admin/_lib/admin-auth'

jest.mock('@/lib/supabase-admin', () => ({
  dbAdmin: { from: jest.fn() },
}))
jest.mock('@/app/api/admin/_lib/admin-auth', () => ({
  requireAdmin: jest.fn(),
}))

const fromMock = dbAdmin.from as unknown as jest.Mock
const requireAdminMock = requireAdmin as unknown as jest.Mock

const FIRST = 'reviewer-one'
const SECOND = 'reviewer-two'

type SourceRow = {
  item_id: string
  reviewer_id: string
  shown_order: number[]
  key_slot: string
  /** null while the reviewer has not answered that item yet. */
  blind_at: string | null
}

/** The 3 rows of a finished source run, as stored. */
const sourceRows: SourceRow[] = [
  { item_id: 'i1', reviewer_id: FIRST, shown_order: [2, 0, 3, 1], key_slot: 'B', blind_at: '2026-08-05T10:00:00Z' },
  { item_id: 'i2', reviewer_id: FIRST, shown_order: [0, 1, 2, 3], key_slot: 'A', blind_at: '2026-08-05T10:01:00Z' },
  { item_id: 'i3', reviewer_id: FIRST, shown_order: [3, 2, 1, 0], key_slot: 'D', blind_at: '2026-08-05T10:02:00Z' },
]

/**
 * Minimal stand-in for the reviews table.
 *
 * `select().eq('run_id', …)` resolves to the source rows; the
 * open-run probe (`.is('blind_at', null)` + maybeSingle) resolves to
 * whatever `openRun` says; `insert` captures what would be written.
 */
function stubReviews({ rows = sourceRows, openRun = null as string | null, insertError = null as { code?: string; message: string } | null } = {}) {
  const captured: { inserted: Record<string, unknown>[] | null } = { inserted: null }
  fromMock.mockImplementation(() => {
    const q: Record<string, unknown> = {}
    let isOpenProbe = false
    const self = () => q
    q.select = () => self()
    q.eq = () => self()
    q.order = () => self()
    q.limit = () => self()
    q.is = () => { isOpenProbe = true; return self() }
    q.maybeSingle = async () => ({ data: openRun ? { run_id: openRun } : null, error: null })
    q.insert = async (r: Record<string, unknown>[]) => {
      captured.inserted = r
      return { error: insertError }
    }
    // Awaiting the builder (no maybeSingle) is the source-row read.
    q.then = (resolve: (v: unknown) => unknown) =>
      resolve(isOpenProbe ? { data: null, error: null } : { data: rows, error: null })
    return q
  })
  return captured
}

const req = (body: unknown) =>
  ({ json: async () => body }) as unknown as Parameters<typeof POST>[0]

beforeEach(() => {
  jest.clearAllMocks()
  requireAdminMock.mockResolvedValue({ userId: SECOND, role: 'super_admin' })
})

describe('mirrorOf — a second reviewer sits the same items', () => {
  it('copies every item, and copies shown_order and key_slot UNCHANGED', async () => {
    /*
     * The presentation must be identical, not re-dealt. reviewerAgreement
     * compares `a.blindPick === b.blindPick`, which are SLOT LETTERS —
     * under two different shuffles "both picked B" would name two
     * different options and every agreement number would be noise.
     */
    const cap = stubReviews()
    const res = await POST(req({ mirrorOf: 'choose-a-response-2026-08-05' }))
    expect(res.status).toBe(200)

    expect(cap.inserted).toHaveLength(3)
    expect(cap.inserted!.map(r => r.item_id)).toEqual(['i1', 'i2', 'i3'])
    expect(cap.inserted!.map(r => r.shown_order)).toEqual(sourceRows.map(r => r.shown_order))
    expect(cap.inserted!.map(r => r.key_slot)).toEqual(sourceRows.map(r => r.key_slot))
    // ...and it is attributed to the SECOND reviewer, not the first.
    expect(new Set(cap.inserted!.map(r => r.reviewer_id))).toEqual(new Set([SECOND]))
  })

  it('REFUSES a mirror by the reviewer who already sat the run', async () => {
    // The load-bearing test. Same account => one reviewer_id => no pair.
    requireAdminMock.mockResolvedValue({ userId: FIRST, role: 'super_admin' })
    const cap = stubReviews()
    const res = await POST(req({ mirrorOf: 'choose-a-response-2026-08-05' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/DIFFERENT person/i)
    expect(cap.inserted).toBeNull()
  })

  it('404s on a run that does not exist, rather than opening an empty one', async () => {
    const cap = stubReviews({ rows: [] })
    const res = await POST(req({ mirrorOf: 'no-such-run' }))
    expect(res.status).toBe(404)
    expect(cap.inserted).toBeNull()
  })

  it('refuses to mirror a half-finished sitting unless forced', async () => {
    // Mirroring a partial run silently shrinks the overlap, so the
    // agreement denominator stops being the sample either person sat.
    const partial = [{ ...sourceRows[0] }, { ...sourceRows[1], blind_at: null }, { ...sourceRows[2] }]
    const cap = stubReviews({ rows: partial })
    const res = await POST(req({ mirrorOf: 'partial-run' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/2\/3 answered/)
    expect(cap.inserted).toBeNull()

    const forced = stubReviews({ rows: partial })
    expect((await POST(req({ mirrorOf: 'partial-run', force: true }))).status).toBe(200)
    expect(forced.inserted).toHaveLength(3)
  })

  it('will not start a mirror while the caller has an unfinished run', async () => {
    const cap = stubReviews({ openRun: 'daily-life-2026-08-05' })
    const res = await POST(req({ mirrorOf: 'choose-a-response-2026-08-05' }))
    expect(res.status).toBe(409)
    expect((await res.json()).openRun).toBe('daily-life-2026-08-05')
    expect(cap.inserted).toBeNull()
  })

  it('reports a duplicate mirror as 409, not as a 500', async () => {
    stubReviews({ insertError: { code: '23505', message: 'duplicate key' } })
    const res = await POST(req({ mirrorOf: 'choose-a-response-2026-08-05' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/already been drawn/i)
  })

  it('names the mirror after its source by default', async () => {
    stubReviews()
    const res = await POST(req({ mirrorOf: 'choose-a-response-2026-08-05' }))
    const json = await res.json()
    expect(json.runId).toBe('choose-a-response-2026-08-05-mirror')
    expect(json.mirrorOf).toBe('choose-a-response-2026-08-05')
    expect(json.drawn).toBe(3)
  })
})
