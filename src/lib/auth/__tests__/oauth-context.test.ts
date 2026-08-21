/** @jest-environment node */
/**
 * Pins for the OAuth signup context.
 *
 * Read the header of ../oauth-context.ts first — every `PIN n` below names
 * the numbered security property documented there. Each pin was
 * break-tested: the mechanism it guards was mutated, the listed test was
 * confirmed to fail, and the mutation reverted. Results are recorded in
 * the handover notes; if you weaken one of these, do the same.
 */
import {
  OAUTH_CONTEXT_KEY,
  TTL_MS,
  FUTURE_SKEW_MS,
  captureOAuthContext,
  restoreOAuthContext,
  clearOAuthContext,
  sanitizeOAuthContext,
  hasJoinablePayload,
  toJoinRequest,
  contextFromSearch,
  type ContextStore,
} from '../oauth-context'

const ACADEMY = '11111111-2222-4333-8444-555555555555'
const FAMILY = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const MEMBER = '99999999-8888-4777-8666-555555555555'

const T0 = 1_700_000_000_000

function memStore(seed?: Record<string, string>): ContextStore & { map: Map<string, string> } {
  const map = new Map<string, string>(Object.entries(seed ?? {}))
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
}

describe('capture -> restore round trip', () => {
  it('carries a personalized parent invite through unchanged', () => {
    const store = memStore()
    const captured = captureOAuthContext(
      {
        intent: 'academy',
        role: 'parent',
        academyId: ACADEMY,
        familyId: FAMILY,
        familyMemberId: MEMBER,
      },
      store,
      T0
    )
    expect(captured).toEqual({
      intent: 'academy',
      role: 'parent',
      academyId: ACADEMY,
      familyId: FAMILY,
      familyMemberId: MEMBER,
      createdAt: T0,
    })

    const restored = restoreOAuthContext(store, T0 + 60_000)
    expect(restored.reason).toBeNull()
    expect(restored.context).toEqual(captured)
  })

  it('produces exactly the join-route body', () => {
    const store = memStore()
    captureOAuthContext(
      { role: 'student', academyId: ACADEMY, familyMemberId: MEMBER },
      store,
      T0
    )
    const { context } = restoreOAuthContext(store, T0 + 1000)
    expect(context && hasJoinablePayload(context)).toBe(true)
    expect(toJoinRequest(context!)).toEqual({
      role: 'student',
      academyId: ACADEMY,
      familyMemberId: MEMBER,
    })
  })

  it('carries a study referral code, uppercased and capped', () => {
    const store = memStore()
    const captured = captureOAuthContext(
      { intent: 'study', ref: '  abcd1234efgh5678ZZZZ ' },
      store,
      T0
    )
    expect(captured).toEqual({ intent: 'study', ref: 'ABCD1234EFGH5678', createdAt: T0 })
    expect(restoreOAuthContext(store, T0).context).toEqual(captured)
  })

  it('writes nothing for a bare study signup', () => {
    const store = memStore()
    expect(captureOAuthContext({ intent: 'study' }, store, T0)).toBeNull()
    expect(store.map.size).toBe(0)
  })

  it('reads the invite shape straight off a search string', () => {
    expect(
      contextFromSearch(
        `?intent=academy&role=parent&academy_id=${ACADEMY}&family_member_id=${MEMBER}`
      )
    ).toEqual({
      intent: 'academy',
      role: 'parent',
      academyId: ACADEMY,
      familyId: null,
      familyMemberId: MEMBER,
      ref: null,
    })
  })
})

describe('PIN 4/5 — expiry', () => {
  it('accepts a context just inside the TTL', () => {
    const store = memStore()
    captureOAuthContext({ role: 'parent', academyId: ACADEMY }, store, T0)
    const r = restoreOAuthContext(store, T0 + TTL_MS)
    expect(r.reason).toBeNull()
    expect(r.context?.role).toBe('parent')
  })

  it('rejects a context one millisecond past the TTL', () => {
    const store = memStore()
    captureOAuthContext({ role: 'parent', academyId: ACADEMY }, store, T0)
    const r = restoreOAuthContext(store, T0 + TTL_MS + 1)
    expect(r).toEqual({ context: null, reason: 'expired' })
  })

  it('rejects a week-old context — the shared-browser case', () => {
    const store = memStore()
    captureOAuthContext({ role: 'parent', academyId: ACADEMY }, store, T0)
    const r = restoreOAuthContext(store, T0 + 7 * 24 * 60 * 60 * 1000)
    expect(r.context).toBeNull()
    expect(r.reason).toBe('expired')
  })

  it('tolerates small clock skew but rejects a far-future createdAt', () => {
    const near = memStore({
      [OAUTH_CONTEXT_KEY]: JSON.stringify({
        intent: 'academy',
        role: 'parent',
        academyId: ACADEMY,
        createdAt: T0 + FUTURE_SKEW_MS,
      }),
    })
    expect(restoreOAuthContext(near, T0).reason).toBeNull()

    const far = memStore({
      [OAUTH_CONTEXT_KEY]: JSON.stringify({
        intent: 'academy',
        role: 'parent',
        academyId: ACADEMY,
        // A tampered timestamp buying itself an extra century.
        createdAt: T0 + 100 * 365 * 24 * 60 * 60 * 1000,
      }),
    })
    expect(restoreOAuthContext(far, T0)).toEqual({ context: null, reason: 'future' })
  })
})

