/**
 * The wiring, not the module.
 *
 * back-intercept.test.ts proves the slot behaves. This proves the ONE
 * backButton listener consults it BEFORE doing anything destructive — which
 * is the whole fix. An interceptor that is checked after `router.back()`
 * would pass every test in the other file and still throw a student out of
 * their exam.
 *
 * Note what is asserted on the negative path too: with no owner, back must
 * STILL navigate. A fix that quietly disables back everywhere would look
 * like a pass if only the test-is-live case were covered.
 */
import { renderHook } from '@testing-library/react'
import { setBackInterceptor, __resetBackInterceptor } from '@/lib/back-intercept'

const back = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ back, push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/mobile/study',
}))

/** Captures the handlers useNativeApp registers, so the real onBackButton
 *  closure can be invoked exactly as Capacitor would invoke it. */
let captured: { onBackButton?: () => boolean } = {}
jest.mock('@/lib/nativeApp', () => ({
  isNativeApp: () => true,
  getPlatform: () => 'android',
  hideSplashScreen: jest.fn(),
  setStatusBarStyle: jest.fn(),
  setStatusBarBackgroundColor: jest.fn(),
  setupDeepLinkListener: () => () => {},
  parseDeepLink: () => null,
  setupAppLifecycleListeners: (h: { onBackButton?: () => boolean }) => {
    captured = h
    return () => {}
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useNativeApp } = require('../useNativeApp') as typeof import('../useNativeApp')

function setHistoryLength(n: number) {
  Object.defineProperty(window.history, 'length', { value: n, configurable: true })
}

beforeEach(() => {
  back.mockClear()
  captured = {}
  __resetBackInterceptor()
})

describe('useNativeApp back button', () => {
  it('consumes the press without navigating when a surface owns back', () => {
    setHistoryLength(5) // history EXISTS — so router.back() would fire if unguarded
    renderHook(() => useNativeApp({}))
    const onExam = jest.fn()
    setBackInterceptor(onExam)

    expect(captured.onBackButton?.()).toBe(true)
    expect(onExam).toHaveBeenCalledTimes(1)
    expect(back).not.toHaveBeenCalled()
  })

  it('reports handled even with NO history, so the app is never exited', () => {
    // This is the path that ended the exam: history.length <= 1 previously
    // returned false, and nativeApp then called App.exitApp().
    setHistoryLength(1)
    renderHook(() => useNativeApp({}))
    setBackInterceptor(jest.fn())

    expect(captured.onBackButton?.()).toBe(true)
    expect(back).not.toHaveBeenCalled()
  })

  it('still navigates back normally when nobody owns it', () => {
    setHistoryLength(5)
    renderHook(() => useNativeApp({}))

    expect(captured.onBackButton?.()).toBe(true)
    expect(back).toHaveBeenCalledTimes(1)
  })

  it('still reports unhandled at the root, so the app can exit normally', () => {
    setHistoryLength(1)
    renderHook(() => useNativeApp({}))

    expect(captured.onBackButton?.()).toBe(false)
    expect(back).not.toHaveBeenCalled()
  })
})
