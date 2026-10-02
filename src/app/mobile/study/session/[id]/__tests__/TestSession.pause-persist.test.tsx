/**
 * A paused test must STAY paused across a reload — including the one iOS
 * Safari does on its own when it discards a backgrounded tab overnight.
 *
 * Reported 2026-10-02 (Digital SAT R&W, iPhone Safari, web not native):
 * "I paused it. The next day it was unpaused, and now there are only 10
 * minutes when it had at least 20." `paused` lived only in React state;
 * the reload restored the frozen elapsed and then started the clock at
 * once, even on a page loading hidden. Every minute between the reload
 * and the student looking was charged.
 *
 * Web platform throughout (mockNative=false): the native exit guard is
 * not what the student had, and must not be what makes these pass.
 * Harness copied from TestSession.background.test.tsx.
 */
import { fireEvent, render, screen, act, waitFor } from '@testing-library/react'
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'util'

// jsdom ships neither; TestSession decodes the generator's NDJSON stream.
if (typeof global.TextDecoder === 'undefined') {
  ;(global as unknown as { TextDecoder: unknown }).TextDecoder = NodeTextDecoder
}
if (typeof global.TextEncoder === 'undefined') {
  ;(global as unknown as { TextEncoder: unknown }).TextEncoder = NodeTextEncoder
}

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

// jest.setup's next/navigation mock builds a NEW router object per call,
// which changes `load`'s identity every render and re-mounts the test in a
// loop. The real hook returns a stable object.
jest.mock('next/navigation', () => {
  const router = { push: jest.fn(), replace: jest.fn(), prefetch: jest.fn(), back: jest.fn(), forward: jest.fn(), refresh: jest.fn() }
  return {
    useRouter: () => router,
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/mobile/study',
  }
})
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k, language: 'en' }),
}))
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'student-1' } }),
}))
jest.mock('@/lib/auth-headers', () => ({
  authHeaders: async () => ({ 'Content-Type': 'application/json' }),
}))
jest.mock('@/lib/study/purchase-credits', () => ({ buyCreditPack: jest.fn() }))
jest.mock('@/lib/nativeHaptics', () => ({ hapticSelection: jest.fn() }))
jest.mock('@/lib/back-intercept', () => ({ setBackInterceptor: jest.fn() }))
jest.mock('@/lib/supabase', () => ({
  db: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { generation_status: 'ready' } }) }),
      }),
    }),
  },
}))
// Pulls in getUserMedia / MediaRecorder; nothing here renders a Speaking item.
jest.mock('@/app/mobile/study/session/[id]/test/VoiceRecorder', () => ({
  VoiceRecorderButton: () => null,
  SpeakingTimer: () => null,
  primeMicStream: jest.fn(),
  releaseMicStream: jest.fn(),
  getPrimedMicStream: () => null,
}))

import { TestSession } from '../TestSession'

const SESSION = 'sess-pause-1'

const TEST_PAYLOAD = {
  title: 'Reading practice',
  timeLimitMinutes: 35,
  section: 'reading',
  family: 'toefl',
  questions: [
    {
      prompt: 'What is the capital of France?',
      type: 'multiple_choice',
      choices: ['Paris', 'Lyon', 'Nice', 'Brest'],
      correct_answer: 'Paris',
      difficulty: 'easy',
      explanation: 'It is Paris.',
    },
    {
      prompt: 'What is 2 + 2?',
      type: 'multiple_choice',
      choices: ['3', '4', '5', '6'],
      correct_answer: '4',
      difficulty: 'easy',
      explanation: 'Four.',
    },
  ],
}

/** One-shot reader over a single NDJSON `result` line. */
const streamOf = (obj: unknown) => {
  let sent = false
  return {
    getReader: () => ({
      read: async () => {
        if (sent) return { value: undefined, done: true }
        sent = true
        return { value: new NodeTextEncoder().encode(JSON.stringify(obj) + '\n'), done: false }
      },
    }),
  }
}

let submitCalls: string[] = []
let clock = 1_700_000_000_000

beforeEach(() => {
  mockNative = true
  mockPlatform = 'ios'
  for (const k of Object.keys(listeners)) delete listeners[k]
  localStorage.clear()
  submitCalls = []
  clock = 1_700_000_000_000
  jest.spyOn(Date, 'now').mockImplementation(() => clock)
  global.fetch = jest.fn(async (url: RequestInfo | URL) => {
    const u = String(url)
    if (u.includes('/api/study/test/generate')) {
      return { ok: true, status: 200, body: streamOf({ type: 'result', test: TEST_PAYLOAD }) } as unknown as Response
    }
    if (u.includes('/api/study/test/submit')) {
      submitCalls.push(u)
      return {
        ok: true, status: 200,
        json: async () => ({ totalQuestions: 2, correctCount: 0, scorePercent: 0, verdicts: [] }),
      } as unknown as Response
    }
    return { ok: true, status: 200, json: async () => ({}) } as unknown as Response
  }) as unknown as typeof fetch
})
afterEach(() => { jest.restoreAllMocks() })


