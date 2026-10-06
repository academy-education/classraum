/** @jest-environment node */
/**
 * Operator refund of one session's credits (POST /api/admin/study/sessions/
 * refund-credits). The RPC model reproduces the live refund_study_credit
 * body, so idempotency is exercised through the same mechanism production
 * relies on — the ledger — not a flag in the route.
 */
import { createHash } from 'crypto'
import { refundSessionCredits } from '@/lib/study/admin-session-refund'
import { POST } from '@/app/api/admin/study/sessions/refund-credits/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdminAuth, logAdminActivity } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'
import { makeRequest } from '@/tests/study-route-helpers'
import { notifyCreditRefund } from '@/lib/study/credit-refund-notify'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { rpc: jest.fn(), from: jest.fn() } }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))
jest.mock('@/lib/study/credit-refund-notify', () => ({ notifyCreditRefund: jest.fn(async () => ({ status: 'sent' })) }))
const notifyRefund = notifyCreditRefund as unknown as jest.Mock
jest.mock('@/lib/admin-auth', () => ({
  requireAdminAuth: jest.fn(async () => ({ success: true, user: { id: 'admin-1' } })),
  logAdminActivity: jest.fn(async () => {}),
}))

const rpc = dbAdmin.rpc as unknown as jest.Mock
const from = dbAdmin.from as unknown as jest.Mock

const SESS = '11111111-1111-4111-8111-111111111111'
const STU = '22222222-2222-4222-8222-222222222222'

