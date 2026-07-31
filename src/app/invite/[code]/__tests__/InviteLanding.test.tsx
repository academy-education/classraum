/**
 * Branch wiring for the invite landing.
 *
 * detectPlatform is unit-tested separately; this asserts the thing that
 * function feeds — which store button actually renders, and who gets sent
 * straight through without ever seeing one. Those are different failures:
 * detectPlatform could be perfect while the JSX renders the Play button for
 * an iPhone, and no amount of reading the file reliably catches that.
 *
 * It also cannot be caught by browsing the preview, because the browser's UA
 * is whatever the developer's machine is — which is exactly the case
 * (desktop) that renders no store buttons at all.
 */
import { render, screen, waitFor } from '@testing-library/react'
import { InviteLanding } from '../InviteLanding'

const replace = jest.fn()
const push = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
}))

let isNative = false
jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNative },
}))

// StudyButton -> nativeHaptics -> @capacitor/haptics, whose web shim extends
// a Capacitor base class at module load. Mocking our own wrapper stops the
// import chain at a boundary we own, rather than reproducing plugin
// internals. Without it the suite dies at IMPORT and jest prints "Tests: 0
// total" next to the other suites' passes — a failure that reads as a pass
// if you only skim the colour.
jest.mock('@/lib/nativeHaptics', () => ({
  hapticTap: jest.fn(),
  hapticImpact: jest.fn(),
  hapticNotification: jest.fn(),
  hapticSelection: jest.fn(),
}))

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ language: 'english', t: (k: string) => k }),
}))

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; SM-S911N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
}

function setUA(ua: string, maxTouchPoints = 0) {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true })
  Object.defineProperty(window.navigator, 'maxTouchPoints', { value: maxTouchPoints, configurable: true })
}

const storeLinks = () =>
  (screen.queryAllByRole('link') as HTMLAnchorElement[])
    .map(a => a.getAttribute('href') ?? '')
    .filter(h => /apps\.apple\.com|play\.google\.com/.test(h))

beforeEach(() => {
  replace.mockClear()
  push.mockClear()
  isNative = false
  window.localStorage.clear()
})

describe('InviteLanding', () => {
  it('offers only the App Store on iOS', async () => {
    setUA(UA.iphone)
    render(<InviteLanding code="ABC234" />)
    await waitFor(() => expect(storeLinks().length).toBeGreaterThan(0))
    const links = storeLinks()
    expect(links.some(h => h.includes('apps.apple.com'))).toBe(true)
    expect(links.some(h => h.includes('play.google.com'))).toBe(false)
  })

  it('offers only Google Play on Android', async () => {
    setUA(UA.android)
    render(<InviteLanding code="ABC234" />)
    await waitFor(() => expect(storeLinks().length).toBeGreaterThan(0))
    const links = storeLinks()
    expect(links.some(h => h.includes('play.google.com'))).toBe(true)
    expect(links.some(h => h.includes('apps.apple.com'))).toBe(false)
  })

  it('shows the code so it can be carried across a store install', async () => {
    setUA(UA.iphone)
    render(<InviteLanding code="ABC234" />)
    expect(await screen.findByText('ABC234')).toBeInTheDocument()
  })

  it('sends desktop straight to /auth with the code, showing no store', async () => {
    setUA(UA.mac)
    render(<InviteLanding code="ABC234" />)
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/auth?intent=study&ref=ABC234')
    )
    expect(storeLinks()).toHaveLength(0)
  })

  it('never shows a store to someone already inside the app', async () => {
    // Android's intent-filter claims every app.classraum.com URL, so this
    // page DOES render inside the installed app. Offering "download the
    // app" there is the obvious failure this branch exists to prevent.
    isNative = true
    setUA(UA.android)
    render(<InviteLanding code="ABC234" />)
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/auth?intent=study&ref=ABC234')
    )
    expect(storeLinks()).toHaveLength(0)
  })

  it('stashes the code before any redirect can unmount the page', async () => {
    setUA(UA.mac) // the redirecting case — the easiest one to lose it in
    render(<InviteLanding code="ABC234" />)
    await waitFor(() =>
      expect(window.localStorage.getItem('study_pending_ref')).toBe('ABC234')
    )
  })
})
