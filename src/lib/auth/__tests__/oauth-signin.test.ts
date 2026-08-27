/** @jest-environment node */
/**
 * Ordering and failure handling for the OAuth round trip.
 *
 * These are the properties that cannot be checked by reading the code:
 * that the invite context is written BEFORE the redirect, that every
 * failure path clears it again, and that the takeover check runs BEFORE
 * any membership row is written. Each is a two-line change away from a
 * version that looks equally correct.
 */
import {
  startOAuthSignIn,
  completeOAuthReturn,
  inferProvider,
  type IdentityFacts,
} from '../oauth-signin'
import { OAUTH_CONTEXT_KEY, captureOAuthContext, type ContextStore } from '../oauth-context'

const ACADEMY = '11111111-2222-4333-8444-555555555555'
const MEMBER = '99999999-8888-4777-8666-555555555555'
const T0 = Date.parse('2026-08-21T09:00:00.000Z')
const iso = (ms: number) => new Date(ms).toISOString()

function memStore(seed?: Record<string, string>): ContextStore & { map: Map<string, string> } {
  const map = new Map<string, string>(Object.entries(seed ?? {}))
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
}

const LOCATION = { protocol: 'https:', hostname: 'app.classraum.com', port: '' }
const INVITE_SEARCH = `?role=parent&academy_id=${ACADEMY}&family_member_id=${MEMBER}`

// ─────────────────────────── startOAuthSignIn ───────────────────────────

