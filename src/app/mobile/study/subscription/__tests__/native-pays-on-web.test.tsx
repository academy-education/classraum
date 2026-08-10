/**
 * BOTH native platforms hand off to the web, and nothing is hidden.
 *
 * This file previously asserted the opposite for Android — that it got a
 * real in-app checkout — under a gate justified by Korea's
 * Telecommunications Business Act and the Epic v. Google injunction. That
 * justification was wrong and is withdrawn: the Korean law entitles a
 * developer to OFFER an alternative billing system, it does not lift
 * Google's requirement to enrol in their program. So Android pays on the
 * web like iOS.
 *
 * The OTHER half is the part that keeps regressing, and it is what most
 * of these assertions are for: the earlier iOS gate did not just change
 * the CTA, it DELETED the credit packs and the exam passes. A student on
 * iOS saw a product with no prices — which reads as "there is nothing to
 * buy", not as "buy it elsewhere". Every surface must render on every
 * platform; only the button's destination changes.
 *
 * BREAK-TEST: flip any `isNative` on the page back to `isIOS` and the
 * Android cases fail; restore a `{!isNative && ...}` wrapper around the
 * credit card and "shows credit packs on every platform" fails.
 *
 * NOT proven here: that the Android hand-off actually opens a browser on
 * a shipped build. That needs a device — see the note in page.tsx.
 */
import { act, render, screen, waitFor } from '@testing-library/react'
import SubscriptionPage from '../page'

let mockPlatform = 'android'
// isNativePlatform must follow mockPlatform, not be hardcoded true — the
// web case exists precisely to prove the native gate does not leak into
// the browser, and a hardcoded true would make it unprovable.
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => mockPlatform !== 'web',
    getPlatform: () => mockPlatform,
  },
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
  it.each(['android', 'ios'])('%s hands off to the web, never an in-app charge', async (platform) => {
    mockPlatform = platform
    await mount()
    expect(screen.getAllByText('study.subscription.subscribeOnWeb').length).toBeGreaterThan(0)
    // "Start <plan>" is the in-app checkout CTA. Neither platform gets it.
    expect(screen.queryByText(/^Start /)).not.toBeInTheDocument()
  })

  it.each(['android', 'ios'])('%s still SEES the credit packs', async (platform) => {
    // The regression this guards: hiding the purchase surface entirely,
    // which taught iOS students the product had no paid tier at all.
    mockPlatform = platform
    await mount()
    expect(screen.getByText('Buy credits')).toBeInTheDocument()
  })

  it('the web keeps its in-app checkout', async () => {
    // Nothing about the native gate should touch the browser experience.
    mockPlatform = 'web'
    await mount()
    expect(screen.getAllByText(/^Start /).length).toBeGreaterThan(0)
    expect(screen.queryByText('study.subscription.subscribeOnWeb')).not.toBeInTheDocument()
  })
})
