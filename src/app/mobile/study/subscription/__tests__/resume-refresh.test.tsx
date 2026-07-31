/**
 * "I paid, and nothing changed" — the subscription page must refetch
 * when the app/tab comes back to the foreground.
 *
 * Native students cannot be sold to in-app, so the plan cards open
 * app.classraum.com in an EXTERNAL browser. They pay there and swipe
 * back into a WebView whose React tree never unmounted. Nothing in the
 * mobile layout re-runs this page's `load()` — its useNativeApp
 * onResume calls PersistentMobileAuth's `refetch` and stops there.
 *
 * These tests render the real page and count calls to
 * /api/study/subscription. Delete the resume effect in page.tsx and
 * every "refetches" case below drops from 2 fetches to 1.
 *
 * What is NOT proven here: that iOS/Android actually deliver `resume`
 * after returning from a Custom Tab / SFSafariViewController. The
 * Capacitor plugin is mocked; only our handling of the event is under
 * test. That leg needs a device.
 */
import { act, render, screen, waitFor } from '@testing-library/react'
import SubscriptionPage from '../page'

let mockNative = true
let mockPlatform = 'ios'
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => mockNative,
    getPlatform: () => mockPlatform,
  },
}))
// Pulled in by the shared primitives (usePullToRefresh → nativeHaptics);
// its real module registers a Capacitor plugin at import time.
jest.mock('@capacitor/haptics', () => ({
  Haptics: { impact: jest.fn(), notification: jest.fn(), vibrate: jest.fn() },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}))

type Handler = (arg: never) => void
const mockListeners: Record<string, Handler[]> = {}
jest.mock('@capacitor/app', () => ({
  App: {
    addListener: (name: string, cb: Handler) => {
      ;(mockListeners[name] ||= []).push(cb)
      return Promise.resolve({
        remove: async () => {
          const arr = mockListeners[name] ?? []
          const i = arr.indexOf(cb)
          if (i >= 0) arr.splice(i, 1)
        },
      })
    },
  },
}))

// `t` MUST be referentially stable across renders — the page's `load` is
// a useCallback on [t], so a fresh function per render would re-run the
// mount effect and hand every assertion below a free extra fetch. (The
// real LanguageContext memoises it.)
jest.mock('@/hooks/useTranslation', () => {
  const t = (k: string) => k
  const tList = () => []
  const setLanguage = () => {}
  return {
    useTranslation: () => ({ t, tList, language: 'english', setLanguage }),
  }
})
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'student-1', email: 's@example.com' } }),
}))
jest.mock('@/lib/auth-headers', () => ({ authHeaders: async () => ({}) }))
jest.mock('@/lib/study/track-client', () => ({ track: jest.fn() }))
jest.mock('@/lib/nativeApp', () => ({ openExternalUrl: jest.fn() }))
jest.mock('@/lib/portone-browser', () => ({
  PortOne: { requestIssueBillingKey: jest.fn(async () => ({})) },
}))

const mockBuyCreditPack = jest.fn()
jest.mock('@/lib/study/purchase-credits', () => ({
  buyCreditPack: (...a: unknown[]) => mockBuyCreditPack(...a),
  billingCustomer: async () => ({ phoneNumber: '01000000000' }),
  missingPhoneMessage: () => 'phone',
  stashBillingIntent: () => {},
  billingRedirectUrl: () => 'https://example.com/r',
  billingIssueId: () => 'iss-1',
  billingWindowType: () => undefined,
  offerPeriodFor: () => undefined,
  requestOneTimePayment: async () => ({ ok: false, cancelled: true }),
}))

/** Only the subscription GET — the page fires nothing else here. */
const subFetches = () =>
  (global.fetch as jest.Mock).mock.calls.filter(
    c => String(c[0]).includes('/api/study/subscription'),
  ).length

const PAYLOAD = { subscription: null }

let clock = 1_700_000_000_000

beforeEach(() => {
  mockNative = true
  mockPlatform = 'ios'
  for (const k of Object.keys(mockListeners)) delete mockListeners[k]
  mockBuyCreditPack.mockReset()
  clock = 1_700_000_000_000
  jest.spyOn(Date, 'now').mockImplementation(() => clock)
  // jsdom has no layout engine; the page smooth-scrolls its banner.
  window.scrollTo = jest.fn()
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => PAYLOAD,
  })) as unknown as typeof fetch
})
afterEach(() => { jest.restoreAllMocks() })

