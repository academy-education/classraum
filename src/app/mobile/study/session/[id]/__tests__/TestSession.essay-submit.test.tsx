/**
 * @jest-environment jsdom
 *
 * AN SSAT WRITING SAMPLE CAN BE WRITTEN AND SUBMITTED, end to end on the
 * client, with the payload production actually served.
 *
 * Why: on 2026-10-11 a real student was locked out of SSAT Writing after
 * five sessions, none of which had ever saved an essay — and across ALL
 * students no SSAT/ISEE essay session had a single study_attempts row. That
 * reads like "the submit has never worked". The server logs said otherwise
 * (no submit request was ever made for those sessions), and this test is the
 * client half of the proof: the real TestSession, fed the real cached
 * payload of the 2026-10-11 session, renders a textarea, takes an essay, and
 * POSTs it to /api/study/test/submit as answers[0]. The server half is
 * api/study/__tests__/essay-submit-served-payload.test.ts.
 *
 * Since 2026-10-27 the student picks a prompt first (the pick travels in the
 * answer, via essayChoice.ts), and the essay IS sent to grade-batch — once —
 * for practice feedback. It stays unscored; that half is pinned server-side.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'util'
import { SSAT_WRITING_SERVED_2026_10_11 } from '@/lib/study/__fixtures__/ssat-writing-served'
import { encodeEssayAnswer } from '@/lib/study/essayChoice'

if (typeof global.TextDecoder === 'undefined') (global as unknown as { TextDecoder: unknown }).TextDecoder = NodeTextDecoder
if (typeof global.TextEncoder === 'undefined') (global as unknown as { TextEncoder: unknown }).TextEncoder = NodeTextEncoder

jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' } }))
jest.mock('@capacitor/app', () => ({ App: { addListener: () => Promise.resolve({ remove: async () => {} }) } }))
jest.mock('next/navigation', () => {
  const router = { push: jest.fn(), replace: jest.fn(), prefetch: jest.fn(), back: jest.fn(), forward: jest.fn(), refresh: jest.fn() }
  return { useRouter: () => router, useSearchParams: () => new URLSearchParams(), usePathname: () => '/mobile/study' }
})
jest.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ t: (k: string) => k, language: 'en' }) }))
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'student-1' } }) }))
jest.mock('@/lib/auth-headers', () => ({ authHeaders: async () => ({ 'Content-Type': 'application/json' }) }))
jest.mock('@/lib/study/purchase-credits', () => ({ buyCreditPack: jest.fn() }))
jest.mock('@/lib/nativeHaptics', () => ({ hapticSelection: jest.fn(), hapticTap: jest.fn() }))
jest.mock('@/lib/back-intercept', () => ({ setBackInterceptor: jest.fn() }))
jest.mock('@/lib/supabase', () => ({
  db: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { generation_status: 'ready' } }) }) }) }) },
}))
jest.mock('@/app/mobile/study/session/[id]/test/VoiceRecorder', () => ({
  VoiceRecorderButton: () => null, SpeakingTimer: () => null,
  primeMicStream: jest.fn(), releaseMicStream: jest.fn(), getPrimedMicStream: () => null,
}))

import { TestSession } from '../TestSession'

const SESSION = '3b4024f8-0000-4000-8000-000000000000'
const ESSAY = 'A school should give places to anyone willing to work hard, because...'

const streamOf = (obj: unknown) => {
  let sent = false
  return { getReader: () => ({ read: async () => {
    if (sent) return { value: undefined, done: true }
    sent = true
    return { value: new NodeTextEncoder().encode(JSON.stringify(obj) + '\n'), done: false }
  } }) }
}

let calls: { url: string; body: string }[] = []

beforeEach(() => {
  localStorage.clear()
  calls = []
  jest.spyOn(console, 'error').mockImplementation(() => {})
  global.fetch = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url)
    calls.push({ url: u, body: String(init?.body ?? '') })
    if (u.includes('/api/study/test/generate')) {
      return { ok: true, status: 200, body: streamOf({ type: 'result', test: SSAT_WRITING_SERVED_2026_10_11 }) } as unknown as Response
    }
    if (u.includes('/api/study/test/submit')) {
      return { ok: true, status: 200, json: async () => ({
        success: true, totalQuestions: 0, correctCount: 0, scorePercent: 0, sat: null,
        verdicts: [{ index: 0, correct: false, correctAnswer: '', ungraded: true }],
      }) } as unknown as Response
    }
    return { ok: true, status: 200, json: async () => ({}) } as unknown as Response
  }) as unknown as typeof fetch
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
})
afterEach(() => { jest.restoreAllMocks() })

it('the served SSAT Writing payload takes an essay and submits it as answers[0]', async () => {
  const { container } = render(<TestSession sessionId={SESSION} language="en" />)
  await waitFor(() => expect(screen.getByText(/Choose ONE of the two prompts/)).toBeInTheDocument())

  fireEvent.click(screen.getByRole('radio', { name: 'A · Essay' }))
  const textarea = container.querySelector('textarea')
  expect(textarea).not.toBeNull()
  fireEvent.change(textarea!, { target: { value: ESSAY } })
  // Saved locally as typed — the only copy until submit succeeds.
  await waitFor(() => expect(localStorage.getItem(`study:test:${SESSION}:answers`)).toContain('willing to work hard'))

  // One question, answered: the bar reads Submit, not "Submit (1 unanswered)".
  fireEvent.click(screen.getByRole('button', { name: 'study.test.submit' }))
  fireEvent.click(await screen.findByRole('button', { name: 'study.test.submitConfirm.confirm' }))

  await waitFor(() => expect(calls.some(c => c.url.includes('/api/study/test/submit'))).toBe(true))
  const sent = JSON.parse(calls.find(c => c.url.includes('/api/study/test/submit'))!.body) as {
    sessionId: string; answers: (string | null)[]; questions: { type: string; bankItemId: string }[]
  }
  expect(sent.sessionId).toBe(SESSION)
  expect(sent.answers).toEqual([encodeEssayAnswer('Essay', ESSAY)])
  expect(sent.questions[0]).toMatchObject({ type: 'essay_choice', bankItemId: '1c891f4a-d678-4da3-9573-8231c6b00fd6' })

  // Cleared only on a successful submit.
  await waitFor(() => expect(localStorage.getItem(`study:test:${SESSION}:answers`)).toBeNull())
  // Practice feedback: the one whole-test batch, exactly once (one writer).
  await waitFor(() => expect(calls.filter(c => c.url.includes('/api/study/response/grade-batch'))).toHaveLength(1))
  expect(calls.some(c => /\/api\/study\/response\/grade(\?|$)/.test(c.url))).toBe(false)
})
