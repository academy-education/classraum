/** @jest-environment node */
/**
 * Both charge recorders hand their charge to sendChargeReceipt (CLAUDE.md:
 * "both recorders call it").
 *
 * recordSubscriptionPayment hands every recorded subscription charge to
 * sendChargeReceipt — including a duplicate insert (a re-run, where the
 * receipt's own claim makes it a no-op) — and never one whose insert truly
 * failed. Deleting the call kept every suite green until 2026-10-02.
 */
import { recordSubscriptionPayment } from '../record-subscription-payment'
import { recordPayment } from '../grant-purchase'
import { sendChargeReceipt } from '@/lib/study/charge-receipt'
import { dbAdmin } from '@/lib/supabase-admin'
import { tableRouter } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
jest.mock('@/lib/study/charge-receipt', () => ({ sendChargeReceipt: jest.fn(async () => ({ status: 'sent', to: 'x' })) }))

const receiptMock = sendChargeReceipt as unknown as jest.Mock
let enqueue: ReturnType<typeof tableRouter>
beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  enqueue = tableRouter(dbAdmin.from as unknown as jest.Mock)
})
afterEach(() => { (console.error as jest.Mock).mockRestore() })

it.each([
  ['a new row', null, true],
  ['a duplicate insert (re-run)', { code: '23505', message: 'duplicate key' }, true],
  ['a failed insert', { code: 'XX000', message: 'boom' }, false],
])('%s', async (_label, error, sends) => {
  const ins = enqueue('study_payments', { error })
  await recordSubscriptionPayment({ paymentId: 'p1', studentId: 'stu-1', amountWon: 9900 })
  expect(ins.insert).toHaveBeenCalledWith(expect.objectContaining({ payment_id: 'p1', kind: 'study_subscription', amount_won: 9900 }))
  if (sends) expect(receiptMock).toHaveBeenCalledWith('p1')
  else expect(receiptMock).not.toHaveBeenCalled()
})

describe('grant-purchase recordPayment (credit packs, exam passes)', () => {
  it('receipts a newly recorded charge', async () => {
    enqueue('study_payments', { error: null })
    expect(await recordPayment('p2', 'stu-1', 'study_credit_pack', 7900)).toEqual({ status: 'new' })
    expect(receiptMock).toHaveBeenCalledWith('p2')
  })
  it('does not receipt a failed insert', async () => {
    enqueue('study_payments', { error: { code: 'XX000', message: 'boom' } })
    expect((await recordPayment('p2', 'stu-1', 'study_exam_pass', 29000)).status).toBe('failed')
    expect(receiptMock).not.toHaveBeenCalled()
  })
})
