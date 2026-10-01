/** @jest-environment node */
/**
 * Referral conversion since 2026-10-01: the friend's first payment is still
 * RECORDED (converted=true, once, race-safe) but pays nobody. The only
 * referral reward is the invitee's REFERRAL_INVITEE_CREDITS on redeem.
 */
import { grantReferralConversionIfEligible } from '../referral-conversion'
import { dbAdmin } from '@/lib/supabase-admin'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn(), rpc: jest.fn() } }))
jest.mock('@/lib/study/analytics', () => ({ trackEvent: jest.fn(async () => {}) }))

const fromMock = dbAdmin.from as unknown as jest.Mock
const rpcMock = dbAdmin.rpc as unknown as jest.Mock

function updateChain(result: { data: unknown; error?: unknown }) {
  const chain: Record<string, jest.Mock> = {}
  for (const m of ['update', 'eq', 'select']) chain[m] = jest.fn(() => chain)
  chain.maybeSingle = jest.fn(async () => result)
  return chain
}

describe('referral conversion', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('records the conversion and pays neither side', async () => {
    const chain = updateChain({ data: { id: 'r1', referrer_id: 'referrer-1' } })
    fromMock.mockReturnValue(chain)
    await grantReferralConversionIfEligible('student-1')
    expect(fromMock).toHaveBeenCalledWith('study_referral_redemptions')
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ converted: true }))
    expect(chain.eq).toHaveBeenCalledWith('converted', false)   // the race guard
    expect(rpcMock).not.toHaveBeenCalled()                      // no credits move
    expect(fromMock).not.toHaveBeenCalledWith('study_credit_ledger')
  })

  it('does nothing for a student who was not referred (or already converted)', async () => {
    fromMock.mockReturnValue(updateChain({ data: null }))
    await grantReferralConversionIfEligible('student-1')
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('never throws into the subscription that already succeeded', async () => {
    fromMock.mockImplementation(() => { throw new Error('db down') })
    jest.spyOn(console, 'error').mockImplementation(() => {})
    await expect(grantReferralConversionIfEligible('student-1')).resolves.toBeUndefined()
  })
})
