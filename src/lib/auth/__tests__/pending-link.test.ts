/** @jest-environment node */
import {
  PENDING_LINK_KEY,
  PENDING_LINK_TTL_MS,
  savePendingLink,
  peekPendingLink,
  takePendingLinkFor,
  clearPendingLink,
} from '../pending-link'
import type { ContextStore } from '../oauth-context'

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

describe('save / peek', () => {
  it('round-trips a marker, normalising the email', () => {
    const store = memStore()
    expect(savePendingLink('kakao', '  User@Example.COM ', store, T0)).toEqual({
      provider: 'kakao',
      email: 'user@example.com',
      createdAt: T0,
    })
    expect(peekPendingLink(store, T0)).toEqual({
      provider: 'kakao',
      email: 'user@example.com',
      createdAt: T0,
    })
  })

  it('peek does not consume — the prompt has to survive re-renders', () => {
    const store = memStore()
    savePendingLink('google', 'a@b.com', store, T0)
    expect(peekPendingLink(store, T0)).not.toBeNull()
    expect(peekPendingLink(store, T0)).not.toBeNull()
  })

  it.each([
    ['an unknown provider', 'facebook', 'a@b.com'],
    ['no provider', '', 'a@b.com'],
    ['no email', 'google', ''],
    ['whitespace email', 'google', '   '],
  ])('refuses to save with %s', (_l, provider, email) => {
    const store = memStore()
    expect(savePendingLink(provider, email, store, T0)).toBeNull()
    expect(store.map.size).toBe(0)
  })
})

describe('expiry and malformed state', () => {
  it('accepts a marker inside the TTL and drops one past it', () => {
    const store = memStore()
    savePendingLink('apple', 'a@b.com', store, T0)
    expect(peekPendingLink(store, T0 + PENDING_LINK_TTL_MS)).not.toBeNull()

    const store2 = memStore()
    savePendingLink('apple', 'a@b.com', store2, T0)
    expect(peekPendingLink(store2, T0 + PENDING_LINK_TTL_MS + 1)).toBeNull()
    expect(store2.map.size).toBe(0)
  })

  it.each([
    ['unparseable', '{{{'],
    ['an array', '[]'],
    ['null', 'null'],
    ['no createdAt', JSON.stringify({ provider: 'google', email: 'a@b.com' })],
    ['an unknown provider', JSON.stringify({ provider: 'evil', email: 'a@b.com', createdAt: T0 })],
    ['no email', JSON.stringify({ provider: 'google', email: '', createdAt: T0 })],
    [
      'a far-future createdAt',
      JSON.stringify({ provider: 'google', email: 'a@b.com', createdAt: T0 + 1e12 }),
    ],
  ])('drops a %s marker', (_l, blob) => {
    const store = memStore({ [PENDING_LINK_KEY]: blob })
    expect(peekPendingLink(store, T0)).toBeNull()
    expect(store.map.size).toBe(0)
  })

  it('survives a throwing storage', () => {
    const hostile: ContextStore = {
      getItem: () => {
        throw new Error('nope')
      },
      setItem: () => {
        throw new Error('nope')
      },
      removeItem: () => {
        throw new Error('nope')
      },
    }
    expect(savePendingLink('google', 'a@b.com', hostile, T0)).toBeNull()
    expect(peekPendingLink(hostile, T0)).toBeNull()
    expect(() => clearPendingLink(hostile)).not.toThrow()
  })
})

describe('takePendingLinkFor — the marker is never an authorisation', () => {
  it('returns the provider when the signed-in email matches', () => {
    const store = memStore()
    savePendingLink('kakao', 'a@b.com', store, T0)
    expect(takePendingLinkFor('A@B.com', store, T0)).toBe('kakao')
  })

  it('refuses — and still consumes — when someone else signs in on the shared device', () => {
    const store = memStore()
    savePendingLink('kakao', 'victim@b.com', store, T0)
    expect(takePendingLinkFor('other@b.com', store, T0)).toBeNull()
    expect(store.map.size).toBe(0)
  })

  it.each([[null], [undefined], ['']])('refuses for a missing signed-in email (%s)', (email) => {
    const store = memStore()
    savePendingLink('kakao', 'a@b.com', store, T0)
    expect(takePendingLinkFor(email, store, T0)).toBeNull()
  })

  it('is one-shot', () => {
    const store = memStore()
    savePendingLink('kakao', 'a@b.com', store, T0)
    expect(takePendingLinkFor('a@b.com', store, T0)).toBe('kakao')
    expect(takePendingLinkFor('a@b.com', store, T0)).toBeNull()
  })

  it('refuses an expired marker', () => {
    const store = memStore()
    savePendingLink('kakao', 'a@b.com', store, T0)
    expect(takePendingLinkFor('a@b.com', store, T0 + PENDING_LINK_TTL_MS + 1)).toBeNull()
  })
})
