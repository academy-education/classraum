import { accessRevocationFor, revocableCredits, validateRevocationRequest } from '../refund-revocation'

describe('refund-revocation', () => {
  describe('accessRevocationFor', () => {
    it('pass payments revoke pass access; plan payments revoke the subscription', () => {
      expect(accessRevocationFor('study_exam_pass')).toBe('pass')
      expect(accessRevocationFor('study_subscription')).toBe('plan')
    })
    it('credit packs (and unknown kinds) buy no access', () => {
      expect(accessRevocationFor('study_credit_pack')).toBeNull()
      expect(accessRevocationFor('something_else')).toBeNull()
    })
  })

  describe('revocableCredits', () => {
    it('claws back what remains in the bucket', () => {
      expect(revocableCredits(15, 20)).toBe(15)
    })
    it('never claws back more than this payment granted (protects other purchases)', () => {
      // 30 remaining but this payment only granted 20 → the other 10 came
      // from somewhere else and must survive the clawback.
      expect(revocableCredits(30, 20)).toBe(20)
    })
    it('never negative, tolerates junk', () => {
      expect(revocableCredits(-5, 20)).toBe(0)
      expect(revocableCredits(0, 20)).toBe(0)
      expect(revocableCredits(NaN, 20)).toBe(0)
      expect(revocableCredits(5, NaN)).toBe(0)
    })
  })

  describe('validateRevocationRequest', () => {
    const base = {
      paymentKind: 'study_exam_pass',
      revokeCredits: false,
      revokeAccess: false,
      requestedWon: 29000,
      remainingWon: 29000,
      attributed: true,
    }

    it('plain refund with nothing to revoke is always fine', () => {
      expect(validateRevocationRequest(base)).toEqual({ ok: true })
      expect(validateRevocationRequest({ ...base, attributed: false })).toEqual({ ok: true })
    })

    it('allows revokeAccess on a full-remaining refund of a pass or plan', () => {
      expect(validateRevocationRequest({ ...base, revokeAccess: true })).toEqual({ ok: true })
      expect(validateRevocationRequest({
        ...base, paymentKind: 'study_subscription', revokeAccess: true,
      })).toEqual({ ok: true })
    })

    it('REFUSES revokeAccess on a partial refund (remaining does not hit 0)', () => {
      expect(validateRevocationRequest({ ...base, revokeAccess: true, requestedWon: 10000 })).toEqual({
        ok: false, error: 'revoke_access_requires_full_refund',
      })
    })

    it('allows revokeAccess on the FINAL partial that zeroes the remainder', () => {
      // 29000 payment, 20000 already refunded → remaining 9000; refunding
      // exactly 9000 zeroes it, so access may go.
      expect(validateRevocationRequest({
        ...base, revokeAccess: true, requestedWon: 9000, remainingWon: 9000,
      })).toEqual({ ok: true })
    })

    it('refuses revokeAccess for credit packs — they bought no access', () => {
      expect(validateRevocationRequest({
        ...base, paymentKind: 'study_credit_pack', revokeAccess: true,
      })).toEqual({ ok: false, error: 'revoke_access_not_applicable' })
    })

    it('refuses revokeCredits when attribution is ambiguous — no guessing', () => {
      expect(validateRevocationRequest({ ...base, revokeCredits: true, attributed: false })).toEqual({
        ok: false, error: 'revoke_credits_unattributable',
      })
    })

    it('allows revokeCredits alone on a partial refund when attributed', () => {
      expect(validateRevocationRequest({
        ...base, revokeCredits: true, requestedWon: 10000,
      })).toEqual({ ok: true })
    })

    it('the access rule fires before the credit rule (first refusal wins)', () => {
      expect(validateRevocationRequest({
        ...base, revokeCredits: true, revokeAccess: true, requestedWon: 100, attributed: false,
      })).toEqual({ ok: false, error: 'revoke_access_requires_full_refund' })
    })
  })
})