/** Render and wait for the first load to land (skeleton → content). */
async function mountLoaded() {
  const view = render(<SubscriptionPage />)
  await waitFor(() => expect(subFetches()).toBe(1))
  // Let the Capacitor addListener promises resolve before emitting.
  await act(async () => { await Promise.resolve() })
  return view
}

const emit = async (name: string, arg?: unknown) => {
  await act(async () => {
    for (const cb of [...(mockListeners[name] ?? [])]) (cb as (a: unknown) => void)(arg)
  })
}

const emitVisibility = async (state: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true, get: () => state,
  })
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
}

describe('subscription page — refetches when the app returns', () => {
  it('native: a Capacitor `resume` re-runs load()', async () => {
    await mountLoaded()
    await emit('resume')
    expect(subFetches()).toBe(2)
  })

  it('native: appStateChange(isActive:true) also counts as a return', async () => {
    await mountLoaded()
    await emit('appStateChange', { isActive: true })
    expect(subFetches()).toBe(2)
  })

  it('native: going to the BACKGROUND does not refetch', async () => {
    await mountLoaded()
    await emit('pause')
    await emit('appStateChange', { isActive: false })
    expect(subFetches()).toBe(1)
  })

  it('native (android): the same return events work', async () => {
    mockNative = true
    mockPlatform = 'android'
    await mountLoaded()
    await emit('resume')
    expect(subFetches()).toBe(2)
  })

  it('web: a visibilitychange back to visible re-runs load()', async () => {
    mockNative = false
    mockPlatform = 'web'
    await mountLoaded()
    await emitVisibility('visible')
    expect(subFetches()).toBe(2)
  })

  it('web: registers no Capacitor listener at all', async () => {
    mockNative = false
    mockPlatform = 'web'
    await mountLoaded()
    expect(Object.values(mockListeners).flat()).toHaveLength(0)
  })

  it('web: going hidden does not refetch', async () => {
    mockNative = false
    mockPlatform = 'web'
    await mountLoaded()
    await emitVisibility('hidden')
    expect(subFetches()).toBe(1)
  })
})

describe('subscription page — resume refresh pathologies', () => {
  it('coalesces the iOS double-signal (resume + appStateChange) into ONE refetch', async () => {
    await mountLoaded()
    await emit('resume')
    await emit('appStateChange', { isActive: true })
    expect(subFetches()).toBe(2)
  })

  it('refetches again on a LATER return, once the coalesce window has passed', async () => {
    await mountLoaded()
    await emit('resume')
    expect(subFetches()).toBe(2)
    clock += 60_000
    await emit('resume')
    expect(subFetches()).toBe(3)
  })

  it('does not refetch while an action is in flight', async () => {
    mockNative = false
    mockPlatform = 'web'
    // buyCreditPack never settles → `acting` stays 'pack'.
    mockBuyCreditPack.mockReturnValue(new Promise(() => {}))
    await mountLoaded()

    const packButton = screen.getAllByRole('button')
      .find(b => b.textContent?.includes('+1'))!
    expect(packButton).toBeDefined()
    await act(async () => { packButton.click() })

    await emitVisibility('visible')
    expect(subFetches()).toBe(1)
  })

  it('does not stack listeners across re-renders', async () => {
    const view = await mountLoaded()
    view.rerender(<SubscriptionPage />)
    view.rerender(<SubscriptionPage />)
    await act(async () => { await Promise.resolve() })
    expect(mockListeners['resume']).toHaveLength(1)
    expect(mockListeners['appStateChange']).toHaveLength(1)
    // and one return is still exactly one refetch
    await emit('resume')
    expect(subFetches()).toBe(2)
  })

  it('removes its listeners on unmount', async () => {
    const view = await mountLoaded()
    view.unmount()
    await act(async () => { await Promise.resolve() })
    expect(Object.values(mockListeners).flat()).toHaveLength(0)
  })

  it('web: removes the visibilitychange handler on unmount', async () => {
    mockNative = false
    mockPlatform = 'web'
    const view = await mountLoaded()
    view.unmount()
    await emitVisibility('visible')
    expect(subFetches()).toBe(1)
  })
})
