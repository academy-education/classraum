/**
 * @jest-environment jsdom
 *
 * A LISTENING ITEM'S TRANSCRIPT IS NEVER IN THE PRE-SUBMIT DOM — any family.
 *
 * The transcript is the answer key: every listening question is answerable by
 * reading it. Until 2026-10-31 TestSession routed a listening item to the audio
 * player only when `family === 'toefl'`, so an iTEP SLATE listening item fell
 * through to the plain passage box and printed its whole script as text.
 * The player is now chosen per item (`isListeningItem`, the bank's
 * "Transcript:" convention), and the player itself never falls back to
 * printing the transcript when TTS fails.
 *
 * Revert-check, done when this landed: restoring the `family === 'toefl'`
 * condition fails the itep and unknown-family cases (transcript text found,
 * no player); TOEFL stays green. Restoring the player's `|| !ttsSupported`
 * fallback with ttsSupported=false fails every case.
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


const SCRIPT_LINE = 'Text your mom. She can bring the shin guards'
const TRANSCRIPT = `Transcript: M: You forgot your shin guards? Run home.\nW: He won't wait that long.\nM: ${SCRIPT_LINE}.`

const item = (n: number) => ({
  difficulty: 'easy', explanation: 'x', type: 'multiple_choice',
  prompt: `LISTEN prompt ${n}: What will the woman probably do next?`,
  passage: TRANSCRIPT, passageGroupId: null,
  choices: ['Ask her mom', 'Run home', 'Play without them', 'Ask the driver'],
  correct_answer: 'Ask her mom',
})

const CASES: Array<[string, string, string | null]> = [
  ['itep', 'itep', 'Listening'],
  ['toefl', 'toefl', 'Listening'],
  // A family the runner has never heard of, with no section: still audio-only.
  ['unknown family, no section', 'newexam', null],
]

describe('listening transcript is never rendered before submit', () => {
  it.each(CASES)('%s', async (_label, family, section) => {
    mockGenerate({ title: 't', timeLimitMinutes: 20, section, family, questions: [item(1)] })
    const { container } = render(<TestSession sessionId={`sess-listen-${family}`} language="en" />)
    await waitFor(() => expect(screen.getByText(/LISTEN prompt 1/)).toBeInTheDocument())
    // Let the player's TTS prefetch settle (the mocked fetch fails it), so the
    // error state is covered too: a failed fetch must not reveal the script.
    await new Promise(r => setTimeout(r, 50))
    const text = container.textContent ?? ''
    expect(text).not.toContain('shin guards')
    expect(text).not.toContain(SCRIPT_LINE)
    expect(text).not.toMatch(/Transcript:/i)
    // ...and the item really is served as audio, not silently dropped.
    expect(container.querySelector('button[aria-label="study.test.audioPlaying"]')).not.toBeNull()
    expect(text).toMatch(/Recording|study\.test\.audio/)
  })

  it('a non-listening passage is still shown (the guard is not a blanket hide)', async () => {
    mockGenerate({ title: 't', timeLimitMinutes: 20, section: 'Reading', family: 'itep', questions: [
      { ...item(2), passage: 'The library opens at nine on weekdays.' }] })
    const { container } = render(<TestSession sessionId="sess-reading-itep" language="en" />)
    await waitFor(() => expect(screen.getByText(/LISTEN prompt 2/)).toBeInTheDocument())
    expect(container.textContent).toContain('The library opens at nine on weekdays.')
    expect(container.querySelector('button[aria-label="study.test.audioPlaying"]')).toBeNull()
  })
})
