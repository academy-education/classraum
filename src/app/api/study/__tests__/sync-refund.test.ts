/** @jest-environment node */
/**
 * Tests for syncStudyPaymentRefund — reconciles refunds issued OUTSIDE our
 * admin console (PortOne dashboard, chargebacks) onto study_payments.
 *
 * The security property under test: the webhook signature is only advisory
 * on these endpoints, so the stamp must depend on PortOne's OWN report of
 * the payment, never on the webhook body. A forged "cancelled" webhook must
 * not be able to mark real revenue as refunded.
 */
import { syncStudyPaymentRefund } from '@/lib/study/sync-refund'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getPaymentInfo } from '@/lib/portone-charge'
import { tableRouter } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: jest.fn(), rpc: jest.fn() },
}))
jest.mock('@/lib/portone-charge', () => ({ getPaymentInfo: jest.fn() }))

const fromMock = supabaseAdmin.from as unknown as jest.Mock
const getPaymentInfoMock = getPaymentInfo as unknown as jest.Mock

const OURS = { payment_id: 'study-pack-1', refunded_at: null }

describe('syncStudyPaymentRefund', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    enqueue = tableRouter(fromMock)
  })

  afterEach(() => {
    ;(console.error as jest.Mock).mockRestore()
  })

  it('ignores a payment that is not ours (no study_payments row)', async () => {
    enqueue('study_payments', { data: null })

    const res = await syncStudyPaymentRefund('inv_academy_123')

    expect(res).toEqual({ status: 'not_ours' })
    // Never asks PortOne about a payment that isn't ours.
    expect(getPaymentInfoMock).not.toHaveBeenCalled()
  })

  it('is idempotent — a second delivery for an already-refunded row no-ops', async () => {
    enqueue('study_payments', { data: { ...OURS, refunded_at: '2026-07-01T00:00:00Z' } })

    const res = await syncStudyPaymentRefund('study-pack-1')

    expect(res).toEqual({ status: 'already_refunded' })
    expect(getPaymentInfoMock).not.toHaveBeenCalled()
  })

  it('refuses to stamp when PortOne still reports the payment as PAID', async () => {
    // The forged-webhook case: body claims cancelled, PortOne disagrees.
    enqueue('study_payments', { data: OURS })
    const update = enqueue('study_payments', { error: null })
    getPaymentInfoMock.mockResolvedValue({ ok: true, status: 'PAID' })

    const res = await syncStudyPaymentRefund('study-pack-1')

    expect(res).toEqual({ status: 'not_cancelled' })
    expect(update.update).not.toHaveBeenCalled()
  })

  it('asks for redelivery when PortOne cannot be reached', async () => {
    enqueue('study_payments', { data: OURS })
    getPaymentInfoMock.mockResolvedValue({ ok: false, message: 'network' })

    const res = await syncStudyPaymentRefund('study-pack-1')

    expect(res).toEqual({ status: 'unverifiable', retryable: true })
  })

  it.each(['CANCELLED', 'PARTIAL_CANCELLED'])(
    'stamps refunded_at when PortOne reports %s',
    async (status) => {
      enqueue('study_payments', { data: OURS })
      const update = enqueue('study_payments', { error: null })
      getPaymentInfoMock.mockResolvedValue({ ok: true, status })

      const res = await syncStudyPaymentRefund('study-pack-1', 'console refund')

      expect(res).toEqual({ status: 'marked' })
      expect(update.update).toHaveBeenCalledWith(
        expect.objectContaining({ refund_reason: 'console refund' }),
      )
      // Guarded so a concurrent delivery can't double-stamp.
      expect(update.is).toHaveBeenCalledWith('refunded_at', null)
    },
  )
})
