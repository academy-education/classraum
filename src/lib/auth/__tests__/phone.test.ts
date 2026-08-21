/** @jest-environment node */
import { isPlausiblePhone, normalizePhone, phoneDigits } from '../phone'

describe('isPlausiblePhone', () => {
  it.each([
    '010-1234-5678',
    '01012345678',
    '010 1234 5678',
    '+82 10-1234-5678',
    '(02) 123-4567',
    '123456789',
    '123456789012345',
  ])('accepts %s', (v) => expect(isPlausiblePhone(v)).toBe(true))

  it.each([
    ['empty', ''],
    ['whitespace', '   '],
    ['null', null],
    ['undefined', undefined],
    ['too short', '12345678'],
    ['too long', '1234567890123456'],
    ['letters', '010-ABCD-5678'],
    ['an email', 'user@example.com'],
    ['a lone plus', '+'],
  ])('rejects %s', (_l, v) => expect(isPlausiblePhone(v)).toBe(false))
})

describe('normalizePhone', () => {
  it('keeps the hyphens a Korean user reads the number back by', () => {
    expect(normalizePhone('  010-1234-5678 ')).toBe('010-1234-5678')
  })

  it('returns null rather than letting junk reach users.phone', () => {
    for (const bad of ['', '   ', 'abc', '123', null, undefined]) {
      expect(normalizePhone(bad)).toBeNull()
    }
  })
})

describe('phoneDigits', () => {
  it('strips only the separators people type', () => {
    expect(phoneDigits('+82 (10) 1234-5678')).toBe('821012345678')
  })
})

describe('parity with the rule the auth page has always used', () => {
  // The signup form's inline check, copied verbatim from
  // src/app/auth/page.tsx before this module existed. Lifting a rule into
  // a shared module is exactly where it silently drifts, so the old one
  // is kept here as the oracle.
  const legacy = (v: string) => /^\d{9,15}$/.test(v.replace(/[\s\-().+]/g, ''))
  it.each([
    '010-1234-5678', '01012345678', '+82 10 1234 5678', '12345678',
    '1234567890123456', 'abc', '', '(02) 123-4567', '010.1234.5678',
  ])('agrees on %s', (v) => expect(isPlausiblePhone(v)).toBe(legacy(v)))
})
