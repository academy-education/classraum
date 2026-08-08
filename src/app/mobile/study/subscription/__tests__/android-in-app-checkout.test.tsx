/**
 * Apple's rule must not silence Android's checkout.
 *
 * Every money control on this page was gated on `isNative`, with the
 * stated reason "App Store IAP rules". That is an Apple rule, and
 * `isNative` is true on Android too — so Android inherited a restriction
 * written for a different store and shipped a "Subscribe on web" button
 * instead of the checkout it can actually run. That button hands the URL
 * to the OS and, with app links verified, gets it handed straight back:
 * the tap does nothing.
 *
 * The gate is now `isIOS`. Android renders the same in-app checkout the
 * web does (PortOne's REDIRECTION flow, built for this WebView — see
 * purchase-credits.ts), and iOS is untouched.
 *
 * BREAK-TEST: change either gate back to `isNative` and the Android case
 * below fails — it renders the web hand-off again.
 *
 * NOT proven here: that a real card charge completes inside the WebView.
 * This covers which controls each platform is offered.
 */
import { act, render, screen, waitFor } from '@testing-library/react'
import SubscriptionPage from '../page'

let mockPlatform = 'android'
jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => mockPlatform },
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
jest.mock('@/lib/nativeApp', () => ({ openExternalUrl: jest.fn(async () => true) }))
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

/** No subscription → plan cards offer a first purchase. */
const PAYLOAD = { subscription: null }

beforeEach(() => {
  window.scrollTo = jest.fn()
  global.fetch = jest.fn(async () => ({
    ok: true, json: async () => PAYLOAD,
  })) as unknown as typeof fetch
})
afterEach(() => { jest.restoreAllMocks() })

const mount = async () => {
  render(<SubscriptionPage />)
  await waitFor(() => expect(screen.queryAllByRole('button').length).toBeGreaterThan(1))
  await act(async () => { await Promise.resolve() })
}

describe('checkout surface by platform', () => {
  it('Android gets real in-app checkout, not the web hand-off', async () => {
    mockPlatform = 'android'
    await mount()
    expect(screen.getAllByText(/^Start /).length).toBeGreaterThan(0)
    expect(screen.queryByText('study.subscription.subscribeOnWeb')).not.toBeInTheDocument()
  })

  it('Android can buy credit packs in-app', async () => {
    mockPlatform = 'android'
    await mount()
    expect(screen.getByText('Buy credits')).toBeInTheDocument()
  })

  it('iOS still hands off to the web — Apple’s rule is untouched', async () => {
    mockPlatform = 'ios'
    await mount()
    expect(screen.getAllByText('study.subscription.subscribeOnWeb').length).toBeGreaterThan(0)
    expect(screen.queryByText(/^Start /)).not.toBeInTheDocument()
    expect(screen.queryByText('Buy credits')).not.toBeInTheDocument()
  })
})
