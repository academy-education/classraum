/**
 * Module 2 already in the payload, but the client never stored the route
 * response (tab discarded / network dropped mid-call, then a reload).
 *
 * Two failures, both found 2026-10-04 by reading the code:
 *  - Module 1 timing out called the route AGAIN; the server replays the
 *    same Module 2 and the client APPENDED it, doubling it. /submit then
 *    refuses the test forever ("submitted question count does not match").
 *  - With no Module 2 start mark, Module 2 was timed from the start of the
 *    whole test, so entering it late showed it nearly spent and could
 *    auto-submit the test on the spot.
 * Harness copied from TestSession.pause-persist.
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

const SESSION = 'sess-m2-recover-1'

// What the cache serves after the route call SUCCEEDED on the server but
// its response never reached the client: Module 1 AND Module 2.
const TEST_PAYLOAD = {
  title: 'SAT Math', timeLimitMinutes: 20, perModuleMinutes: 10, section: 'Math', family: 'sat',
  adaptive: true, moduleBreakIdx: 2,
  questions: [
    { prompt: 'M1 question one', type: 'multiple_choice', choices: ['A', 'B', 'C', 'D'], correct_answer: 'A', difficulty: 'easy', explanation: '' },
    { prompt: 'M1 question two', type: 'multiple_choice', choices: ['A', 'B', 'C', 'D'], correct_answer: 'B', difficulty: 'easy', explanation: '' },
    { prompt: 'M2 question one', type: 'multiple_choice', choices: ['A', 'B', 'C', 'D'], correct_answer: 'C', difficulty: 'easy', explanation: '' },
    { prompt: 'M2 question two', type: 'multiple_choice', choices: ['A', 'B', 'C', 'D'], correct_answer: 'D', difficulty: 'easy', explanation: '' },
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

let routeCalls = 0
let submitBodies: string[] = []
let clock = 1_700_000_000_000

beforeEach(() => {
  localStorage.clear()
  routeCalls = 0
  submitBodies = []
  clock = 1_700_000_000_000
  jest.spyOn(Date, 'now').mockImplementation(() => clock)
  global.fetch = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url)
    if (u.includes('/api/study/test/generate')) {
      return { ok: true, status: 200, body: streamOf({ type: 'result', test: TEST_PAYLOAD }) } as unknown as Response
    }
    if (u.includes('/api/study/test/route')) {
      routeCalls++
      // The server's idempotent replay: the same Module 2 it already cached.
      return { ok: true, status: 200, json: async () => ({
        route: 'hard', module1Correct: 1, module1Total: 2, alreadyRouted: true,
        module2Questions: TEST_PAYLOAD.questions.slice(2),
      }) } as unknown as Response
    }
    if (u.includes('/api/study/test/submit')) {
      submitBodies.push(String(init?.body ?? ''))
      return { ok: true, status: 200, json: async () => ({ totalQuestions: 4, correctCount: 0, scorePercent: 0, verdicts: [] }) } as unknown as Response
    }
    return { ok: true, status: 200, json: async () => ({}) } as unknown as Response
  }) as unknown as typeof fetch
  mockNative = false
  mockPlatform = 'web'
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
})
afterEach(() => { jest.restoreAllMocks() })

const openTest = async () => {
  render(<TestSession sessionId={SESSION} language="en" />)
  await waitFor(() => expect(screen.getByText('M1 question one')).toBeInTheDocument())
}
const tick = async () => { await act(async () => { await new Promise(r => setTimeout(r, 1100)) }) }
const clockText = () => screen.getByText(/^\d+:\d{2}$/).textContent

describe('TestSession — Module 2 already served, route response lost', () => {
  it('Module 1 timing out enters the loaded Module 2 instead of appending a second copy', async () => {
    await openTest()
    clock += 11 * 60_000          // Module 1's 10 minutes run out
    await tick()
    await waitFor(() => expect(screen.getByText('M2 question one')).toBeInTheDocument())
    expect(routeCalls).toBe(0)
    await tick()
    expect(clockText()).toBe('10:00')   // Module 2 on its own full budget

    clock += 11 * 60_000          // Module 2 runs out -> one submit
    await tick()
    await waitFor(() => expect(submitBodies).toHaveLength(1))
    expect((JSON.parse(submitBodies[0]!) as { questions: unknown[] }).questions).toHaveLength(4)
  })

  it('entering Module 2 with no start mark does not charge Module 1 time to it', async () => {
    await openTest()
    clock += 9 * 60_000
    await tick()
    fireEvent.click(screen.getByRole('button', { name: 'study.test.next' }))
    fireEvent.click(screen.getByRole('button', { name: 'study.test.next' }))
    await waitFor(() => expect(screen.getByText('M2 question one')).toBeInTheDocument())
    await tick()
    await tick()
    expect(clockText()).toBe('10:00')   // was 1:00 — nine minutes of Module 1 charged to Module 2
    expect(submitBodies).toHaveLength(0)
  })
})
