/**
 * TOEFL Writing per-section timers — the HARD-ADVANCE contract, tested
 * through the real TestSession (the pure split/marking math lives in
 * lib/study/__tests__/writing-section-timing.test.ts; this suite covers
 * the wiring: countdown source, expiry → advance, expiry → submit,
 * one-way boundaries, resume).
 *
 * What a student must experience:
 *   - the header countdown is the CURRENT task block's budget (6:00 for
 *     Build-a-Sentence), not the whole-test 23:00;
 *   - when a block's clock hits zero the test advances to the next task
 *     by itself, shows a brief notice, and the new block starts on its
 *     own full budget;
 *   - unanswered items in the expired block submit as nulls (the
 *     representation /api/study/test/submit grades as blank);
 *   - the last block's expiry submits the whole test exactly once;
 *   - a mid-test reload restores the CURRENT block's remaining time.
 *
 * Revert-check (verified by hand when the suite landed): commenting out
 * the writingSections branch of the expiry effect in TestSession fails
 * the hard-advance and last-block-submit tests; removing the
 * per-section remainingMs branch fails the countdown test; removing the
 * wsStartMs restore fails the resume test.
 */
import { fireEvent, render, screen, act, waitFor } from '@testing-library/react'
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'util'

if (typeof global.TextDecoder === 'undefined') {
  ;(global as unknown as { TextDecoder: unknown }).TextDecoder = NodeTextDecoder
}
if (typeof global.TextEncoder === 'undefined') {
  ;(global as unknown as { TextEncoder: unknown }).TextEncoder = NodeTextEncoder
}

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
}))
jest.mock('@capacitor/app', () => ({
  App: { addListener: () => Promise.resolve({ remove: async () => {} }) },
}))
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
jest.mock('@/app/mobile/study/session/[id]/test/VoiceRecorder', () => ({
  VoiceRecorderButton: () => null,
  SpeakingTimer: () => null,
  primeMicStream: jest.fn(),
  releaseMicStream: jest.fn(),
  getPrimedMicStream: () => null,
}))

import { TestSession } from '../TestSession'

const SESSION = 'sess-ws-1'

/** 2 Build-a-Sentence + 1 Email + 1 Discussion — same task-block shape
 *  as the shipped 10+1+1 form, small enough to walk in a test. */
const WRITING_PAYLOAD = {
  title: 'TOEFL iBT — Writing',
  timeLimitMinutes: 23,
  section: 'Writing',
  family: 'toefl',
  questions: [
    {
      prompt: 'Arrange the words (one).',
      type: 'arrange_words',
      choices: ['the cat', 'sat', 'here'],
      correct_answer: 'the cat | sat | here',
      difficulty: 'easy',
      explanation: 'Word order.',
    },
    {
      prompt: 'Arrange the words (two).',
      type: 'arrange_words',
      choices: ['she', 'left', 'early'],
      correct_answer: 'she | left | early',
      difficulty: 'easy',
      explanation: 'Word order.',
    },
    {
      prompt: '[Email — Professor] Write your reply.',
      type: 'writing_email',
      passage: 'You received an email from your professor about a guest lecture.',
      choices: [],
      correct_answer: '',
      difficulty: 'medium',
      explanation: 'Rubric-graded.',
    },
    {
      prompt: '[Academic Discussion] Write your contribution.',
      type: 'writing_discussion',
      passage: 'PROFESSOR: Should cities ban cars downtown?',
      choices: [],
      correct_answer: '',
      difficulty: 'medium',
      explanation: 'Rubric-graded.',
    },
  ],
}

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
let clock = 1_700_000_000_000

beforeEach(() => {
  localStorage.clear()
  submitBodies = []
  clock = 1_700_000_000_000
  jest.spyOn(Date, 'now').mockImplementation(() => clock)
  global.fetch = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url)
    if (u.includes('/api/study/test/generate')) {
      return { ok: true, status: 200, body: streamOf({ type: 'result', test: WRITING_PAYLOAD }) } as unknown as Response
    }
    if (u.includes('/api/study/test/submit')) {
      submitBodies.push(String(init?.body ?? ''))
      return {
        ok: true, status: 200,
        json: async () => ({ totalQuestions: 2, correctCount: 0, scorePercent: 0, verdicts: [] }),
      } as unknown as Response
    }
    return { ok: true, status: 200, json: async () => ({}) } as unknown as Response
  }) as unknown as typeof fetch
})
afterEach(() => { jest.restoreAllMocks() })

const clockText = () => screen.getByText(/^\d+:\d{2}$/).textContent

const renderWritingTest = async () => {
  render(<TestSession sessionId={SESSION} language="en" />)
  await waitFor(() => expect(screen.getByText('Arrange the words (one).')).toBeInTheDocument())
}

/** Advance the mocked wall clock and let the 1s UI tick re-render. */
const advanceClock = async (ms: number) => {
  clock += ms
  await act(async () => { await new Promise(r => setTimeout(r, 1100)) })
}

