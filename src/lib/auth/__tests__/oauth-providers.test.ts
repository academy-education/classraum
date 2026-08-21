/** @jest-environment node */
import {
  parseEnabledProviders,
  PROVIDER_ORDER,
  PROVIDER_SCOPES,
  PROVIDER_LABEL,
} from '../oauth-providers'

describe('the flag is the safety property', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty', ''],
    ['whitespace', '   '],
    ['a lone comma', ','],
    ['commas only', ',,, ,'],
    ['an unknown name', 'facebook'],
    ['several unknown names', 'facebook,naver,line'],
    ['a near-miss typo', 'kakaotalk'],
  ])('renders nothing when the flag is %s', (_label, raw) => {
    expect(parseEnabledProviders(raw)).toEqual([])
  })
})

describe('parsing', () => {
  it('keeps only known providers, dropping the junk beside them', () => {
    expect(parseEnabledProviders('kakao,facebook,google')).toEqual(['kakao', 'google'])
  })

  it('tolerates spacing and case', () => {
    expect(parseEnabledProviders(' KAKAO ,  Google ')).toEqual(['kakao', 'google'])
  })

  it('de-duplicates', () => {
    expect(parseEnabledProviders('google,google,google')).toEqual(['google'])
  })

  it('imposes the display order regardless of the order in the flag', () => {
    expect(parseEnabledProviders('apple,google,kakao')).toEqual(['kakao', 'google', 'apple'])
    expect(parseEnabledProviders('google,apple')).toEqual(['google', 'apple'])
  })

  it('puts Kakao first for a Korean audience — not alphabetical', () => {
    expect(PROVIDER_ORDER[0]).toBe('kakao')
    expect(parseEnabledProviders('apple,google,kakao')[0]).toBe('kakao')
    // Alphabetical would be apple,google,kakao — assert we are NOT that.
    expect([...PROVIDER_ORDER]).not.toEqual([...PROVIDER_ORDER].sort())
  })
})

describe('per-provider config is complete', () => {
  it('every ordered provider has a scope string and a label', () => {
    for (const p of PROVIDER_ORDER) {
      expect(typeof PROVIDER_SCOPES[p]).toBe('string')
      expect(PROVIDER_LABEL[p]).toBeTruthy()
    }
  })

  it("asks Kakao for the consent item that carries the email — without it there is never one", () => {
    expect(PROVIDER_SCOPES.kakao).toContain('account_email')
  })
})
