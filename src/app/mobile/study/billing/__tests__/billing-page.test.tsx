/**
 * The billing-history page: every charge listed with its amount, date and
 * card-slip link; refunds marked; the slip opens outside the WebView.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import BillingHistoryPage from '../page'
import { openExternalUrl } from '@/lib/nativeApp'

let mockLang: 'english' | 'korean' = 'english'
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' } }))
jest.mock('@capacitor/haptics', () => ({
  Haptics: { impact: jest.fn(), notification: jest.fn(), vibrate: jest.fn() },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}))
jest.mock('@capacitor/app', () => ({ App: { addListener: () => Promise.resolve({ remove: async () => {} }) } }))
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k, tList: () => [], language: mockLang, setLanguage: () => {} }),
}))
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'student-1' } }) }))
jest.mock('@/lib/auth-headers', () => ({ authHeaders: async () => ({ Authorization: 'Bearer t' }) }))
jest.mock('@/lib/nativeApp', () => ({ openExternalUrl: jest.fn(async () => true), isNativeApp: () => false }))

const ITEMS = [
  { paymentId: 'sub-1', kind: 'study_subscription', amountWon: 26900, paidAt: '2026-09-29T15:30:00Z', refundedAt: null,
    orderName: 'Classraum Study — Premium Plus (Monthly)', receiptUrl: 'https://iniweb.inicis.com/receipt/1' },
  { paymentId: 'pack-1', kind: 'study_credit_pack', amountWon: 1900, paidAt: '2026-08-02T01:00:00Z', refundedAt: '2026-08-03T01:00:00Z',
    orderName: null, receiptUrl: null },
]
function mockFetch(body: unknown, ok = true) {
  global.fetch = jest.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => body })) as unknown as typeof fetch
}

describe('billing history page', () => {
  beforeEach(() => { mockLang = 'english'; (openExternalUrl as jest.Mock).mockClear() })

  it('lists each charge with item, amount and Seoul-time date, and marks refunds', async () => {
    mockFetch({ items: ITEMS })
    render(<BillingHistoryPage />)
    await waitFor(() => expect(screen.getByTestId('billing-list')).toBeInTheDocument())
    expect(screen.getByText('Classraum Study — Premium Plus (Monthly)')).toBeInTheDocument()
    expect(screen.getByText('₩26,900')).toBeInTheDocument()
    expect(screen.getByText('Sep 30, 2026')).toBeInTheDocument()     // 15:30Z = 00:30 KST next day
    expect(screen.getByText('Refunded')).toBeInTheDocument()
    expect(screen.getByText('Receipt pending')).toBeInTheDocument()   // no slip URL yet
    expect(global.fetch).toHaveBeenCalledWith('/api/study/billing', expect.objectContaining({ headers: { Authorization: 'Bearer t' } }))
  })

  it('opens the card slip outside the app', async () => {
    mockFetch({ items: ITEMS })
    render(<BillingHistoryPage />)
    fireEvent.click(await screen.findByRole('button', { name: /Receipt/ }))
    expect(openExternalUrl).toHaveBeenCalledWith('https://iniweb.inicis.com/receipt/1')
  })

  it('renders Korean amounts and labels', async () => {
    mockLang = 'korean'
    mockFetch({ items: ITEMS })
    render(<BillingHistoryPage />)
    expect(await screen.findByText('26,900원')).toBeInTheDocument()
    expect(screen.getByText('환불됨')).toBeInTheDocument()
    expect(screen.getByText('2026년 9월 30일')).toBeInTheDocument()
  })

  it('shows the empty state and the load error distinctly', async () => {
    mockFetch({ items: [] })
    const { unmount } = render(<BillingHistoryPage />)
    expect(await screen.findByText('No payments yet')).toBeInTheDocument()
    unmount()
    mockFetch({}, false)
    render(<BillingHistoryPage />)
    expect(await screen.findByText(/Couldn't load your billing history/)).toBeInTheDocument()
  })
})