describe('startOAuthSignIn', () => {
  it('stores the invite context BEFORE calling the provider', async () => {
    const store = memStore()
    // On web, signInWithOAuth navigates away. Anything written after it
    // may never run — so the assertion is made from INSIDE the call.
    let storedAtCallTime: string | null = null
    const res = await startOAuthSignIn('google', {
      store,
      search: INVITE_SEARCH,
      location: LOCATION,
      native: false,
      now: T0,
      openExternal: async () => true,
      signInWithOAuth: async () => {
        storedAtCallTime = store.getItem(OAUTH_CONTEXT_KEY)
        return { data: { url: null }, error: null }
      },
    })
    expect(res.ok).toBe(true)
    expect(storedAtCallTime).not.toBeNull()
    expect(JSON.parse(storedAtCallTime!)).toEqual({
      intent: 'academy',
      role: 'parent',
      academyId: ACADEMY,
      familyMemberId: MEMBER,
      createdAt: T0,
    })
  })

  it('passes the marked callback URL and the provider scopes', async () => {
    const seen: Array<Record<string, unknown>> = []
    await startOAuthSignIn('kakao', {
      store: memStore(),
      search: '',
      location: LOCATION,
      native: false,
      now: T0,
      openExternal: async () => true,
      signInWithOAuth: async (args) => {
        seen.push(args as unknown as Record<string, unknown>)
        return { data: { url: null }, error: null }
      },
    })
    expect(seen[0]).toEqual({
      provider: 'kakao',
      options: {
        redirectTo: 'https://app.classraum.com/auth/callback?flow=oauth',
        // phone_number deliberately absent: its 동의항목 is unapproved and
        // naming it kills every Kakao login with KOE205 (2026-08-27).
        scopes: 'account_email profile_nickname',
      },
    })
  })

  it('asks for the URL and hands it to the OS browser on native', async () => {
    const opened: string[] = []
    let optionsSeen: Record<string, unknown> = {}
    const res = await startOAuthSignIn('google', {
      store: memStore(),
      search: '',
      location: LOCATION,
      native: true,
      now: T0,
      openExternal: async (url) => {
        opened.push(url)
        return true
      },
      signInWithOAuth: async (args) => {
        optionsSeen = args.options as unknown as Record<string, unknown>
        return { data: { url: 'https://accounts.google.com/o/oauth2/auth?x=1' }, error: null }
      },
    })
    expect(res.ok).toBe(true)
    // Google refuses to authenticate inside an embedded WebView, so the
    // redirect MUST be suppressed and handed to the OS instead.
    expect(optionsSeen.skipBrowserRedirect).toBe(true)
    // BARE — no query string. The dashboard allow-list entry is exactly
    // classraum://auth/callback, Supabase matches exactly, and a ?flow=
    // suffix sent the whole native return to the Site-URL fallback:
    // signed in inside the browser sheet, app left signed out.
    expect(optionsSeen.redirectTo).toBe('classraum://auth/callback')
    expect(opened).toEqual(['https://accounts.google.com/o/oauth2/auth?x=1'])
  })

  it('does NOT suppress the redirect on web', async () => {
    let optionsSeen: Record<string, unknown> = {}
    await startOAuthSignIn('google', {
      store: memStore(),
      search: '',
      location: LOCATION,
      native: false,
      now: T0,
      openExternal: async () => true,
      signInWithOAuth: async (args) => {
        optionsSeen = args.options as unknown as Record<string, unknown>
        return { data: { url: null }, error: null }
      },
    })
    expect('skipBrowserRedirect' in optionsSeen).toBe(false)
  })

  describe('every failure path clears the stored context', () => {
    // The bug this pins: a user opens a parent invite, taps Google,
    // abandons it — and half an hour later signs in with Google for an
    // unrelated reason and is attached to that academy as a parent.
    const failing = async (
      over: Partial<Parameters<typeof startOAuthSignIn>[1]>
    ) => {
      const store = memStore()
      const res = await startOAuthSignIn('google', {
        store,
        search: INVITE_SEARCH,
        location: LOCATION,
        native: false,
        now: T0,
        openExternal: async () => true,
        signInWithOAuth: async () => ({ data: { url: null }, error: null }),
        ...over,
      })
      return { res, store }
    }

    it('when the provider call returns an error', async () => {
      const { res, store } = await failing({
        signInWithOAuth: async () => ({ data: { url: null }, error: { message: 'bad provider' } }),
      })
      expect(res).toEqual({ ok: false, reason: 'start_failed', message: 'bad provider' })
      expect(store.map.size).toBe(0)
    })

    it('when the provider call throws', async () => {
      const { res, store } = await failing({
        signInWithOAuth: async () => {
          throw new Error('network down')
        },
      })
      expect(res).toEqual({ ok: false, reason: 'start_failed', message: 'network down' })
      expect(store.map.size).toBe(0)
    })

    it('when native gets no URL back', async () => {
      const { res, store } = await failing({
        native: true,
        signInWithOAuth: async () => ({ data: { url: null }, error: null }),
      })
      expect(res).toEqual({ ok: false, reason: 'no_url' })
      expect(store.map.size).toBe(0)
    })

    it('when the native hand-off silently fails', async () => {
      // openExternalUrl returns false rather than throwing when no
      // browser is resolvable — a dead button that looks alive.
      const { res, store } = await failing({
        native: true,
        signInWithOAuth: async () => ({ data: { url: 'https://p/' }, error: null }),
        openExternal: async () => false,
      })
      expect(res).toEqual({ ok: false, reason: 'handoff_failed' })
      expect(store.map.size).toBe(0)
    })
  })

  it('stores nothing for a plain sign-in with no invite in the URL', async () => {
    const store = memStore()
    const res = await startOAuthSignIn('google', {
      store,
      search: '?next=/mobile/study',
      location: LOCATION,
      native: false,
      now: T0,
      openExternal: async () => true,
      signInWithOAuth: async () => ({ data: { url: null }, error: null }),
    })
    expect(res).toEqual({ ok: true, context: null })
    expect(store.map.size).toBe(0)
  })
})

// ────────────────────────── completeOAuthReturn ──────────────────────────

const cleanFacts = (over: Partial<IdentityFacts> = {}): IdentityFacts => ({
  email: 'user@example.com',
  userCreatedAt: iso(T0 - 1000),
  identities: [{ provider: 'google', createdAt: iso(T0 - 1000) }],
  profileExists: true,
  ...over,
})

const takenOverFacts = (): IdentityFacts => ({
  email: 'victim@example.com',
  userCreatedAt: iso(T0 - 30 * 24 * 60 * 60 * 1000),
  identities: [
    { provider: 'email', createdAt: iso(T0 - 30 * 24 * 60 * 60 * 1000) },
    { provider: 'google', createdAt: iso(T0 - 4000) },
  ],
  profileExists: true,
})