describe('TOEFL Writing per-section timers', () => {
  it('counts down the CURRENT task block (6:00), not the whole test (23:00)', async () => {
    await renderWritingTest()
    expect(clockText()).toBe('6:00')
    expect(screen.getByText('Task 1 of 3')).toBeInTheDocument()
  })

  it('hard-advances to the Email task when the Build-a-Sentence clock expires, with a notice and a fresh 7:00', async () => {
    await renderWritingTest()

    await advanceClock(6 * 60_000)

    // Advanced to the email task without any tap…
    await waitFor(() => expect(screen.getByText(/Write your reply/)).toBeInTheDocument())
    // …with the non-blocking notice…
    expect(screen.getByText('study.test.sectionTimeUp')).toBeInTheDocument()
    // …the next block's own full budget…
    expect(clockText()).toBe('7:00')
    expect(screen.getByText('Task 2 of 3')).toBeInTheDocument()
    // …and NO submit (only the last block submits).
    expect(submitBodies).toHaveLength(0)
  })

  it('expiring the last block submits once, with unanswered items as nulls', async () => {
    await renderWritingTest()

    await advanceClock(6 * 60_000)  // BaS expires → email
    await waitFor(() => expect(screen.getByText(/Write your reply/)).toBeInTheDocument())
    await advanceClock(7 * 60_000)  // email expires → discussion
    await waitFor(() => expect(screen.getByText(/ban cars downtown/)).toBeInTheDocument())
    expect(clockText()).toBe('10:00')
    await advanceClock(10 * 60_000) // discussion expires → submit

    await waitFor(() => expect(submitBodies).toHaveLength(1))
    const body = JSON.parse(submitBodies[0]!) as { answers: (string | null)[] }
    // Nothing was answered: every slot must round-trip as an explicit
    // null — the representation submit grades as blank.
    expect(body.answers).toEqual([null, null, null, null])
    // And it stays submitted-once even as ticks continue.
    await advanceClock(2_000)
    expect(submitBodies).toHaveLength(1)
  })

  it('the boundary is one-way: after the hard advance, Prev cannot re-enter the expired block', async () => {
    await renderWritingTest()
    await advanceClock(6 * 60_000)
    await waitFor(() => expect(screen.getByText(/Write your reply/)).toBeInTheDocument())

    // Prev is floored at the email block's first question — disabled.
    expect(screen.getByRole('button', { name: 'study.test.previous' })).toBeDisabled()
  })

  it('answers given before the expiry survive the hard advance', async () => {
    await renderWritingTest()
    // Answer question 1 by tapping its chips in order.
    fireEvent.click(screen.getByRole('button', { name: 'the cat' }))
    fireEvent.click(screen.getByRole('button', { name: 'sat' }))
    fireEvent.click(screen.getByRole('button', { name: 'here' }))

    await advanceClock(6 * 60_000)
    await waitFor(() => expect(screen.getByText(/Write your reply/)).toBeInTheDocument())
    await advanceClock(7 * 60_000)
    await waitFor(() => expect(screen.getByText(/ban cars downtown/)).toBeInTheDocument())
    await advanceClock(10 * 60_000)

    await waitFor(() => expect(submitBodies).toHaveLength(1))
    const body = JSON.parse(submitBodies[0]!) as { answers: (string | null)[] }
    expect(body.answers).toEqual(['the cat | sat | here', null, null, null])
  })

  it('manual advance out of a block with blanks asks first (one-way boundary confirm)', async () => {
    await renderWritingTest()
    // Move to the last BaS question, then hit Next with both unanswered.
    fireEvent.click(screen.getByRole('button', { name: /study.test.next/ }))
    await waitFor(() => expect(screen.getByText('Arrange the words (two).')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /study.test.next/ }))

    // Confirm dialog, still on the BaS block.
    expect(await screen.findByText('Move to the next task?')).toBeInTheDocument()
    expect(screen.getByText('Arrange the words (two).')).toBeInTheDocument()

    // Confirming advances into the email block.
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(screen.getByText(/Write your reply/)).toBeInTheDocument())
    expect(clockText()).toBe('7:00')
  })

  it('a reload mid-block restores the block\'s remaining time, not a fresh budget', async () => {
    // First mount: burn 2 minutes of the BaS block, then unmount
    // (persisting elapsedMs on the 1s tick, exactly like a real refresh).
    const first = render(<TestSession sessionId={SESSION} language="en" />)
    await waitFor(() => expect(screen.getByText('Arrange the words (one).')).toBeInTheDocument())
    await advanceClock(2 * 60_000)
    await waitFor(() => expect(clockText()).toBe('4:00'))
    first.unmount()

    // Remount — same session id, storage intact.
    render(<TestSession sessionId={SESSION} language="en" />)
    await waitFor(() => expect(screen.getByText('Arrange the words (one).')).toBeInTheDocument())
    expect(clockText()).toBe('4:00')
  })

  it('a reload in a LATER block restores that block\'s clock from the persisted start mark', async () => {
    // Expire the BaS block (hard advance into email at elapsed 6:00),
    // burn 2 minutes of the email block, then reload. Without the
    // persisted wsStartMs the email clock would reset to 7:00 — or
    // worse, be measured from elapsed 0 and read as already expired.
    const first = render(<TestSession sessionId={SESSION} language="en" />)
    await waitFor(() => expect(screen.getByText('Arrange the words (one).')).toBeInTheDocument())
    await advanceClock(6 * 60_000)
    await waitFor(() => expect(screen.getByText(/Write your reply/)).toBeInTheDocument())
    await advanceClock(2 * 60_000)
    await waitFor(() => expect(clockText()).toBe('5:00'))
    first.unmount()

    render(<TestSession sessionId={SESSION} language="en" />)
    await waitFor(() => expect(screen.getByText(/Write your reply/)).toBeInTheDocument())
    expect(clockText()).toBe('5:00')
    expect(screen.getByText('Task 2 of 3')).toBeInTheDocument()
    // And no phantom submit from the reload.
    expect(submitBodies).toHaveLength(0)
  })
})
