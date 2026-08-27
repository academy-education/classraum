import {
  needsSocialOnboarding,
  hasSocialIdentity,
  prefillFromProvider,
} from '../social-onboarding'

/**
 * This predicate decides who is LOCKED OUT of the app until they type
 * something, so the tests that matter are the ones proving it does NOT
 * fire on the existing user base.
 *
 * The measured facts it is guarding, at the time of writing:
 *   448 accounts, 392 (87.5%) with a NULL phone
 *   437 of 437 identities are `email`
 * Gating on the missing phone would wall 392 real accounts on deploy
 * day; gating on the social identity walls none of them.
 */

const emailUser = {
  providers: ['email'],
  phone: null,
  family_name: null,
  given_name: null,
  name_confirmed_at: null,
}

describe('who gets the blocking profile step', () => {
  it('never fires for a password-only account, however incomplete', () => {
    // THE load-bearing case. This exact shape describes 392 live
    // accounts; if this ever returns true, almost every user is locked
    // out at once.
    expect(needsSocialOnboarding(emailUser)).toBe(false)
  })

  it.each([
    ['no phone', { ...emailUser, phone: null }],
    ['no name split', { ...emailUser, family_name: null, given_name: null }],
    ['nothing at all', { ...emailUser, phone: null, name_confirmed_at: null }],
  ])('still does not fire for an email account with %s', (_l, u) => {
    expect(needsSocialOnboarding(u)).toBe(false)
  })

  it.each(['google', 'kakao', 'apple'])('fires for a fresh %s signup', (provider) => {
    expect(needsSocialOnboarding({ ...emailUser, providers: [provider] })).toBe(true)
  })

  it('fires for a password user who later LINKED a provider', () => {
    // They keep `email` in the list, so the predicate must ask whether
    // ANY identity is social, not whether the first one is.
    expect(needsSocialOnboarding({ ...emailUser, providers: ['email', 'google'] })).toBe(true)
  })

  it('stops firing once both pieces are supplied', () => {
    expect(
      needsSocialOnboarding({
        providers: ['kakao'],
        phone: '010-1234-5678',
        family_name: '홍',
        given_name: '길동',
        name_confirmed_at: null,
      }),
    ).toBe(false)
  })

  it('a confirmed name with no phone still fires', () => {
    // The phone is the new requirement; a settled name does not excuse it.
    expect(
      needsSocialOnboarding({
        providers: ['kakao'],
        phone: null,
        family_name: '홍',
        given_name: '길동',
        name_confirmed_at: '2026-08-01T00:00:00Z',
      }),
    ).toBe(true)
  })

  it('a phone with an unsettled name still fires', () => {
    expect(
      needsSocialOnboarding({
        providers: ['google'],
        phone: '010-1234-5678',
        family_name: null,
        given_name: null,
        name_confirmed_at: null,
      }),
    ).toBe(true)
  })

  it('an implausible phone does not count as having one', () => {
    expect(
      needsSocialOnboarding({
        providers: ['google'],
        phone: '123',
        family_name: '홍',
        given_name: '길동',
        name_confirmed_at: null,
      }),
    ).toBe(true)
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty', []],
    ['unknown provider only', ['facebook']],
  ])('treats %s providers as not social', (_l, providers) => {
    expect(hasSocialIdentity(providers as string[] | null | undefined)).toBe(false)
    expect(needsSocialOnboarding({ ...emailUser, providers: providers as string[] })).toBe(false)
  })

  it('never throws on a missing subject', () => {
    expect(needsSocialOnboarding(null)).toBe(false)
    expect(needsSocialOnboarding(undefined)).toBe(false)
  })
})

describe('prefill from provider metadata', () => {
  it('prefers a real name over a nickname', () => {
    // A Kakao nickname is the least likely to be the name a teacher needs
    // to see, so it must not win over a full_name when both are present.
    expect(
      prefillFromProvider({ nickname: 'andy99', full_name: '이앤디' }).name,
    ).toBe('이앤디')
  })

  it.each([
    ['google/apple full_name', { full_name: 'Andy Lee' }, 'Andy Lee'],
    ['generic name', { name: 'Andy Lee' }, 'Andy Lee'],
    ['kakao nickname', { nickname: '앤디' }, '앤디'],
    ['preferred_username', { preferred_username: 'andy' }, 'andy'],
  ])('reads %s', (_l, meta, expected) => {
    expect(prefillFromProvider(meta).name).toBe(expected)
  })

  it('returns null rather than empty strings', () => {
    // An empty prefill must not look like a supplied value, or the form
    // would render a blank "confirmed" name.
    expect(prefillFromProvider({ full_name: '   ', name: '' }).name).toBeNull()
    expect(prefillFromProvider({}).name).toBeNull()
    expect(prefillFromProvider(null).name).toBeNull()
  })

  it('has no phone unless the provider actually sent one', () => {
    // Google and Apple never do. Kakao only with phone_number approved.
    expect(prefillFromProvider({ full_name: 'Andy Lee' }).phone).toBeNull()
    expect(prefillFromProvider({ phone_number: '+82 10-1234-5678' }).phone).toBe('+82 10-1234-5678')
  })

  it('never throws on junk metadata', () => {
    expect(() => prefillFromProvider({ full_name: 42, phone_number: {} })).not.toThrow()
    expect(prefillFromProvider({ full_name: 42 } as Record<string, unknown>).name).toBeNull()
  })
})
