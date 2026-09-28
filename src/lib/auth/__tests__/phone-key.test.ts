import { phoneKey } from '../phone'
import { maskEmail } from '../mask-email'
import { LAST_SIGN_IN_KEY, readSignInMethod, rememberSignInMethod } from '../last-sign-in'

describe('phoneKey', () => {
  it('keys the three spellings of one number identically', () => {
    expect(new Set(['508227384', '+966508227384', '966508227384', '966-50-822-7384'].map(phoneKey)).size).toBe(1)
    expect(phoneKey('+966508227384')).toBe('508227384')
  })
  it('keys a Korean mobile on its last nine digits and rejects junk', () => {
    expect(phoneKey('010-1234-5678')).toBe('012345678')
    expect(phoneKey('+82 10-1234-5678')).toBe('012345678')
    expect(phoneKey('12345')).toBe('')
    expect(phoneKey(null)).toBe('')
  })
})

describe('maskEmail', () => {
  it('keeps the first letter and the domain only', () => {
    expect(maskEmail('keekoonom@gmail.com')).toBe('k***@gmail.com')
    expect(maskEmail('9rzz7vmgsj@privaterelay.appleid.com')).toBe('9***@privaterelay.appleid.com')
    expect(maskEmail('')).toBe('***')
  })
})

describe('last sign-in method', () => {
  const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) } } }
  it('round-trips a known method and ignores unknown ones', () => {
    const s = mem()
    rememberSignInMethod('apple', s); expect(readSignInMethod(s)).toBe('apple')
    rememberSignInMethod('facebook', s); expect(readSignInMethod(s)).toBe('apple')
    rememberSignInMethod(null, s); expect(readSignInMethod(s)).toBe('apple')
    expect(s.getItem(LAST_SIGN_IN_KEY)).toBe('apple')
  })
  it('returns null on an empty or poisoned store', () => {
    const s = mem(); expect(readSignInMethod(s)).toBeNull()
    s.setItem(LAST_SIGN_IN_KEY, 'garbage'); expect(readSignInMethod(s)).toBeNull()
  })
})
