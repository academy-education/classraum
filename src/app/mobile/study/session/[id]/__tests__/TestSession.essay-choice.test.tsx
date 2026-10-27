/**
 * @jest-environment jsdom
 *
 * SSAT Writing Sample: CHOOSE, THEN WRITE (2026-10-27).
 *
 * The served passage's two prompts render as option cards; there is no
 * textarea until one is picked; the pick shows that prompt above the
 * editor; changing the pick keeps the text; and the pick survives a reload
 * because it travels inside the saved answer (essayChoice.ts).
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'util'
import { SSAT_WRITING_SERVED_2026_10_11 } from '@/lib/study/__fixtures__/ssat-writing-served'
import { decodeEssayAnswer, encodeEssayAnswer } from '@/lib/study/essayChoice'

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
  jest.spyOn(console, 'error').mockImplementation(() => {})
  calls = []
  global.fetch = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url)
    calls.push({ url: u, body: String(init?.body ?? '') })
    if (u.includes('/api/study/test/submit')) {
      return { ok: true, status: 200, json: async () => ({
        success: true, totalQuestions: 0, correctCount: 0, scorePercent: 0, sat: null,
        verdicts: [{ index: 0, correct: false, correctAnswer: '', ungraded: true }],
      }) } as unknown as Response
    }
    if (u.includes('/api/study/test/generate')) {
      return { ok: true, status: 200, body: streamOf({ type: 'result', test: SSAT_WRITING_SERVED_2026_10_11 }) } as unknown as Response
    }
    return { ok: true, status: 200, json: async () => ({}) } as unknown as Response
  }) as unknown as typeof fetch
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
})
afterEach(() => { jest.restoreAllMocks() })

const STORY = 'The vending machine gave back more money than I had put in, and the next day it did it again.'
const ESSAY_HEAD = 'When a school team or club has more people'
const savedAnswer = () => {
  const raw = localStorage.getItem(`study:test:${SESSION}:answers`)
  return raw ? (JSON.parse(raw) as (string | null)[])[0] ?? null : null
}

it('no textarea until a prompt is picked; picking shows that prompt above the editor', async () => {
  const { container } = render(<TestSession sessionId={SESSION} language="en" />)
  await waitFor(() => expect(screen.getByText(/Choose ONE of the two prompts/)).toBeInTheDocument())

  // Both prompts as option cards, nothing to type into yet.
  const essay = screen.getByRole('radio', { name: 'A · Essay' })
  const story = screen.getByRole('radio', { name: 'B · Story Starter' })
  expect(essay).toHaveAttribute('aria-checked', 'false')
  expect(story.textContent).toContain(STORY)
  expect(container.querySelector('textarea')).toBeNull()
  // The old instruction to name the prompt inside the essay is gone.
  expect(screen.queryByText(/Name the prompt you chose/)).toBeNull()
  // Each prompt appears once (in its card), not again in a passage box.
  expect(screen.getAllByText((_, el) => el?.tagName === 'SPAN' && (el.textContent ?? '').startsWith(ESSAY_HEAD))).toHaveLength(1)

  fireEvent.click(story)
  const chosen = await screen.findByTestId('essay-chosen-prompt')
  expect(chosen.textContent).toContain('Story Starter')
  expect(chosen.textContent).toContain(STORY)
  expect(chosen.textContent).not.toContain(ESSAY_HEAD)
  const textarea = container.querySelector('textarea')
  expect(textarea).not.toBeNull()
  // A pick alone is stored (so it survives a reload) but is not an answer.
  await waitFor(() => expect(savedAnswer()).toBe(encodeEssayAnswer('Story Starter', '')))
  expect(screen.getByRole('button', { name: 'study.test.submitWithUnanswered' })).toBeInTheDocument()

  fireEvent.change(textarea!, { target: { value: 'I kept the coins.' } })
  await waitFor(() => expect(decodeEssayAnswer(savedAnswer())).toEqual({ label: 'Story Starter', body: 'I kept the coins.' }))
  // Now it is an answer.
  expect(screen.getByRole('button', { name: 'study.test.submit' })).toBeInTheDocument()
  // The editor shows the student's words, never the marker.
  expect((container.querySelector('textarea') as HTMLTextAreaElement).value).toBe('I kept the coins.')
})

it('changing the prompt keeps the text, and the pick survives a reload', async () => {
  const first = render(<TestSession sessionId={SESSION} language="en" />)
  await waitFor(() => expect(screen.getByText(/Choose ONE of the two prompts/)).toBeInTheDocument())
  fireEvent.click(screen.getByRole('radio', { name: 'A · Essay' }))
  fireEvent.change(first.container.querySelector('textarea')!, { target: { value: 'Schools should choose effort.' } })

  fireEvent.click(screen.getByRole('button', { name: 'Change prompt' }))
  // Cards are back, the current pick checked, the editor still there.
  expect(screen.getByRole('radio', { name: 'A · Essay' })).toHaveAttribute('aria-checked', 'true')
  fireEvent.click(screen.getByRole('radio', { name: 'B · Story Starter' }))
  await waitFor(() => expect(decodeEssayAnswer(savedAnswer())).toEqual({ label: 'Story Starter', body: 'Schools should choose effort.' }))
  first.unmount()

  const second = render(<TestSession sessionId={SESSION} language="en" />)
  const chosen = await screen.findByTestId('essay-chosen-prompt')
  expect(chosen.textContent).toContain(STORY)
  expect((second.container.querySelector('textarea') as HTMLTextAreaElement).value).toBe('Schools should choose effort.')
})

it('a picked prompt with nothing written submits as a blank (null)', async () => {
  render(<TestSession sessionId={SESSION} language="en" />)
  await waitFor(() => expect(screen.getByText(/Choose ONE of the two prompts/)).toBeInTheDocument())
  fireEvent.click(screen.getByRole('radio', { name: 'A · Essay' }))
  await waitFor(() => expect(savedAnswer()).toBe(encodeEssayAnswer('Essay', '')))
  fireEvent.click(screen.getByRole('button', { name: 'study.test.submitWithUnanswered' }))
  fireEvent.click(await screen.findByRole('button', { name: 'study.test.submitConfirm.confirm' }))
  await waitFor(() => expect(calls.some(c => c.url.includes('/api/study/test/submit'))).toBe(true))
  const sent = JSON.parse(calls.find(c => c.url.includes('/api/study/test/submit'))!.body) as { answers: (string | null)[] }
  expect(sent.answers).toEqual([null])
})
