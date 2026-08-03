/**
 * Backgrounding the app must PAUSE a timed test — never end it.
 *
 * The hook-level suite (`test/__tests__/useAppExitGuard.test.tsx`) is
 * green while a student loses a real test, because it stops at the
 * hook's callback: it asserts the callback fires, and asserts nothing
 * about what TestSession then DOES with it. What it did was set
 * `endedByAppExit`, which ran the submit path and wrote
 * status='completed', ended_reason='app_exited' — two such rows exist in
 * production, both scoring 0/20 on a test the student had barely
 * started.
 *
 * So this suite renders the real TestSession and attacks the thing the
 * student actually experiences: emit the platform's background/foreground
 * lifecycle events mid-test and assert that /api/study/test/submit is
 * never called and the test is still there when they come back.
 */
import { fireEvent, render, screen, act, waitFor } from '@testing-library/react'
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'util'
import { exitMarkerKey } from '@/lib/study/test-exit-guard'

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

const SESSION = 'sess-bg-1'

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

const emit = async (name: string, arg?: unknown) => {
  await act(async () => {
    for (const cb of listeners[name] ?? []) cb(arg)
  })
}

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

const renderLiveTest = async () => {
  render(<TestSession sessionId={SESSION} language="en" />)
  await waitFor(() => expect(screen.getByText('What is the capital of France?')).toBeInTheDocument())
}

describe('TestSession — the app goes to the background mid-test', () => {
  it('does not submit the test when the student returns after a long absence (iOS)', async () => {
    await renderLiveTest()

    await emit('pause')            // iOS didEnterBackground
    clock += 60_000                // a full minute in another app
    await emit('resume')

    expect(submitCalls).toHaveLength(0)
  })

  it('leaves the student on the test, paused, rather than on an "ended" screen', async () => {
    await renderLiveTest()

    await emit('pause')
    clock += 60_000
    await emit('resume')

    // Still the test, and explicitly paused.
    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument()
    expect(await screen.findByRole('dialog', { name: 'Test paused' })).toBeInTheDocument()
  })

  it('does not submit on the next launch when the OS killed the app while backgrounded (Android)', async () => {
    mockPlatform = 'android'
    // Marker left by the run that was killed.
    localStorage.setItem(exitMarkerKey(SESSION), String(clock - 60_000))

    await renderLiveTest()

    expect(await screen.findByRole('dialog', { name: 'Test paused' })).toBeInTheDocument()
    expect(submitCalls).toHaveLength(0)
  })

  it('a blip shorter than the grace window neither pauses nor stops the clock', async () => {
    await renderLiveTest()
    const clockText = () => screen.getByText(/^\d+:\d{2}$/).textContent

    await emit('pause')
    clock += 1_000              // an app-switcher peek
    await emit('resume')

    expect(screen.queryByRole('dialog', { name: 'Test paused' })).toBeNull()
    // And the clock is RUNNING again. The freeze happens on the way out,
    // before anyone knows how long the trip will be; if nothing undoes it
    // for a blip, a peek at the app switcher quietly hands out an untimed
    // test. (The chip re-renders on its own 1s tick.)
    clock += 120_000
    await waitFor(() => expect(clockText()).toBe('33:00'), { timeout: 3000 })
  })

  it('survives the whole reason a student presses Pause: pause, leave, come back, resume', async () => {
    // The reported second symptom — "it also ends the test when I pause
    // and resume". Pausing is what a student does BEFORE leaving, and
    // the guard used to ignore the pause entirely: leaving after
    // pressing Pause ended the test exactly as leaving without it did.
    await renderLiveTest()
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(await screen.findByRole('dialog', { name: 'Test paused' })).toBeInTheDocument()

    await emit('pause')
    clock += 120_000
    await emit('resume')

    expect(submitCalls).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Test paused' })).toBeNull())
    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument()
    expect(submitCalls).toHaveLength(0)
  })

  it('keeps the clock frozen when the WebView reports "visible" in the same tick as the pause', async () => {
    // Coming back fires two things at once: Capacitor's `resume` and the
    // WebView's own visibilitychange. The visibility handler decides
    // whether to restart the clock, and it is re-registered whenever
    // `paused` changes — so within this tick it still sees the value from
    // BEFORE the guard paused, and starts the clock under the overlay.
    await renderLiveTest()
    const clockText = () => screen.getByText(/^\d+:\d{2}$/).textContent

    await emit('pause')
    clock += 60_000
    await act(async () => {
      for (const cb of listeners['resume'] ?? []) cb(undefined)
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(await screen.findByRole('dialog', { name: 'Test paused' })).toBeInTheDocument()
    const frozenAt = clockText()
    clock += 120_000
    // Give the 1s chip tick a chance to render the wrong number.
    await act(async () => { await new Promise(r => setTimeout(r, 1200)) })
    expect(clockText()).toBe(frozenAt)
  })

  it('freezes the clock while the app is away — the student is not charged the time', async () => {
    await renderLiveTest()
    // The countdown chip, e.g. "35:00".
    const clockText = () => screen.getByText(/^\d+:\d{2}$/).textContent
    const shownAtStart = clockText()

    await emit('pause')
    clock += 120_000
    await emit('resume')

    expect(clockText()).toBe(shownAtStart)
  })
})