const deps = (over: Partial<Parameters<typeof completeOAuthReturn>[0]> = {}) => ({
  store: memStore(),
  provider: 'google',
  now: T0,
  fetchIdentity: async () => cleanFacts(),
  provision: async () => true,
  join: async () => ({ ok: true }),
  ...over,
})

describe('completeOAuthReturn — the ordinary paths', () => {
  it('a plain social signup with no invite is ok and joins nothing', async () => {
    const joins: unknown[] = []
    const res = await completeOAuthReturn(
      deps({ join: async (b) => (joins.push(b), { ok: true }) })
    )
    expect(res).toEqual({ kind: 'ok', joined: false, context: null })
    expect(joins).toEqual([])
  })

  it('an invited parent is joined through the existing route, with the invite body', async () => {
    const store = memStore()
    captureOAuthContext(
      { role: 'parent', academyId: ACADEMY, familyMemberId: MEMBER },
      store,
      T0
    )
    const joins: unknown[] = []
    const res = await completeOAuthReturn(
      deps({ store, join: async (b) => (joins.push(b), { ok: true }) })
    )
    expect(res.kind).toBe('ok')
    expect(res).toMatchObject({ joined: true })
    expect(joins).toEqual([
      { role: 'parent', academyId: ACADEMY, familyMemberId: MEMBER },
    ])
    // Consumed — a reload must not join twice.
    expect(store.map.size).toBe(0)
  })

  it('reports a join failure instead of leaving the user as a silent study student', async () => {
    const store = memStore()
    captureOAuthContext({ role: 'parent', academyId: ACADEMY }, store, T0)
    const res = await completeOAuthReturn(deps({ store, join: async () => ({ ok: false }) }))
    expect(res.kind).toBe('join_failed')
    expect(res).toMatchObject({ context: { role: 'parent', academyId: ACADEMY } })
  })

  it('reports a join that throws the same way', async () => {
    const store = memStore()
    captureOAuthContext({ role: 'parent', academyId: ACADEMY }, store, T0)
    const res = await completeOAuthReturn(
      deps({
        store,
        join: async () => {
          throw new Error('offline')
        },
      })
    )
    expect(res.kind).toBe('join_failed')
  })

  it('says so when an invite context was carried and lost, but stays quiet when there was none', async () => {
    // Expired: the user really did come from an invite and it did not
    // survive. Silence here is the invited-parent-becomes-study-student
    // failure, so it must be reported.
    const expired = memStore()
    captureOAuthContext({ role: 'parent', academyId: ACADEMY }, expired, T0 - 60 * 60 * 1000)
    expect(await completeOAuthReturn(deps({ store: expired }))).toEqual({
      kind: 'context_lost',
      reason: 'expired',
    })

    // Absent: the overwhelmingly common case — an ordinary social
    // sign-in. Reporting it would train users to ignore the message.
    expect(await completeOAuthReturn(deps({ store: memStore() }))).toEqual({
      kind: 'ok',
      joined: false,
      context: null,
    })
  })

  it('reports a malformed context rather than throwing', async () => {
    const store = memStore({ [OAUTH_CONTEXT_KEY]: 'not-json{' })
    expect(await completeOAuthReturn(deps({ store }))).toEqual({
      kind: 'context_lost',
      reason: 'malformed',
    })
  })

  it('does not attempt a join for a context that carries no role', async () => {
    const store = memStore()
    captureOAuthContext({ intent: 'study', ref: 'FRIEND01' }, store, T0)
    const joins: unknown[] = []
    const res = await completeOAuthReturn(
      deps({ store, join: async (b) => (joins.push(b), { ok: true }) })
    )
    expect(res).toMatchObject({ kind: 'ok', joined: false })
    expect(joins).toEqual([])
  })
})

