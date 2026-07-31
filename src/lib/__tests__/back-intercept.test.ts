/**
 * The contract that keeps the Android back button from ending an exam.
 *
 * The bug being prevented: back was destructive both ways during a timed
 * test. With history it navigated off the test; without it, useNativeApp
 * returned false and nativeApp called App.exitApp() — which finishes the
 * activity, fires onStop, and is the authoritative "student left" event in
 * test-exit-guard.ts. One accidental tap ended the exam.
 *
 * These tests assert the interceptor's own contract. The wiring — that
 * useNativeApp actually consults it BEFORE navigating — is asserted in
 * useNativeApp-back.test.ts, because a correct module wired in the wrong
 * order fixes nothing.
 */
import {
  setBackInterceptor,
  runBackInterceptor,
  __resetBackInterceptor,
} from '../back-intercept'

beforeEach(() => __resetBackInterceptor())

describe('back interceptor', () => {
  it('reports NOT handled when nobody owns back', () => {
    // Must be false, not true: a default of "handled" would silently kill
    // ordinary back navigation across the whole app.
    expect(runBackInterceptor()).toBe(false)
  })

  it('runs the owner and reports handled', () => {
    const fn = jest.fn()
    setBackInterceptor(fn)
    expect(runBackInterceptor()).toBe(true)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('releases ownership when set to null', () => {
    const fn = jest.fn()
    setBackInterceptor(fn)
    setBackInterceptor(null)
    expect(runBackInterceptor()).toBe(false)
    expect(fn).not.toHaveBeenCalled()
  })

  it('keeps ownership across repeated presses', () => {
    // Back is pressed repeatedly by frustrated students; the owner must not
    // be consumed by the first press and hand the next one to exitApp().
    const fn = jest.fn()
    setBackInterceptor(fn)
    runBackInterceptor()
    runBackInterceptor()
    expect(runBackInterceptor()).toBe(true)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('lets a later owner replace an earlier one', () => {
    const first = jest.fn()
    const second = jest.fn()
    setBackInterceptor(first)
    setBackInterceptor(second)
    runBackInterceptor()
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
  })
})
