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
  const onExit = jest.fn()
  const view = renderHook((props: { phase: string }) => useAppExitGuard({
    sessionId: SESSION,
    timeLimitMinutes: 35,
    onExit,
    ...rest,
    phase: props.phase,
  }), { initialProps: { phase: initialPhase } })
  return { onExit, view }
}

describe('useAppExitGuard — iOS', () => {
  it('records the exit on `pause` (didEnterBackground), not on appStateChange(false)', async () => {
    mount()
    await emit('appStateChange', { isActive: false })
    expect(localStorage.getItem(KEY)).toBeNull()

    await emit('pause')
    expect(localStorage.getItem(KEY)).toBe(String(clock))
  })

  it('ends the test on return once the student has been away past the grace window', async () => {
    const { onExit } = mount()
    await emit('pause')
    clock += EXIT_GRACE_MS + 1
    await emit('resume')
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('does not end the test — and forgets the exit — for a blip inside the grace window', async () => {
    const { onExit } = mount()
    await emit('pause')
    clock += EXIT_GRACE_MS - 1
    await emit('resume')
    expect(onExit).not.toHaveBeenCalled()
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('fires once, however many return events arrive', async () => {
    const { onExit } = mount()
    await emit('pause')
    clock += 60_000
    await emit('resume')
    await emit('appStateChange', { isActive: true })
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('leaves the marker in place until the submit clears it, so an app killed mid-submit still ends the test', async () => {
    const { onExit } = mount()
    await emit('pause')
    clock += 60_000
    await emit('resume')
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(KEY)).not.toBeNull()
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
    const { onExit } = mount()
    expect(onExit).not.toHaveBeenCalled()
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
  it('ends the test on the next mount, once the test is actually loaded', async () => {
    // Marker written by a previous run of the app; no resume event will
    // ever arrive in this JS context.
    localStorage.setItem(KEY, String(clock - 60_000))
    const { onExit, view } = mount({ phase: 'detecting' })
    // Still loading: nothing decided yet, and the marker survives.
    expect(onExit).not.toHaveBeenCalled()
    expect(localStorage.getItem(KEY)).not.toBeNull()

    await act(async () => { view.rerender({ phase: 'taking' }) })
    expect(onExit).toHaveBeenCalledTimes(1)
  })
})
