/**
 * Wiring test for the timed-test exit guard.
 *
 * The decision table lives in `@/lib/study/test-exit-guard` and is
 * attacked directly by its own suite. What this file checks is the part
 * that suite cannot see: that the hook subscribes to the RIGHT
 * @capacitor/app event per platform, that it writes and honours the
 * localStorage marker, and — the one that would be invisible in a green
 * unit test — that on web it never registers a listener at all.
 *
 * The Capacitor plugins are mocked. What CANNOT be verified here, and
 * needs a device/simulator: that iOS really withholds `pause` for a mic
 * permission alert, and that Android really withholds `appStateChange`
 * for its runtime permission dialog. The mocks assert our handling of
 * those events, not the OS's decision to send them.
 */
import { act, renderHook } from '@testing-library/react'
import { useAppExitGuard } from '../useAppExitGuard'
import { exitMarkerKey, EXIT_GRACE_MS } from '@/lib/study/test-exit-guard'
import { __resetMicPromptState, beginMicPrompt, endMicPrompt } from '@/lib/study/mic-prompt'

let mockNative = true
let mockPlatform = 'ios'
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => mockNative,
    getPlatform: () => mockPlatform,
  },
}))

type Handler = (arg: unknown) => void
const listeners: Record<string, Handler[]> = {}
jest.mock('@capacitor/app', () => ({
  App: {
    addListener: (name: string, cb: Handler) => {
      ;(listeners[name] ||= []).push(cb)
      return Promise.resolve({ remove: async () => {} })
    },
  },
}))

const emit = async (name: string, arg?: unknown) => {
  await act(async () => {
    for (const cb of listeners[name] ?? []) cb(arg)
  })
}

const SESSION = 'sess-1'
const KEY = exitMarkerKey(SESSION)

/** Advance the clock the guard reads. */
let clock = 1_700_000_000_000
beforeEach(() => {
  mockNative = true
  mockPlatform = 'ios'
  for (const k of Object.keys(listeners)) delete listeners[k]
  localStorage.clear()
  __resetMicPromptState()
  clock = 1_700_000_000_000
  jest.spyOn(Date, 'now').mockImplementation(() => clock)
})
afterEach(() => { jest.restoreAllMocks() })

const mount = (over: Partial<Parameters<typeof useAppExitGuard>[0]> = {}) => {
  // `phase` is deliberately NOT spread over the rendered props: it is the
  // one input a rerender changes, and folding it into the overrides made
  // the rerender a no-op — the killed-app case below then "passed" for
  // the wrong reason on the way to failing for the right one.
  const { phase: initialPhase = 'taking', ...rest } = over
  const onAway = jest.fn()
  const onReturn = jest.fn()
  const view = renderHook((props: { phase: string; isPaused: boolean }) => useAppExitGuard({
    sessionId: SESSION,
    timeLimitMinutes: 35,
    isPaused: false,
    onAway,
    onReturn,
    ...rest,
    phase: props.phase,
    ...(rest.isPaused === undefined ? { isPaused: props.isPaused } : {}),
  }), { initialProps: { phase: initialPhase, isPaused: false } })
  /** Calls that asked for a pause (as opposed to a grace-window blip). */
  const pauseCalls = () => onReturn.mock.calls.filter(([pause]) => pause === true)
  return { onAway, onReturn, pauseCalls, view }
}

