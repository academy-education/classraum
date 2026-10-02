/**
 * Practice "Explain more" is saved against the attempt, and gets the passage.
 *
 * Until 2026-10-02 the grade route saved the study_attempt but never returned
 * its id, so PracticeSession had nothing to pass as attemptId and every
 * explanation generated in practice was shown once and lost. It also sent the
 * passage folded into `prompt`, where the explain route's 4000-char clamp cut
 * the question off a long passage.
 */
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('@/lib/auth-headers', () => ({ authHeaders: async () => ({}) }))
jest.mock('@/lib/nativeHaptics', () => ({ hapticSelection: jest.fn() }))
const mockT = (k: string) => k
jest.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ t: mockT }) }))
// One stable router: fetchQuestions depends on it, so a fresh object per
// render would re-run the load effect forever.
const mockRouter = { replace: jest.fn(), push: jest.fn() }
jest.mock('next/navigation', () => ({ useRouter: () => mockRouter }))
jest.mock('@/lib/supabase', () => ({ db: { from: jest.fn(), auth: { getUser: jest.fn() } } }))
jest.mock('@/app/mobile/study/_shared/ReportQuestion', () => ({ ReportQuestion: () => null }))
jest.mock('@/app/mobile/study/_shared/PathMascot', () => ({ PathMascot: () => null }))
jest.mock('@/app/mobile/study/_shared/MascotLoader', () => ({
  MascotLoader: () => null,
  useMascotGate: () => false,
}))

import { PracticeSession } from '../PracticeSession'

const PASSAGE = 'The committee met twice. '.repeat(200).trim() // ~5,000 chars
const STEM = 'Which choice best states the main purpose of the text?'
const QUESTION = {
  prompt: `${PASSAGE}\n\n${STEM}`,
  type: 'multiple_choice',
  choices: ['To argue', 'To describe', 'To refute', 'To predict'],
  correct_answer: 'To describe',
  difficulty: 'medium',
  explanation: 'It describes.',
  passage: PASSAGE,
}

type Call = { url: string; body: Record<string, unknown> }

function mockFetch(gradeJson: Record<string, unknown>) {
  const calls: Call[] = []
  global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    calls.push({ url, body })
    const json =
      url.includes('/practice/generate') ? { questions: [QUESTION], source: 'bank' } :
      url.includes('/practice/grade') ? gradeJson :
      url.includes('/study/explain') ? { text: 'B is right because...' } : {}
    return { ok: true, status: 200, json: async () => json } as Response
  }) as unknown as typeof fetch
  return calls
}

async function answerAndExplain() {
  render(<PracticeSession sessionId="sess-1" language="en" />)
  // Past the 3.2s mascot hold.
  await act(async () => { await jest.advanceTimersByTimeAsync(4000) })
  fireEvent.click(screen.getByRole('button', { name: /To argue/ }))
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'study.practice.submit' })) })
  await act(async () => { await jest.advanceTimersByTimeAsync(10) })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Explain more/ })) })
  await act(async () => { await jest.advanceTimersByTimeAsync(10) })
}

describe('PracticeSession -> ExplainMore', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { jest.useRealTimers() })

  it('sends the attempt id from the grade response, so the explanation is saved', async () => {
    const calls = mockFetch({ isCorrect: false, aiExplanation: 'It describes.', xpAwarded: 0, attemptId: 'att-123' })
    await answerAndExplain()
    const explain = calls.find(c => c.url.includes('/study/explain'))
    expect(explain).toBeDefined()
    expect(explain!.body.attemptId).toBe('att-123')
    expect(screen.getByText('B is right because...')).toBeInTheDocument()
  })

  it('sends the passage separately and the bare question as the prompt', async () => {
    const calls = mockFetch({ isCorrect: false, aiExplanation: 'x', xpAwarded: 0, attemptId: 'att-1' })
    await answerAndExplain()
    const explain = calls.find(c => c.url.includes('/study/explain'))!
    expect(explain.body.prompt).toBe(STEM)
    expect(explain.body.passage).toBe(PASSAGE)
  })

  it('sends no attempt id when the grade route recorded none', async () => {
    const calls = mockFetch({ isCorrect: false, aiExplanation: 'x', xpAwarded: 0, attemptId: null })
    await answerAndExplain()
    const explain = calls.find(c => c.url.includes('/study/explain'))!
    expect(explain.body.attemptId).toBeUndefined()
  })
})
