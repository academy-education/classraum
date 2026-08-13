/**
 * The purchase intent must survive a redirect that returns in a NEW TAB.
 *
 * This is not a hypothetical. On 2026-08-13 a real buyer tried three
 * times to subscribe from an iPhone. All three attempts registered her
 * card at the PG and none of them charged her: her `checkout_result`
 * rows read `step:'redirect-return', ok:true, hasBillingKey:true` with
 * NO `kind` field, while every successful buyer's row carries
 * `kind:'plan'`. `kind: intent?.kind` serialising away is direct proof
 * `takeBillingIntent()` returned null on the way back.
 *
 * Her Supabase session survived the same round-trip — the analytics rows
 * are stamped with her student_id, so a Bearer token was present — and
 * Supabase stores its session in localStorage. localStorage intact,
 * sessionStorage empty, same browser and origin: the return landed in a
 * different tab, which is what iOS does when the card app hands back.
 *
 * So the test simulates exactly that: write the intent, wipe ONLY
 * sessionStorage, read it back.
 *
 * BREAK-TEST (per CLAUDE.md — a passing check is evidence only if it
 * would have failed). Revert stash/take to sessionStorage and this file
 * fails on 'survives a return in a new tab' with `null`. Confirmed by
 * running it against the pre-fix implementation, not by inspection.
 */
// purchase-credits pulls in auth-headers -> supabase-js, which is
// published as untranspiled ESM and kills the suite at import (the
// failure prints "Tests: 0 total" while other suites still show their
// passes). The intent helpers touch none of it.
jest.mock('@/lib/auth-headers', () => ({ authHeaders: async () => ({}) }))
jest.mock('@/lib/supabase', () => ({ db: {}, supabase: {} }))
jest.mock('@portone/browser-sdk/v2', () => ({}), { virtual: true })

import { stashBillingIntent, takeBillingIntent, checkoutContext } from '../purchase-credits'

/** What iOS does to a tab's storage between leaving and coming back. */
function returnInANewTab() {
  sessionStorage.clear()
}

describe('billing intent survives the PG round-trip', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('survives a return in a new tab', () => {
    stashBillingIntent({ kind: 'plan', planId: 'premium_plus_v1', returnTo: '/mobile/study/subscription', ko: true })

    returnInANewTab()

    const intent = takeBillingIntent()
    // The precise assertion the live failure would have caught: `kind`
    // present, because it is `intent?.kind` that went missing.
    expect(intent).not.toBeNull()
    expect(intent?.kind).toBe('plan')
    expect(intent?.planId).toBe('premium_plus_v1')
  })

  it('is read-and-clear, so a reopened redirect cannot re-charge', () => {
    stashBillingIntent({ kind: 'plan', planId: 'premium_plus_v1', returnTo: '/x', ko: true })
    expect(takeBillingIntent()?.kind).toBe('plan')
    expect(takeBillingIntent()).toBeNull()
  })

  it('still expires after 30 minutes rather than charging a stale intent', () => {
    // localStorage outlives the tab, so the TTL is now the ONLY thing
    // bounding how long a forgotten intent stays chargeable. Under
    // sessionStorage, closing the tab used to do that job implicitly.
    const realNow = Date.now
    try {
      Date.now = () => realNow() - 31 * 60_000
      stashBillingIntent({ kind: 'plan', planId: 'premium_plus_v1', returnTo: '/x', ko: true })
    } finally {
      Date.now = realNow
    }
    expect(takeBillingIntent()).toBeNull()
  })

  it('survives for every purchase kind, not just plans', () => {
    for (const intent of [
      { kind: 'pass' as const, passId: 'toefl_pass_v1', returnTo: '/x', ko: true },
      { kind: 'pack' as const, packId: 'pack5_v2', returnTo: '/x', ko: false },
      { kind: 'gift' as const, returnTo: '/x', ko: true },
    ]) {
      stashBillingIntent(intent)
      returnInANewTab()
      expect(takeBillingIntent()?.kind).toBe(intent.kind)
    }
  })
})

/**
 * The context helper only earns its place if it can detect the BAD case.
 * A probe that reports ls:true unconditionally would look identical on a
 * healthy device and on the one device where the fix cannot work — iOS
 * private browsing / an in-app browser that denies localStorage, where
 * stashBillingIntent swallows the throw by design and the buyer silently
 * lands in the no-intent branch again.
 */
describe('checkoutContext', () => {
  it('reports storage as UNAVAILABLE when writes throw', () => {
    const real = Storage.prototype.setItem
    try {
      Storage.prototype.setItem = () => { throw new DOMException('QuotaExceededError') }
      const ctx = checkoutContext()
      expect(ctx.ls).toBe(false)
      expect(ctx.ss).toBe(false)
    } finally {
      Storage.prototype.setItem = real
    }
  })

  it('reports storage as available on a healthy device, and leaves no probe behind', () => {
    const ctx = checkoutContext()
    expect(ctx.ls).toBe(true)
    expect(ctx.ss).toBe(true)
    expect(localStorage.getItem('__probe')).toBeNull()
  })

  it('flags Korean in-app browsers, which present the PG in a sheet', () => {
    const real = navigator.userAgent
    const set = (ua: string) =>
      Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
    try {
      set('Mozilla/5.0 (iPhone) AppleWebKit KAKAOTALK 10.4.5')
      expect(checkoutContext().inApp).toBe(true)
      set('Mozilla/5.0 (iPhone) AppleWebKit Version/17.0 Mobile/15E148 Safari/604.1')
      expect(checkoutContext().inApp).toBe(false)
    } finally {
      set(real)
    }
  })

  it('carries no personal data', () => {
    const ctx = checkoutContext()
    for (const k of ['email', 'phone', 'phoneNumber', 'name', 'fullName', 'customerId'])
      expect(ctx[k]).toBeUndefined()
  })
})
