/** @jest-environment node */
/**
 * chargeAlreadyPaid decides whether a failed billing-key charge actually
 * left the card paid (the loser of a concurrent charge for the same
 * paymentId). The error code alone is never trusted: PortOne's payment is
 * re-read and must be PAID for the expected amount.
 */
import { chargeAlreadyPaid } from '@/lib/portone-charge'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
jest.mock('@/lib/portone-config', () => ({ getPortOneConfig: () => ({ apiSecret: 'sk', storeId: 'store' }) }))

const fetchMock = jest.fn()
beforeEach(() => {
  fetchMock.mockReset()
  ;(global as unknown as { fetch: jest.Mock }).fetch = fetchMock
})

const payment = (status: string, total = 9900) => ({
  ok: true, status: 200, json: async () => ({ status, amount: { total }, currency: 'KRW' }),
})
const ALREADY = { ok: false, httpStatus: 409, code: 'ALREADY_PAID', message: 'already paid' }

describe('chargeAlreadyPaid', () => {
  it('true only when PortOne re-reads the payment as PAID for the expected amount', async () => {
    fetchMock.mockResolvedValue(payment('PAID'))
    await expect(chargeAlreadyPaid(ALREADY, 'pay-1', 9900)).resolves.toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/payments/pay-1'), expect.anything())
  })

  it('false when the re-read is not PAID', async () => {
    fetchMock.mockResolvedValue(payment('FAILED'))
    await expect(chargeAlreadyPaid(ALREADY, 'pay-1', 9900)).resolves.toBe(false)
  })

  it('false when the paid amount differs', async () => {
    fetchMock.mockResolvedValue(payment('PAID', 1000))
    await expect(chargeAlreadyPaid(ALREADY, 'pay-1', 9900)).resolves.toBe(false)
  })

  it('never re-reads for any other failure, whatever the HTTP status', async () => {
    await expect(chargeAlreadyPaid({ ok: false, httpStatus: 409, code: 'INVALID_REQUEST' }, 'pay-1', 9900)).resolves.toBe(false)
    await expect(chargeAlreadyPaid({ ok: false, httpStatus: 409 }, 'pay-1', 9900)).resolves.toBe(false)
    await expect(chargeAlreadyPaid({ ok: true }, 'pay-1', 9900)).resolves.toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