describe('completeOAuthReturn — the session must be judged before anything is written', () => {
  it('blocks a takeover and performs NO join, even with an invite waiting', async () => {
    const store = memStore()
    captureOAuthContext({ role: 'parent', academyId: ACADEMY }, store, T0)
    const joins: unknown[] = []
    const res = await completeOAuthReturn(
      deps({
        store,
        fetchIdentity: async () => takenOverFacts(),
        join: async (b) => (joins.push(b), { ok: true }),
      })
    )
    expect(res).toEqual({
      kind: 'blocked',
      outcome: { kind: 'link_required', email: 'victim@example.com', provider: 'google' },
      provider: 'google',
    })
    // A membership row written on a session we are about to reject
    // cannot be undone by signing out.
    expect(joins).toEqual([])
    // And the context must not survive to attach itself to whoever
    // signs in next on this browser.
    expect(store.map.size).toBe(0)
  })

  it('lets the deliberate prove-then-link through', async () => {
    const res = await completeOAuthReturn(
      deps({ fetchIdentity: async () => takenOverFacts(), deliberateLink: true })
    )
    expect(res.kind).toBe('ok')
  })

  it('blocks a provider that returned no email', async () => {
    const res = await completeOAuthReturn(
      deps({
        provider: 'kakao',
        fetchIdentity: async () => cleanFacts({ email: null, profileExists: false }),
      })
    )
    expect(res).toEqual({
      kind: 'blocked',
      outcome: { kind: 'missing_email' },
      provider: 'kakao',
    })
  })

  it('repairs a missing profile row and continues', async () => {
    let called = 0
    const res = await completeOAuthReturn(
      deps({
        fetchIdentity: async () => cleanFacts({ profileExists: false }),
        provision: async () => (called++, true),
      })
    )
    expect(called).toBe(1)
    expect(res).toEqual({ kind: 'ok', joined: false, context: null })
  })

  it('blocks when the repair fails or throws', async () => {
    for (const provision of [
      async () => false,
      async () => {
        throw new Error('500')
      },
    ]) {
      const res = await completeOAuthReturn(
        deps({ fetchIdentity: async () => cleanFacts({ profileExists: false }), provision })
      )
      expect(res).toEqual({
        kind: 'blocked',
        outcome: { kind: 'no_profile' },
        provider: 'google',
      })
    }
  })

  it('does not try to repair a takeover — it is not a broken profile', async () => {
    let called = 0
    await completeOAuthReturn(
      deps({
        fetchIdentity: async () => takenOverFacts(),
        provision: async () => (called++, true),
      })
    )
    expect(called).toBe(0)
  })

  it('degrades to unknown, without joining, when the identity lookup fails', async () => {
    const joins: unknown[] = []
    for (const fetchIdentity of [
      async () => null,
      async () => {
        throw new Error('network')
      },
    ]) {
      const store = memStore()
      captureOAuthContext({ role: 'parent', academyId: ACADEMY }, store, T0)
      const res = await completeOAuthReturn(
        deps({ store, fetchIdentity, join: async (b) => (joins.push(b), { ok: true }) })
      )
      expect(res).toEqual({ kind: 'unknown' })
    }
    expect(joins).toEqual([])
  })
})

describe('inferProvider — the callback URL never says which provider it was', () => {
  it('picks the social identity, ignoring the password one', () => {
    expect(
      inferProvider(cleanFacts({
        identities: [
          { provider: 'email', createdAt: iso(T0) },
          { provider: 'kakao', createdAt: iso(T0 - 1000) },
        ],
      }))
    ).toBe('kakao')
  })

  it('picks the NEWEST social identity when a user has several', () => {
    expect(
      inferProvider(cleanFacts({
        identities: [
          { provider: 'google', createdAt: iso(T0 - 90 * 24 * 3600 * 1000) },
          { provider: 'apple', createdAt: iso(T0 - 1000) },
        ],
      }))
    ).toBe('apple')
  })

  it('does not fall over on unusable timestamps', () => {
    expect(
      inferProvider(cleanFacts({
        identities: [{ provider: 'kakao', createdAt: null }],
      }))
    ).toBe('kakao')
  })

  it('returns null rather than naming the wrong provider at the user', () => {
    expect(inferProvider(cleanFacts({ identities: [] }))).toBeNull()
    expect(
      inferProvider(cleanFacts({ identities: [{ provider: 'email', createdAt: iso(T0) }] }))
    ).toBeNull()
  })

  it('is what a blocked result reports when the caller passed no provider', async () => {
    const res = await completeOAuthReturn(
      deps({
        provider: undefined,
        fetchIdentity: async () =>
          cleanFacts({ email: null, identities: [{ provider: 'kakao', createdAt: iso(T0) }] }),
      })
    )
    expect(res).toMatchObject({ kind: 'blocked', provider: 'kakao' })
  })
})
