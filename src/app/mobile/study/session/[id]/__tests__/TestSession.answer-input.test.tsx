/**
 * @jest-environment jsdom
 *
 * EVERY QUESTION TYPE THE BANK CAN SERVE MUST RENDER SOMETHING A STUDENT CAN
 * ANSWER WITH. Mounted through the real TestSession, one item per type.
 *
 * WHY THIS EXISTS. On 2026-09-25 the SSAT Writing Sample and ISEE Essay
 * (`essay_choice`, `essay`) were reachable and unanswerable for 25 days: the
 * answer area is one ternary chain on `q.type` whose fallback maps over
 * `q.choices`, an essay row's choices are `[]`, so the prompt rendered and
 * then nothing. The submit bar read "1 unanswered". Four commits touched the
 * feature in that window and 1,133 tests stayed green, because every one of
 * them asserted the TYPE LIST rather than the SCREEN — the test written for the
 * first half of that same bug says in its own header that it "pins the type
 * list, which is the load-bearing half of the fix". It was half.
 *
 * `scripts/study-bank/check-unrendered-types.mjs` compares the live bank's
 * types against a hand-maintained list and says plainly it cannot verify the
 * list is true. This is the check that can: it renders.
 *
 * WHAT COUNTS AS AN ANSWER CONTROL, per type:
 *   choice list           a [data-runner-option] button
 *   numeric_entry         a text input with inputMode="decimal"
 *   fill_in_blanks        at least one text input per blank
 *   writing_* / essay*    a textarea
 *   speaking_*            the start screen's button (the recorder itself is
 *                         gated behind mic priming and is a separate contract)
 *
 * Revert-check, done when this landed: removing `essay` and `essay_choice` from
 * the writing branch condition in TestSession fails exactly the two essay
 * cases and nothing else.
 */
import { render, screen, waitFor } from '@testing-library/react'
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'util'

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

/** One item per type. `prompt` is unique per case so the render wait is
 *  unambiguous. Shapes follow test/types.ts. */
const BASE = { difficulty: 'medium', explanation: 'x' }
const CASES: Array<{ type: string; family: string; section: string; q: Record<string, unknown>; control: (c: HTMLElement) => Element | null }> = [
  { type: 'multiple_choice', family: 'sat', section: 'Math',
    q: { prompt: 'MC prompt', type: 'multiple_choice', choices: ['1', '2', '3', '4'], correct_answer: '2' },
    control: c => c.querySelector('button[data-runner-option]') },
  { type: 'multi_select', family: 'gre', section: 'Verbal',
    q: { prompt: 'MS prompt', type: 'multi_select', choices: ['a', 'b', 'c', 'd'], correct_answer: 'a', correct_answers: ['a', 'b'] },
    control: c => c.querySelector('button[data-runner-option]') },
  { type: 'numeric_entry', family: 'sat', section: 'Math',
    q: { prompt: 'NE prompt', type: 'numeric_entry', choices: [], correct_answer: '12' },
    control: c => c.querySelector('input[inputmode="decimal"]') },
  { type: 'fill_in_blanks', family: 'toefl', section: 'Reading',
    q: { prompt: 'FIB prompt', type: 'fill_in_blanks', passage: 'The [1] sat on the mat.', choices: [], correct_answer: 'cat', blanks: [{ id: 1, answer: 'cat' }] },
    control: c => c.querySelector('input') },
  { type: 'arrange_words', family: 'toefl', section: 'Writing',
    q: { prompt: 'AW prompt', type: 'arrange_words', choices: ['the cat', 'sat', 'here'], correct_answer: 'the cat | sat | here' },
    control: c => c.querySelector('button[data-runner-option], button') },
  { type: 'writing_email', family: 'toefl', section: 'Writing',
    q: { prompt: 'WE prompt', type: 'writing_email', passage: 'An email.', choices: [], correct_answer: '' },
    control: c => c.querySelector('textarea') },
  { type: 'writing_discussion', family: 'toefl', section: 'Writing',
    q: { prompt: 'WD prompt', type: 'writing_discussion', passage: 'PROFESSOR: a question.', choices: [], correct_answer: '' },
    control: c => c.querySelector('textarea') },
  { type: 'essay', family: 'isee', section: 'Writing',
    q: { prompt: 'ESSAY prompt: which way of working teaches you more?', type: 'essay', passage: null, choices: [], correct_answer: '' },
    control: c => c.querySelector('textarea') },
  { type: 'essay_choice', family: 'ssat', section: 'Writing',
    q: { prompt: 'ESSAYCHOICE prompt: choose ONE of the two prompts.', type: 'essay_choice', passage: '[Essay]\nA claim.\n\n[Story Starter]\nA sentence.', choices: [], correct_answer: '' },
    control: c => c.querySelector('textarea') },
  { type: 'speaking_repeat', family: 'toefl', section: 'Speaking',
    q: { prompt: 'SR prompt', type: 'speaking_repeat', passage: 'Repeat me.', choices: [], correct_answer: '' },
    control: c => [...c.querySelectorAll('button')].find(b => /Start Test/.test(b.textContent ?? '')) ?? null },
  { type: 'speaking_interview', family: 'toefl', section: 'Speaking',
    q: { prompt: 'SI prompt', type: 'speaking_interview', passage: 'Interview.', choices: [], correct_answer: '' },
    control: c => [...c.querySelectorAll('button')].find(b => /Start Test/.test(b.textContent ?? '')) ?? null },
]

const streamOf = (obj: unknown) => {
  let sent = false
  return { getReader: () => ({ read: async () => {
    if (sent) return { value: undefined, done: true }
    sent = true
    return { value: new NodeTextEncoder().encode(JSON.stringify(obj) + '\n'), done: false }
  } }) }
}

const mockGenerate = (payload: unknown) => {
  global.fetch = jest.fn(async (url: RequestInfo | URL) => {
    const u = String(url)
    if (u.includes('/api/study/test/generate')) return { ok: true, status: 200, body: streamOf({ type: 'result', test: payload }) } as unknown as Response
    return { ok: true, status: 200, json: async () => ({}) } as unknown as Response
  }) as unknown as typeof fetch
}

beforeEach(() => { localStorage.clear() })
afterEach(() => { jest.restoreAllMocks() })

describe('every servable question type renders an answer control', () => {
  it.each(CASES.map(c => [c.type, c] as const))('%s', async (_type, c) => {
    mockGenerate({ title: 't', timeLimitMinutes: 10, section: c.section, family: c.family, questions: [{ ...BASE, ...c.q }] })
    const { container } = render(<TestSession sessionId={`sess-${c.type}`} language="en" />)
    // Speaking items hide their prompt until the mic is primed — showing the
    // sentence to repeat would defeat the task — so the mounted signal there is
    // the start screen, and the answer control is its Start button.
    const mounted = c.type.startsWith('speaking') ? /Ready for the Speaking test/ : new RegExp(String(c.q.prompt).slice(0, 12))
    await waitFor(() => expect(screen.getByText(mounted)).toBeInTheDocument())
    // The load-bearing assertion. An empty <div class="space-y-2"> is what the
    // fallback produced for the essay types, and it contains none of these.
    expect(c.control(container)).not.toBeNull()
  })
})
