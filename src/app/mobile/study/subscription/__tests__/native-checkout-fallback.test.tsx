/**
 * On native, checkout leaves the app — and when that hand-off fails it
 * fails SILENTLY. Browser.open throws (no resolvable browser package), the
 * catch swallows it, and the tap is indistinguishable from one that
 * worked. A student sees a dead button and has no way to pay.
 *
 * The manifest fix for that ships only in a store release. This escape
 * hatch ships in the web bundle: the raw checkout URL, copyable, touching
 * no Capacitor plugin at all — so it cannot fail the same way.
 *
 * BREAK-TEST: delete the "Didn't open? Copy the link" button and its panel
 * from page.tsx and both cases below fail.
 *
 * NOT proven here: that the URL opens a working checkout on a real device.
 * This covers that the student is always given something to act on.
 */
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react'
import SubscriptionPage from '../page'

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
}))
jest.mock('@capacitor/haptics', () => ({
  Haptics: { impact: jest.fn(), notification: jest.fn(), vibrate: jest.fn() },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}))
jest.mock('@capacitor/app', () => ({
  App: { addListener: () => Promise.resolve({ remove: async () => {} }) },
}))
jest.mock('@/hooks/useTranslation', () => {
  const t = (k: string) => k
  return { useTranslation: () => ({ t, tList: () => [], language: 'english', setLanguage: () => {} }) }
})
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'student-1', email: 's@example.com' } }),
}))
jest.mock('@/lib/auth-headers', () => ({ authHeaders: async () => ({}) }))
jest.mock('@/lib/study/track-client', () => ({ track: jest.fn() }))

/** The failure this whole path exists for: the hand-off reports false. */
const mockOpen = jest.fn(async () => false)
jest.mock('@/lib/nativeApp', () => ({ openExternalUrl: (u: string) => mockOpen(u) }))

jest.mock('@/lib/portone-browser', () => ({
  PortOne: { requestIssueBillingKey: jest.fn(async () => ({})) },
}))
jest.mock('@/lib/study/purchase-credits', () => ({
  buyCreditPack: jest.fn(),
  billingCustomer: async () => ({ phoneNumber: '01000000000' }),
  missingPhoneMessage: () => 'phone',
  stashBillingIntent: () => {},
  billingRedirectUrl: () => 'https://example.com/r',
  billingIssueId: () => 'iss-1',
  billingWindowType: () => undefined,
  offerPeriodFor: () => undefined,
  requestOneTimePayment: async () => ({ ok: false, cancelled: true }),
}))

const PAYLOAD = { subscription: null }

beforeEach(() => {
  mockOpen.mockClear()
  window.scrollTo = jest.fn()
  global.fetch = jest.fn(async () => ({
    ok: true, json: async () => PAYLOAD,
  })) as unknown as typeof fetch
})
afterEach(() => { jest.restoreAllMocks() })

async function mountLoaded() {
  const view = render(<SubscriptionPage />)
  await waitFor(() =>
    expect(screen.getAllByText('study.subscription.subscribeOnWeb').length).toBeGreaterThan(0))
  await act(async () => { await Promise.resolve() })
  return view
}

describe('native checkout — the student is never left with a dead button', () => {
  it('a failed hand-off surfaces the URL instead of doing nothing', async () => {
    await mountLoaded()
    await act(async () => {
      fireEvent.click(screen.getAllByText('study.subscription.subscribeOnWeb')[0])
    })
    expect(mockOpen).toHaveBeenCalled()
    // It said something...
    expect(screen.getByText(/Copy the address below/)).toBeInTheDocument()
    // ...and gave them the actual link to act on.
    expect(screen.getAllByText(/app\.classraum\.com\/auth\?intent=study/).length).toBeGreaterThan(0)
  })

  it('the link is reachable without tapping the broken button first', async () => {
    await mountLoaded()
    fireEvent.click(screen.getAllByText("Didn't open? Copy the link")[0])
    expect(screen.getAllByText(/app\.classraum\.com\/auth\?intent=study/).length).toBeGreaterThan(0)
    expect(mockOpen).not.toHaveBeenCalled()
  })
})