/** Same derivation as credits.ts creditSourceId (epoch 0). */
const slice = (sessionId: string, i: number) => {
  if (i === 0) return sessionId
  const h = createHash('sha1').update(`${sessionId}:credit:${i}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}

interface World {
  balance: number
  ledger: Array<{ kind: 'debit' | 'refund'; source: string; note?: string }>
  session: Record<string, unknown> | null
  sessionUpdates: Array<Record<string, unknown>>
  noteUpdates: Array<{ note: string; sources: string[] }>
  rpcError?: boolean
}

function world(debitedSlices: number, session: Record<string, unknown> | null): World {
  const w: World = { balance: 0, ledger: [], session, sessionUpdates: [], noteUpdates: [] }
  for (let i = 0; i < debitedSlices; i++) w.ledger.push({ kind: 'debit', source: slice(SESS, i) })
  rpc.mockImplementation(async (fn: string, a: { p_student: string; p_source: string }) => {
    if (fn !== 'refund_study_credit') throw new Error(`unexpected rpc ${fn}`)
    if (w.rpcError) return { data: null, error: { message: 'boom' } }
    if (a.p_student !== STU) return { data: { ok: false, reason: 'no_debit' }, error: null }
    const has = (k: string) => w.ledger.some(l => l.kind === k && l.source === a.p_source)
    if (!has('debit')) return { data: { ok: false, reason: 'no_debit' }, error: null }
    if (has('refund')) return { data: { ok: true, already: true }, error: null }
    w.balance++
    w.ledger.push({ kind: 'refund', source: a.p_source })
    return { data: { ok: true, bucket: 'grant' }, error: null }
  })
  from.mockImplementation((table: string) => {
    let op = 'select'
    let payload: Record<string, unknown> = {}
    let inList: string[] = []
    const b: Record<string, unknown> = {}
    b.select = () => b
    b.eq = () => b
    b.update = (p: Record<string, unknown>) => { op = 'update'; payload = p; return b }
    b.in = (_c: string, v: string[]) => { inList = v; return b }
    b.maybeSingle = () => b
    b.then = (ok: (v: unknown) => unknown, no?: (e: unknown) => unknown) => {
      let res: unknown = { data: null, error: null }
      if (table === 'study_sessions' && op === 'select') res = { data: w.session, error: null }
      if (table === 'study_sessions' && op === 'update') { w.sessionUpdates.push(payload); res = { data: null, error: null } }
      if (table === 'study_credit_ledger' && op === 'update') {
        w.noteUpdates.push({ note: String(payload.note), sources: inList })
        for (const l of w.ledger) if (l.kind === 'refund' && inList.includes(l.source)) l.note = String(payload.note)
        // .select('id') on the label update: the ledger ids the notifier claims.
        res = { data: w.ledger.filter(l => l.kind === 'refund' && inList.includes(l.source)).map(l => ({ id: `L:${l.source}` })), error: null }
      }
      return Promise.resolve(res).then(ok, no)
    }
    return b
  })
  return w
}

const active = () => ({ id: SESS, student_id: STU, status: 'active', mode: 'full_test', archived: false, config: { family: 'sat' } })

describe('refundSessionCredits', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.spyOn(console, 'error').mockImplementation(() => {}) })

  it('refunds every charged slice of an abandoned 3-credit test, archives it and labels the ledger', async () => {
    const w = world(3, active())
    const out = await refundSessionCredits({ adminId: 'admin-1', sessionId: SESS, reason: 'paused SAT' })
    expect(out.status).toBe(200)
    expect(out.body).toMatchObject({ refunded: 3, alreadyRefunded: 0, failed: 0, archived: true })
    expect(w.balance).toBe(3)
    expect(w.sessionUpdates[0]).toMatchObject({ archived: true, config: { family: 'sat', credit_refund: { by: 'admin-1', refunded: 3 } } })
    expect(w.ledger.filter(l => l.kind === 'refund').every(l => l.note === 'admin refund by admin-1: paused SAT')).toBe(true)
  })

  it('is idempotent: a second call refunds nothing, relabels nothing, re-archives nothing', async () => {
    const w = world(3, active())
    await refundSessionCredits({ adminId: 'admin-1', sessionId: SESS, reason: 'first' })
    const again = await refundSessionCredits({ adminId: 'admin-2', sessionId: SESS, reason: 'second' })
    expect(again.status).toBe(200)
    expect(again.body).toMatchObject({ refunded: 0, alreadyRefunded: 3 })
    expect(w.balance).toBe(3)
    expect(w.noteUpdates).toHaveLength(1)
    expect(w.sessionUpdates).toHaveLength(1)
    expect(w.ledger.find(l => l.kind === 'refund')!.note).toContain('admin-1: first')
  })

  it('does not relabel a refund an automatic path already made', async () => {
    const w = world(2, active())
    w.ledger.push({ kind: 'refund', source: slice(SESS, 0) })        // e.g. a rollback
    const out = await refundSessionCredits({ adminId: 'admin-1', sessionId: SESS, reason: 'r' })
    expect(out.body).toMatchObject({ refunded: 1, alreadyRefunded: 1 })
    expect(w.noteUpdates[0].sources).toEqual([slice(SESS, 1)])
  })

  it('refuses a completed (delivered) test unless allowCompleted, and never archives one', async () => {
    const w = world(2, { ...active(), status: 'completed' })
    const refused = await refundSessionCredits({ adminId: 'a', sessionId: SESS, reason: 'r' })
    expect(refused.status).toBe(409)
    expect(w.balance).toBe(0)
    const forced = await refundSessionCredits({ adminId: 'a', sessionId: SESS, reason: 'r', allowCompleted: true })
    expect(forced.status).toBe(200)
    expect(w.balance).toBe(2)
    expect(w.sessionUpdates[0].archived).toBeUndefined()
  })

  it('a deleted session needs studentId, then refunds by ledger alone', async () => {
    const w = world(2, null)
    expect((await refundSessionCredits({ adminId: 'a', sessionId: SESS, reason: 'r' })).status).toBe(404)
    const out = await refundSessionCredits({ adminId: 'a', sessionId: SESS, studentId: STU, reason: 'r' })
    expect(out.status).toBe(200)
    expect(w.balance).toBe(2)
    expect(w.sessionUpdates).toHaveLength(0)
  })

  it('rejects a studentId that does not own the session', async () => {
    world(2, active())
    const out = await refundSessionCredits({ adminId: 'a', sessionId: SESS, studentId: '33333333-3333-4333-8333-333333333333', reason: 'r' })
    expect(out.status).toBe(400)
  })

  it('404s when nothing was ever charged (a free path stop)', async () => {
    const w = world(0, active())
    const out = await refundSessionCredits({ adminId: 'a', sessionId: SESS, reason: 'r' })
    expect(out.status).toBe(404)
    expect(w.sessionUpdates).toHaveLength(0)
  })

  it('an errored refund RPC is a 502 with failed > 0, not a silent success, and archives nothing', async () => {
    const w = world(2, active())
    w.rpcError = true
    const out = await refundSessionCredits({ adminId: 'a', sessionId: SESS, reason: 'r' })
    expect(out.status).toBe(502)
    expect(out.body).toMatchObject({ refunded: 0, failed: MAX_FAILED_AT_LEAST })
    expect(w.sessionUpdates).toHaveLength(0)
  })
})
// Every one of MAX_SLICES slices errors at epoch 0.
const MAX_FAILED_AT_LEAST = 6

describe('POST /api/admin/study/sessions/refund-credits', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('is admin-only: an unauthenticated call touches no credit', async () => {
    const w = world(2, active());
    (requireAdminAuth as jest.Mock).mockResolvedValueOnce({ success: false, response: NextResponse.json({}, { status: 401 }) })
    const res = await POST(makeRequest({ sessionId: SESS, reason: 'r' }))
    expect(res.status).toBe(401)
    expect(rpc).not.toHaveBeenCalled()
    expect(w.balance).toBe(0)
  })

  it('requires a reason and a uuid session id', async () => {
    world(2, active())
    expect((await POST(makeRequest({ sessionId: SESS }))).status).toBe(400)
    expect((await POST(makeRequest({ sessionId: 'nope', reason: 'r' }))).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('writes an admin activity row with what moved', async () => {
    world(3, active())
    const res = await POST(makeRequest({ sessionId: SESS, reason: 'paused SAT' }))
    expect(res.status).toBe(200)
    expect(logAdminActivity).toHaveBeenCalledWith(expect.objectContaining({
      adminUserId: 'admin-1', action: 'STUDY_SESSION_CREDIT_REFUND', targetId: STU,
      metadata: expect.objectContaining({ sessionId: SESS, refunded: 3 }),
    }))
  })
})

describe('refund notifications (2026-10-06)', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('refundSessionCredits notifies only when asked, with exactly the rows THIS call refunded', async () => {
    // mutation: drop `input.notify &&` (notifies on every call) or pass r.refundedSources
    world(3, active())
    await refundSessionCredits({ adminId: 'a', sessionId: SESS, reason: 'r' })
    expect(notifyRefund).not.toHaveBeenCalled()
    const w = world(3, active())
    w.ledger.push({ kind: 'refund', source: slice(SESS, 0) })   // an earlier automatic refund: not announced
    const out = await refundSessionCredits({ adminId: 'a', sessionId: SESS, reason: 'r', notify: true, noticeReason: { en: 'Sorry' } })
    expect(w.balance).toBe(2)
    expect(notifyRefund).toHaveBeenCalledTimes(1)
    expect(notifyRefund).toHaveBeenCalledWith(STU, [1, 2].map(i => `L:${slice(SESS, i)}`), { en: 'Sorry' }, { sessionIds: [SESS] })
    expect(out.result?.refundLedgerIds).toHaveLength(2)
  })

  it('a replay (everything already refunded) notifies nobody', async () => {
    world(2, active())
    await refundSessionCredits({ adminId: 'a', sessionId: SESS, reason: 'r' })
    await refundSessionCredits({ adminId: 'a', sessionId: SESS, reason: 'r', notify: true })
    expect(notifyRefund).not.toHaveBeenCalled()
  })

  it('a notifier failure never fails the refund', async () => {
    world(2, active())
    notifyRefund.mockResolvedValueOnce({ status: 'failed', reason: 'Resend 500' })
    const out = await refundSessionCredits({ adminId: 'a', sessionId: SESS, reason: 'r', notify: true })
    expect(out.status).toBe(200)
    expect(out.body).toMatchObject({ ok: true, refunded: 2 })
  })

  it('the route notifies by default, once, after the refund', async () => {
    world(3, active())
    const res = await POST(makeRequest({ sessionId: SESS, reason: 'paused SAT', noticeReason: { ko: '죄송합니다' } }))
    expect(res.status).toBe(200)
    expect(notifyRefund).toHaveBeenCalledTimes(1)
    expect(notifyRefund.mock.calls[0][0]).toBe(STU)
    expect(notifyRefund.mock.calls[0][1]).toHaveLength(3)
    expect(notifyRefund.mock.calls[0][2]).toEqual({ ko: '죄송합니다' })
    expect(await res.json()).toMatchObject({ ok: true, refunded: 3, notice: 'sent' })
  })

  it('notify:false on the route sends nothing', async () => {
    world(3, active())
    await POST(makeRequest({ sessionId: SESS, reason: 'r', notify: false }))
    expect(notifyRefund).not.toHaveBeenCalled()
  })

  it('a batch of sessions for one student is ONE notification carrying every session\'s rows', async () => {
    // mutation: notify inside the per-session loop (one message per session)
    const SESS2 = '44444444-4444-4444-8444-444444444444'
    const w = world(2, active())
    for (let i = 0; i < 2; i++) w.ledger.push({ kind: 'debit', source: slice(SESS2, i) })
    // the session lookup answers with a row owned by STU for either id
    const res = await POST(makeRequest({ sessionIds: [SESS, SESS2], reason: 'essay bug' }))
    expect(res.status).toBe(200)
    expect(notifyRefund).toHaveBeenCalledTimes(1)
    const [stu, ids, , opts] = notifyRefund.mock.calls[0]
    expect(stu).toBe(STU)
    expect(ids).toHaveLength(4)
    expect(opts).toEqual({ sessionIds: [SESS, SESS2] })
    expect(logAdminActivity).toHaveBeenCalledTimes(2)
  })

  it('rejects a body with both or neither of sessionId / sessionIds', async () => {
    world(2, active())
    expect((await POST(makeRequest({ reason: 'r' }))).status).toBe(400)
    expect((await POST(makeRequest({ sessionId: SESS, sessionIds: [SESS], reason: 'r' }))).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })
})
