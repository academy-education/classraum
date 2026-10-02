/** @jest-environment node */
/**
 * study-receipt-sweep: `?dry=1` sends nothing, and the sweep never picks
 * up a held, refunded, already-sent or still-fresh charge.
 *
 * Exactly-once is sendChargeReceipt's claim (charge-receipt.test.ts); this
 * pins the sweep's own selection, so it is tested against a filter-honouring
 * fake DB rather than a queue mock that would return the held row anyway.
 * Break-checked: forcing dry=false, and dropping the sweep's
 * `.is('receipt_held_reason', null)`, each fail a test below.
 */
import { NextRequest } from 'next/server'
import { fakeDb, type FakeDb } from '@/tests/fake-supabase'
import { GET } from '@/app/api/cron/study-receipt-sweep/route'
import { sendChargeReceipt } from '@/lib/study/charge-receipt'

let mockDb: FakeDb
jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: (t: string) => mockDb.from(t) } }))
jest.mock('@/lib/cron-auth', () => ({ verifyCronAuth: jest.fn(() => true) }))
jest.mock('@/lib/ops/heartbeat', () => ({ withHeartbeat: jest.fn(async (_job: string, fn: () => unknown) => fn()) }))
jest.mock('@/lib/study/charge-receipt', () => ({ sendChargeReceipt: jest.fn(async () => ({ status: 'sent', to: 'x' })) }))

const sendMock = sendChargeReceipt as unknown as jest.Mock
const ago = (min: number) => new Date(Date.now() - min * 60e3).toISOString()
const base = { student_id: 'stu-1', kind: 'study_credit_pack', amount_won: 9900, receipt_sent_at: null, refunded_at: null, receipt_held_reason: null }

beforeEach(() => {
  jest.clearAllMocks()
  mockDb = fakeDb({
    study_payments: [
      { ...base, payment_id: 'pending-old', created_at: ago(60) },
      { ...base, payment_id: 'held', created_at: ago(120), receipt_held_reason: 'email suppressed (email_suppressions)' },
      { ...base, payment_id: 'already-sent', created_at: ago(180), receipt_sent_at: ago(170) },
      { ...base, payment_id: 'refunded', created_at: ago(240), refunded_at: ago(200) },
      { ...base, payment_id: 'fresh', created_at: ago(5) },
    ],
    users: [{ id: 'stu-1', email: 'student@example.com' }],
  })
})

const req = (q = '') => new NextRequest(`http://localhost/api/cron/study-receipt-sweep${q}`, { headers: { authorization: 'Bearer cron' } })

describe('study-receipt-sweep', () => {
  it('sends only the pending, unheld, unrefunded, non-fresh charge', async () => {
    const body = await (await GET(req())).json()
    expect(body).toMatchObject({ pending: 1, sent: 1, skipped: 0, failed: 0 })
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock).toHaveBeenCalledWith('pending-old', { backfill: false })
  })

  it('?dry=1 lists what it would send and sends nothing', async () => {
    const body = await (await GET(req('?dry=1'))).json()
    expect(sendMock).not.toHaveBeenCalled()
    expect(body).toMatchObject({ dry: true, pending: 1 })
    expect(body.items).toEqual([expect.objectContaining({ kind: 'study_credit_pack', emailDomain: 'example.com' })])
    // dry output carries the domain only, never the address
    expect(JSON.stringify(body)).not.toContain('student@')
  })

  it('marks a pre-launch charge as backfill', async () => {
    mockDb.tables.study_payments[0].created_at = '2026-09-20T00:00:00+00:00'
    await GET(req())
    expect(sendMock).toHaveBeenCalledWith('pending-old', { backfill: true })
  })
})
