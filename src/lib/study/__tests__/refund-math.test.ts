import { creditPresetWon, refundedTotalWon, remainingWon, validateRefundAmount } from '../refund-math'
import { attributePaymentCredits } from '../refund-credit-preset'

describe('refund-math', () => {
  describe('remainingWon', () => {
    it('is the full amount when nothing was refunded', () => {
      expect(remainingWon(50000, [])).toBe(50000)
    })
    it('subtracts prior refunds', () => {
      expect(remainingWon(50000, [{ amountWon: 10000 }, { amountWon: 5000 }])).toBe(35000)
    })
    it('is 0 when fully refunded, and never negative', () => {
      expect(remainingWon(50000, [{ amountWon: 50000 }])).toBe(0)
      expect(remainingWon(50000, [{ amountWon: 60000 }])).toBe(0)
    })
    it('treats a null/undefined amount as 0', () => {
      expect(remainingWon(null, [])).toBe(0)
      expect(remainingWon(undefined, [])).toBe(0)
    })
    it('sums the ledger', () => {
      expect(refundedTotalWon([{ amountWon: 1 }, { amountWon: 2 }, { amountWon: 3 }])).toBe(6)
    })
  })

  describe('validateRefundAmount', () => {
    it('defaults to the full remaining amount when no amount is requested', () => {
      expect(validateRefundAmount(undefined, 35000)).toEqual({ ok: true, amountWon: 35000 })
    })
    it('accepts a partial amount within remaining', () => {
      expect(validateRefundAmount(10000, 35000)).toEqual({ ok: true, amountWon: 10000 })
    })
    it('accepts exactly the remaining amount (final refund)', () => {
      expect(validateRefundAmount(35000, 35000)).toEqual({ ok: true, amountWon: 35000 })
    })
    it('REJECTS an amount exceeding remaining — the non-redundancy guard', () => {
      expect(validateRefundAmount(35001, 35000)).toEqual({ ok: false, error: 'exceeds_remaining' })
      // even off a partially-refunded payment
      expect(validateRefundAmount(50000, remainingWon(50000, [{ amountWon: 20000 }]))).toEqual({
        ok: false, error: 'exceeds_remaining',
      })
    })
    it('rejects anything when nothing remains (already fully refunded)', () => {
      expect(validateRefundAmount(1, 0)).toEqual({ ok: false, error: 'nothing_remaining' })
      expect(validateRefundAmount(undefined, 0)).toEqual({ ok: false, error: 'nothing_remaining' })
    })
    it('rejects zero, negative and non-integer amounts', () => {
      expect(validateRefundAmount(0, 35000)).toEqual({ ok: false, error: 'invalid_amount' })
      expect(validateRefundAmount(-100, 35000)).toEqual({ ok: false, error: 'invalid_amount' })
      expect(validateRefundAmount(99.5, 35000)).toEqual({ ok: false, error: 'invalid_amount' })
    })
  })

  describe('creditPresetWon (refund-unused-credits preset)', () => {
    it("computes Andy's example: ₩18,900 × 15/20 unused = ₩14,175", () => {
      expect(creditPresetWon(18900, 15, 20)).toBe(14175)
    })
    it('floors to whole won', () => {
      // 9900 × 7 / 10 = 6930 exactly; 9900 × 1 / 3 = 3300; 1900 × 2 / 3 = 1266.66… → 1266
      expect(creditPresetWon(1900, 2, 3)).toBe(1266)
    })
    it('clamps unused to at most the granted count (full refund, never more)', () => {
      expect(creditPresetWon(18900, 25, 20)).toBe(18900)
    })
    it('clamps negative unused to 0', () => {
      expect(creditPresetWon(18900, -3, 20)).toBe(0)
    })
    it('returns null when granted is unknown or zero — no prefill, no guessing', () => {
      expect(creditPresetWon(18900, 5, 0)).toBeNull()
      expect(creditPresetWon(18900, 5, -1)).toBeNull()
      expect(creditPresetWon(null, 5, 20)).toBeNull()
      expect(creditPresetWon(0, 5, 20)).toBeNull()
    })
    it('the preset still goes through the remaining-amount validation and is rejected past remaining', () => {
      // Payment of 18900 with 10000 already refunded → remaining 8900. A
      // preset of 14175 (15/20 unused) must be REJECTED like any manual amount.
      const preset = creditPresetWon(18900, 15, 20)!
      const remaining = remainingWon(18900, [{ amountWon: 10000 }])
      expect(validateRefundAmount(preset, remaining)).toEqual({ ok: false, error: 'exceeds_remaining' })
      // …and accepted when it fits.
      expect(validateRefundAmount(preset, remainingWon(18900, []))).toEqual({ ok: true, amountWon: 14175 })
    })
  })

  describe('attributePaymentCredits (price → catalog)', () => {
    it('maps a known credit-pack price to the purchased bucket', () => {
      expect(attributePaymentCredits('study_credit_pack', 13900)).toEqual({ ok: true, grantedCredits: 10, bucket: 'purchased' })
    })
    it('maps a known plan price to the grant bucket', () => {
      expect(attributePaymentCredits('study_subscription', 18900)).toEqual({ ok: true, grantedCredits: 20, bucket: 'grant' })
    })
    it('maps a pass price to the pass bucket with its candidate tests', () => {
      const a = attributePaymentCredits('study_exam_pass', 29000)
      expect(a.ok && a.bucket === 'pass' && a.grantedCredits === 20).toBe(true)
    })
    it('refuses to guess on an unknown price or kind', () => {
      expect(attributePaymentCredits('study_credit_pack', 1234)).toEqual({ ok: false, reason: 'no_catalog_match' })
      expect(attributePaymentCredits('something_else', 13900)).toEqual({ ok: false, reason: 'unknown_kind' })
      expect(attributePaymentCredits('study_subscription', 0)).toEqual({ ok: false, reason: 'zero_amount' })
    })
  })
})