describe('absent and malformed', () => {
  it('returns absent when nothing was stored', () => {
    expect(restoreOAuthContext(memStore(), T0)).toEqual({ context: null, reason: 'absent' })
  })

  it.each([
    ['not json at all', 'not-json{'],
    ['a bare string', '"parent"'],
    ['an array', '[{"role":"parent"}]'],
    ['null', 'null'],
    ['no createdAt', JSON.stringify({ role: 'parent', academyId: ACADEMY })],
    [
      'a string createdAt',
      JSON.stringify({ role: 'parent', academyId: ACADEMY, createdAt: 'yesterday' }),
    ],
    [
      'a NaN createdAt',
      `{"role":"parent","academyId":"${ACADEMY}","createdAt":NaN}`,
    ],
  ])('rejects %s', (_label, blob) => {
    const store = memStore({ [OAUTH_CONTEXT_KEY]: blob })
    const r = restoreOAuthContext(store, T0)
    expect(r.context).toBeNull()
    expect(r.reason).toBe('malformed')
  })

  it('survives a throwing storage', () => {
    const hostile: ContextStore = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceeded')
      },
      removeItem: () => {
        throw new Error('nope')
      },
    }
    expect(restoreOAuthContext(hostile, T0)).toEqual({ context: null, reason: 'absent' })
    expect(captureOAuthContext({ role: 'parent', academyId: ACADEMY }, hostile, T0)).toBeNull()
    expect(() => clearOAuthContext(hostile)).not.toThrow()
  })
})

describe('PIN 1 — a restored context cannot set a role the invite did not carry', () => {
  it('drops a role that arrives with no academy', () => {
    const store = memStore({
      [OAUTH_CONTEXT_KEY]: JSON.stringify({
        intent: 'academy',
        role: 'parent',
        createdAt: T0,
      }),
    })
    const { context } = restoreOAuthContext(store, T0)
    expect(context).not.toBeNull()
    expect(context!.role).toBeUndefined()
    expect(context!.intent).toBe('study')
    expect(hasJoinablePayload(context!)).toBe(false)
    expect(toJoinRequest(context!)).toBeNull()
  })

  it('drops family ids that arrive with no academy', () => {
    const store = memStore({
      [OAUTH_CONTEXT_KEY]: JSON.stringify({
        role: 'parent',
        familyId: FAMILY,
        familyMemberId: MEMBER,
        createdAt: T0,
      }),
    })
    const { context } = restoreOAuthContext(store, T0)
    expect(context).toMatchObject({ intent: 'study' })
    expect(context!.familyId).toBeUndefined()
    expect(context!.familyMemberId).toBeUndefined()
  })

  it('never lets a hand-edited blob invent an academy that is not UUID-shaped', () => {
    for (const bad of ['not-a-uuid', '../../admin', "' OR 1=1--", '', '   ', ACADEMY + 'x']) {
      const store = memStore({
        [OAUTH_CONTEXT_KEY]: JSON.stringify({
          role: 'parent',
          academyId: bad,
          createdAt: T0,
        }),
      })
      const { context } = restoreOAuthContext(store, T0)
      expect(context?.academyId).toBeUndefined()
      expect(context && hasJoinablePayload(context)).toBe(false)
    }
  })
})

describe('PIN 2 — role is narrowed to student|parent, and escalation is rejected loudly', () => {
  it.each(['manager', 'teacher', 'admin', 'super_admin', 'PARENT ADMIN', 'owner'])(
    'rejects a stored role of %s',
    (role) => {
      const store = memStore({
        [OAUTH_CONTEXT_KEY]: JSON.stringify({
          intent: 'academy',
          role,
          academyId: ACADEMY,
          createdAt: T0,
        }),
      })
      expect(restoreOAuthContext(store, T0)).toEqual({
        context: null,
        reason: 'unsupported_role',
      })
    }
  )

  it('refuses to capture an unsupported role rather than storing a downgrade', () => {
    const store = memStore()
    expect(
      captureOAuthContext({ role: 'manager', academyId: ACADEMY }, store, T0)
    ).toBeNull()
    expect(store.map.size).toBe(0)
  })

  it('accepts the two real invite roles, case-insensitively', () => {
    for (const role of ['student', 'parent', 'Parent', ' STUDENT ']) {
      const r = sanitizeOAuthContext({ role, academyId: ACADEMY }, T0)
      expect(r.context?.role).toBe(role.trim().toLowerCase())
    }
  })
})

describe('PIN 6 — restore consumes', () => {
  it('a second restore in the same tab gets nothing', () => {
    const store = memStore()
    captureOAuthContext({ role: 'parent', academyId: ACADEMY }, store, T0)
    expect(restoreOAuthContext(store, T0).context).not.toBeNull()
    expect(restoreOAuthContext(store, T0)).toEqual({ context: null, reason: 'absent' })
  })

  it('an expired blob is removed, not left to be re-evaluated forever', () => {
    const store = memStore()
    captureOAuthContext({ role: 'parent', academyId: ACADEMY }, store, T0)
    restoreOAuthContext(store, T0 + TTL_MS + 1)
    expect(store.map.size).toBe(0)
  })

  it('clearOAuthContext drops the entry without acting on it', () => {
    const store = memStore()
    captureOAuthContext({ role: 'parent', academyId: ACADEMY }, store, T0)
    clearOAuthContext(store)
    expect(restoreOAuthContext(store, T0).reason).toBe('absent')
  })
})

describe('PIN 3 — ids are normalised, not merely accepted', () => {
  it('lowercases and trims a UUID so the join body matches the DB', () => {
    const r = sanitizeOAuthContext(
      { role: 'student', academyId: `  ${ACADEMY.toUpperCase()}  ` },
      T0
    )
    expect(r.context?.academyId).toBe(ACADEMY)
  })
})
