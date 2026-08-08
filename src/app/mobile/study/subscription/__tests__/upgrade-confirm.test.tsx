/**
 * An upgrade takes money NOW. It must ask first.
 *
 * `POST /api/study/subscription/change-plan` charges the stored billing
 * key immediately for an upgrade ("UPGRADE — immediate charge, fresh
 * period, fresh grant"). The plan card's button used to call changePlan()
 * straight from onClick, so one tap on "Upgrade to Premium" moved real
 * money with nothing in between — no amount shown at the moment of
 * decision and no way back. Cancelling, which costs nothing, already had
 * a confirm step.
 *
 * BREAK-TEST: point the upgrade button's onClick back at
 * `void changePlan(plan.id)` and the first case below fails — the POST
 * fires on the first tap. The third case guards the other direction: a
 * downgrade is only scheduled at renewal and must NOT grow a confirm.
 *
 * NOT proven here: that the charge itself succeeds, or that PortOne is
 * called with the right amount. This covers the gate, not the payment.
 */
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react'
import SubscriptionPage from '../page'

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
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

/** Active on Basic (9,900) → Premium (18,900) is a paid upgrade. */
const PAYLOAD = {
  subscription: {
    id: 'sub-1',
    plan: 'general_v1',
    status: 'active',
    cancel_at_period_end: false,
    current_period_end: '2026-09-06T00:00:00.000Z',
    pending_plan: null,
  },
  tier: 'general',
  credits: { grant: 10, purchased: 0, total: 10 },
}

const changePlanCalls = () =>
  (global.fetch as jest.Mock).mock.calls.filter(
    c => String(c[0]).includes('/change-plan'),
  ).length

beforeEach(() => {
  window.scrollTo = jest.fn()
  global.fetch = jest.fn(async () => ({
    ok: true, json: async () => PAYLOAD,
  })) as unknown as typeof fetch
})
afterEach(() => { jest.restoreAllMocks() })

async function mountLoaded() {
  const view = render(<SubscriptionPage />)
  // Two cards read "Upgrade to Premium" — Premium (18,900) and Premium
  // Plus (26,900), both tier 'premium'. Index 0 is Premium; asserting on
  // the amount below is what pins which card was actually confirmed.
  await waitFor(() => expect(screen.getAllByText('Upgrade to Premium').length).toBe(2))
  await act(async () => { await Promise.resolve() })
  return view
}

const clickUpgradeToPremium = () =>
  fireEvent.click(screen.getAllByText('Upgrade to Premium')[0])

describe('upgrade confirmation', () => {
  it('the first tap charges nothing — it asks', async () => {
    await mountLoaded()
    clickUpgradeToPremium()
    expect(changePlanCalls()).toBe(0)
    // and it states the amount and the consequence
    // The amount shown is Premium's, not Premium Plus's — the confirm is
    // bound to the card that was tapped.
    expect(screen.getByText(/charged ₩18,900 now/)).toBeInTheDocument()
  })

  it('confirming is what actually charges', async () => {
    await mountLoaded()
    clickUpgradeToPremium()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Pay / }))
    })
    await waitFor(() => expect(changePlanCalls()).toBe(1))
  })

  it('backing out leaves the plan alone', async () => {
    await mountLoaded()
    clickUpgradeToPremium()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() =>
      expect(screen.queryByText(/charged ₩18,900 now/)).not.toBeInTheDocument())
    expect(changePlanCalls()).toBe(0)
  })
})
