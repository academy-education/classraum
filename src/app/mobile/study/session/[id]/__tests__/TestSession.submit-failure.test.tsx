/**
 * A failed submit must never lose work, never show server internals, and
 * must always leave the student a way to finish.
 *
 * 2026-10-04: every SSAT/ISEE essay submit 400'd and the banner printed the
 * raw zod dump ("bad payload — invalid_enum_value ... essay_choice"). And
 * when the submit that failed was the TIMER's auto-submit, the student was
 * dropped back on a 0:00 test whose one-shot auto-submit was spent, with
 * only a Dismiss button. Harness copied from TestSession.pause-persist.
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

const SESSION = 'sess-submit-fail-1'

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

let submitBodies: string[] = []
let submitResponses: Array<{ status: number; json: unknown } | 'throw'> = []
let clock = 1_700_000_000_000
const OK = { status: 200, json: { totalQuestions: 2, correctCount: 1, scorePercent: 50, verdicts: [] } }

beforeEach(() => {
  localStorage.clear()
  submitBodies = []
  submitResponses = []
  clock = 1_700_000_000_000
  jest.spyOn(Date, 'now').mockImplementation(() => clock)
  jest.spyOn(console, 'error').mockImplementation(() => {})
  global.fetch = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url)
    if (u.includes('/api/study/test/generate')) {
      return { ok: true, status: 200, body: streamOf({ type: 'result', test: TEST_PAYLOAD }) } as unknown as Response
    }
    if (u.includes('/api/study/test/submit')) {
      submitBodies.push(String(init?.body ?? ''))
      const next = submitResponses.shift() ?? OK
      if (next === 'throw') throw new TypeError('Failed to fetch')
      return { ok: next.status < 400, status: next.status, json: async () => next.json } as unknown as Response
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
  await waitFor(() => expect(screen.getByText('What is the capital of France?')).toBeInTheDocument())
}
const tick = async () => { await act(async () => { await new Promise(r => setTimeout(r, 1100)) }) }
const storedAnswers = () => localStorage.getItem(`study:test:${SESSION}:answers`)
const answersSent = (i: number) => (JSON.parse(submitBodies[i]!) as { answers: (string | null)[] }).answers
const BAD_PAYLOAD = {
  status: 400,
  json: { error: 'bad payload', details: '[{"received":"essay_choice","code":"invalid_enum_value"}]' },
}

describe('TestSession — submit failure', () => {
  it('timer-expiry submit rejected: human message, answers kept, Try again submits them', async () => {
    await openTest()
    fireEvent.click(screen.getByText('Paris'))
    await waitFor(() => expect(storedAnswers()).toContain('Paris'))

    submitResponses = [BAD_PAYLOAD]
    clock += 36 * 60_000          // past the 35-minute limit
    await tick()
    await screen.findByText('study.test.submitError.title')

    // No server internals on screen.
    expect(screen.queryByText(/bad payload|invalid_enum_value|essay_choice|HTTP 400/)).toBeNull()
    expect(screen.getByText(/Your answers are saved/)).toBeInTheDocument()
    // Work survives the failure.
    expect(storedAnswers()).toContain('Paris')
    expect(submitBodies).toHaveLength(1)

    // The auto-submit is one-shot; the banner is the way forward.
    fireEvent.click(screen.getByRole('button', { name: 'study.test.submitError.retry' }))
    await waitFor(() => expect(submitBodies).toHaveLength(2))
    expect(answersSent(1)).toEqual(['Paris', null])
    await waitFor(() => expect(screen.queryByText('study.test.submitError.title')).toBeNull())
    await waitFor(() => expect(storedAnswers()).toBeNull())   // cleared only on success
  })

  it('server down for every attempt: retried, then human message and Try again', async () => {
    await openTest()
    fireEvent.click(screen.getByText('Paris'))
    submitResponses = [
      { status: 503, json: { error: 'persist failed' } },
      { status: 503, json: { error: 'persist failed' } },
      'throw',
    ]
    clock += 36 * 60_000
    await tick()
    await screen.findByText('study.test.submitError.title', undefined, { timeout: 8000 })
    expect(submitBodies).toHaveLength(3)
    expect(screen.queryByText(/persist failed|HTTP 5/)).toBeNull()
    expect(storedAnswers()).toContain('Paris')
    expect(screen.getByRole('button', { name: 'study.test.submitError.retry' })).toBeInTheDocument()
  }, 15000)

  it('a 401 tells the student to sign in again, not a status code', async () => {
    await openTest()
    submitResponses = [{ status: 401, json: { error: 'unauthorized' } }]
    clock += 36 * 60_000
    await tick()
    await screen.findByText('study.test.submitError.title')
    expect(screen.getByText(/sign-in has expired/)).toBeInTheDocument()
    expect(screen.queryByText(/unauthorized|401/)).toBeNull()
  })
})
