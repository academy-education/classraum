/** @jest-environment node */
import {
  classifyOAuthOutcome,
  outcomeMessageKey,
  IDENTITY_RECENT_MS,
  IDENTITY_GRACE_MS,
  type OAuthOutcomeInput,
} from '../oauth-outcome'

const NOW = Date.parse('2026-08-21T09:00:00.000Z')
const iso = (ms: number) => new Date(ms).toISOString()

const base = (over: Partial<OAuthOutcomeInput> = {}): OAuthOutcomeInput => ({
  email: 'user@example.com',
  userCreatedAt: iso(NOW - 1000),
  identities: [{ provider: 'google', createdAt: iso(NOW - 1000) }],
  provider: 'google',
  profileExists: true,
  now: NOW,
  ...over,
})

describe('a clean first-time OAuth signup', () => {
  it('is ok', () => {
    expect(classifyOAuthOutcome(base())).toEqual({ kind: 'ok' })
  })

  it('is ok even though the identity is seconds newer than the account', () => {
    expect(
      classifyOAuthOutcome(
        base({
          userCreatedAt: iso(NOW - 3000),
          identities: [{ provider: 'google', createdAt: iso(NOW - 1000) }],
        })
      )
    ).toEqual({ kind: 'ok' })
  })
})

describe('missing email — the Kakao case', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty', ''],
    ['whitespace', '   '],
  ])('reports missing_email when the address is %s', (_l, email) => {
    expect(classifyOAuthOutcome(base({ email }))).toEqual({ kind: 'missing_email' })
  })

  it('reports missing_email BEFORE no_profile, because it is the cause', () => {
    // users.email is NOT NULL: no email means the trigger's INSERT raised
    // and was swallowed, so there is no profile row either. Reporting the
    // consequence would send the owner looking in the wrong place.
    expect(classifyOAuthOutcome(base({ email: null, profileExists: false }))).toEqual({
      kind: 'missing_email',
    })
  })

  it('names Kakao specifically in the message key', () => {
    expect(outcomeMessageKey({ kind: 'missing_email' }, 'kakao')).toBe(
      'auth.social.errors.kakaoNoEmail'
    )
    expect(outcomeMessageKey({ kind: 'missing_email' }, 'google')).toBe(
      'auth.social.errors.noEmail'
    )
  })
})

describe('THE TAKEOVER CHECK — an OAuth sign-in must not open a pre-existing password account', () => {
  const victimAccount = (over: Partial<OAuthOutcomeInput> = {}) =>
    base({
      // Account registered by the attacker weeks ago, with a password.
      userCreatedAt: iso(NOW - 30 * 24 * 60 * 60 * 1000),
      identities: [
        { provider: 'email', createdAt: iso(NOW - 30 * 24 * 60 * 60 * 1000) },
        // Supabase auto-linked the victim's Google identity just now.
        { provider: 'google', createdAt: iso(NOW - 4000) },
      ],
      ...over,
    })

  it('refuses the session and demands proof of ownership', () => {
    expect(classifyOAuthOutcome(victimAccount())).toEqual({
      kind: 'link_required',
      email: 'user@example.com',
      provider: 'google',
    })
  })

  it('refuses regardless of provider', () => {
    for (const provider of ['kakao', 'apple', 'google']) {
      const r = classifyOAuthOutcome(
        victimAccount({
          provider,
          identities: [
            { provider: 'email', createdAt: iso(NOW - 30 * 24 * 60 * 60 * 1000) },
            { provider, createdAt: iso(NOW - 4000) },
          ],
        })
      )
      expect(r.kind).toBe('link_required')
    }
  })

  it('refuses even when the profile row is fine — the account is not the problem', () => {
    expect(classifyOAuthOutcome(victimAccount({ profileExists: true })).kind).toBe(
      'link_required'
    )
  })

  it('is reported ahead of a missing profile row, because the remedy differs', () => {
    // Both outcomes block the session, so the ORDER is not a security
    // property — it is a diagnosis property. "Contact support, your
    // profile is missing" for what is actually an attempted takeover
    // sends the user and the owner to the wrong place entirely.
    expect(classifyOAuthOutcome(victimAccount({ profileExists: false })).kind).toBe(
      'link_required'
    )
  })

  it('does NOT refuse a user who linked Google legitimately months ago', () => {
    // Same shape minus recency: identity created long after the account,
    // but not during this sign-in. Blocking this would lock every
    // successfully-linked user out forever.
    expect(
      classifyOAuthOutcome(
        victimAccount({
          identities: [
            { provider: 'email', createdAt: iso(NOW - 30 * 24 * 60 * 60 * 1000) },
            { provider: 'google', createdAt: iso(NOW - 10 * 24 * 60 * 60 * 1000) },
          ],
        })
      )
    ).toEqual({ kind: 'ok' })
  })

  it('does NOT refuse the deliberate prove-then-link, the one sanctioned bypass', () => {
    expect(classifyOAuthOutcome(victimAccount({ deliberateLink: true }))).toEqual({ kind: 'ok' })
  })

  it('does NOT refuse an account with no password identity to steal', () => {
    expect(
      classifyOAuthOutcome(
        victimAccount({
          identities: [{ provider: 'google', createdAt: iso(NOW - 4000) }],
        })
      )
    ).toEqual({ kind: 'ok' })
  })

  it('holds at the recency boundary', () => {
    const at = (age: number) =>
      classifyOAuthOutcome(
        victimAccount({
          identities: [
            { provider: 'email', createdAt: iso(NOW - 30 * 24 * 60 * 60 * 1000) },
            { provider: 'google', createdAt: iso(NOW - age) },
          ],
        })
      ).kind
    expect(at(IDENTITY_RECENT_MS - 1)).toBe('link_required')
    expect(at(IDENTITY_RECENT_MS + 1)).toBe('ok')
  })

  it('holds at the grace boundary — a fresh signup is not a takeover', () => {
    const gap = (g: number) =>
      classifyOAuthOutcome(
        base({
          userCreatedAt: iso(NOW - 1000 - g),
          identities: [
            { provider: 'email', createdAt: iso(NOW - 1000 - g) },
            { provider: 'google', createdAt: iso(NOW - 1000) },
          ],
        })
      ).kind
    expect(gap(IDENTITY_GRACE_MS - 1)).toBe('ok')
    expect(gap(IDENTITY_GRACE_MS + 1000)).toBe('link_required')
  })

  it('ignores identities with unusable timestamps rather than guessing', () => {
    expect(
      classifyOAuthOutcome(
        victimAccount({
          identities: [
            { provider: 'email', createdAt: iso(NOW - 30 * 24 * 60 * 60 * 1000) },
            { provider: 'google', createdAt: 'not-a-date' },
          ],
        })
      ).kind
    ).toBe('ok')
  })
})

describe('no_profile', () => {
  it('is reported when the trigger silently produced no users row', () => {
    expect(classifyOAuthOutcome(base({ profileExists: false }))).toEqual({ kind: 'no_profile' })
  })

  it('has a message key', () => {
    expect(outcomeMessageKey({ kind: 'no_profile' }, 'google')).toBe(
      'auth.social.errors.noProfile'
    )
  })

  it('ok has no message key', () => {
    expect(outcomeMessageKey({ kind: 'ok' }, 'google')).toBeNull()
  })
})