let view: ReturnType<typeof render> | null = null
const openTest = async () => {
  view = render(<TestSession sessionId={SESSION} language="en" />)
  await waitFor(() => expect(screen.getByText('What is the capital of France?')).toBeInTheDocument())
}
const closeTest = () => { view?.unmount(); view = null }
const clockText = () => screen.getByText(/^\d+:\d{2}$/).textContent
/** Let the 1s tick run (real timers; Date.now is the mocked `clock`). */
const tick = async () => { await act(async () => { await new Promise(r => setTimeout(r, 1100)) }) }
const pausedDialog = () => screen.queryByRole('dialog', { name: 'Test paused' })
let visibility: DocumentVisibilityState = 'visible'
beforeEach(() => {
  mockNative = false
  mockPlatform = 'web'
  visibility = 'visible'
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
})

describe('TestSession — pause survives closing and reopening (web)', () => {
  it('paused -> close -> reopen 8 hours later: still paused, same time left', async () => {
    await openTest()
    clock += 15 * 60_000          // 15 minutes into a 35-minute test
    await tick()
    expect(clockText()).toBe('20:00')

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(await screen.findByRole('dialog', { name: 'Test paused' })).toBeInTheDocument()
    await tick()
    closeTest()                   // Safari discards the tab overnight

    clock += 8 * 3600_000
    await openTest()              // tab reloads next day
    expect(await screen.findByRole('dialog', { name: 'Test paused' })).toBeInTheDocument()
    expect(clockText()).toBe('20:00')

    // Ten minutes pass before the student looks at it — the reported loss.
    clock += 10 * 60_000
    await tick()
    expect(clockText()).toBe('20:00')

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    await waitFor(() => expect(pausedDialog()).toBeNull())
    clock += 60_000
    await tick()
    expect(clockText()).toBe('19:00')
    expect(submitCalls).toHaveLength(0)
  })

  it('paused -> quick refresh: still paused (the stored pause, not the away rule, holds it)', async () => {
    await openTest()
    clock += 15 * 60_000
    await tick()
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    await screen.findByRole('dialog', { name: 'Test paused' })
    await tick()                  // heartbeat stays fresh while paused
    closeTest()

    clock += 3_000                // inside the refresh window
    await openTest()
    expect(await screen.findByRole('dialog', { name: 'Test paused' })).toBeInTheDocument()
    clock += 10 * 60_000
    await tick()
    expect(clockText()).toBe('20:00')
  })

  it('a page that reloads HIDDEN does not run the clock until it is seen', async () => {
    await openTest()
    clock += 15 * 60_000
    await tick()
    closeTest()

    // Quick reload (inside the refresh window) but the page comes up in
    // the background and sits there for ten minutes.
    clock += 5_000
    visibility = 'hidden'
    await openTest()
    clock += 10 * 60_000
    await tick()
    visibility = 'visible'
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
    await tick()
    expect(clockText()).toBe('20:00')
  })

  it('an unpaused test reopened after being closed comes back paused, no time charged', async () => {
    await openTest()
    clock += 15 * 60_000
    await tick()
    closeTest()                   // closed without pressing Pause

    clock += 3600_000
    await openTest()
    expect(await screen.findByRole('dialog', { name: 'Test paused' })).toBeInTheDocument()
    clock += 5 * 60_000
    await tick()
    expect(clockText()).toBe('20:00')
  })

  it('a quick refresh of a running, visible test keeps running (no overlay)', async () => {
    await openTest()
    clock += 15 * 60_000
    await tick()
    closeTest()

    clock += 3_000
    await openTest()
    expect(pausedDialog()).toBeNull()
    clock += 60_000
    await tick()
    expect(clockText()).toBe('19:00')
  })

  it('pausing from the paused overlay path and resuming clears the stored pause', async () => {
    await openTest()
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    await screen.findByRole('dialog', { name: 'Test paused' })
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    await waitFor(() => expect(pausedDialog()).toBeNull())
    await tick()
    closeTest()
    clock += 3_000
    await openTest()
    expect(pausedDialog()).toBeNull()
  })
})