describe('useAppExitGuard — iOS', () => {
  it('records the exit on `pause` (didEnterBackground), not on appStateChange(false)', async () => {
    mount()
    await emit('appStateChange', { isActive: false })
    expect(localStorage.getItem(KEY)).toBeNull()

    await emit('pause')
    expect(localStorage.getItem(KEY)).toBe(String(clock))
  })

  it('stops the clock on the way OUT, not on the way back', async () => {
    // The freeze cannot wait for the return: the student is charged for
    // every second between the two, and the only reason it used to work
    // was an assumed `visibilitychange` from the WebView.
    const { onAway, pauseCalls } = mount()
    await emit('pause')
    expect(onAway).toHaveBeenCalledTimes(1)
    expect(pauseCalls()).toHaveLength(0)
  })

  it('pauses the test on return once the student has been away past the grace window', async () => {
    const { pauseCalls, onAway } = mount()
    await emit('pause')
    clock += EXIT_GRACE_MS + 1
    await emit('resume')
    expect(pauseCalls()).toHaveLength(1)
  })

  it('does not pause — but DOES restart the clock — for a blip inside the grace window', async () => {
    const { pauseCalls, onReturn } = mount()
    await emit('pause')
    clock += EXIT_GRACE_MS - 1
    await emit('resume')
    expect(pauseCalls()).toHaveLength(0)
    // The clock was frozen on the way out, so somebody has to start it
    // again or the blip silently makes the test untimed.
    expect(onReturn).toHaveBeenCalledWith(false)
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('fires once per trip away, however many return events arrive', async () => {
    const { pauseCalls, onAway } = mount()
    await emit('pause')
    clock += 60_000
    await emit('resume')
    await emit('appStateChange', { isActive: true })
    expect(pauseCalls()).toHaveLength(1)
  })

  it('consumes the marker when it pauses — nothing is left to re-fire later', async () => {
    // The marker used to be left behind deliberately, because the thing
    // it triggered was a submit and the submit cleared it. There is no
    // submit now, so a marker left behind would re-pause on every phase
    // change for the rest of the test.
    const { pauseCalls, onAway } = mount()
    await emit('pause')
    clock += 60_000
    await emit('resume')
    expect(pauseCalls()).toHaveLength(1)
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('pauses AGAIN the next time the student leaves — the guard is not one-shot', async () => {
    // The old guard fired at most once per session because firing meant
    // ending. A student who checks a message twice must come back to a
    // paused test twice.
    const { pauseCalls, onAway } = mount()
    await emit('pause')
    clock += 60_000
    await emit('resume')
    expect(pauseCalls()).toHaveLength(1)

    await emit('pause')
    clock += 60_000
    await emit('resume')
    expect(pauseCalls()).toHaveLength(2)
  })

  it('does nothing while the test is already paused — no marker, no second pause', async () => {
    const { pauseCalls } = mount({ isPaused: true })
    await emit('pause')
    expect(localStorage.getItem(KEY)).toBeNull()
    clock += 60_000
    await emit('resume')
    expect(pauseCalls()).toHaveLength(0)
  })
})

describe('useAppExitGuard — Android', () => {
  beforeEach(() => { mockPlatform = 'android' })

  it('records the exit on appStateChange(false) (onStop), not on `pause` (onPause)', async () => {
    mount()
    await emit('pause')
    expect(localStorage.getItem(KEY)).toBeNull()

    await emit('appStateChange', { isActive: false })
    expect(localStorage.getItem(KEY)).toBe(String(clock))
  })
})

describe('useAppExitGuard — web is untouched', () => {
  beforeEach(() => { mockNative = false; mockPlatform = 'web' })

  it('registers no listener at all', () => {
    mount()
    expect(Object.keys(listeners)).toHaveLength(0)
  })

  it('ignores a marker left behind by a previous native install', () => {
    localStorage.setItem(KEY, String(clock - 60_000))
    const { pauseCalls, onAway } = mount()
    expect(pauseCalls()).toHaveLength(0)
  })
})

describe('useAppExitGuard — false positives', () => {
  it('a mic permission prompt on screen does not record an exit', async () => {
    mount()
    beginMicPrompt()
    await emit('pause')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('still suppresses just after the prompt closes (the settle window)', async () => {
    mount()
    beginMicPrompt()
    endMicPrompt()
    await emit('pause')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('records normally once the settle window has passed', async () => {
    mount()
    beginMicPrompt()
    endMicPrompt()
    clock += 10_000
    await emit('pause')
    expect(localStorage.getItem(KEY)).toBe(String(clock))
  })

  it('does not record an exit when no test is in progress', async () => {
    mount({ phase: 'reviewing' })
    await emit('pause')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('does not record an exit for an untimed session', async () => {
    mount({ timeLimitMinutes: 0 })
    await emit('pause')
    expect(localStorage.getItem(KEY)).toBeNull()
  })
})

describe('useAppExitGuard — the app was killed while backgrounded', () => {
  it('pauses on the next mount, once the test is actually loaded', async () => {
    // Marker written by a previous run of the app; no resume event will
    // ever arrive in this JS context.
    localStorage.setItem(KEY, String(clock - 60_000))
    const { pauseCalls, view } = mount({ phase: 'detecting' })
    // Still loading: nothing decided yet, and the marker survives.
    expect(pauseCalls()).toHaveLength(0)
    expect(localStorage.getItem(KEY)).not.toBeNull()

    await act(async () => { view.rerender({ phase: 'taking', isPaused: false }) })
    expect(pauseCalls()).toHaveLength(1)
  })
})
